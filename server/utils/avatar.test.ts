import { assert, assertEquals } from "@std/assert";
import { hmac512Base64Sign } from "./hmac.ts";
import { authFromSecondLifeRequest } from "./avatar.ts";

const SL_REQUEST_SIGN_KEY = "123456";
const ALLOW_SL_USER_AGENT_PART = "Second-Life-LSL";

Deno.test("avatarTest", async (t) => {
    // init env
    Deno.env.set("SL_REQUEST_SIGN_KEY", SL_REQUEST_SIGN_KEY);
    Deno.env.set("ALLOW_SL_USER_AGENT_PART", ALLOW_SL_USER_AGENT_PART);
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
        // build request
        const req = new Request(url, {
            headers: {
                "x-secondlife-owner-key": avatarKey,
                "x-secondlife-owner-name": avatarName,
                "x-secondlife-sign-rand": signRand,
                "x-secondlife-sign-time": signTime,
                "x-secondlife-sign": sign,
                "user-agent":
                    "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
                    ALLOW_SL_USER_AGENT_PART + "/1.0",
            },
        });
        const avatar = await authFromSecondLifeRequest(req);
        assert(avatar); // not undefined.
        assertEquals(avatar.avatarKey, avatarKey);
        assertEquals(avatar.avatarName, avatarName);
    });
});
