import { assert } from "@std/assert";
import { handler } from "../router.ts";
import registerRoute from "./auth.ts";
import {
    cleanTestRequestEnv,
    initTestRequestEnv,
    makeRequest,
    makeServeHandlerInfo,
} from "../../utils/test_request.ts";
const TEST_USER_KEY = "12345678-e1a3-4422-ae62-78dd110c4b85";

Deno.test("router/route/auth", async (t) => {
    let avatarKey = "";
    let authCode = "";
    let authId = "";
    let token = "";
    let session = "";
    const srv = makeServeHandlerInfo();
    await initTestRequestEnv();
    await t.step("registerRoute", async () => {
        registerRoute();
    });
    await t.step("handlerMe1", async () => {
        const req = new Request("http://127.0.0.1/api/auth/me", { method: "GET" });
        const resp = await handler(req, srv);
        const data = (await resp.json() as { data: { avatarKey: string; authenticated: string } }).data;
        assert(!data.authenticated);
        assert(!data.avatarKey);
    });
    await t.step("handlerMe2", async () => {
        const req = await makeRequest("/api/auth/me", "GET", false, false);
        const resp = await handler(req, srv);
        const data = (await resp.json() as { data: { avatarKey: string; authenticated: string } }).data;
        assert(data.authenticated);
        assert(data.avatarKey);
    });
    await t.step("handlerMe3", async () => {
        const req = await makeRequest("/api/auth/me", "GET", true, true);
        const resp = await handler(req, srv);
        const data = (await resp.json() as { data: { avatarKey: string; authenticated: string } }).data;
        assert(data.authenticated);
        assert(data.avatarKey);
    });
    await t.step("handlerNewCode1", async () => {
        const req = await makeRequest("/api/auth/new_code", {}, false, false);
        const resp = await handler(req, srv);
        assert(resp.status === 403);
        const data = await resp.json() as { code: number; data: unknown };
        assert(data.code == 403);
    });
    await t.step("handlerNewCode2", async () => {
        const req = await makeRequest("/api/auth/new_code", {}, false, true);
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { avatarKey: string; code: string } };
        assert(data.code == 200);
        assert(typeof data.data.avatarKey === "string");
        assert(typeof data.data.code === "string");
        avatarKey = data.data.avatarKey;
        authCode = data.data.code;
    });
    await t.step("handlerAuthByCode1", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/auth_by_code",
            {
                method: "POST",
                body: JSON.stringify({
                    authCode: "31423232",
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403);
        const data = await resp.json() as { code: number; data: unknown };
        assert(data.code == 403);
    });
    await t.step("handlerAuthByCode2", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/auth_by_code",
            {
                method: "POST",
                body: JSON.stringify({
                    authCode: authCode,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { avatarKey: string; authId: string; token: string } };
        assert(data.code == 200);
        assert(data.data.avatarKey === avatarKey);
        assert(typeof data.data.authId === "string");
        assert(typeof data.data.token === "string");
        authId = data.data.authId;
        token = data.data.token;
    });
    await t.step("handlerNewSession1", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/new_session",
            {
                method: "POST",
                body: JSON.stringify({
                    authId: "abc",
                    token: "def",
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403);
        const data = await resp.json() as { code: number; data: unknown };
        assert(data.code == 403);
    });
    await t.step("handlerNewSession2", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/new_session",
            {
                method: "POST",
                body: JSON.stringify({
                    authId: authId,
                    token: token,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { avatarKey: string; session: string } };
        assert(data.code == 200);
        assert(data.data.avatarKey === avatarKey);
        assert(typeof data.data.session === "string");
        session = data.data.session;
    });
    await t.step("handlerMe4", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/me",
            {
                method: "GET",
                headers: {
                    "X-Session": session,
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { avatarKey: string; authenticated: string } };
        assert(data.code == 200);
        assert(typeof data.data.authenticated);
        assert(data.data.avatarKey === avatarKey);
    });
    await t.step("handlerMe4", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/me",
            {
                method: "GET",
                headers: {
                    "X-Session": session,
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { avatarKey: string; authenticated: string } };
        assert(data.code == 200);
        assert(typeof data.data.authenticated);
        assert(data.data.avatarKey === avatarKey);
    });
    await t.step("handleRefreshAuthToken1", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/refresh_auth_token",
            {
                method: "POST",
                body: JSON.stringify({
                    authId: authId,
                    token: token + "dddd",
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403);
        const data = await resp.json() as { code: number; data: unknown };
        assert(data.code == 403);
    });
    await t.step("handleRefreshAuthToken2", async () => {
        const req = new Request(
            "http://127.0.0.1:8080/api/auth/refresh_auth_token",
            {
                method: "POST",
                body: JSON.stringify({
                    authId: authId,
                    token: token,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const data = await resp.json() as { code: number; data: { authId: string; token: string } };
        assert(data.code == 200);
        assert(data.data.token);
        assert(authId === data.data.authId);
        assert(token !== data.data.token);
        token = data.data.token;
    });
    await cleanTestRequestEnv();
});
