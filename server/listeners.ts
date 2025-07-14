const encoder = new TextEncoder();

class EventListener {
    #id: string = "";
    #stream: ReadableStream | undefined = undefined;
    #controller: ReadableStreamDefaultController | undefined = undefined;

    constructor(id: string) {
        this.#id = id;
    }

    getId() {
        return this.#id;
    }

    makeResponse(onClose: (() => void) | (() => Promise<void>)) {
        this.#stream = new ReadableStream({
            start: (ctl) => {
                this.#controller = ctl;
                this.#sendRaw(":connected\r\n\r\n");
            },
            cancel: async () => {
                const rst = onClose();
                if (rst instanceof Promise) {
                    await rst;
                }
            },
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

    close() {
        if (this.#stream != undefined) {
            this.#controller?.close();
            this.#controller = undefined;
            this.#stream = undefined;
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

const listeners: Map<string, EventListener> = new Map();

const unregisterListener = (uid: string) => {
    if (listeners.has(uid)) {
        listeners.delete(uid);
    }
};

export const startListen = (uid: string): Response | undefined => {
    if (listeners.has(uid)) {
        listeners.get(uid)?.close();
        listeners.delete(uid);
    }
    const lst = new EventListener(uid);
    listeners.set(uid, lst);
    return lst.makeResponse(() => {
        unregisterListener(uid);
    });
};

export const pingListener = (uid: string): boolean => {
    if (listeners.has(uid)) {
        listeners.get(uid)?.pingKeeplive();
        return true;
    }
    return false;
};

export const emitEvent = (uid: string, event: string | undefined, data: string): boolean => {
    if (listeners.has(uid)) {
        listeners.get(uid)?.emitEvent(event, data);
        return true;
    }
    return false;
};

export const startKeepliveTask = () => {
    // init task
    const task = () => {
        for (const lst of listeners.values()) {
            try {
                lst.pingKeeplive();
            } catch {
                // CONTINUE IGNORE ERROR
            }
        }
    };
    setInterval(task, 14 * 1000);
};
