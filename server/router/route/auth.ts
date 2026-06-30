import type { RouterHandler } from "../router.d.ts";
import { authFromRequest } from "../../controller/avatar.ts";
import { PathPattern } from "../pattern.ts";
import { registerRoute } from "../router.ts";
import { response } from "../response.ts";
import { getCookies, setCookie } from "../../utils/cookie.ts";
import { SESSION_EXPIRE_MS } from "../../data/auth.ts";
import { createUser, getUser } from "../../data/user.ts";
import {
    authByCode,
    authByToken,
    createAuthToken,
    createSession,
    refreshAuthToken,
    startCodeAuth,
} from "../../data/auth.ts";

const randomSleep = () => {
    const ms = 50 * Math.random();
    return new Promise((r) => setTimeout(r, ms));
};

export interface RDataMe {
    avatarKey: string;
    avatarName: string;
    authenticated: boolean;
}
export interface RDataNewSession {
    avatarKey: string;
    session: string;
}
export interface RDataAuthByCode {
    avatarKey: string;
    authId: string;
    token: string;
}
export interface RDataNewCode {
    avatarKey: string;
    code: string;
}
export interface RDataRefreshAuthToken {
    authId: string;
    token: string;
}

const handlerMe: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "GET") {
        const avatar = await authFromRequest(req);
        await randomSleep();
        if (!avatar.authed) {
            return response(200, { avatarKey: "", avatarName: "", authenticated: false } as RDataMe);
        }
        const user = await getUser(avatar.avatarKey);
        const resp = response(200, {
            avatarKey: avatar.avatarKey,
            avatarName: user?.name ?? "",
            authenticated: avatar.authed,
        });
        if (avatar.authed && !avatar.fromSL) {
            const cookies = getCookies(req);
            const session = cookies["x-session"] ?? "";
            if (session) {
                // refresh cookie
                setCookie(resp, "x-session", session, Math.floor(SESSION_EXPIRE_MS / 1000), true);
            }
        }
        return resp;
    }
};

const handlerNewSession: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const params = await req.json() as { authId?: string; token?: string };
        const authId = params.authId;
        const token = params.token;
        if ((!token) || (!authId)) {
            return response(400);
        }
        await randomSleep();
        const avatarKey = await authByToken(authId, token);
        if (!avatarKey) {
            return response(403);
        }
        const session = await createSession(avatarKey);
        const resp = response(200, { avatarKey: avatarKey, session: session } as RDataNewSession);
        setCookie(resp, "x-session", session, Math.floor(SESSION_EXPIRE_MS / 1000), true);
        return resp;
    }
};

const handlerAuthByCode: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const params = await req.json() as { authCode?: string };
        const authCode = params.authCode;
        if (!authCode) {
            return response(400);
        }
        await randomSleep();
        const avatarKey = await authByCode(authCode);
        if (!avatarKey) {
            return response(403);
        }
        const { authId, token } = await createAuthToken(avatarKey);
        return response(200, { avatarKey: avatarKey, authId: authId, token: token } as RDataAuthByCode);
    }
};

const handleNewCode: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const avatar = await authFromRequest(req);
        if (!avatar.fromSL) {
            return response(403);
        }
        await randomSleep();
        // create user if not exist
        const user = await getUser(avatar.avatarKey);
        if (!user) {
            const success = await createUser(avatar.avatarKey, avatar.avatarName!);
            if (!success) {
                throw Error("Failed to create user.");
            }
        }
        const code = await startCodeAuth(avatar.avatarKey);
        return response(200, { avatarKey: avatar.avatarKey, code: code } as RDataNewCode);
    }
};

const handleRefreshAuthToken: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const params = await req.json() as { authId?: string; token?: string };
        const authId = params.authId;
        const token = params.token;
        if ((!token) || (!authId)) {
            return response(400);
        }
        await randomSleep();
        const newToken = await refreshAuthToken(authId, token);
        if (!newToken) {
            return response(403);
        }
        return response(200, { authId: authId, token: newToken } as RDataRefreshAuthToken);
    }
};

export default () => {
    registerRoute(new PathPattern("/api/auth/me"), handlerMe);
    registerRoute(new PathPattern("/api/auth/new_session"), handlerNewSession);
    registerRoute(new PathPattern("/api/auth/auth_by_code"), handlerAuthByCode);
    registerRoute(new PathPattern("/api/auth/new_code"), handleNewCode);
    registerRoute(new PathPattern("/api/auth/refresh_auth_token"), handleRefreshAuthToken);
};
