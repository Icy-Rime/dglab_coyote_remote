import { assert } from "@std/assert";
import { response } from "./response.ts";

Deno.test("router/response", async (t) => {
    await t.step("createResponse", async () => {
        let resp = response(404);
        assert(resp.status === 404);
        let obj = await resp.json();
        assert(obj.code === 404);
        assert(obj.data !== undefined);
        resp = response(200, { var: "hello" });
        assert(resp.status === 200);
        obj = await resp.json();
        assert(obj.code === 200);
        assert(obj.data.var === "hello");
    });
});
