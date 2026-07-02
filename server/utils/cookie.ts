const asciiSpecialChars = Array.from('()<>@,;:\\ "/[]?={}').map((ch) => ch.charCodeAt(0));

const checkCookieName = (name: string) => {
    for (const ch of name) {
        const code = ch.charCodeAt(0);
        if (code <= 31) {
            return false;
        } else if (code >= 127) {
            return false;
        }
        if (asciiSpecialChars.includes(code)) {
            return false;
        }
    }
    return true;
};

export const setCookie = (resp: Response, name: string, value: string, path = "", maxAge = -1, httpOnly = true) => {
    if (!checkCookieName(name)) {
        throw Error("Cookie name contains special character.");
    }
    const valueText = encodeURIComponent(value);
    let cookieText = `${name}=${valueText}`;
    if (path) {
        cookieText = cookieText + `; Path=${encodeURI(path)}`;
    }
    if (maxAge >= 0) {
        cookieText = cookieText + `; Max-Age=${maxAge.toString()}`;
    }
    if (httpOnly) {
        cookieText = cookieText + "; HttpOnly";
    }
    resp.headers.append("Set-Cookie", cookieText);
};

export const getCookies = (req: Request) => {
    const ck = {} as Record<string, string>;
    const cookieText = req.headers.get("Cookie") ?? "";
    for (const part of cookieText.split("; ")) {
        const idx = part.indexOf("=");
        if (idx <= 0) {
            continue;
        }
        const name = part.substring(0, idx);
        const value = part.substring(idx + 1);
        const trueValue = decodeURIComponent(value);
        ck[name] = trueValue;
    }
    return ck;
};
