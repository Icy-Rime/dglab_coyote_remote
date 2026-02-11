type Resolver = (value: void) => void;

/**
 * 一个简单的Promise锁实现，用于在异步环境中控制对共享资源的访问。
 * 
 * 注意：此锁**不支持重入**。如果同一个执行上下文多次调用lock()方法，
 * 第二次调用会被阻塞，直到第一次调用的unlock()方法被执行。
 * 
 * 这意味着在同一个异步函数中，如果在获得锁后再次尝试获取锁，
 * 会导致死锁。
 */
export class PromiseLock {
    #locked = false;
    #waitResolver: Array<Resolver> = new Array<Resolver>();
    constructor() {
        // make sure this point right.
        this.lock = this.lock.bind(this);
        this.unlock = this.unlock.bind(this);
        this.isLocked = this.isLocked.bind(this);
        this.do = this.do.bind(this);
        this.wrap = this.wrap.bind(this);
    }
    lock() {
        if (this.#locked) {
            return new Promise((resolve: Resolver) => {
                this.#waitResolver.push(resolve);
            });
        } else {
            this.#locked = true;
            return Promise.resolve();
        }
    }
    unlock() {
        if (this.#locked) {
            this.#locked = false;
        }
        if (this.#waitResolver.length > 0) {
            this.#locked = true;
            this.#waitResolver.shift()!();
        }
    }
    isLocked() {
        return this.#locked;
    }
    async do<T>(func: () => Promise<T>) {
        await this.lock();
        try {
            return await func();
        } finally {
            this.unlock();
        }
    }
    // deno-lint-ignore no-explicit-any
    wrap<F extends (...args: any[]) => Promise<any>>(func: F) {
        return (...args: Parameters<F>) => this.do(() => func(...args)) as Promise<Awaited<ReturnType<F>>>;
    }
}