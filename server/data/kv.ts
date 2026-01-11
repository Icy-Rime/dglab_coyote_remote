/// <reference lib="deno.unstable" />

const DB_PATH = "datakv.db";

let db: Deno.Kv | undefined = undefined;

export class KVRetry extends Error {}

export const initKv = async (isTest: boolean = false) => {
    if (isTest) {
        db = await Deno.openKv(":memory:");
    } else {
        db = await Deno.openKv(DB_PATH);
    }
    globalThis.addEventListener("unload", closeKv);
};

export const getKv = () => {
    if (db) {
        return db;
    }
    throw Error("KV database not inited.");
};

export const closeKv = () => {
    db?.close();
    db = undefined;
};

/**
 * Wrap a kv operation to retry on KVRetry error.
 */
// deno-lint-ignore no-explicit-any
export const wrapKvOperation = <T extends (...args: any[]) => Promise<unknown>>(op: T, retry: number = 5): T => {
    const func = async (...args: unknown[]) => {
        while (true) {
            try {
                return await op(...args);
            } catch (e) {
                if (e instanceof KVRetry) {
                    retry--;
                    if (retry > 0) {
                        continue;
                    }
                }
                throw e;
            }
        }
    };
    return func as T;
};
