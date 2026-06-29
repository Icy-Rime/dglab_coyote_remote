import { getKv, KVRetry, wrapKvOperation } from "./kv.ts";
import type { ExpirableItem } from "./expirable_store.ts";
import { createManagedExpirableStore } from "./expirable_store.ts";
import { ulid } from "@std/ulid";
import { env } from "../utils/env.ts";

const D_AUTH_PREFIX = "auth";
const D_BY_TOKEN = "avatar_by_token"; // auth id -> avatar key
const D_BY_AVATAR = "token_by_avatar"; // avatar key + auth id -> auth token info
const CODE_EXPIRE_MS = 5 * 60_000; // 5 min
const AUTH_TOKEN_EXPIRE_MS = 7 * 24 * 3600_000; // 7 days
const SESSION_EXPIRE_MS = 60 * 60_000; // 60 min

interface AuthTokenInfo {
    token: string;
    expireAt: number;
}

interface AuthCodeInfo extends ExpirableItem {
    avatarKey: string;
}

interface SessionInfo extends ExpirableItem {
    avatarKey: string;
}

const codeStore = createManagedExpirableStore<AuthCodeInfo>(); // auth code -> avatar key
const sessionStore = createManagedExpirableStore<SessionInfo>(); // session key -> avatar key

const randomAuthCode = () => {
    // generate 16 random hex number
    const arr = new Uint8Array(8);
    globalThis.crypto.getRandomValues(arr);
    const code = Array.from(arr).map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    return code;
};

export const startCodeAuth = async (avatarKey: string) => {
    const code = randomAuthCode();
    await codeStore.set(code, { avatarKey, expireAt: Date.now() + CODE_EXPIRE_MS });
    return code;
};

export const authByCode = async (code: string) => {
    const avatarKey = (await codeStore.get(code))?.avatarKey;
    if (avatarKey) {
        await codeStore.delete(code);
    }
    return avatarKey;
};

export const createAuthToken = wrapKvOperation(async (avatarKey: string) => {
    const authId = ulid();
    const token = ulid();
    const kv = getKv();
    const expireAt = Date.now() + AUTH_TOKEN_EXPIRE_MS;
    const result = await kv.atomic()
        .check({ key: [env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], versionstamp: null })
        .check({ key: [env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId], versionstamp: null })
        .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], {
            token,
            expireAt,
        } as AuthTokenInfo, { expireIn: AUTH_TOKEN_EXPIRE_MS })
        .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId], avatarKey, { expireIn: AUTH_TOKEN_EXPIRE_MS })
        .commit();
    if (!result.ok) {
        throw new KVRetry("create auth token failed");
    }
    return {
        authId,
        token,
    };
});

export const authByToken = async (authId: string, token: string) => {
    const kv = getKv();
    const avatarKeyResult = await kv.get<string>([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId]);
    if (avatarKeyResult.value) {
        const avatarKey = avatarKeyResult.value;
        const tokenResult = await kv.get<AuthTokenInfo>([
            env.APP_DB_PREFIX,
            D_AUTH_PREFIX,
            D_BY_AVATAR,
            avatarKey,
            authId,
        ]);
        if (tokenResult.value?.token === token && tokenResult.value.expireAt >= Date.now()) {
            return avatarKey;
        }
    }
    return undefined;
};

export const refreshAuthToken = wrapKvOperation(async (authId: string, token: string) => {
    const kv = getKv();
    const expireAt = Date.now() + AUTH_TOKEN_EXPIRE_MS;
    const avatarKeyResult = await kv.get<string>([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId]);
    if (avatarKeyResult.value) {
        const avatarKey = avatarKeyResult.value;
        const tokenResult = await kv.get<AuthTokenInfo>([
            env.APP_DB_PREFIX,
            D_AUTH_PREFIX,
            D_BY_AVATAR,
            avatarKey,
            authId,
        ]);
        const oldToken = tokenResult.value?.token;
        if (tokenResult.value?.token !== token || tokenResult.value.expireAt < Date.now()) {
            return "";
        }
        const newToken = ulid();
        const result = await kv.atomic()
            .check(avatarKeyResult)
            .check(tokenResult)
            .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], {
                token: newToken,
                expireAt,
            } as AuthTokenInfo, { expireIn: AUTH_TOKEN_EXPIRE_MS })
            .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId], avatarKey, { expireIn: AUTH_TOKEN_EXPIRE_MS })
            .commit();
        if (!result.ok) {
            throw new KVRetry("refresh auth token failed");
        }
        return newToken;
    }
    return "";
    // const tokenResult = await kv.get<AuthTokenInfo>([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId]);
    // if (tokenResult.value) {
    //     const oldToken = tokenResult.value.token;
    //     if (token !== oldToken) {
    //         return "";
    //     }
    //     const newToken = ulid();
    //     const kv = getKv();
    //     const result = await kv.atomic()
    //         .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], {
    //             token: newToken,
    //             expireAt,
    //         } as AuthTokenInfo, { expireIn: AUTH_TOKEN_EXPIRE_MS })
    //         .set([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId], avatarKey, { expireIn: AUTH_TOKEN_EXPIRE_MS })
    //         .commit();
    //     if (!result.ok) {
    //         throw new KVRetry("refresh auth token failed");
    //     }
    //     return newToken;
    // }
    // return "";
});

export const createSession = async (avatarKey: string) => {
    const sessionId = ulid();
    await sessionStore.set(sessionId, { avatarKey, expireAt: Date.now() + SESSION_EXPIRE_MS });
    return sessionId;
};

export const authBySession = async (sessionId: string) => {
    const session = await sessionStore.get(sessionId);
    if (session) {
        await sessionStore.updateExpireTime(sessionId, Date.now() + SESSION_EXPIRE_MS); // refresh expire time
        return session.avatarKey;
    }
    return undefined;
};

export const expireAllAuth = wrapKvOperation(async (avatarKey: string) => {
    // expire all sessions
    await codeStore.deleteAll((item) => item.avatarKey === avatarKey);
    await sessionStore.deleteAll((item) => item.avatarKey === avatarKey);
    // expire all tokens
    const kv = getKv();
    for await (const item of kv.list({ prefix: [env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_AVATAR, avatarKey] })) {
        const authId = item.key[3] as string | undefined;
        if (!authId) {
            continue;
        }
        const authTokenResult = await kv.get([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId]);
        const result = await kv.atomic()
            .check(item)
            .check(authTokenResult)
            .delete(item.key)
            .delete([env.APP_DB_PREFIX, D_AUTH_PREFIX, D_BY_TOKEN, authId])
            .commit();
        if (!result.ok) {
            throw new KVRetry(`expire auth token failed: ${authId}`);
        }
    }
});
