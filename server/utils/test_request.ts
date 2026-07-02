import { _reload, env } from "./env.ts";
import { hmac512Base64Sign } from "./hmac.ts";
import { closeKv, initKv } from "../data/kv.ts";
import { createSession } from "../data/auth.ts";
import { closeAllManagedExpirableStore } from "../data/expirable_store.ts";
export const USER_NAME = "Test User";
export const NORMAL_USER_UUID = "12345678-e1a3-4422-ae62-78dd110c4b86";
export const ADMIN_USER_UUID = "f09f9a28-e1a3-4422-ae62-78dd110c4b86";
let NORMAL_USER_SESSION = "";
let ADMIN_USER_SESSION = "";

export const initTestRequestEnv = async () => {
    // init env
    await initKv(true);
    Deno.env.set("SL_ADMIN_LIST", `12345678-1234-1234-1234-123456789012,${ADMIN_USER_UUID}`);
    NORMAL_USER_SESSION = await createSession(NORMAL_USER_UUID);
    ADMIN_USER_SESSION = await createSession(ADMIN_USER_UUID);
    _reload();
};

export const cleanTestRequestEnv = async () => {
    await closeAllManagedExpirableStore();
    closeKv();
};

export const makeServeHandlerInfo = (hostname: string = "127.0.0.1", port: number = 48990): Deno.ServeHandlerInfo => {
    return {
        remoteAddr: { hostname: hostname, port: port, transport: "tcp" },
        completed: Promise.resolve(),
    } as Deno.ServeHandlerInfo;
};

export const signSLRequest = async (req: Request, isAdmin: boolean = false) => {
    const avatarKey = isAdmin ? ADMIN_USER_UUID : NORMAL_USER_UUID;
    const avatarName = USER_NAME;
    const signRand = "randomstring" + Math.random().toFixed(4);
    const url = new URL(req.url);
    const signTime = new Date().toISOString();
    const sign = await hmac512Base64Sign(
        avatarKey + env.SL_REQUEST_SIGN_KEY,
        avatarKey + url.pathname + url.search + signTime + signRand,
    );
    req.headers.set("x-secondlife-owner-key", avatarKey);
    req.headers.set("x-secondlife-owner-name", avatarName);
    req.headers.set("x-secondlife-sign-rand", signRand);
    req.headers.set("x-secondlife-sign-time", signTime);
    req.headers.set("x-secondlife-sign", sign);
    req.headers.set(
        "user-agent",
        "Second-Life-LSL/2024-10-15.11356152186 (https://secondlife.com) " +
            env.ALLOW_SL_USER_AGENT_PART + "/1.0",
    );
    return req;
};

export const signSessionRequest = async (req: Request, isAdmin: boolean = false) => {
    req.headers.set("Cookie", "x-session=" + (isAdmin ? ADMIN_USER_SESSION : NORMAL_USER_SESSION));
    return req;
};

export const makeRequest = async (
    path: string = "/",
    params: "GET" | Record<string, string | number | boolean> = "GET",
    isAdmin: boolean = false,
    fromSL: boolean = false,
) => {
    while (path.startsWith("/")) {
        path = path.substring(1);
    }
    const method = params === "GET" ? "GET" : "POST";
    const req = new Request(`http://127.0.0.1/${path}`, {
        method: method,
        body: params === "GET" ? undefined : JSON.stringify(params),
        headers: params === "GET" ? {} : {
            "Content-Type": "application/json",
        },
    });
    if (fromSL) {
        await signSLRequest(req, isAdmin);
    } else {
        await signSessionRequest(req, isAdmin);
    }
    return req;
};

export const makeNoAuthRequest = async (
    path: string = "/",
    params: "GET" | Record<string, string> = "GET",
) => {
    while (path.startsWith("/")) {
        path = path.substring(1);
    }
    const method = params === "GET" ? "GET" : "POST";
    const req = new Request(`http://127.0.0.1/${path}`, {
        method: method,
        body: params === "GET" ? undefined : JSON.stringify(params),
        headers: params === "GET" ? {} : {
            "Content-Type": "application/json",
        },
    });
    return req;
};
