import { PromiseLock } from "../utils/lock.ts";

export type OnExpireCallbackType = (
    force_delete: boolean,
) => number | undefined | null | void | Promise<number | undefined | null | void>;
interface StoreItem<T> {
    value: T;
    expires: number;
    /**
     * onClear callback when the item is expired or deleted.
     * @param force_delete whether the item will be deleted forcibly.
     * @returns new expire time in ms, or undefined to let the item to be deleted.
     */
    onExpire?: OnExpireCallbackType;
}

/** the store that expires its items after a certain time. */
export class TimedStore<T> {
    #store: Map<string, StoreItem<T>> = new Map();
    #timerHandler: number = -1;
    #scheduleTask: Promise<void> | undefined = undefined;
    #nextKeyToClear: string = "";
    #lock = new PromiseLock();
    __triggerClearTask: () => void;

    constructor() {
        this.__triggerClearTask = this.#triggerClearTask.bind(this);
    }

    keys() {
        return this.#store.keys();
    }

    set = this.#lock.wrap(async (key: string, value: T, expireAt: number, onClear?: OnExpireCallbackType) => {
        if (this.#store.has(key)) {
            const item = this.#store.get(key)!;
            await item.onExpire?.(true);
        }
        this.#store.set(key, {
            value,
            expires: expireAt,
            onExpire: onClear,
        });
        await this.#restartClearTask();
    });

    get = this.#lock.wrap(async (key: string, defaultValue?: T): Promise<T | undefined> => {
        const item = this.#store.get(key);
        const now = Date.now();
        if (item) {
            if (item.expires >= now) {
                return item.value as T;
            }
            // expire callback, can query new expire time
            const newExpire = await item.onExpire?.(false) ?? false;
            if (typeof newExpire === "number" && newExpire > now) {
                // update expire time
                item.expires = newExpire;
                await this.#restartClearTask();
                return item.value as T;
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
            await item.onExpire?.(true);
            this.#store.delete(key);
            await this.#restartClearTask();
        }
    });

    clear = this.#lock.wrap(async () => {
        const tasks = this.#store.values().map((item) => item.onExpire?.(true));
        this.#store.clear();
        await Promise.allSettled(tasks);
        await this.#restartClearTask();
    });

    deleteAllValues = this.#lock.wrap(async (value: T) => {
        const keyToDelete = new Set<string>();
        for (const [key, item] of this.#store) {
            if (item.value === value) {
                keyToDelete.add(key);
            }
        }
        for (const key of keyToDelete) {
            // await this.delete(key); // lock didn't support recursive call
            const item = this.#store.get(key);
            if (item) {
                await item.onExpire?.(true);
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
            if (item.expires < nearestExpireTimeMs) {
                // find the nearest expire item
                nearestExpireTimeMs = item.expires;
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
                if (item && item.expires <= now) {
                    const result = await item.onExpire?.(true);
                    if (typeof result === "number") {
                        // update expire time
                        item.expires = result;
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

const managedStores = new Set<TimedStore<unknown>>();

export const createManagedTimedStore = <T>(): TimedStore<T> => {
    const store = new TimedStore<T>();
    managedStores.add(store as TimedStore<unknown>);
    return store;
};

export const closeAllManagedTimedStore = async () => {
    for (const store of managedStores) {
        await store.close();
    }
};
