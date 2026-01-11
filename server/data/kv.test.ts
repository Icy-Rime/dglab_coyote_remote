import { assert, AssertionError, assertThrows } from "@std/assert";
import { KVRetry, getKv, initKv, closeKv, wrapKvOperation } from "./kv.ts";

Deno.test("data/kv", async (t) => {
    await t.step("getKvBeforeInit", () => {
        assertThrows(() => {
            getKv();
        });
    });
    await t.step("initKv", async () => {
        await initKv(true);
    });
    await t.step("getKv", () => {
        const kv = getKv();
        assert(kv instanceof Deno.Kv);
    });
    await t.step("wrapKvOperation", async (ctx) => {
        await ctx.step("normal", async () => {
            let counter = 0;
            const rand = Math.floor(Math.random() * 65535);
            const op = wrapKvOperation((num: number) => {
                counter++;
                return Promise.resolve(num + 1);
            });
            const ret = await op(rand);
            assert(counter === 1);
            assert(ret === rand + 1);
        });
        await ctx.step("retry", async () => {
            let counter = 0;
            const rand = Math.floor(Math.random() * 65535);
            const op = wrapKvOperation((num: number) => {
                counter++;
                if (counter < 2) {
                    return Promise.reject(new KVRetry());
                }
                return Promise.resolve(num + 1);
            }, 2);
            const ret = await op(rand);
            assert(counter === 2);
            assert(ret === rand + 1);
        });
        await ctx.step("retryManyTimes", async () => {
            let counter = 0;
            const rand = Math.floor(Math.random() * 65535);
            const op = wrapKvOperation((num: number) => {
                counter++;
                if (counter < 3) {
                    return Promise.reject(new KVRetry());
                }
                return Promise.resolve(num + 1);
            }, 2);
            try {
                const _ = await op(rand);
                throw new AssertionError("Should not reach here.");
            } catch {
                assert(counter === 2);
            }
        });
    });
    await t.step("closeKv", () => {
        closeKv();
    });
});
