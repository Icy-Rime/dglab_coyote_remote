import { assert, unreachable } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { closeKv, initKv } from "../data/kv.ts";
import { createUser, getUser, updateUser } from "../data/user.ts";
import { _getClientStore, getEventClient, createEventClient } from "./event_client.ts";

Deno.test("controller/event_client", async (t) => {
    using time = new FakeTime();
    const USER_ID = "12345678-1234-1234-1234-123456789012";
    const USER_NAME = "User XXX";
    const DEVICE_ID = "Device 0";
    await initKv(true);
    assert(await createUser(USER_ID, USER_NAME));
    const user = await getUser(USER_ID);
    assert(user !== undefined);
    await t.step("createClientFaild", async () => {
        // user not have enough time
        const client = await createEventClient(USER_ID, DEVICE_ID);
        assert(client === undefined);
        // user not found
        try {
            await createEventClient("User YYY", DEVICE_ID);
            unreachable();
        } catch {
            // pass
        }
    });
    await t.step("createClient", async () => {
        user.subscriptionTimeMs = Date.now() + (300 * 1000);
        await updateUser(user);
        const client = await createEventClient(USER_ID, DEVICE_ID);
        assert(client !== undefined);
    });
    await t.step("getClient", async () => {
        const client = await getEventClient(USER_ID, DEVICE_ID);
        assert(client !== undefined);
        const client2 = await getEventClient(USER_ID + "xxxx", DEVICE_ID);
        assert(client2 === undefined);
        const client3 = await getEventClient(USER_ID, DEVICE_ID + "xxxx");
        assert(client3 === undefined);
    });
    await t.step("expireClient", async () => {
        const store = _getClientStore();
        // only one item
        for (const k of store.keys()) {
            const item = await store.get(k);
            assert(item?.getUserId() === USER_ID);
        }
        await time.tickAsync(500 * 1000);
        await time.runMicrotasks();
        // should be no item there
        for (const k of store.keys()) {
            unreachable()
        };
    });
    closeKv();
});
