import { useStore } from "@nanostores/preact";
import { $lang, TextRecord } from "../store/browser_var.ts";
import { useMemo } from "preact/hooks";

export const useTranslator = () => {
    const lang = useStore($lang, {});
    return useMemo(() => ((text: TextRecord) => {
        return text[lang] ?? text["en"];
    }), [lang]);
};
