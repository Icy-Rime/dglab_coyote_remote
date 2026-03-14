import { PromiseLock } from "../utils/lock.ts";

export enum ExpireReason {
    /** the item is expired. */
    Expired = "EXPIRED",
    /** the item is deleted. */
    Deleted = "DELETED",
    /** the item is overridden by a new item. */
    Overridden = "OVERRIDDEN",
    /** the item is not expired. */
    Unknown = "UNKNOWN",
}

export interface ExpirableItem {
    expireAt: number;
}

export type OnExpireCallbackType<T extends ExpirableItem> = (
    value: T,
    reason: ExpireReason,
) => number | undefined | null | void | Promise<number | undefined | null | void>;

/** the store that expires its items after a certain time. */
export class ExpirableStore<T extends ExpirableItem> {
    #store: Map<string, T> = new Map();
    #timerHandler: number = -1;
    #scheduleTask: Promise<void> | undefined = undefined;
    #nextKeyToClear: string = "";
    #lock = new PromiseLock();
    #onExpire: OnExpireCallbackType<T>;
    __triggerClearTask: () => void;

    constructor(onExpire: OnExpireCallbackType<T> = (() => undefined)) {
        this.#onExpire = onExpire;
        this.__triggerClearTask = this.#triggerClearTask.bind(this);
    }

    keys() {
        return this.#store.keys();
    }

    set = this.#lock.wrap(async (key: string, value: T) => {
        if (this.#store.has(key)) {
            const item = this.#store.get(key)!;
            if (item === value) {
                return;
            }
            await this.#onExpire(item, ExpireReason.Overridden);
        }
        this.#store.set(key, value);
        await this.#restartClearTask();
    });

    updateExpireTime = this.#lock.wrap(async (key: string, expireAt: number) => {
        if (this.#store.has(key)) {
            const item = this.#store.get(key)!;
            if (item) {
                item.expireAt = expireAt;
                await this.#restartClearTask();
            }
        }
    });

    get = this.#lock.wrap(async (key: string, defaultValue?: T): Promise<T | undefined> => {
        const item = this.#store.get(key);
        const now = Date.now();
        if (item) {
            if (item.expireAt >= now) {
                return item;
            }
            // expire callback, can query new expire time
            const newExpire = (await this.#onExpire(item, ExpireReason.Expired)) ?? false;
            if (typeof newExpire === "number") {
                // update expire time
                item.expireAt = newExpire;
                await this.#restartClearTask();
                return item;
            } else {
                this.#store.delete(key);
                await this.#restartClearTask();
            }
        }
        return defaultValue as T | undefined;
    });

    delete = this.#lock.wrap(async (key: string) => {
        const item = this.#store.get(key);
        if (item) {
            await this.#onExpire(item, ExpireReason.Deleted);
            this.#store.delete(key);
            await this.#restartClearTask();
        }
    });

    clear = this.#lock.wrap(async () => {
        const tasks = this.#store.values().map((item) => this.#onExpire(item, ExpireReason.Deleted));
        this.#store.clear();
        await Promise.allSettled(tasks);
        await this.#restartClearTask();
    });

    deleteAll = this.#lock.wrap(async (isEqual: (item: T) => boolean | Promise<boolean>) => {
        const keyToDelete = new Set<string>();
        for (const [key, item] of this.#store) {
            if (await isEqual(item)) {
                keyToDelete.add(key);
            }
        }
        for (const key of keyToDelete) {
            // await this.delete(key); // lock didn't support recursive call
            const item = this.#store.get(key);
            if (item) {
                await this.#onExpire(item, ExpireReason.Deleted);
                this.#store.delete(key);
            }
        }
        if (keyToDelete.size > 0) {
            await this.#restartClearTask();
        }
    });

    // #counter = 0;
    #startClearTask() {
        let nearestExpireTimeMs = Number.MAX_SAFE_INTEGER;
        let nearestExpireKey: string | undefined = undefined;
        for (const [key, item] of this.#store) {
            if (item.expireAt < nearestExpireTimeMs) {
                // find the nearest expire item
                nearestExpireTimeMs = item.expireAt;
                nearestExpireKey = key;
            }
        }
        // cancel previous timer
        this.#scheduleTask = undefined;
        if (this.#timerHandler >= 0) {
            clearTimeout(this.#timerHandler);
            this.#timerHandler = -1;
        }
        if (typeof nearestExpireKey === "string") {
            this.#nextKeyToClear = nearestExpireKey;
            const delayMs = Math.max(0, nearestExpireTimeMs - Date.now() + 1);
            this.#timerHandler = setTimeout(this.__triggerClearTask, delayMs);
            // const cid = ++this.#counter;
            // console.log(`schedule clear task ${cid} in ${delayMs}ms`);
        }
    }

    /** warn: this method should be called in a locked context */
    async #restartClearTask() {
        if (!this.#lock.isLocked()) {
            throw new Error("#restartClearTask should be called in a locked context");
        }
        this.#lock.unlock(); // unlock, let clear task run
        try {
            await this.#stopClearTask();
        } finally {
            await this.#lock.lock(); // lock again
        }
        if (this.#store.size > 0 && this.#timerHandler < 0 && this.#scheduleTask === undefined) {
            this.#startClearTask();
        }
    }

    #triggerClearTask() {
        if (this.#scheduleTask) {
            return;
        }
        const keyToClear = this.#nextKeyToClear;
        // const cid = ++this.#counter;
        // console.log(`start clear task ${cid}`);
        const task = this.#lock.do(async () => {
            // console.log(`execute clear task ${cid}`);
            try {
                const now = Date.now();
                const item = this.#store.get(keyToClear);
                if (item && item.expireAt <= now) {
                    const newExpire = await this.#onExpire(item, ExpireReason.Expired);
                    if (typeof newExpire === "number") {
                        // update expire time
                        item.expireAt = newExpire;
                    } else {
                        // delete item
                        this.#store.delete(keyToClear);
                    }
                }
            } catch (e) {
                console.error(e);
            }
            this.#startClearTask();
        });
        this.#scheduleTask = task;
        this.#timerHandler = -1;
    }

    async #stopClearTask() {
        if (this.#timerHandler >= 0) {
            clearTimeout(this.#timerHandler);
            this.#timerHandler = -1;
        }
        if (this.#scheduleTask) {
            await this.#scheduleTask;
            this.#scheduleTask = undefined;
        }
    }

    async close() {
        await this.#stopClearTask();
    }
}

const managedStores = new Set<ExpirableStore<ExpirableItem>>();

export const createManagedExpirableStore = <T extends ExpirableItem>(): ExpirableStore<T> => {
    const store = new ExpirableStore<T>();
    managedStores.add(store as unknown as ExpirableStore<ExpirableItem>);
    return store;
};

export const closeAllManagedExpirableStore = async () => {
    for (const store of managedStores) {
        await store.close();
    }
};
