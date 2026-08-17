import type { FunctionComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { request } from "../../utils/request.ts";
import { useConfirm, usePrompt } from "../../components/dialog/dialog.tsx";
import { Icon } from "../../components/icon/icon.tsx";

export const ManageInfoPage: FunctionComponent = (_) => {
    const t = useTranslator();
    const [infoList, setInfoList] = useState<string[]>([]);
    const [infoMap, setInfoMap] = useState<Record<string, string>>({});
    const prompt = usePrompt();
    const confirm = useConfirm();

    /* Actions */
    const updateInfoList = useCallback(async (infoIdNeedUpdate: string[] = []) => {
        const infoList = await request<string[]>("/api/info/list", "GET");
        const newInfoMap: Record<string, string> = {};
        await Promise.all(infoList.map(async (infoId) => {
            try {
                if (infoIdNeedUpdate.includes(infoId) || infoMap[infoId] === undefined) {
                    const info = await request<string>(`/api/info/content/${encodeURIComponent(infoId)}`, "GET");
                    newInfoMap[infoId] = info;
                } else {
                    newInfoMap[infoId] = infoMap[infoId];
                }
            } catch (error) {
                console.error("updateInfoList error:", error);
                newInfoMap[infoId] = infoMap[infoId];
            }
        }));
        setInfoList(infoList);
        setInfoMap(newInfoMap);
    }, [setInfoList, setInfoMap, infoMap]);

    const fetchInfoContent = useCallback(async (infoId: string) => {
        const content = await request<string>(`/api/info/content/${encodeURIComponent(infoId)}`, "GET");
        const newInfoMap = { ...infoMap, [infoId]: content };
        setInfoMap(newInfoMap);
    }, [infoMap, setInfoMap]);

    const actionAddInfo = useCallback(async () => {
        const infoId = await prompt(t({ zh: "信息ID", en: "Info ID" }));
        if (!infoId) return;
        const infoContent = await prompt(t({ zh: "信息内容", en: "Info Content" }));
        if (!infoContent) return;
        await request("/api/info/add", "POST", { infoId, infoContent });
        await updateInfoList([infoId]);
    }, [updateInfoList, prompt]);

    const actionEditInfo = useCallback(async (infoId: string) => {
        const infoContent = await prompt(t({ zh: "信息内容", en: "Info Content" }));
        if (!infoContent) return;
        await request("/api/info/update", "POST", { infoId, infoContent });
        await fetchInfoContent(infoId);
    }, [fetchInfoContent, prompt]);

    const actionDeleteInfo = useCallback(async (infoId: string) => {
        if (!await confirm(t({ zh: "确认删除信息吗？", en: "Are you sure to delete info?" }))) return;
        await request("/api/info/delete", "POST", { infoId });
        await updateInfoList();
    }, [updateInfoList, confirm]);

    /* Effect */
    useEffect(() => {
        updateInfoList();
    }, []);

    return (
        <div style="width: 100%; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: top; padding: var(--pico-spacing);">
            {infoList.map((infoId) => {
                return (
                    <article key={infoId} style="flex: 0 0 auto; width: 100%;">
                        <header>
                            <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                                <div style="flex: 1 1 auto;">{infoId}</div>
                                <Icon
                                    name="edit"
                                    style="flex: 0 0 auto; cursor: pointer; float: right; margin: 0 0.5rem;"
                                    onClick={() => actionEditInfo(infoId)}
                                />
                                <Icon
                                    name="trash-2"
                                    style="flex: 0 0 auto; cursor: pointer; float: right; color: var(--tinyui-error-color);"
                                    onClick={() => actionDeleteInfo(infoId)}
                                />
                            </div>
                        </header>
                        {infoMap[infoId]}
                        <br />
                    </article>
                );
            })}
            <button style="flex: 0 0 auto;" onClick={actionAddInfo}>{t({ zh: "添加信息", en: "Add Info" })}</button>
        </div>
    );
};
export default ManageInfoPage;
