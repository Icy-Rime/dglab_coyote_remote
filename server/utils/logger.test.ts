import { assertEquals } from "@std/assert";
import { logger } from "./logger.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.test("utils/logger", async (t) => {
    await t.step("basic_functionality", async () => {
        logger.info("test info log");
        logger.error("test error log");
    });
});
