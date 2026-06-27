import { assert } from "@std/assert";
import { _reload, env } from "./env.ts";

const APP_DB_PREFIX = "dglab_remote";
const SL_REQUEST_SIGN_KEY = "123456";
const ALLOW_SL_USER_AGENT_PART = "Second-Life-LSL";
const SL_ADMIN_LIST = "12345678-1234-1234-1234-123456789012,f09f9a28-e1a3-4422-ae62-78dd110c4b86";

const init_env_for_test = () => {
    Deno.env.set("APP_DB_PREFIX", APP_DB_PREFIX);
    Deno.env.set("SL_REQUEST_SIGN_KEY", SL_REQUEST_SIGN_KEY);
    Deno.env.set("ALLOW_SL_USER_AGENT_PART", ALLOW_SL_USER_AGENT_PART);
    Deno.env.set("SL_ADMIN_LIST", SL_ADMIN_LIST);
    _reload();
};

Deno.test("utils/env", async (t) => {
    await t.step("initTestEnv", () => {
        init_env_for_test();
        assert(env.APP_DB_PREFIX === APP_DB_PREFIX);
        assert(env.SL_REQUEST_SIGN_KEY === SL_REQUEST_SIGN_KEY);
        assert(env.ALLOW_SL_USER_AGENT_PART === ALLOW_SL_USER_AGENT_PART);
        assert(env.SL_ADMIN_LIST === SL_ADMIN_LIST);
    });
    await t.step("reloadEnv", () => {
        Deno.env.set("SL_REQUEST_SIGN_KEY", "987654321");
        _reload();
        assert(env.SL_REQUEST_SIGN_KEY === "987654321");
    });
    await t.step("resetTestEnv", () => {
        init_env_for_test();
        assert(env.APP_DB_PREFIX === APP_DB_PREFIX);
        assert(env.SL_REQUEST_SIGN_KEY === SL_REQUEST_SIGN_KEY);
        assert(env.ALLOW_SL_USER_AGENT_PART === ALLOW_SL_USER_AGENT_PART);
        assert(env.SL_ADMIN_LIST === SL_ADMIN_LIST);
    });
});
