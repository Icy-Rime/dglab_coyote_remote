import { assert } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import type { ExpirableItem } from "./expirable_store.ts"
import { ExpireReason, ExpirableStore } from "./expirable_store.ts";

// give out time slice to let the store expire

interface TestValue extends ExpirableItem {
    rand: string;
    expireReason: ExpireReason;
}

Deno.test("data/timed_store", async (t) => {
    using time = new FakeTime();
    let clearCounter = 0;
    const key = globalThis.crypto.randomUUID();
    const val = {
        rand: globalThis.crypto.randomUUID(),
        expireReason: ExpireReason.Unknown,
        expireAt: Date.now(),
    };
    const onClear1 = async (value: TestValue, reason: ExpireReason) => {
        clearCounter++;
        value.expireReason = reason;
        await time.tickAsync(1);
    };
    const onClear2 = async (value: TestValue, reason: ExpireReason) => {
        clearCounter++;
        value.expireReason = reason;
        await time.tickAsync(1);
        if (reason === ExpireReason.Expired) {
            return Date.now() + 1000;
        }
        return undefined;
    };
    const store1 = new ExpirableStore<TestValue>(onClear1);
    const store = new ExpirableStore<TestValue>(onClear2);
    await t.step("set_and_get", async () => {
        await store1.set(key, { ...val, expireAt: Date.now() + 1000 });
        const res = await store1.get(key);
        assert(res?.rand === val.rand);
        assert(res?.expireReason === ExpireReason.Unknown);
        assert(clearCounter === 0);
        // the only one key in the store
        const iter = store1.keys();
        assert((iter.next()).value === key);
        assert((iter.next()).done === true);
    });
    await t.step("set_override", async () => {
        const initClearCounter = clearCounter;
        const lastItem = await store1.get(key);
        await store1.set(key, { ...val, expireAt: Date.now() + 1000 });
        const res = await store1.get(key);
        assert(res?.rand === val.rand);
        assert(lastItem?.expireReason === ExpireReason.Overridden);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_at_get", async () => {
        const item = { ...val, expireAt: Date.now() - 1 };
        await store1.set(key, item);
        const initClearCounter = clearCounter;
        // expired
        const res1 = await store1.get(key);
        assert(res1 === undefined);
        assert(item.expireReason === ExpireReason.Expired);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_delete", async () => {
        const item = { ...val, expireAt: Date.now() + 50 };
        await store1.set(key, item);
        const initClearCounter = clearCounter;
        // expired
        await store1.delete(key);
        assert(item.expireReason === ExpireReason.Deleted);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_task", async () => {
        const item = { ...val, expireAt: Date.now() + 50 };
        await store1.set(key, item);
        const initClearCounter = clearCounter;
        // expired
        await time.tickAsync(100);
        await time.runMicrotasks();
        assert(item.expireReason === ExpireReason.Expired);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("update_expire_time", async () => {
        const item = { ...val, expireAt: Date.now() + 50 };
        await store1.set(key, item);
        const initClearCounter = clearCounter;
        // update expire time
        store1.updateExpireTime(key, Date.now() + 101);
        // not expire yet
        await time.tickAsync(100);
        await time.runMicrotasks();
        assert(item.expireReason === ExpireReason.Unknown);
        assert(clearCounter === initClearCounter);
        // expired by task
        await time.tickAsync(2);
        await time.runMicrotasks();
        assert(item.expireReason as ExpireReason === ExpireReason.Expired);
    });
    await t.step("delete_all", async () => {
        await time.tickAsync(1);
        await time.runMicrotasks();
        const nval = { ...val, rand: globalThis.crypto.randomUUID(), expireAt: Date.now() + 1000 };
        await store1.set("k0", nval);
        await store1.set("k1", { ...val, expireAt: Date.now() + 1000 });
        await store1.set("k2", { ...val, expireAt: Date.now() + 1000 });
        await store1.set("k3", { ...val, expireAt: Date.now() + 1000 });
        const initClearCounter = clearCounter;
        await store1.deleteAll((item) => item.rand === val.rand);
        // k0 as is. k1,k2,k3 expired
        let res = await store1.get("k0");
        assert(res !== undefined);
        assert(typeof (res as typeof nval)?.rand === "string");
        res = await store1.get("k1");
        assert(res === undefined);
        res = await store1.get("k2");
        assert(res === undefined);
        res = await store1.get("k3");
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 3);
        // clean for later test
        await store1.delete("k0");
    });
    await t.step("update_expire_in_callback_at_get", async () => {
        await time.tickAsync(1);
        await time.runMicrotasks();
        const tmpKey = globalThis.crypto.randomUUID();
        const item = { ...val, expireAt: Date.now() - 1 };
        await store.set(tmpKey, item);
        const initClearCounter = clearCounter;
        assert(item.expireReason === ExpireReason.Unknown);
        // expired at get
        const res2 = await store.get(tmpKey);
        assert(res2?.rand === val.rand);
        assert(res2?.expireReason === ExpireReason.Expired);
        assert(clearCounter === initClearCounter + 1);
        // clean up
        await store.delete(tmpKey);
    });
    await t.step("update_expire_in_callback_by_task", async () => {
        await time.tickAsync(1);
        await time.runMicrotasks();
        const tmpKey = globalThis.crypto.randomUUID();
        await store.set(tmpKey, { ...val, expireAt: Date.now() + 1000 });
        const initClearCounter = clearCounter;
        await time.tickAsync(200);
        await time.runMicrotasks();
        const res1 = await store.get(tmpKey);
        assert(res1?.rand === val.rand);
        assert(res1?.expireReason === ExpireReason.Unknown);
        // time passed expired
        await time.tickAsync(1001);
        await time.runMicrotasks();
        const res2 = await store.get(tmpKey);
        assert(res2?.rand === val.rand);
        assert(res2?.expireReason === ExpireReason.Expired);
        assert(clearCounter === initClearCounter + 1);
        // clean up
        await store.delete(tmpKey);
    });
    await store1.close();
});
