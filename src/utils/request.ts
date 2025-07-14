import { expireUserInfo } from "../store/user_info.ts"

export const URL_BASE = "";

class RequestError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "Request Error";
        this.statusCode = statusCode;
    }
}

export const requestGet = async <T>(path: string, queries: Record<string, string | number> = {}) => {
    const url = new URL(URL_BASE + path, globalThis.location.toString());
    for (const key in queries) {
        if (Object.prototype.hasOwnProperty.call(queries, key)) {
            const element = queries[key];
            url.searchParams.set(key, element.toString());
        }
    }
    try {
        const resp = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
        });
        if (resp.status != 200) {
            if (resp.status === 403) expireUserInfo();
            throw new RequestError(resp.status, await resp.text());
        }
        return await resp.json() as T;
    } catch (err: unknown) {
        throw new RequestError(-1, (err as Error)?.message ?? "");
    }
};
