import type { RouterHandler } from "../router.d.ts";
import { authFromRequest } from "../../controller/avatar.ts";
import { PathPattern } from "../pattern.ts";
import { registerRoute } from "../router.ts";
import { response } from "../response.ts";
import { addInfo, deleteInfo, getInfoContent, getInfoList, updateInfoContent } from "../../data/info.ts";

const handleAddInfo: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed || !auth.isAdmin) {
            return response(403);
        }
        let infoId = "";
        let infoContent = "";
        try {
            const param = await req.json();
            infoId = param.infoId ?? "";
            infoContent = param.infoContent ?? "";
        } catch {
            return response(400);
        }
        if (!infoId || !infoContent) {
            return response(400);
        }
        if (await addInfo(infoId, infoContent)) {
            return response(200);
        } else {
            return response(409);
        }
    }
};

const handleUpdateInfo: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed || !auth.isAdmin) {
            return response(403);
        }
        let infoId = "";
        let infoContent = "";
        try {
            const param = await req.json();
            infoId = param.infoId ?? "";
            infoContent = param.infoContent ?? "";
        } catch {
            return response(400);
        }
        if (!infoId || !infoContent) {
            return response(400);
        }
        if (await updateInfoContent(infoId, infoContent)) {
            return response(200);
        } else {
            return response(404);
        }
    }
};

const handleDeleteInfo: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "POST") {
        const auth = await authFromRequest(req);
        if (!auth.authed || !auth.isAdmin) {
            return response(403);
        }
        let infoId = "";
        try {
            const param = await req.json();
            infoId = param.infoId ?? "";
        } catch {
            return response(400);
        }
        if (!infoId) {
            return response(400);
        }
        if (await deleteInfo(infoId)) {
            return response(200);
        } else {
            return response(404);
        }
    }
};

const handleListInfo: RouterHandler = async (req, _params) => {
    if (req.method.toUpperCase() === "GET") {
        return response(200, await getInfoList());
    }
};

const handleGetInfo: RouterHandler = async (req, params) => {
    if (req.method.toUpperCase() === "GET") {
        const infoId = params["infoId"] ?? "";
        const content = await getInfoContent(infoId);
        if (!content) {
            return response(404);
        }
        return response(200, content);
    }
};

export default () => {
    registerRoute(new PathPattern("/api/info/add"), handleAddInfo);
    registerRoute(new PathPattern("/api/info/update"), handleUpdateInfo);
    registerRoute(new PathPattern("/api/info/delete"), handleDeleteInfo);
    registerRoute(new PathPattern("/api/info/list"), handleListInfo);
    registerRoute(new PathPattern("/api/info/content/:*infoId"), handleGetInfo);
};
