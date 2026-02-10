/** the store that expires its items after a certain time. */
interface StoreItem {
    value: unknown;
    expires: number;
    onClear?: () => void;
}

export class TimedStore<T> {
    #store: Map<string, StoreItem> = new Map();
    #timerHandler: number = -1;
    #timerIntervalMs: number = 0;

    constructor() {
        this.checkAndClearExpiredItems = this.checkAndClearExpiredItems.bind(this);
        this.__clearTaskAction = this.__clearTaskAction.bind(this);
    }

    set(key: string, value: T, expireAt: number, onClear?: () => void) {
        if (this.#store.has(key)) {
            const item = this.#store.get(key)!;
            item.onClear?.();
        }
        this.#store.set(key, {
            value,
            expires: expireAt,
            onClear,
        });
    }

    get(key: string, defaultValue?: T): T | undefined {
        const item = this.#store.get(key);
        if (item) {
            if (item.expires >= Date.now()) {
                return item.value as T;
            }
            // expired
            item.onClear?.();
            this.#store.delete(key);
        }
        return defaultValue;
    }

    delete(key: string) {
        const item = this.#store.get(key);
        if (item) {
            item.onClear?.();
            this.#store.delete(key);
        }
    }

    deleteAllValues(value: T) {
        const keyToDelete = new Set<string>();
        for (const [key, item] of this.#store) {
            if (item.value === value) {
                keyToDelete.add(key);
            }
        }
        for (const key of keyToDelete) {
            this.delete(key);
        }
    }

    checkAndClearExpiredItems() {
        const now = Date.now();
        const expiredItemsSet = new Set<string>();
        for (const [key, item] of this.#store) {
            if (item.expires < now) {
                expiredItemsSet.add(key);
            }
        }
        for (const key of expiredItemsSet) {
            const item = this.#store.get(key)!;
            item.onClear?.();
            this.#store.delete(key);
        }
    }

    __clearTaskAction() {
        this.checkAndClearExpiredItems();
        this.#timerHandler = setTimeout(this.__clearTaskAction, this.#timerIntervalMs);
    }

    stopClearTask() {
        if (this.#timerHandler >= 0) {
            clearTimeout(this.#timerHandler);
            this.#timerHandler = -1;
            this.#timerIntervalMs = 0;
        }
    }

    startClearTask(intervalMs: number = 60000) {
        // stop the existing timer if any
        if (this.#timerHandler >= 0) {
            this.stopClearTask();
        }
        // start the timer
        this.#timerIntervalMs = intervalMs;
        this.#timerHandler = setTimeout(this.__clearTaskAction, this.#timerIntervalMs);
    }
}
