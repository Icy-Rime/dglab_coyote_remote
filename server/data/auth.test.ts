import { assert } from "@std/assert";
import { FakeTime } from "@std/testing/time";
const time = new FakeTime(); // fake time before anyother
import { initKv, closeKv } from "./kv.ts";
import { startCodeAuth, authByCode, expireAllAuth } from "./auth.ts";
import { createAuthToken, authByToken, refreshAuthToken } from "./auth.ts";
import { createSession, authBySession } from "./auth.ts";

Deno.test("data/auth", async (t) => {
    await initKv(true);
    const avatarKey = globalThis.crypto.randomUUID();
    await t.step("authByCode", () => {
        let code = startCodeAuth(avatarKey);
        assert(typeof code === "string");
        assert(code.length === 16);
        const av = authByCode(code);
        assert(av === avatarKey);
        // check code not exist
        assert(authByCode(code) === undefined);
        // test expire
        code = startCodeAuth(avatarKey);
        time.tick(6 * 60_000);
        assert(authByCode(code) === undefined);
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
    await t.step("authBySession", () => {
        const session = createSession(avatarKey);
        assert(typeof session === "string");
        assert(session.length > 0);
        assert(authBySession(session) === avatarKey);
        // test refresh
        time.tick(50 * 60_000);
        assert(authBySession(session) === avatarKey);
        time.tick(50 * 60_000);
        assert(authBySession(session) === avatarKey);
        time.tick(50 * 60_000);
        assert(authBySession(session) === avatarKey);
        // test expire
        time.tick(70 * 60_000);
        assert(authBySession(session) === undefined);
    });
    await t.step("expireAllAuth", async () => {
        const code = startCodeAuth(avatarKey);
        const session = createSession(avatarKey);
        const authInfo = await createAuthToken(avatarKey);
        // test expire
        await expireAllAuth(avatarKey);
        assert(authByCode(code) === undefined);
        assert(authBySession(session) === undefined);
        assert(await authByToken(authInfo.authId, authInfo.token) === undefined);
    });
    closeKv();
});
