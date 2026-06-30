import { initKv } from "./data/kv.ts";
import { startKeepliveTask } from "./controller/event_client.ts";
import { handler, registerDefaultRoutes } from "./router/router.ts";

// start
await initKv();
registerDefaultRoutes();
startKeepliveTask();
export default {
    fetch: handler,
} satisfies Deno.ServeDefaultExport;
