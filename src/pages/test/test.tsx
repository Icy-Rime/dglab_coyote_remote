import { useState } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { setLang, setTheme, setDebug } from "../../store/browser_var.ts";
import { Drawer } from "../../components/drawer/drawer.tsx";
import type { FunctionComponent } from "preact";
import { FooterRecord } from "../../components/footer_record/footer_record.tsx";
import { Icon } from "../../components/icon/icon.tsx";
import { HeaderNav } from "../../components/header_nav/header_nav.tsx";

export const TestPage: FunctionComponent = (_) => {
    const t = useTranslator();
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <HeaderNav></HeaderNav>
            <button type="button" onClick={() => setIsOpen(true)}>Open</button>
            <Icon name="feather"></Icon>
            <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} class="container">
                <div class="container">
                    <h3>{t({ zh: "你好", en: "Hello" })}</h3>
                    <button type="button" onClick={() => setLang("zh")}>ZH</button>
                    <span></span>
                    <button type="button" onClick={() => setLang("en")}>EN</button>
                    <br />
                    <button type="button" onClick={() => setTheme("dark")}>Dark</button>
                    <span></span>
                    <button type="button" onClick={() => setTheme("light")}>Light</button>
                    <br />
                    <button type="button" onClick={() => setDebug(true)}>Debug On</button>
                    <span></span>
                    <button type="button" onClick={() => setDebug(false)}>Debug Off</button>
                    <br />
                    <button type="button" onClick={() => setIsOpen(false)}>Close</button>
                </div>
            </Drawer>
            <FooterRecord />
        </>
    );
};
export default TestPage;
