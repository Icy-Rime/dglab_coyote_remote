import { getKv, KVRetry, wrapKvOperation } from "./kv.ts";
import { env } from "../utils/env.ts";

const D_USER_PREFIX = "users";
export interface UserData {
    uid: string;
    name: string;
    /** time until subscription time end. */
    subscriptionTimeMs: number;
}

export const newUserData = () => {
    return {
        name: "user",
        subscriptionTimeMs: 0,
    } as UserData;
};

export const createUser = wrapKvOperation(async (userId: string, userName: string) => {
    const kv = getKv();
    // get exist user
    const k = [env.APP_DB_PREFIX, D_USER_PREFIX, userId];
    const result = await kv.get(k);
    if (result.versionstamp !== null) {
        // already created
        return false;
    }
    const u = newUserData();
    u.uid = userId;
    u.name = userName;
    const ret = await kv.atomic()
        .check(result)
        .set(k, u)
        .commit();
    if (!ret.ok) {
        throw new KVRetry();
    }
    return true;
});

export const getUser = async (userId: string) => {
    const kv = getKv();
    const k = [env.APP_DB_PREFIX, D_USER_PREFIX, userId];
    const result = await kv.get(k);
    if (result.versionstamp === null) {
        return undefined;
    }
    return result.value as UserData;
};

export const updateUser = wrapKvOperation(async (newData: UserData) => {
    const kv = getKv();
    const k = [env.APP_DB_PREFIX, D_USER_PREFIX, newData.uid];
    const result = await kv.get(k);
    if (result.versionstamp === null) {
        return false;
    }
    const ret = await kv.atomic()
        .check(result)
        .set(k, newData)
        .commit();
    if (!ret.ok) {
        throw new KVRetry();
    }
    return true;
});
