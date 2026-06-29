import { assert } from "@std/assert";
import {
    cleanTestRequestEnv,
    initTestRequestEnv,
    makeNoAuthRequest,
    makeRequest,
    makeServeHandlerInfo,
    signSessionRequest,
    signSLRequest,
} from "./test_request.ts";

Deno.test("utils/test_request", async (t) => {
    await t.step("init", async () => {
        await initTestRequestEnv();
    });
    await t.step("makeServeHandlerInfo", async () => {
        const info = makeServeHandlerInfo();
        assert(typeof info.remoteAddr.transport === "string");
    });
    await t.step("signSLRequest", async () => {
        const req = await signSLRequest(new Request("http://127.0.0.1/auth/me", { "headers": { "custom": "222" } }));
        assert(req.headers.get("custom") === "222");
        assert(req.headers.has("x-secondlife-owner-key"));
        assert(req.headers.has("x-secondlife-owner-name"));
        assert(req.headers.has("x-secondlife-sign-rand"));
        assert(req.headers.has("x-secondlife-sign-time"));
        assert(req.headers.has("x-secondlife-sign"));
        assert(req.headers.has("user-agent"));
    });
    await t.step("signSessionRequest", async () => {
        const req = await signSessionRequest(
            new Request("http://127.0.0.1/auth/me", { "headers": { "custom": "222" } }),
        );
        assert(req.headers.get("custom") === "222");
        assert(req.headers.has("x-session"));
    });
    await t.step("makeRequest", async () => {
        const req1 = await makeRequest("/auth/me", "GET", true, false);
        assert(req1.url.indexOf("/auth/me") > 0);
        assert(req1.headers.has("x-session"));
        const req2 = await makeRequest("/auth/me", "GET", false, true);
        assert(req2.url.indexOf("/auth/me") > 0);
        assert(req2.headers.has("x-secondlife-owner-key"));
        assert(req2.headers.has("x-secondlife-owner-name"));
        assert(req2.headers.has("x-secondlife-sign-rand"));
        assert(req2.headers.has("x-secondlife-sign-time"));
        assert(req2.headers.has("x-secondlife-sign"));
        assert(req2.headers.has("user-agent"));
    });
    await t.step("makeNoAuthRequest", async () => {
        const req = await makeNoAuthRequest("/auth/me", {});
        assert(req.method.toUpperCase() === "POST");
        assert(!req.headers.has("x-secondlife-owner-key"));
        assert(!req.headers.has("x-secondlife-owner-name"));
        assert(!req.headers.has("x-secondlife-sign-rand"));
        assert(!req.headers.has("x-secondlife-sign-time"));
        assert(!req.headers.has("x-secondlife-sign"));
        assert(!req.headers.has("user-agent"));
        assert(!req.headers.has("x-session"));
        assert(req.headers.get("content-type") === "application/json");
    });
    await t.step("cleanTestRequestEnv", async () => {
        await cleanTestRequestEnv();
    });
});
