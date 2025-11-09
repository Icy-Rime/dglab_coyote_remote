export const base64Encode = (data: ArrayBufferLike) => {
    // to data string
    const characters = [];
    for (const byte of new Uint8Array(data)) {
        characters.push(String.fromCharCode(byte));
    }
    const dataString = characters.join("");
    return globalThis.btoa(dataString);
};

export const base64Decode = (b64String: string) => {
    const dataString = globalThis.atob(b64String);
    // from data string
    const size = dataString.length;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = dataString.charCodeAt(i);
    }
    return data.buffer;
};

export const hmac512Base64Sign = async (key: string, msg: string) => {
    const crypto = globalThis.crypto.subtle;
    if (!crypto) {
        return "";
    }
    const encoder = new TextEncoder();
    const cKey = await crypto.importKey(
        "raw",
        encoder.encode(key),
        {
            name: "HMAC",
            hash: "SHA-512",
        },
        true,
        ["sign"],
    );
    const signature = await crypto.sign(
        "HMAC",
        cKey,
        encoder.encode(msg),
    );
    return base64Encode(signature);
};

export const hmac512Base64Verify = async (
    key: string,
    msg: string,
    sign: string,
) => {
    const crypto = globalThis.crypto.subtle;
    if (!crypto) {
        return false;
    }
    const encoder = new TextEncoder();
    const cKey = await crypto.importKey(
        "raw",
        encoder.encode(key),
        {
            name: "HMAC",
            hash: "SHA-512",
        },
        true,
        ["verify"],
    );
    const signature = base64Decode(sign);
    const result = await crypto.verify(
        "HMAC",
        cKey,
        signature,
        encoder.encode(msg),
    );
    return result;
};
