import { assert } from "@std/assert";
import { getCookies, setCookie } from "./cookie.ts";

Deno.test("utils/cookie", async (t) => {
    await t.step("setCookie", async () => {
        const resp = new Response("", { status: 200 });
        setCookie(resp, "x-session", "Hello World", 0, true);
        const cookieText = resp.headers.get("Set-Cookie");
        assert(cookieText);
        assert(cookieText.toLowerCase().indexOf("httponly") > 0);
        assert(cookieText.toLowerCase().indexOf("max-age") > 0);
    });
    await t.step("getCookies", async () => {
        const req = new Request("http://127.0.0.1", {
            headers: {
                "Cookie": "name=value; name2=value2; name3=value3",
            },
        });
        const cookies = getCookies(req);
        assert(cookies.name === "value");
        assert(cookies.name2 === "value2");
        assert(cookies.name3 === "value3");
    });
});
