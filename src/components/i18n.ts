import { useMemo } from "preact/hooks";
import { useTranslator } from "../hooks/i18n.ts";

export const useCommonTranslator = () => {
    const t = useTranslator();
    const translated = useMemo(() => {
        return {
            cancel: t({ zh: "取消", en: "Cancel" }),
            confirm: t({ zh: "确认", en: "Confirm" }),
            ok: t({ zh: "好的", en: "Ok" }),
        };
    }, [t]);
    return translated;
};
