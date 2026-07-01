import { atom, onSet } from "nanostores";
import { persistentJSON } from "@nanostores/persistent";
import { API_BASE } from "../utils/app_const.ts";

/* ==== Stores ==== */
export const $userAuth = persistentJSON("userAuth", {
    authId: "" as string,
    token: "" as string,
    updateUnixMs: Date.now() as number,
}, { listen: true });
export const $busyPromise = atom(Promise.resolve());
export const $_inited = atom(false);
const $failedToRefresh = atom(false);

/* ==== Actions ==== */
const jsonPost = async (path: string, params: Record<string, string>) => {
    const url = `${API_BASE}${path}`;
    const resp = await fetch(url, {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
            "Content-Type": "application/json",
        },
    });
    return resp;
};
const _refreshAuthTokenTask = async () => {
    const info = $userAuth.get();
    const resp = await jsonPost("/api/auth/refresh_auth_token", {
        authId: info.authId,
        token: info.token,
    });
    if (resp.status !== 200) {
        $failedToRefresh.set(true);
        return;
    }
    const data = await resp.json() as { code: number; data: { authId: string; token: string } };
    if (data.code !== 200) {
        $failedToRefresh.set(true);
        return;
    }
    $userAuth.set({
        ...data.data,
        updateUnixMs: Date.now(),
    });
    console.log("AuthTokenRefreshed");
};

export const refreshAuthToken = async () => {
    await $busyPromise.get();
    $busyPromise.set(_refreshAuthTokenTask().catch());
    await $busyPromise.get();
};

export const expireUserAuth = () => {
    $userAuth.set({
        authId: "" as string,
        token: "" as string,
        updateUnixMs: Date.now() as number,
    });
};

export const authByCode = async (code: string) => {
    const resp = await jsonPost("/api/auth/auth_by_code", { authCode: code });
    if (resp.status !== 200) {
        $failedToRefresh.set(true);
        return false;
    }
    const data = await resp.json() as { code: number; data: { avatarKey: string; authId: string; token: string } };
    if (data.code !== 200) {
        $failedToRefresh.set(true);
        return false;
    }
    await jsonPost("/api/auth/new_session", {
        authId: data.data.authId,
        token: data.data.token,
    });
    $userAuth.set({
        authId: data.data.authId,
        token: data.data.token,
        updateUnixMs: Date.now(),
    });
    return true;
};

export const newSession = async () => {
    if ($failedToRefresh.get()) {
        return false;
    }
    const info = $userAuth.get();
    const resp = await jsonPost("/api/auth/new_session", {
        authId: info.authId,
        token: info.token,
    });
    if (resp.status !== 200) {
        $failedToRefresh.set(true);
        return false;
    }
    const data = await resp.json() as { code: number; data: { session: string } };
    if (data.code !== 200) {
        $failedToRefresh.set(true);
        return false;
    }
    if (typeof data.data?.session !== "string") {
        return false;
    }
    return true;
};

export const logout = async () => {
    const info = $userAuth.get();
    const resp = await jsonPost("/api/auth/logout", {
        authId: info.authId,
        token: info.token,
    });
    if (resp.status !== 200) {
        return false;
    }
    $userAuth.set({
        authId: "",
        token: "",
        updateUnixMs: Date.now(),
    });
    return true;
};

/* ==== Events ==== */
onSet($userAuth, (_) => {
    $failedToRefresh.set(false);
});
(async () => {
    // refresh token task
    const now = Date.now();
    const last = $userAuth.get().updateUnixMs;
    if (now - last >= 1 * 24 * 3600_000) {
        await refreshAuthToken(); // refresh once
    }
    $_inited.set(true);
    setInterval(() => {
        if (!$failedToRefresh.get()) {
            refreshAuthToken();
        }
    }, 8 * 60 * 60 * 1000);
})();
