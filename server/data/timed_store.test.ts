import { assert } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { TimedStore } from "./timed_store.ts";

Deno.test("data/timed_store", async (t) => {
    const store = new TimedStore<object>();
    using time = new FakeTime();
    let clearCounter = 0;
    const key = globalThis.crypto.randomUUID();
    const val = {
        rand: globalThis.crypto.randomUUID(),
    };
    const onClear = () => {
        clearCounter++;
    };
    await t.step("set_and_get", () => {
        store.set(key, val, Date.now() + 1000, onClear);
        const res = store.get(key);
        assert(res === val);
        assert((res as typeof val).rand === val.rand);
        assert(clearCounter === 0);
    });
    await t.step("set_again_delete", () => {
        const initClearCounter = clearCounter;
        store.set(key, val, Date.now() + 1000, onClear);
        const res = store.get(key);
        assert(res === val);
        assert((res as typeof val).rand === val.rand);
        assert(clearCounter === initClearCounter +1);
    });
    await t.step("expire_at_get", () => {
        const initClearCounter = clearCounter;
        time.tick(200);
        const res1 = store.get(key);
        assert(res1 === val);
        assert((res1 as typeof val).rand === val.rand);
        // time passed
        time.tick(1000);
        // expired
        const res2 = store.get(key);
        assert(res2 === undefined);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_delete", () => {
        const initClearCounter = clearCounter;
        store.set(key, val, Date.now() + 1000, onClear);
        store.delete(key);
        // expired
        const res = store.get(key);
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_manually_check", () => {
        const initClearCounter = clearCounter;
        store.set(key, val, Date.now() + 1000, onClear);
        time.tick(200);
        store.checkAndClearExpiredItems();
        assert(clearCounter === initClearCounter);
        // expired
        time.tick(1000);
        store.checkAndClearExpiredItems();
        assert(clearCounter === initClearCounter + 1);
    });
    await t.step("expire_by_task", () => {
        const initClearCounter = clearCounter;
        store.set(key, val, Date.now() + 500, onClear);
        store.startClearTask(100);
        time.tick(200);
        assert(clearCounter === initClearCounter);
        // expired
        time.tick(450);
        assert(clearCounter === initClearCounter + 1);
        // test if task stop
        store.stopClearTask();
        store.set(key, val, Date.now() + 500, onClear);
        time.tick(1000);
        assert(clearCounter === initClearCounter + 1);
        // clear by get
        const res = store.get(key);
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 2);
    });
    await t.step("delete_value", () => {
        const initClearCounter = clearCounter;
        const nval = { rand: globalThis.crypto.randomUUID() };
        store.set("k0", nval, Date.now() + 1000, onClear);
        store.set("k1", val, Date.now() + 1000, onClear);
        store.set("k2", val, Date.now() + 1000, onClear);
        store.set("k3", val, Date.now() + 1000, onClear);
        store.deleteAllValues(val);
        // k0 as is. k1,k2,k3 expired
        let res = store.get("k0");
        assert(res !== undefined);
        assert(typeof (res as typeof nval)?.rand === "string");
        res = store.get("k1");
        assert(res === undefined);
        res = store.get("k2");
        assert(res === undefined);
        res = store.get("k3");
        assert(res === undefined);
        assert(clearCounter === initClearCounter + 3);
    });
});