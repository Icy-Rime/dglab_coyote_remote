import { atom, computed } from "nanostores";

interface UserInfoResponse {
    username: string;
    adv_expire: number;
}

/* ==== Stores ==== */
export const $username = atom("");
export const $isLogined = computed($username, (un) => typeof un === "string" && un.length > 0);

/* ==== Actions ==== */
export const expireUserInfo = () => {
    $username.set("");
    console.log("UserInfoExpired");
};
export const updateUserInof = (infoResp: UserInfoResponse) => {
    $username.set(infoResp?.username ?? "");
};

/* ==== Events ==== */
(async () => {
    // query user info
    // const resp = await requestGet<UserInfoResponse>("/v2/user");
    // updateUserInof(resp);
})();
