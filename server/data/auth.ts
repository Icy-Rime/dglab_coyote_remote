import { getKv, KVRetry, wrapKvOperation } from "./kv.ts";
import { createManagedTimedStore } from "./timed_store.ts";
import { monotonicUlid, ulid } from "@std/ulid";

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

const codeStore = createManagedTimedStore<string>(); // auth code -> avatar key
const sessionStore = createManagedTimedStore<string>(); // session key -> avatar key

const randomAuthCode = () => {
    // generate 16 random hex number
    const arr = new Uint8Array(8);
    globalThis.crypto.getRandomValues(arr);
    const code = Array.from(arr).map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    return code;
};

export const startCodeAuth = async (avatarKey: string) => {
    const code = randomAuthCode();
    await codeStore.set(code, avatarKey, Date.now() + CODE_EXPIRE_MS); // 5 min
    return code;
};

export const authByCode = async (code: string) => {
    const avatarKey = await codeStore.get(code);
    if (avatarKey) {
        await codeStore.delete(code);
    }
    return avatarKey;
};

export const createAuthToken = wrapKvOperation(async (avatarKey: string) => {
    const authId = monotonicUlid();
    const token = ulid();
    const kv = getKv();
    const expireAt = Date.now() + AUTH_TOKEN_EXPIRE_MS;
    const result = await kv.atomic()
        .set([D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], {
            token,
            expireAt,
        } as AuthTokenInfo, { expireIn: AUTH_TOKEN_EXPIRE_MS })
        .set([D_AUTH_PREFIX, D_BY_TOKEN, authId], avatarKey, { expireIn: AUTH_TOKEN_EXPIRE_MS })
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
    const avatarKeyResult = await kv.get<string>([D_AUTH_PREFIX, D_BY_TOKEN, authId]);
    if (avatarKeyResult.value) {
        const avatarKey = avatarKeyResult.value;
        const tokenResult = await kv.get<AuthTokenInfo>([D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId]);
        if (tokenResult.value?.token === token && tokenResult.value.expireAt >= Date.now()) {
            return avatarKey;
        }
    }
    return undefined;
};

export const refreshAuthToken = wrapKvOperation(async (avatarKey: string, authId: string) => {
    const kv = getKv();
    const expireAt = Date.now() + AUTH_TOKEN_EXPIRE_MS;
    const tokenResult = await kv.get<AuthTokenInfo>([D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId]);
    if (tokenResult.value) {
        const token = tokenResult.value.token;
        const kv = getKv();
        const result = await kv.atomic()
            .set([D_AUTH_PREFIX, D_BY_AVATAR, avatarKey, authId], {
                token,
                expireAt,
            } as AuthTokenInfo, { expireIn: AUTH_TOKEN_EXPIRE_MS })
            .set([D_AUTH_PREFIX, D_BY_TOKEN, authId], avatarKey, { expireIn: AUTH_TOKEN_EXPIRE_MS })
            .commit();
        if (!result.ok) {
            throw new KVRetry("refresh auth token failed");
        }
        return true;
    }
    return false;
});

export const createSession = async (avatarKey: string) => {
    const sessionId = ulid();
    await sessionStore.set(sessionId, avatarKey, Date.now() + SESSION_EXPIRE_MS);
    return sessionId;
};

export const authBySession = async (sessionId: string) => {
    const av = await sessionStore.get(sessionId);
    if (av) {
        await sessionStore.set(sessionId, av, Date.now() + SESSION_EXPIRE_MS); // refresh expire time
        return av;
    }
    return undefined;
};

export const expireAllAuth = wrapKvOperation(async (avatarKey: string) => {
    // expire all sessions
    await codeStore.deleteAllValues(avatarKey);
    await sessionStore.deleteAllValues(avatarKey);
    // expire all tokens
    const kv = getKv();
    for await (const item of kv.list({ prefix: [D_AUTH_PREFIX, D_BY_AVATAR, avatarKey] })) {
        const authId = item.key[3] as string | undefined;
        if (!authId) {
            continue;
        }
        const result = await kv.atomic()
            .delete(item.key)
            .delete([D_AUTH_PREFIX, D_BY_TOKEN, authId])
            .commit();
        if (!result.ok) {
            throw new KVRetry(`expire auth token failed: ${authId}`);
        }
    }
});
