import type { RouterHandler } from "../router.d.ts";
import { authFromRequest } from "../../controller/avatar.ts";
import { PathPattern } from "../pattern.ts";
import { registerRoute } from "../router.ts";
import { response } from "../response.ts";
import { createEventClient, getEventClient } from "../../controller/event_client.ts";

const handleSubscribeDevice: RouterHandler = async (req, params) => {
    if (req.method.toUpperCase() === "GET") {
        const auth = await authFromRequest(req);
        if (!auth.authed) {
            return response(403);
        }
        const user = auth.avatarKey;
        const device = params["device"] ?? "";
        if (!device) {
            return response(400);
        }
        const client = await createEventClient(user, device);
        if (!client) {
            return response(403);
        }
        return client.makeResponse();
    }
};
const handleEmitEvent: RouterHandler = async (req, params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed) {
            return response(403);
        }
        const user = auth.avatarKey;
        const device = params["device"] ?? "";
        if (!device) {
            return response(400);
        }
        const text = await req.text();
        const event = params["event"] ?? undefined;
        const client = await getEventClient(user, device);
        if (!client) {
            return response(404);
        }
        client.emitEvent(event, text);
        return response(200);
    }
};

export default () => {
    registerRoute(new PathPattern("/api/event/subscribe/:*device"), handleSubscribeDevice);
    registerRoute(new PathPattern("/api/event/emit/:*device"), handleEmitEvent);
    registerRoute(new PathPattern("/api/event/emit/:*device/:*event"), handleEmitEvent);
};
