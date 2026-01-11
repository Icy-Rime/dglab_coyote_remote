import { hmac512Base64Verify } from "./hmac.ts";

export interface Avatar {
    avatarKey: string;
    avatarName: string;
    fromSL: boolean;
    isAdmin: boolean;
}

export const authFromSecondLifeRequest = async (req: Request) => {
    const SL_REQUEST_SIGN_KEY = Deno.env.get("SL_REQUEST_SIGN_KEY") ?? "key";
    const ALLOW_SL_USER_AGENT_PART = Deno.env.get("ALLOW_SL_USER_AGENT_PART") ??
        "(Unknown)";
    const headers = req.headers;
    const avatarKey = headers.get("x-secondlife-owner-key") ?? "";
    const avatarName = headers.get("x-secondlife-owner-name") ?? "";
    const signRand = headers.get("x-secondlife-sign-rand") ?? "";
    const signTime = headers.get("x-secondlife-sign-time") ?? "";
    const sign = headers.get("x-secondlife-sign") ?? "";
    const userAgent = headers.get("user-agent") ?? "";
    const url = new URL(req.url);
    // check empty header
    const allHeaders = [
        avatarKey,
        avatarName,
        signRand,
        signTime,
        sign,
    ];
    const notEmptyHeadersCount = allHeaders.filter((item) => {
        return item.length > 0;
    }).length;
    if (notEmptyHeadersCount < allHeaders.length) {
        return undefined;
    }
    // check UA
    if (userAgent.indexOf(ALLOW_SL_USER_AGENT_PART) < 0) {
        return undefined;
    }
    // check time
    const currentTimeSec = Date.now() / 1000;
    const signTimeSec = Date.parse(signTime) / 1000;
    if (Number.isNaN(signTimeSec)) {
        return undefined; // wrong time format
    }
    if (Math.abs(currentTimeSec - signTimeSec) > 30) {
        return undefined; // timeout 30 sec
    }
    // check sign
    const authed = await hmac512Base64Verify(
        avatarKey + SL_REQUEST_SIGN_KEY,
        avatarKey + url.pathname + url.search + signTime + signRand,
        sign,
    );
    if (authed) {
        // authed
        return {
            avatarKey,
            avatarName,
        } as Avatar;
    }
    return undefined;
};
