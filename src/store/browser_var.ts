import { persistentAtom } from "@nanostores/persistent";
import { atom, onSet } from "nanostores";

type ThemeType = "light" | "dark";

/* ==== Theme Color Scheme ==== */
const DARK = "(prefers-color-scheme: dark)";
const LIGHT = "(prefers-color-scheme: light)";

const getCurrentColorScheme = () => {
    const mqDark = globalThis.matchMedia(DARK);
    if (mqDark.matches) {
        return "dark" as ThemeType;
    }
    return "light" as ThemeType;
};

export const $theme = persistentAtom<ThemeType>("_theme_", getCurrentColorScheme(), { listen: false });

onSet($theme, ({ newValue }) => {
    // set theme for page
    globalThis?.document.querySelector("html")?.setAttribute("data-theme", newValue);
});

export const setTheme = (newValue: ThemeType) => {
    $theme.set(newValue);
};

(() => {
    // listen to browser color schema change
    const mqDark = globalThis.matchMedia(DARK);
    mqDark.addEventListener("change", (evt) => {
        if (!evt.matches) return;
        console.log(evt.media);
        setTheme("dark");
    });
    const mqLight = globalThis.matchMedia(LIGHT);
    mqLight.addEventListener("change", (evt) => {
        if (!evt.matches) return;
        console.log(evt.media);
        setTheme("light");
    });
})();

/* ==== Language ==== */

export const LANGUAGE_CODE_LIST = [
    "zh",
    "en",
] as const;
export type TextRecord = { [K in typeof LANGUAGE_CODE_LIST[number]]: string };
export type LanguageCode = keyof TextRecord;

const getDefaultLanguage = () => {
    for (let lang of globalThis?.navigator?.languages ?? []) {
        lang = lang.toLowerCase();
        if (LANGUAGE_CODE_LIST.includes(lang as LanguageCode)) {
            return lang as LanguageCode;
        }
        if (lang.indexOf("-") > 0) {
            // search substring
            for (const mtLang of LANGUAGE_CODE_LIST) {
                if (lang.indexOf(mtLang) >= 0) {
                    return mtLang as LanguageCode;
                }
            }
        }
    }
    return "en" as LanguageCode; // default return en
};

export const $lang = persistentAtom<LanguageCode>("_lang_", getDefaultLanguage());
export const setLang = (newValue: LanguageCode) => {
    $lang.set(newValue);
};

/* ==== Drawer Nav Open ==== */
export const $drawerNavOpen = atom(false);

export const setDrawerNavOpen = (value: boolean) => {
    $drawerNavOpen.set(value);
};
