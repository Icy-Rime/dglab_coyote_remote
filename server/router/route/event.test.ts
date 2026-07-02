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
import { createUser, getUser, updateUser } from "../../data/user.ts";

Deno.test("router/route/event", async (t) => {
    await registerDefaultRoutes();
    const srv = makeServeHandlerInfo();
    await initTestRequestEnv();
    // real test begin
    await t.step("initTest", async () => {
        await createUser(NORMAL_USER_UUID, USER_NAME);
        const user = await getUser(NORMAL_USER_UUID);
        assert(user);
        user.subscriptionTimeMs = Date.now() + 5_000; // 5 secs before expire
        await updateUser(user);
    });
    await t.step("handleSubscribeDevice1", async () => {
        const req = await makeRequest("/api/event/subscribe/test_device", "GET");
        const resp = await handler(req, srv);
        assert(resp.status === 403); // 10 secs before expire, reject.
    });
    await t.step("handleEmit1", async () => {
        const req = await makeRequest("/api/event/emit/test_device", {});
        const resp = await handler(req, srv);
        assert(resp.status === 404); // no device, 404
    });
    await t.step("handleSubscribeDevice2", async () => {
        const user = await getUser(NORMAL_USER_UUID);
        assert(user);
        user.subscriptionTimeMs = Date.now() + 30_000;
        await updateUser(user);
        const req = await makeRequest("/api/event/subscribe/test_device", "GET");
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        assert(resp.headers.get("Content-Type") === "text/event-stream");
    });
    await t.step("handleEmit1", async () => {
        const req = await makeRequest("/api/event/emit/test_device", {});
        const resp = await handler(req, srv);
        assert(resp.status === 200);
    });
    await t.step("handleEmit1", async () => {
        const req = await makeRequest("/api/event/emit/test_device/test_event", {});
        const resp = await handler(req, srv);
        assert(resp.status === 200);
    });
    await cleanTestRequestEnv();
});
