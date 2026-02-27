import { assert } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { closeKv, initKv } from "./kv.ts";
import { authByCode, expireAllAuth, startCodeAuth } from "./auth.ts";
import { authByToken, createAuthToken, refreshAuthToken } from "./auth.ts";
import { authBySession, createSession } from "./auth.ts";
import { closeAllManagedTimedStore } from "./timed_store.ts";

Deno.test("data/auth", async (t) => {
    using time = new FakeTime(); // fake time
    await initKv(true);
    const avatarKey = globalThis.crypto.randomUUID();
    await t.step("authByCode", async () => {
        let code = await startCodeAuth(avatarKey);
        assert(typeof code === "string");
        assert(code.length === 16);
        const av = await authByCode(code);
        assert(av === avatarKey);
        // check code not exist
        assert(await authByCode(code) === undefined);
        // test expire
        code = await startCodeAuth(avatarKey);
        time.tick(6 * 60_000);
        assert(await authByCode(code) === undefined);
    });
    await t.step("authByToken", async () => {
        const authInfo = await createAuthToken(avatarKey);
        assert(typeof authInfo.authId === "string");
        assert(typeof authInfo.token === "string");
        assert(authInfo.authId.length > 0);
        assert(authInfo.token.length > 0);
        assert(await authByToken(authInfo.authId, authInfo.token) === avatarKey);
        // check exist
        assert(await authByToken(authInfo.authId, authInfo.token) === avatarKey);
        // test refresh
        time.tick(5 * 24 * 3600_000);
        assert(await refreshAuthToken(avatarKey, authInfo.authId));
        time.tick(5 * 24 * 3600_000);
        assert(await authByToken(authInfo.authId, authInfo.token) === avatarKey);
        // test expire
        time.tick(3 * 24 * 3600_000);
        assert(await authByToken(authInfo.authId, authInfo.token) === undefined);
    });
    await t.step("authBySession", async () => {
        const session = await createSession(avatarKey);
        assert(typeof session === "string");
        assert(session.length > 0);
        assert(await authBySession(session) === avatarKey);
        // test refresh
        time.tick(50 * 60_000);
        assert(await authBySession(session) === avatarKey);
        time.tick(50 * 60_000);
        assert(await authBySession(session) === avatarKey);
        time.tick(50 * 60_000);
        assert(await authBySession(session) === avatarKey);
        // test expire
        time.tick(70 * 60_000);
        assert(await authBySession(session) === undefined);
    });
    await t.step("expireAllAuth", async () => {
        const code = await startCodeAuth(avatarKey);
        const session = await createSession(avatarKey);
        const authInfo = await createAuthToken(avatarKey);
        // test expire
        await expireAllAuth(avatarKey);
        assert(await authByCode(code) === undefined);
        assert(await authBySession(session) === undefined);
        assert(await authByToken(authInfo.authId, authInfo.token) === undefined);
    });
    await closeAllManagedTimedStore();
    closeKv();
});
