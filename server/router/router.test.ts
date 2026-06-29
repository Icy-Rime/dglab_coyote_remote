import type { RouterHandler } from "./router.d.ts";
import { assert } from "@std/assert";
import { PathPattern } from "./pattern.ts";
import { handler, registerDefaultRoutes, registerRoute } from "./router.ts";

Deno.test("router/router", async (t) => {
    // init test data
    const mockInfo = {
        remoteAddr: { hostname: "127.0.0.1", port: 48990, transport: "tcp" },
        completed: Promise.resolve(),
    } as Deno.ServeHandlerInfo;
    const varb = { value: 0 };
    const hd: RouterHandler = async (req, args) => {
        varb.value += 1;
        return new Response("", { status: 200 });
    };
    // test
    await t.step("registerRoute", async () => {
        registerRoute(new PathPattern("/app/defg"), hd);
    });
    await t.step("handleRequest", async () => {
        const orig = varb.value;
        const req = new Request(new URL("http://127.0.0.1/app/defg"), { method: "GET" });
        handler(req, mockInfo);
        assert(orig + 1 === varb.value);
        const req2 = new Request(new URL("http://127.0.0.1/app/cccc"), { method: "POST" });
        handler(req2, mockInfo);
        assert(orig + 1 === varb.value);
    });
    await t.step("registerDefaultRoutes", async () => {
        const loaded = await registerDefaultRoutes();
        assert(loaded.length > 0);
    });
});
