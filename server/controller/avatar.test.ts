import { assert, assertEquals } from "@std/assert";
import { hmac512Base64Sign } from "../utils/hmac.ts";
import { authFromRequest, authFromSecondLifeRequest, authFromSession } from "../controller/avatar.ts";
import { closeKv, initKv } from "../data/kv.ts";
import { createSession } from "../data/auth.ts";

const SL_REQUEST_SIGN_KEY = "123456";
const ALLOW_SL_USER_AGENT_PART = "Second-Life-LSL";
const SL_ADMIN_LIST = "12345678-1234-1234-1234-123456789012,f09f9a28-e1a3-4422-ae62-78dd110c4b86";

Deno.test("avatarTest", async (t) => {
    // init env
    Deno.env.set("SL_REQUEST_SIGN_KEY", SL_REQUEST_SIGN_KEY);
    Deno.env.set("ALLOW_SL_USER_AGENT_PART", ALLOW_SL_USER_AGENT_PART);
    Deno.env.set("SL_ADMIN_LIST", SL_ADMIN_LIST);
    await initKv(true);
    await t.step("authFromSecondLifeRequestTest", async () => {
        // build a request
        const avatarKey = "f09f9a28-e1a3-4422-ae62-78dd110c4b86";
        const avatarName = "Test User";
        const signRand = "randomstring" + Math.random().toFixed(4);
        const url = new URL("https://127.0.0.1/auth?abc=321");
        const signTime = new Date().toISOString();
        const sign = await hmac512Base64Sign(
            avatarKey + SL_REQUEST_SIGN_KEY,
            avatarKey + url.pathname + url.search + signTime + signRand,
        );
        const req = new Request(url, {
            headers: {
                "x-secondlife-owner-key": avatarKey,
                "x-secondlife-owner-name": avatarName,
                "x-secondlife-sign-rand": signRand,
                "x-secondlife-sign-time": signTime,
                "x-secondlife-sign": sign,
                "user-agent": "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
                    ALLOW_SL_USER_AGENT_PART + "/1.0",
            },
        });
        // request
        const avatar = await authFromSecondLifeRequest(req);
        assert(avatar); // not undefined.
        assertEquals(avatar.authed, true);
        assertEquals(avatar.avatarKey, avatarKey);
        assertEquals(avatar.avatarName, avatarName);
        assertEquals(avatar.fromSL, true);
        assertEquals(avatar.isAdmin, true);
    });
    await t.step("authFromSessionTest", async () => {
        const avatarKey = "f09f9a28-e1a3-4422-ae62-78dd110c4b00";
        const session = await createSession(avatarKey);
        // build request
        const req = new Request("https://127.0.0.1/auth?abc=321", {
            headers: {
                "x-session": session,
            },
        });
        // request
        const avatar = await authFromSession(req);
        assert(avatar); // not undefined.
        assertEquals(avatar.authed, true);
        assertEquals(avatar.avatarKey, avatarKey);
        assertEquals(avatar.fromSL, false);
        assertEquals(avatar.isAdmin, false);
    });
    await t.step("authFromSessionFailedTest", async () => {
        // build request
        const req = new Request("https://127.0.0.1/auth?abc=321", {
            headers: {
                "x-session": "what-ever-is-this-session",
            },
        });
        // request
        const avatar = await authFromSession(req);
        assert(avatar === undefined);
    });
    await t.step("authFromRequest1Test", async () => {
        // build a request
        const avatarKey = "f09f9a28-e1a3-4422-ae62-78dd110c4b86";
        const avatarKey2 = "f09f9a28-e1a3-4422-ae62-78dd110c4b00";
        const session = await createSession(avatarKey2);
        const avatarName = "Test User";
        const signRand = "randomstring" + Math.random().toFixed(4);
        const url = new URL("https://127.0.0.1/auth?abc=321");
        const signTime = new Date().toISOString();
        const sign = await hmac512Base64Sign(
            avatarKey + SL_REQUEST_SIGN_KEY,
            avatarKey + url.pathname + url.search + signTime + signRand,
        );
        const req = new Request(url, {
            headers: {
                "x-secondlife-owner-key": avatarKey,
                "x-secondlife-owner-name": avatarName,
                "x-secondlife-sign-rand": signRand,
                "x-secondlife-sign-time": signTime,
                "x-secondlife-sign": sign,
                "user-agent": "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
                    ALLOW_SL_USER_AGENT_PART + "/1.0",
                "x-session": session,
            },
        });
        // request
        const avatar = await authFromRequest(req);
        // first try for SL request
        assert(avatar); // not undefined.
        assertEquals(avatar.authed, true);
        assertEquals(avatar.avatarKey, avatarKey);
        assertEquals(avatar.avatarName, avatarName);
        assertEquals(avatar.fromSL, true);
        assertEquals(avatar.isAdmin, true);
    });
    await t.step("authFromRequest2Test", async () => {
        // build a request
        const avatarKey = "f09f9a28-e1a3-4422-ae62-78dd110c4b86";
        const avatarKey2 = "f09f9a28-e1a3-4422-ae62-78dd110c4b00";
        const session = await createSession(avatarKey2);
        const avatarName = "Test User";
        const signRand = "randomstring" + Math.random().toFixed(4);
        const url = new URL("https://127.0.0.1/auth?abc=321");
        const signTime = new Date().toISOString();
        const sign = await hmac512Base64Sign(
            avatarKey + SL_REQUEST_SIGN_KEY,
            avatarKey + url.pathname + url.search + signTime + signRand + "badsign",
        );
        const req = new Request(url, {
            headers: {
                "x-secondlife-owner-key": avatarKey,
                "x-secondlife-owner-name": avatarName,
                "x-secondlife-sign-rand": signRand,
                "x-secondlife-sign-time": signTime,
                "x-secondlife-sign": sign,
                "user-agent": "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
                    ALLOW_SL_USER_AGENT_PART + "/1.0",
                "x-session": session,
            },
        });
        // request
        const avatar = await authFromRequest(req);
        // then try for session
        assert(avatar); // not undefined.
        assertEquals(avatar.authed, true);
        assertEquals(avatar.avatarKey, avatarKey2);
        assertEquals(avatar.avatarName, undefined);
        assertEquals(avatar.fromSL, false);
        assertEquals(avatar.isAdmin, false);
    });
    await t.step("authFromRequest3Test", async () => {
        // build a request
        const avatarKey = "f09f9a28-e1a3-4422-ae62-78dd110c4b86";
        const avatarName = "Test User";
        const signRand = "randomstring" + Math.random().toFixed(4);
        const url = new URL("https://127.0.0.1/auth?abc=321");
        const signTime = new Date().toISOString();
        const sign = await hmac512Base64Sign(
            avatarKey + SL_REQUEST_SIGN_KEY,
            avatarKey + url.pathname + url.search + signTime + signRand + "badsign",
        );
        const req = new Request(url, {
            headers: {
                "x-secondlife-owner-key": avatarKey,
                "x-secondlife-owner-name": avatarName,
                "x-secondlife-sign-rand": signRand,
                "x-secondlife-sign-time": signTime,
                "x-secondlife-sign": sign,
                "user-agent": "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
                    ALLOW_SL_USER_AGENT_PART + "/1.0",
                "x-session": "bad-sessions",
            },
        });
        // request
        const avatar = await authFromRequest(req);
        // then try for session
        assert(avatar); // not undefined.
        assertEquals(avatar.authed, false);
        assertEquals(avatar.avatarKey, ""); // not undefined.
    });
    closeKv();
});
