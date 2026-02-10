/** the store that expires its items after a certain time. */
export type OnExpireCallbackType = (
    force_delete: boolean,
) => number | undefined | null | void | Promise<number | undefined | null | void>;
interface StoreItem {
    value: unknown;
    expires: number;
    /**
     * onClear callback when the item is expired or deleted.
     * @param force_delete whether the item will be deleted forcibly.
     * @returns new expire time in ms, or undefined to let the item be deleted.
     */
    onExpire?: OnExpireCallbackType;
}

export class TimedStore<T> {
    #store: Map<string, StoreItem> = new Map();
    #timerHandler: number = -1;
    #timerIntervalMs: number = 0;
    #asyncTasks: Set<Promise<unknown>> = new Set();

    constructor() {
        this.checkAndClearExpiredItems = this.checkAndClearExpiredItems.bind(this);
        this.__clearTaskAction = this.__clearTaskAction.bind(this);
    }

    async set(key: string, value: T, expireAt: number, onClear?: OnExpireCallbackType) {
        if (this.#store.has(key)) {
            const item = this.#store.get(key)!;
            await item.onExpire?.(true);
        }
        this.#store.set(key, {
            value,
            expires: expireAt,
            onExpire: onClear,
        });
    }

    async get(key: string, defaultValue?: T): Promise<T | undefined> {
        const item = this.#store.get(key);
        const now = Date.now();
        if (item) {
            if (item.expires >= now) {
                return item.value as T;
            }
            // expire callback
            const newExpire = await item.onExpire?.(false) ?? false;
            if (typeof newExpire === "number" && newExpire > now) {
                // update expire time
                item.expires = newExpire;
                return item.value as T;
            } else {
                this.#store.delete(key);
            }
        }
        return defaultValue;
    }

    async delete(key: string) {
        const item = this.#store.get(key);
        if (item) {
            await item.onExpire?.(true);
            this.#store.delete(key);
        }
    }

    async clear() {
        const tasks = this.#store.values().map((item) => item.onExpire?.(true));
        this.#store.clear();
        await Promise.allSettled(tasks);
    }

    async deleteAllValues(value: T) {
        const keyToDelete = new Set<string>();
        for (const [key, item] of this.#store) {
            if (item.value === value) {
                keyToDelete.add(key);
            }
        }
        for (const key of keyToDelete) {
            await this.delete(key);
        }
    }

    #counter: number = 0;
    async checkAndClearExpiredItems() {
        const now = Date.now();
        // const id = this.#counter++;
        // console.log(`checkAndClearExpiredItems ${id}, ${now}, ${this.#store.size} items`);
        const expiredItemsSet = new Set<string>();
        for (const [key, item] of this.#store) {
            // console.log(`${item.expires}`);
            if (item.expires < now) {
                expiredItemsSet.add(key);
                // console.log(`clear ${id} add ${key}`);
            }
        }
        const tasks = Array.from(expiredItemsSet).map(async (key) => {
            const item = this.#store.get(key)!;
            // expire callback
            const newExpire = await item.onExpire?.(false) ?? false;
            if (typeof newExpire === "number" && newExpire > now) {
                // update expire time
                item.expires = newExpire;
            } else {
                this.#store.delete(key);
            }
            // console.log(`clear ${id} done ${key}`);
        });
        await Promise.allSettled(tasks);
        // console.log(`checkAndClearExpiredItems ${id} done`);
    }

    __clearTaskAction() {
        const now1 = Date.now();
        // console.log(`__clearTaskAction ${this.#counter}, ${now1}`);
        const task = this.checkAndClearExpiredItems()
            .catch(console.error)
            .then(async () => {
                if (this.#timerIntervalMs > 0) {
                    const now2 = Date.now();
                    if (now2 - now1 > this.#timerIntervalMs) {
                        await this.checkAndClearExpiredItems(); // execute next clear task immediately
                    }
                    this.#timerHandler = setTimeout(this.__clearTaskAction, this.#timerIntervalMs);
                }
            })
            .then(() => {
                this.#asyncTasks.delete(task);
            });
        this.#asyncTasks.add(task);
    }

    async stopClearTask() {
        if (this.#timerHandler >= 0) {
            clearTimeout(this.#timerHandler);
            this.#timerHandler = -1;
            this.#timerIntervalMs = 0;
        }
        await Promise.allSettled(this.#asyncTasks);
    }

    async startClearTask(intervalMs: number = 60000) {
        // stop the existing timer if any
        if (this.#timerHandler >= 0) {
            await this.stopClearTask();
        }
        // start the timer
        this.#timerIntervalMs = intervalMs;
        this.#timerHandler = setTimeout(this.__clearTaskAction, this.#timerIntervalMs);
    }

    async _waitForClearTask() {
        await Promise.allSettled(this.#asyncTasks);
    }
}
