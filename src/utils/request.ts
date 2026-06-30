import { API_BASE } from "../utils/app_const.ts";

export class RequestError extends Error {
    subCode: number;
    reason: string;
    status: number;
    constructor(msg?: string, status: number = -1, errorData: unknown = undefined) {
        super(msg);
        this.subCode = (errorData as { subCode?: number })?.subCode ?? -1;
        this.reason = (errorData as { reason?: string })?.reason ?? "";
        this.status = status;
    }
}

export const request = async <T>(
    apiPath: string,
    method: "POST" | "GET" = "GET",
    params: Record<string, string> = {},
) => {
    while (apiPath.startsWith("/")) {
        apiPath = apiPath.substring(1);
    }
    const url = new URL(`${API_BASE}/${apiPath}`);
    if (method === "GET") {
        for (const k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) {
                url.searchParams.set(k, params[k]);
            }
        }
    }
    const resp = await fetch(url, {
        method: method,
        body: method === "GET" ? undefined : JSON.stringify(params),
        headers: method === "GET" ? {} : {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });
    let data = {} as unknown;
    try {
        data = await resp.json();
    } catch {
        // ignore error
        data = {};
    }
    if (resp.status !== 200) {
        throw new RequestError(
            `Failed to request: status ${resp.status}`,
            resp.status,
            (data as { data?: unknown })?.data,
        );
    }
    if (!((data as { data?: unknown })?.data)) {
        throw new RequestError(`Failed to parse response: ${JSON.stringify(data)}`, 200);
    }
    return (data as { data?: unknown })?.data as T;
};
