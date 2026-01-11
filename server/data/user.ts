import { getKv, wrapKvOperation } from "./kv.ts";

const D_USER_PREFIX = "users"
export interface UserData {
    /** time until subscription time end. */
    name?: string;
    subscriptionTimeMs?: number;
}

//
