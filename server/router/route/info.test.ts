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
import type { RDataAddVip, RDataGetVip, RDataTryVip } from "./user.ts";

Deno.test("router/route/info", async (t) => {
    const INFO_ID = "info 0000 - test / appp";
    const INFO_CONTENT1 = "Info XXX";
    const INFO_CONTENT2 = "Info XXX2222";
    await registerDefaultRoutes();
    const srv = makeServeHandlerInfo();
    await initTestRequestEnv();
    // real test begin
    await t.step("addInfo1", async () => {
        const req = await makeRequest(
            "/api/info/add",
            {
                infoId: INFO_ID,
                infoContent: INFO_CONTENT1,
            },
            false,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403); // not from admin
    });
    await t.step("addInfo2", async () => {
        const req = await makeRequest(
            "/api/info/add",
            {
                infoId: INFO_ID,
                infoContent: INFO_CONTENT1,
            },
            true,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200); // success
    });
    await t.step("updateInfoContent", async () => {
        const req = await makeRequest(
            "/api/info/update",
            {
                infoId: INFO_ID,
                infoContent: INFO_CONTENT2,
            },
            false,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403); // not from admin
    });
    await t.step("updateInfoContent2", async () => {
        const req = await makeRequest(
            "/api/info/update",
            {
                infoId: INFO_ID,
                infoContent: INFO_CONTENT2,
            },
            true,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200); // success
    });
    await t.step("addMoreInfo", async () => {
        for (const i of ["2", "3", "4", "5"]) {
            const resp = await handler(
                await makeRequest(
                    "/api/info/add",
                    {
                        infoId: "k" + i,
                        infoContent: INFO_CONTENT1,
                    },
                    true,
                    false,
                ),
                srv,
            );
            assert(resp.status === 200); // success
        }
    });
    await t.step("getInfoList", async () => {
        const req = await makeRequest("/api/info/list", "GET", false, false);
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const result = await resp.json() as APIResponse<string[]>;
        assert(result.code === 200);
        assert(result.data.length == 5);
        assert(result.data.includes(INFO_ID));
        assert(result.data.includes("k2"));
        assert(result.data.includes("k3"));
        assert(result.data.includes("k4"));
        assert(result.data.includes("k5"));
    });
    await t.step("getInfoContent", async () => {
        console.log("/api/info/content/" + encodeURIComponent(INFO_ID));
        const req = await makeRequest(
            "/api/info/content/" + encodeURIComponent(INFO_ID),
            "GET",
            false,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const result = await resp.json() as APIResponse<string>;
        assert(result.code === 200);
        assert(result.data === INFO_CONTENT2);
    });
    await t.step("getInfoContent2", async () => {
        const req = await makeRequest("/api/info/list", "GET", false, false);
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        const result = await resp.json() as APIResponse<string[]>;
        assert(result.code === 200);
        for (const iid of result.data) {
            const req = await makeRequest(
                "/api/info/content/" + encodeURIComponent(iid),
                "GET",
                false,
                false,
            );
            const resp = await handler(req, srv);
            assert(resp.status === 200);
            const result = await resp.json() as APIResponse<string>;
            assert(result.code === 200);
            assert(result.data.length > 0);
        }
    });
    await t.step("deleteInfo1", async () => {
        const req = await makeRequest(
            "/api/info/delete",
            {
                infoId: INFO_ID,
            },
            false,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 403);
    });
    await t.step("deleteInfo2", async () => {
        const req = await makeRequest(
            "/api/info/delete",
            {
                infoId: "Whatever ID",
            },
            true,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 404);
    });
    await t.step("deleteInfo3", async () => {
        const req = await makeRequest(
            "/api/info/delete",
            {
                infoId: INFO_ID,
            },
            true,
            false,
        );
        const resp = await handler(req, srv);
        assert(resp.status === 200);
        // check if the info is deleted
        const req2 = await makeRequest(
            "/api/info/content/" + encodeURIComponent(INFO_ID),
            "GET",
            false,
            false,
        );
        const resp2 = await handler(req2, srv);
        assert(resp2.status === 404);
        const req3 = await makeRequest(
            "/api/info/list",
            "GET",
            false,
            false,
        );
        const result3 = await (await handler(req3, srv)).json() as APIResponse<string[]>;
        assert(result3.code === 200);
        assert(!result3.data.includes(INFO_ID));
    });
    await cleanTestRequestEnv();
});
