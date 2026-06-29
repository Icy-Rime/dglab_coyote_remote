import { createManagedExpirableStore, ExpireReason } from "../data/expirable_store.ts";
import type { ExpirableItem, OnExpireCallbackType } from "../data/expirable_store.ts";
import { ulid } from "@std/ulid";
import { getUser } from "../data/user.ts";

const encoder = new TextEncoder();

class EventClient implements ExpirableItem {
    expireAt: number = 0; // expirable
    #id: string = "";
    #uid: string = "";
    #did: string = "";
    #stream: ReadableStream | undefined = undefined;
    #controller: ReadableStreamDefaultController | undefined = undefined;

    constructor(uid: string, did: string) {
        this.#id = ulid();
        this.#uid = uid;
        this.#did = did;
        this.close = this.close.bind(this);
    }

    getId() {
        return this.#id;
    }

    getUserId() {
        return this.#uid;
    }

    getDeviceId() {
        return this.#did;
    }

    isConnected() {
        return this.#controller !== undefined;
    }

    makeResponse() {
        if (this.#stream != undefined) {
            throw new Error(`EventClient ${this.#id} not closed before new response`);
        }
        this.#stream = new ReadableStream({
            start: (ctl) => {
                this.#controller = ctl;
                this.#sendRaw(":connected\r\n\r\n");
            },
            cancel: this.close,
        });
        return new Response(this.#stream, {
            headers: {
                // "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/event-stream",
            },
        });
    }

    #sendRaw(text: string) {
        if (this.#controller != undefined) {
            this.#controller.enqueue(encoder.encode(text));
        }
    }

    pingKeeplive() {
        this.#sendRaw(":ping\r\n\r\n");
    }

    async close() {
        if (this.#stream != undefined) {
            this.#stream = undefined;
            this.#controller?.close();
            this.#controller = undefined;
        }
    }

    emitEvent(event: string | undefined, data: string) {
        if (event) {
            this.#sendRaw(`event: ${event}\r\n`);
        }
        data.replaceAll("\r\n", "\n").split("\n").forEach((line) => {
            this.#sendRaw(`data: ${line.trimEnd()}\r\n`);
        });
        this.#sendRaw("\r\n");
    }
}

const queryUserSubscriptionTimeMs = async (userId: string) => {
    const user = await getUser(userId);
    if (user === undefined) {
        throw new Error(`User ${userId} not found.`);
    }
    return user.subscriptionTimeMs;
};

const onExpireCallback: OnExpireCallbackType<EventClient> = async (item: EventClient, reason: ExpireReason) => {
    if (reason === ExpireReason.Expired) {
        const userId = item.getUserId();
        // query current expire time
        const expireTime = await queryUserSubscriptionTimeMs(userId);
        if (expireTime - Date.now() > 1000) {
            return expireTime;
        }
    }
    // other reason / time expire
    item.close(); // disconnect
    return undefined;
};

const clientStore = createManagedExpirableStore<EventClient>(onExpireCallback);

export const _getClientStore = () => {
    return clientStore;
};

export const getEventClient = async (userId: string, deviceId: string) => {
    for (const k of clientStore.keys()) {
        const item = await clientStore.get(k);
        if (item?.getUserId() === userId) {
            if (deviceId === "*" || item.getDeviceId() === deviceId) {
                return item;
            }
        }
    }
    return undefined;
};

export const startKeepliveTask = (intervalMs = 25 * 1000) => {
    const returnHandler = {
        _runningTask: Promise.resolve(),
        _handle: undefined as NodeJS.Timeout | number | undefined,
        stop: async () => {
            if (returnHandler._handle !== undefined) {
                clearInterval(returnHandler._handle);
                returnHandler._handle = undefined;
            }
            await returnHandler._runningTask;
        },
    };
    // init task
    const taskPing = async () => {
        const st = Date.now();
        for (const key of clientStore.keys()) {
            try {
                const lst = await clientStore.get(key);
                if (lst) {
                    lst.pingKeeplive();
                }
            } catch (e) {
                // CONTINUE IGNORE ERROR
                console.warn(e);
            }
        }
        const ed = Date.now();
        // check if task takes too long
        if (ed - st >= intervalMs * 0.5) {
            console.warn(`Keeplive task takes ${ed - st} ms`);
        }
    };
    const task = () => {
        returnHandler._runningTask = returnHandler._runningTask.then(taskPing);
    };
    // set interval
    returnHandler._handle = setInterval(task, intervalMs);
    return returnHandler;
};

export const createEventClient = async (userId: string, deviceId: string) => {
    let expireTime = await queryUserSubscriptionTimeMs(userId);
    if ((expireTime - Date.now()) < 10 * 1000) {
        // not enough time
        return undefined;
    }
    const client = new EventClient(userId, deviceId);
    client.expireAt = expireTime;
    clientStore.set(client.getId(), client);
    return client;
};
