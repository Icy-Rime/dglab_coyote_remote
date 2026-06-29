export const response = (code = 200, data: unknown = undefined) => {
    if (data === undefined) {
        switch (code) {
            case 200:
                data = "Ok";
                break;
            case 400:
                data = "Bad Request";
                break;
            case 404:
                data = "Not Found";
                break;
            case 409:
                data = "Conflict";
                break;
            default:
                data = "";
                break;
        }
    }
    return new Response(
        JSON.stringify({ code, data }),
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
