import { assert, assertEquals } from "@std/assert";
import {
    base64Decode,
    base64Encode,
    hmac512Base64Sign,
    hmac512Base64Verify,
} from "./hmac.ts";

/*
    // LSL in secondlife
    string privateKey = "123⭐🌟456";
    string msg = "你好⭐🌟";
    string signature = llHMAC(privateKey, msg, "sha512");
*/
Deno.test("hmacTest", async (t) => {
    await t.step("base64Test", () => {
        const data = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            data[i] = i;
        }
        const b64Text = base64Encode(data.buffer);
        assert(typeof b64Text === "string");
        const decodedData = base64Decode(b64Text);
        assertEquals(decodedData, data.buffer);
    });
    await t.step("hmac512Base64SignTest", async () => {
        const privateKey = "123⭐🌟456";
        const msg = "你好⭐🌟";
        const signature = await hmac512Base64Sign(privateKey, msg);
        assertEquals(
            signature,
            "lD1iuqXkYLqe6lpXJQSSGUbwv2iOz/Ffo+7JArhgEvSo/ePMg8bI5qK8jv5POH2Q/sdYao07M3sx43p+STXANQ==",
        );
    });
    await t.step("hmac512Base64VerifyTest", async () => {
        const privateKey = "123⭐🌟456";
        const msg = "你好⭐🌟";
        const signature =
            "lD1iuqXkYLqe6lpXJQSSGUbwv2iOz/Ffo+7JArhgEvSo/ePMg8bI5qK8jv5POH2Q/sdYao07M3sx43p+STXANQ==";
        assert(await hmac512Base64Verify(privateKey, msg, signature));
    });
});
