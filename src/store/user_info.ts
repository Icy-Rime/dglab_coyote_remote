import { atom, computed, onSet } from "nanostores";
import { $userAuth, newSession } from "./user_auth.ts";
import { request, RequestError } from "../utils/request.ts";

interface UserInfoResponse {
    avatarKey: string;
    avatarName: string;
    authenticated: boolean;
}

/* ==== Stores ==== */
export const $canTryGetInfo = atom(true);
export const $userInfo = atom({
    userId: "" as string,
    name: "" as string,
});
export const $isLogined = computed($userInfo, (un) => typeof un.userId === "string" && un.userId.length > 0);
export const $username = computed($userInfo, (un) => un.name);
export const $_inited = atom(false);

/* ==== Actions ==== */
export const expireUserInfo = () => {
    $userInfo.set({
        userId: "" as string,
        name: "" as string,
    });
    console.log("UserInfoExpired");
};
export const updateUserInfo = async () => {
    try {
        const info = await request("/api/auth/me") as UserInfoResponse;
        const newInfo = { ...$userInfo.get() };
        newInfo.userId = info.authenticated ? info.avatarKey : "";
        newInfo.name = info.avatarName;
        $userInfo.set(newInfo);
        return true;
    } catch (e) {
        if (e instanceof RequestError && e.status === 403) {
            $canTryGetInfo.set(false);
        }
    }
    return false;
};

/* ==== Events ==== */
let oldAuthId = $userAuth.get().authId;
onSet($userAuth, ({ newValue }) => {
    if (newValue.authId !== oldAuthId) {
        // update userinfo
        if (newValue.authId.length > 0) {
            $canTryGetInfo.set(true);
            updateUserInfo().catch().then(() => {
                oldAuthId = newValue.authId;
            });
        } else {
            // clear if no authId
            $canTryGetInfo.set(false);
            $userInfo.set({
                userId: "",
                name: "",
            });
            oldAuthId = newValue.authId;
        }
    }
});
(async () => {
    const success = await updateUserInfo();
    if ((!success) || !($isLogined.get())) {
        // try new session
        if ($userAuth.get().authId) {
            if (await newSession()) {
                await updateUserInfo();
            }
        }
    }
    $_inited.set(true);
    setInterval(() => {
        if ($canTryGetInfo.get()) {
            updateUserInfo();
        }
    }, 20 * 60 * 1000); // refresh to keep session
})();
