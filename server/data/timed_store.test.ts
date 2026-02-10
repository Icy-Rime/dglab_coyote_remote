import { assert } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { TimedStore } from "./timed_store.ts";

// give out time slice to let the store expire

Deno.test("data/timed_store", async (t) => {
    const store = new TimedStore<object>();
    using time = new FakeTime();
    let clearCounter = 0;
    const key = globalThis.crypto.randomUUID();
    const val = {
        rand: globalThis.crypto.randomUUID(),
    };
    const onClear1 = (_force_delete: boolean) => {
        clearCounter++;
    };
    const onClear2 = async (_force_delete: boolean) => {
        clearCounter++;
        await time.tickAsync(1);
        return Date.now() + 1000;
    };
    await t.step("set_and_get", async () => {
        await store.set(key, val, Date.now() + 1000, onClear1);
        const res = await store.get(key);
        assert(res === val);
        assert((res as typeof val).rand === val.rand);
        assert(clearCounter === 0);
    });
    await t.step("set_again_delete", async () => {
        const initClearCounter = clearCounter;
        await store.set(key, val, Date.now() + 1000, onClear1);
        const res = await store.get(key);
        assert(res === val);
        assert((res as typeof val).rand === val.rand);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_at_get", async () => {
        const initClearCounter = clearCounter;
        await time.tickAsync(200);
        const res1 = await store.get(key);
        assert(res1 === val);
        assert((res1 as typeof val).rand === val.rand);
        // time passed
        await time.tickAsync(1000);
        // expired
        const res2 = await store.get(key);
        assert(res2 === undefined);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_delete", async () => {
        const initClearCounter = clearCounter;
        await store.set(key, val, Date.now() + 1000, onClear1);
        await store.delete(key);
        // expired
        const res = await store.get(key);
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_manually_check", async () => {
        const initClearCounter = clearCounter;
        await store.set(key, val, Date.now() + 1000, onClear1);
        await time.tickAsync(200);
        await store.checkAndClearExpiredItems();
        assert(clearCounter === initClearCounter);
        // expired
        await time.tickAsync(1000);
        await store.checkAndClearExpiredItems();
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_task", async () => {
        await store.clear();
        const initClearCounter = clearCounter;
        await store.set(key, val, Date.now() + 500, onClear1);
        await store.startClearTask(100);
        await time.tickAsync(201);
        await time.runMicrotasks();
        assert(clearCounter === initClearCounter);
        // expired
        await time.tickAsync(450);
        await time.runMicrotasks();
        assert(clearCounter === initClearCounter + 1);
        // test if task stop
        await store.stopClearTask();
        assert(clearCounter === initClearCounter + 1);
        // clear by get
        await store.set(key, val, Date.now() + 500, onClear1);
        await time.tickAsync(501);
        await time.runMicrotasks();
        const res = await store.get(key);
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 2);
    });
    await t.step("delete_value", async () => {
        const initClearCounter = clearCounter;
        const nval = { rand: globalThis.crypto.randomUUID() };
        await store.set("k0", nval, Date.now() + 1000, onClear1);
        await store.set("k1", val, Date.now() + 1000, onClear1);
        await store.set("k2", val, Date.now() + 1000, onClear1);
        await store.set("k3", val, Date.now() + 1000, onClear1);
        await store.deleteAllValues(val);
        // k0 as is. k1,k2,k3 expired
        let res = await store.get("k0");
        assert(res !== undefined);
        assert(typeof (res as typeof nval)?.rand === "string");
        res = await store.get("k1");
        assert(res === undefined);
        res = await store.get("k2");
        assert(res === undefined);
        res = await store.get("k3");
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 3);
        await store.delete("k0");
    });
    await t.step("update_expire_at_get", async () => {
        const initClearCounter = clearCounter;
        const tmpKey = globalThis.crypto.randomUUID();
        await store.set(tmpKey, val, Date.now() + 1000, onClear2);
        await time.tickAsync(200);
        const res1 = await store.get(tmpKey);
        assert(res1 === val);
        assert((res1 as typeof val).rand === val.rand);
        // time passed
        await time.tickAsync(1000);
        // not expired
        const res2 = await store.get(tmpKey);
        assert(res2 === val);
        assert(clearCounter === initClearCounter + 1);
        // time passed
        await time.tickAsync(1001);
        // not expired
        const res3 = await store.get(tmpKey);
        assert(res3 === val);
        assert(clearCounter === initClearCounter + 2);
        // clean up
        await store.delete(tmpKey);
    });
    await t.step("update_expire_by_task", async () => {
        // expire all previous items
        await store.checkAndClearExpiredItems();
        // init
        const initClearCounter = clearCounter;
        const tmpKey = globalThis.crypto.randomUUID();
        await store.set(tmpKey, val, Date.now() + 1000, onClear2);
        await store.startClearTask(100);
        // time passed
        await time.tickAsync(1200);
        await time.runMicrotasks();
        assert(clearCounter === initClearCounter + 1);
        // time passed
        await time.tickAsync(1200);
        await time.runMicrotasks();
        assert(clearCounter === initClearCounter + 2);
        // test if task stop
        await store.stopClearTask();
        // time passed
        await time.tickAsync(1050);
        await time.runMicrotasks();
        assert(clearCounter === initClearCounter + 2); // not clear because task stopped
        // clear by get
        const res = await store.get(tmpKey);
        assert(res === val);
        assert(clearCounter === initClearCounter + 3);
        // clean up
        await store.delete(tmpKey);
    });
});