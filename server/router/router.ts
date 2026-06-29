import type { RouterHandler } from "./router.d.ts";
import { serveDir } from "@std/http";
import { response } from "./response.ts";
import { PathPattern } from "./pattern.ts";

const STATIC_DIR = "dist";

const pathHandler: Array<[PathPattern, RouterHandler]> = [];

export const registerRoute = (pattern: PathPattern, handler: RouterHandler) => {
    pathHandler.push([pattern, handler]);
};

const canServeStatic = (await Deno.permissions.request({ name: "read", path: STATIC_DIR })).state === "granted";

export const registerDefaultRoutes = async () => {
    const { resolve } = await import("@std/path");
    let dir = import.meta.dirname;
    if (dir === undefined) {
        return [] as string[];
    }
    dir = resolve(dir, "route");
    const foundModules: string[] = [];
    for await (const item of Deno.readDir(dir)) {
        if (item.name.toLowerCase().endsWith(".ts") && (!item.name.toLowerCase().endsWith(".test.ts"))) {
            // import and register
            const model = await import("./route/" + item.name);
            if (model.default) {
                try {
                    model.default();
                    foundModules.push(item.name);
                } catch {
                    // ignore error
                    console.warn(`Failed to load route/${item.name}`);
                }
            }
        }
    }
    return foundModules;
};

export const handler: Deno.ServeHandler = async (req, _) => {
    // if (req.method === "OPTIONS") {
    //     return new Response("200 OK", {
    //         headers: {
    //             "Access-Control-Allow-Origin": "*",
    //             "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    //             "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") ?? "*",
    //             "Access-Control-Max-Age": "86400",
    //         }
    //     });
    // }
    const url = new URL(req.url);
    const path = url.pathname;
    for (const [pat, hdl] of pathHandler) {
        const args = pat.match(path);
        if (args !== undefined) {
            const result = await hdl(req, args);
            if (result !== undefined) {
                return result;
            }
        }
    }
    if (canServeStatic && req.method.toUpperCase() === "GET") {
        return await serveDir(req, {
            urlRoot: "",
            fsRoot: STATIC_DIR,
            showDirListing: true,
        });
    }
    return response(404);
};
