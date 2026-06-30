export type APIResponse<T> = {
    code: number;
    data: T;
};

export const response = <T>(code = 200, data: T | undefined = undefined) => {
    if (data === undefined) {
        switch (code) {
            case 200:
                data = "Ok" as T;
                break;
            case 400:
                data = "Bad Request" as T;
                break;
            case 404:
                data = "Not Found" as T;
                break;
            case 409:
                data = "Conflict" as T;
                break;
            default:
                data = "" as T;
                break;
        }
    }
    return new Response(
        JSON.stringify({ code, data } as APIResponse<T>),
        {
            status: code,
            headers: {
                // "Access-Control-Allow-Origin": "*",
                // "Content-Type": "text/plain",
                "Content-Type": "application/json",
            },
        },
    );
};
