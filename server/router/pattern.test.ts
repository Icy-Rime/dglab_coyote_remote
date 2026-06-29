import { assert } from "@std/assert";
import { PathPattern } from "./pattern.ts";

Deno.test("router/pattern", async (t) => {
    await t.step("testNormorPattern", async () => {
        assert(new PathPattern("/").match("") !== undefined);
        assert(new PathPattern("/").match("/") !== undefined);
        assert(new PathPattern("/app").match("/app") !== undefined);
        assert(new PathPattern("/app/").match("/app") !== undefined);
        assert(new PathPattern("/app/").match("/app/") !== undefined);
        assert(new PathPattern("/app/bbb/ccc").match("/app/bbb/ccc/") !== undefined);
    });
    await t.step("testMatchPattern1", async () => {
        assert(new PathPattern("/app/:*param1/ccc").match("/app/bbb/ccc/") !== undefined);
        assert(new PathPattern("/app/:*param1/ccc").match("/app/bbb/ccc/")?.["param1"] === "bbb");
        assert(new PathPattern("/app/:*param1/").match("/app/bbbccc") !== undefined);
        assert(new PathPattern("/app/:*param1").match("/app/bbbccc/")?.["param1"] === "bbbccc");
        assert(new PathPattern("/app/:*param1/:*param2/app").match("/app/bbb/ccc/app")?.["param1"] === "bbb");
        assert(new PathPattern("/app/:*param1/:*param2/app").match("/app/bbb/ccc/app")?.["param2"] === "ccc");
        assert(new PathPattern("/app/:*param1/:*param2/app").match("/app/bbb/ccc") === undefined);
        assert(new PathPattern("/app/:*param1/:*param2/app").match("/app/bbb/ccc/apppp") === undefined);
    });
    await t.step("testMatchPattern2", async () => {
        assert(new PathPattern("/app/:>param1:start-/").match("/app/start-bbbccc") !== undefined);
        assert(new PathPattern("/app/:>param1:start-").match("/app/start-bbbccc/")?.["param1"] === "bbbccc");
        assert(new PathPattern("/app/:>param1:start-/ddd").match("/app/start-bbbccc/ddd") !== undefined);
        assert(new PathPattern("/app/:>param1:start-/ddd").match("/app/start-bbbccc/ddd/")?.["param1"] === "bbbccc");
        assert(new PathPattern("/app/:>param1:start-").match("/app/start-bbbccc/ddd") === undefined);
        assert(new PathPattern("/app/:>param1:st-/:*param2").match("/app/st-bbbccc/ddd")?.["param1"] === "bbbccc");
        assert(new PathPattern("/app/:>param1:st-/:*param2").match("/app/st-bbbccc/ddd")?.["param2"] === "ddd");
    });
    await t.step("testMatchPattern3", async () => {
        assert(new PathPattern("/app/:<param1:-end/").match("/app/bbbccc-end") !== undefined);
        assert(new PathPattern("/app/:<param1:-end").match("/app/bbbccc-end/")?.["param1"] === "bbbccc");
    });
    await t.step("testMatchPattern4", async () => {
        assert(new PathPattern("/app/:~endp/").match("/app/") === undefined);
        assert(new PathPattern("/app/:~endp/").match("/app/bbbccc-end") !== undefined);
        assert(new PathPattern("/app/:~endp").match("/app/bbbccc-end/")?.["endp"] === "bbbccc-end");
        assert(new PathPattern("/app/:~endp").match("/app/bbb/ccc/ddd/")?.["endp"] === "bbb/ccc/ddd");
        assert(new PathPattern("/app/:~endp/aaa").match("/app/bbb/aaa") === undefined);
    });
    await t.step("testMatchSubPattern1", async () => {
        const subp = new PathPattern("user/:*userId");
        const pattern = new PathPattern(
            "/app",
            true,
            subp,
            new PathPattern("device/:*deviceId"),
        );
        assert(pattern.match("/app") === undefined);
        assert(pattern.match("/app/item") === undefined);
        assert(pattern.match("/app/item/app") === undefined);
        assert(pattern.match("/app/user") === undefined);
        assert(pattern.match("/app/user/u4422") !== undefined);
        assert(pattern.match("/app/user/u4422")?.["userId"] === "u4422");
        assert(pattern.matchSubPattern("/app/user/u4422") === subp); // cache
        assert(pattern.match("/app/device/dev1")?.["deviceId"] === "dev1");
        assert(pattern.matchSubPattern("/app/user/u4422") === subp);
    });
    await t.step("testMatchSubPattern2", async () => {
        const subp = new PathPattern("user/:*userId");
        const pattern = new PathPattern(
            "/app",
            true,
            new PathPattern("device/", true, subp),
        );
        assert(pattern.match("/app") === undefined);
        assert(pattern.match("/app/item") === undefined);
        assert(pattern.match("/app/item/app") === undefined);
        assert(pattern.match("/app/device/user") === undefined);
        assert(pattern.match("/app/device/user/u4422") !== undefined);
        assert(pattern.match("/app/device/user/u4422")?.["userId"] === "u4422");
    });
});
