import { initKv } from "./data/kv.ts";
import { initLogger } from "./utils/logger.ts";
import { startKeepliveTask } from "./controller/event_client.ts";
import { handler, registerDefaultRoutes } from "./router/router.ts";

// start
await initKv();
await initLogger();
registerDefaultRoutes();
startKeepliveTask();
export default {
    fetch: handler,
} satisfies Deno.ServeDefaultExport;
