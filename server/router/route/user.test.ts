import { assert } from "@std/assert";
import { handler, registerDefaultRoutes } from "../router.ts";
import {
    cleanTestRequestEnv,
    initTestRequestEnv,
    makeRequest,
    makeServeHandlerInfo,
    NORMAL_USER_UUID,
    USER_NAME,
} from "../../utils/test_request.ts";
import { createUser, getUser } from "../../data/user.ts";
import type { APIResponse } from "../response.ts";
import type { RDataTryVip } from "./user.ts";

Deno.test("router/route/user", async (t) => {
    await registerDefaultRoutes();
    const srv = makeServeHandlerInfo();
    await initTestRequestEnv();
    // real test begin
    const now = Date.now();
    await t.step("initTest", async () => {
        await createUser(NORMAL_USER_UUID, USER_NAME);
        const user = await getUser(NORMAL_USER_UUID);
        assert(user);
        assert(user.subscriptionTimeMs < now);
    });
    await t.step("handleTryVip1", async () => {
        const req = await makeRequest("/api/user/try_vip", {}, false, false);
        const resp = await handler(req, srv);
        assert(resp.status === 403); // not from sl
    });
    await t.step("handleTryVip2", async () => {
        const req = await makeRequest("/api/user/try_vip", {}, false, true);
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const user = await getUser(NORMAL_USER_UUID);
        assert(user);
        assert(user.subscriptionTimeMs > now);
        const result = await resp.json() as APIResponse<RDataTryVip>;
        assert(result.code === 200);
        assert(result.data.succeed);
    });
    await t.step("handleTryVip3", async () => {
        const req = await makeRequest("/api/user/try_vip", {}, false, true);
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const result = await resp.json() as APIResponse<RDataTryVip>;
        assert(result.code === 200);
        assert(!result.data.succeed); // not been able to extend time, time too close.
    });
    await cleanTestRequestEnv();
});
