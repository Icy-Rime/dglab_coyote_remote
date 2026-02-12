import { createManagedTimedStore } from "../data/timed_store.ts";
import { monotonicUlid } from "@std/ulid";

const encoder = new TextEncoder();
const clientStore = createManagedTimedStore<EventClient>();

class EventClient {
    #id: string = "";
    #stream: ReadableStream | undefined = undefined;
    #controller: ReadableStreamDefaultController | undefined = undefined;
    #onClose: (() => void) | (() => Promise<void>) = () => {};

    constructor() {
        this.#id = monotonicUlid();
        this.close = this.close.bind(this);
    }

    setOnCloseCallback(onClose: (() => void) | (() => Promise<void>)) {
        this.#onClose = onClose;
    }

    getId() {
        return this.#id;
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
            await this.#onClose();
        }
    }

    emitEvent(event: string | undefined, data: string) {
        if (event) {
            this.#sendRaw(`event: ${event}\r\n`);
        }
        data.split("\n").forEach((line) => {
            this.#sendRaw(`data: ${line.trimEnd()}\r\n`);
        });
        this.#sendRaw("\r\n");
    }
}

export const startKeepliveTask = (intervalMs = 25 * 1000) => {
    const returnHandler = {
        _runningTask: Promise.resolve(),
        _handle: -1,
        stop: async () => {
            if (returnHandler._handle >= 0) {
                clearInterval(returnHandler._handle);
                returnHandler._handle = -1;
            }
            await returnHandler._runningTask;
        },
    }
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
