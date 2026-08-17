import { assert } from "@std/assert";
import { closeKv, getKv, initKv } from "./kv.ts";
import { addInfo, deleteInfo, getInfoContent, getInfoList, updateInfoContent } from "./info.ts";

Deno.test("data/info", async (t) => {
    const INFO_ID = "info 0000";
    const INFO_CONTENT1 = "Info XXX";
    const INFO_CONTENT2 = "Info XXX2222";
    await initKv(true);
    await t.step("addInfo_getInfoList", async () => {
        assert(await addInfo(INFO_ID, INFO_CONTENT1));
        const lst = await getInfoList();
        assert(lst.includes(INFO_ID));
    });
    await t.step("getInfoContent1", async () => {
        const content = await getInfoContent("What Ever");
        assert(content === undefined);
    });
    await t.step("getInfoContent2", async () => {
        const content = await getInfoContent(INFO_ID);
        assert(content !== undefined);
        assert(content === INFO_CONTENT1);
    });
    await t.step("getInfoContent3", async () => {
        assert(await addInfo("k2", INFO_CONTENT1));
        assert(await addInfo("k3", INFO_CONTENT1));
        assert(await addInfo("k4", INFO_CONTENT1));
        const lst = await getInfoList();
        for (const id of lst) {
            const content = await getInfoContent(id);
            assert(content !== undefined);
        }
    });
    await t.step("updateInfoContent1", async () => {
        const result = await updateInfoContent("What Ever", INFO_CONTENT2);
        assert(result === false);
    });
    await t.step("updateInfoContent2", async () => {
        const result = await updateInfoContent(INFO_ID, INFO_CONTENT2);
        assert(result === true);
        const content = await getInfoContent(INFO_ID);
        assert(content !== undefined);
        assert(content === INFO_CONTENT2);
    });
    await t.step("deleteInfoContent", async () => {
        const result = await deleteInfo(INFO_ID);
        assert(result === true);
        const lst = await getInfoList();
        assert(!lst.includes(INFO_ID));
    });
    closeKv();
});
