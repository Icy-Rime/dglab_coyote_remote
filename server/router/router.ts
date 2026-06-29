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
    // if (req.method.toUpperCase() === "POST") {
    //     // const body = await req.json();
    //     if (path.startsWith("/api/ping/")) {
    //         const uid = path.substring("/api/ping/".length);
    //         if (pingListener(uid)) {
    //             return response(200);
    //         }
    //     } else if (path.startsWith("/api/emit/")) {
    //         const uidAndEvent = path.substring("/api/emit/".length);
    //         let uid = uidAndEvent;
    //         let event = undefined;
    //         const pos = uidAndEvent.indexOf("/");
    //         if (pos > 0) {
    //             uid = uidAndEvent.substring(0, pos);
    //             event = uidAndEvent.substring(pos + 1)
    //                 .replaceAll("\r\n", "_")
    //                 .replaceAll("\n", "_")
    //                 .replaceAll(" ", "_");
    //         }
    //         const data = await req.text();
    //         if (data.length > FIELD_CONTENT_MAX_LENGTH) {
    //             return response(400);
    //         }
    //         if (emitEvent(uid, event, data)) {
    //             return response(200);
    //         }
    //     }
    //     return response(404);
    // } else if (req.method.toUpperCase() === "GET") {
    //     // if (path.startsWith("/api/listen/")) {
    //     //     const uid = path.substring("/api/listen/".length);
    //     //     if (uid.length <= 0 || uid.indexOf("/") >= 0) {
    //     //         return response(400);
    //     //     }
    //     //     const resp = startListen(uid);
    //     //     if (resp) {
    //     //         return resp;
    //     //     }
    //     //     return response(409);
    //     // }
    //     if (path.startsWith("/api/me")) {
    //         // try to auth user
    //         const authSL = await authFromSecondLifeRequest(req);
    //         if (authSL) {
    //             return response(200, authSL);
    //         }
    //         return response(403);
    //     }

    //     return await serveDir(req, {
    //         urlRoot: "",
    //         fsRoot: STATIC_DIR,
    //         showDirListing: true,
    //     });
    // }
};
