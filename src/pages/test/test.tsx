import { useState } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { setDebug, setLang, setTheme } from "../../store/browser_var.ts";
import type { FunctionComponent } from "preact";
import { FooterRecord } from "../../components/footer_record/footer_record.tsx";
import { Icon } from "../../components/icon/icon.tsx";
import { HeaderNav } from "../../components/header_nav/header_nav.tsx";

import { Dialog, useAlart, useConfirm, usePrompt } from "../../components/dialog/dialog.tsx";
import { useToast } from "../../components/toast/toast.tsx";

export const TestPage: FunctionComponent = (_) => {
    const t = useTranslator();
    const [isOpen, setIsOpen] = useState(false);
    const toast = useToast();
    const prompt = usePrompt();
    const confirm = useConfirm();
    const alert = useAlart();
    // const d = useDialog();
    return (
        <>
            <HeaderNav></HeaderNav>
            <button type="button" onClick={() => setIsOpen(true)}>Open</button>
            <button
                type="button"
                onClick={async () => {
                    const res = await prompt("What do you want?", "Toys?");
                    if (res) await alert(res);
                }}
            >
                Prompt
            </button>
            <button
                type="button"
                onClick={async () => {
                    const res = await confirm("Are you sure?");
                    await alert(res ? "Confirmed" : "Canceled");
                }}
            >
                Confirm
            </button>
            <button
                type="button"
                onClick={async () => {
                    const res = await alert("This is Notice!");
                    console.log(res);
                }}
            >
                Alert
            </button>
            <br />
            <button type="button" onClick={() => toast("Hello Dragon 1", "normal")}>Toast1</button>
            <button type="button" onClick={() => toast("Hello Dragon 2", "success")}>Toast2</button>
            <button type="button" onClick={() => toast("Hello Dragon 3", "error")}>Toast3</button>
            <button type="button" onClick={() => toast("Hello Dragon 4", "warn")}>Toast4</button>
            <Icon name="feather"></Icon>
            <Dialog isOpen={isOpen} onCancel={() => setIsOpen(false)} title="Dialog">
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
            </Dialog>
            <FooterRecord />
        </>
    );
};
export default TestPage;
