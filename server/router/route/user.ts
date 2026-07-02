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

const handleTryVip: RouterHandler = async (req, params) => {
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

export default () => {
    registerRoute(new PathPattern("/api/user/try_vip"), handleTryVip);
};
