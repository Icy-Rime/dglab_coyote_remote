import type { RouterHandler } from "../router.d.ts";
import { authFromRequest } from "../../controller/avatar.ts";
import { PathPattern } from "../pattern.ts";
import { registerRoute } from "../router.ts";
import { response } from "../response.ts";
import { createUser, getUser, updateUser } from "../../data/user.ts";

export type RDataTryVip = {
    succeed: boolean;
    subscriptionTimeMs: number;
};
export type RDataAddVip = {
    succeed: boolean;
};
export type RDataGetVip = {
    subscriptionTimeMs: number;
};

const handleTryVip: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed || !auth.fromSL) {
            return response(403);
        }
        // create user if not exist
        let user = await getUser(auth.avatarKey);
        if (!user) {
            const success = await createUser(auth.avatarKey, auth.avatarName!);
            if (!success) {
                throw Error("Failed to create user.");
            }
            user = await getUser(auth.avatarKey);
            if (!user) {
                throw Error("Failed to create user.");
            }
        }
        // check time
        const last = user.subscriptionTimeMs;
        const now = Date.now();
        if (now - last < 20 * 60_000) {
            return response(200, { succeed: false, subscriptionTimeMs: user.subscriptionTimeMs } as RDataTryVip);
        }
        // update vip time
        user.subscriptionTimeMs = Date.now() + (30 * 60_000);
        if (!(await updateUser(user))) {
            return response(200, { succeed: false, subscriptionTimeMs: user.subscriptionTimeMs } as RDataTryVip);
        }
        return response(200, { succeed: true, subscriptionTimeMs: user.subscriptionTimeMs } as RDataTryVip);
    }
};

const handleAddVipTime: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed || !auth.isAdmin || !auth.fromSL) {
            return response(403);
        }
        let param = { avatarKey: "", increasement: -1, avatarName: "" };
        let avatarKey = "";
        let increasement = 0;
        let avatarName = "";
        try {
            param = await req.json();
            avatarKey = param.avatarKey ?? "";
            increasement = param.increasement ?? 0;
            avatarName = param.avatarName ?? "";
        } catch {
            return response(400);
        }
        if (!avatarKey || !increasement || !avatarName) {
            return response(400);
        }
        // create user if not exist
        let user = await getUser(avatarKey);
        if (!user) {
            const success = await createUser(avatarKey, avatarName);
            if (!success) {
                throw Error("Failed to create user.");
            }
            user = await getUser(avatarKey);
            if (!user) {
                throw Error("Failed to create user.");
            }
        }
        // add time
        const baseTime = Math.max(user.subscriptionTimeMs, Date.now());
        user.subscriptionTimeMs = baseTime + (increasement * 1000);
        if (await updateUser(user)) {
            return response(200, { succeed: true } as RDataAddVip);
        }
        return response(200, { succeed: false } as RDataAddVip);
    }
};

const handleGetVipTime: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "GET") {
        const auth = await authFromRequest(req);
        if (!auth.authed) {
            return response(403);
        }
        // create user if not exist
        let user = await getUser(auth.avatarKey);
        if (!user && auth.fromSL) {
            const success = await createUser(auth.avatarKey, auth.avatarName!);
            if (!success) {
                throw Error("Failed to create user.");
            }
            user = await getUser(auth.avatarKey);
            if (!user) {
                throw Error("Failed to create user.");
            }
        }
        return response(200, { subscriptionTimeMs: user?.subscriptionTimeMs ?? 0 } as RDataGetVip);
    }
};

export default () => {
    registerRoute(new PathPattern("/api/user/try_vip"), handleTryVip);
    registerRoute(new PathPattern("/api/user/add_vip_time"), handleAddVipTime);
    registerRoute(new PathPattern("/api/user/get_vip_time"), handleGetVipTime);
};
