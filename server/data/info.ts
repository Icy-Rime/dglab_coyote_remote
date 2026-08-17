// info storage
import { getKv, KVRetry, wrapKvOperation } from "./kv.ts";
import { env } from "../utils/env.ts";

const D_INFO_PREFIX = "info";
const D_INFO_LIST_PREFIX = "list";
const D_INFO_CONTENT_PREFIX = "content";

export const getInfoList = async () => {
    const kv = getKv();
    const k = [env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_LIST_PREFIX];
    const result = await kv.get(k);
    if (result.versionstamp === null) {
        return [];
    }
    return result.value as string[];
};

export const addInfo = wrapKvOperation(async (infoId: string, infoContent: string) => {
    const kv = getKv();
    const listResult = await kv.get<string[]>([env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_LIST_PREFIX]);
    let lst: string[] = [];
    if (listResult.versionstamp !== null) {
        lst = listResult.value;
    }
    if (lst.includes(infoId)) {
        return false; // already exist
    }
    lst.push(infoId);
    lst.sort();
    const contentKey = [env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_CONTENT_PREFIX, infoId];
    const ret = await kv.atomic()
        .check(listResult)
        .set(listResult.key, lst)
        .set(contentKey, infoContent)
        .commit();
    if (!ret.ok) {
        throw new KVRetry();
    }
    return true;
});

export const getInfoContent = async (infoId: string) => {
    const kv = getKv();
    const contentKey = [env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_CONTENT_PREFIX, infoId];
    const result = await kv.get<string>(contentKey);
    if (result.versionstamp === null) {
        return undefined;
    }
    return result.value;
};

export const updateInfoContent = wrapKvOperation(async (infoId: string, infoContent: string) => {
    const kv = getKv();
    const contentKey = [env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_CONTENT_PREFIX, infoId];
    const contentResult = await kv.get<string>(contentKey);
    if (contentResult.versionstamp === null) {
        return false; // not exist
    }
    const ret = await kv.atomic()
        .check(contentResult)
        .set(contentKey, infoContent)
        .commit();
    if (!ret.ok) {
        throw new KVRetry();
    }
    return true;
});

export const deleteInfo = wrapKvOperation(async (infoId: string) => {
    const kv = getKv();
    const listResult = await kv.get<string[]>([env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_LIST_PREFIX]);
    let lst: string[] = [];
    if (listResult.versionstamp !== null) {
        lst = listResult.value;
    }
    if (!lst.includes(infoId)) {
        return false; // not exist
    }
    lst = lst.filter((id) => id !== infoId);
    const contentResult = await kv.get<string>([env.APP_DB_PREFIX, D_INFO_PREFIX, D_INFO_CONTENT_PREFIX, infoId]);
    if (contentResult.versionstamp === null) {
        return false; // not exist
    }
    const ret = await kv.atomic()
        .check(listResult)
        .check(contentResult)
        .delete(contentResult.key)
        .set(listResult.key, lst)
        .commit();
    if (!ret.ok) {
        throw new KVRetry();
    }
    return true;
});
