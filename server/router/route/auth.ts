import type { RouterHandler } from "../router.d.ts";
import { authFromRequest } from "../../controller/avatar.ts";
import { PathPattern } from "../pattern.ts";
import { registerRoute } from "../router.ts";
import { response } from "../response.ts";
import { setCookie } from "../../utils/cookie.ts";
import { SESSION_EXPIRE_MS } from "../../data/auth.ts";
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

const handlerMe: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "GET") {
        const avatar = await authFromRequest(req);
        return response(200, { avatarKey: avatar.avatarKey, authenticated: avatar.authed });
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
        const resp = response(200, { avatarKey: avatarKey, session: session });
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
        return response(200, { avatarKey: avatarKey, authId: authId, token: token });
    }
};

const handleNewCode: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const avatar = await authFromRequest(req);
        if (!avatar.fromSL) {
            return response(403);
        }
        await randomSleep();
        const code = await startCodeAuth(avatar.avatarKey);
        return response(200, { avatarKey: avatar.avatarKey, code: code });
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
        return response(200, { authId: authId, token: newToken });
    }
};

export default () => {
    registerRoute(new PathPattern("/api/auth/me"), handlerMe);
    registerRoute(new PathPattern("/api/auth/new_session"), handlerNewSession);
    registerRoute(new PathPattern("/api/auth/auth_by_code"), handlerAuthByCode);
    registerRoute(new PathPattern("/api/auth/new_code"), handleNewCode);
    registerRoute(new PathPattern("/api/auth/refresh_auth_token"), handleRefreshAuthToken);
};
