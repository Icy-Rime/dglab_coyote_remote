import { assert } from "@std/assert";
import { closeKv, getKv, initKv } from "./kv.ts";
import { createUser, getUser, updateUser } from "./user.ts";

Deno.test("data/user", async (t) => {
    const USER_ID = "12345678-1234-1234-1234-123456789012";
    const USER_NAME = "User XXX";
    await initKv(true);
    await t.step("createUser", async () => {
        assert(await createUser(USER_ID, USER_NAME));
        const kv = getKv();
        for await (const result of kv.list({ prefix: [] })) {
            assert(Object.prototype.hasOwnProperty.call(result.value, "uid"));
            assert(Object.prototype.hasOwnProperty.call(result.value, "name"));
            assert((result.value as { uid: string }).uid === USER_ID);
            assert((result.value as { name: string }).name === USER_NAME);
        }
    });
    await t.step("getUser", async () => {
        const user = await getUser(USER_ID);
        assert(user !== undefined);
        assert(user.uid === USER_ID);
        assert(user.name === USER_NAME);
    });
    await t.step("updateUser", async () => {
        const user = await getUser(USER_ID);
        assert(user !== undefined);
        user.name = "User234";
        assert(await updateUser(user));
        const user2 = await getUser(USER_ID);
        assert(user2 !== undefined);
        assert(user2.name === "User234");
    });
    closeKv();
});
