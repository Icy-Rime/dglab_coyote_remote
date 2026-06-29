import { startKeepliveTask } from "./controller/event_client.ts";
import { handler } from "./router/router.ts";

// start
startKeepliveTask();
export default {
    fetch: handler,
} satisfies Deno.ServeDefaultExport;
