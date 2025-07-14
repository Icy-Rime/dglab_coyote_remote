import { emitEvent, pingListener, startKeepliveTask, startListen } from "./listeners.ts";
import { serveDir } from "@std/http";

const FIELD_CONTENT_MAX_LENGTH = 16384;
const STATIC_DIR = "dist";

const response = (code = 200, data = "") => {
    if (typeof data !== "string") {
        switch (code) {
            case 200:
                data = "Ok";
                break;
            case 400:
                data = "Bad Request";
                break;
            case 404:
                data = "Not Found";
                break;
            case 409:
                data = "Conflict";
                break;
            default:
                data = "";
                break;
        }
    }
    return new Response(
        JSON.stringify({ code, data }),
        {
            headers: {
                // "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/plain",
            },
        },
    );
};

const handler: Deno.ServeHandler = async (req, _) => {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method.toUpperCase() === "POST") {
        // const body = await req.json();
        if (path.startsWith("/api/ping/")) {
            const uid = path.substring("/api/ping/".length);
            if (pingListener(uid)) {
                return response(200);
            }
        } else if (path.startsWith("/api/emit/")) {
            const uidAndEvent = path.substring("/api/emit/".length);
            let uid = uidAndEvent;
            let event = undefined;
            const pos = uidAndEvent.indexOf("/");
            if (pos > 0) {
                uid = uidAndEvent.substring(0, pos);
                event = uidAndEvent.substring(pos + 1).replaceAll("\r\n", " ").replaceAll("\n", " ");
            }
            const data = await req.text();
            if (data.length > FIELD_CONTENT_MAX_LENGTH) {
                return response(400);
            }
            if (emitEvent(uid, event, data)) {
                return response(200);
            }
        }
        return response(404);
    } else if (req.method.toUpperCase() === "GET") {
        if (path.startsWith("/api/listen/")) {
            const uid = path.substring("/api/listen/".length);
            if (uid.length <= 0 || uid.indexOf("/") >= 0) {
                return response(400);
            }
            const resp = startListen(uid);
            if (resp) {
                return resp;
            }
            return response(409);
        }

        return await serveDir(req, {
            urlRoot: "",
            fsRoot: STATIC_DIR,
            showDirListing: true,
        });
    }
    // else if (req.method === "OPTIONS") {
    //     return new Response("200 OK", {
    //         headers: {
    //             "Access-Control-Allow-Origin": "*",
    //             "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    //             "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") ?? "*",
    //             "Access-Control-Max-Age": "86400",
    //         }
    //     });
    // }
    return response(404);
};

// start
startKeepliveTask();
export default {
    fetch: handler,
} satisfies Deno.ServeDefaultExport;
