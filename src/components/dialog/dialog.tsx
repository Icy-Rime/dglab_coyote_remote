import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useOverlay } from "../overlay/overlay.tsx";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useMergedClassName } from "../utils.ts";
import { useCommonTranslator } from "../i18n.ts";
import Icon from "../icon/icon.tsx";

export type DialogHookProps = JSX.HTMLAttributes<HTMLElement> & {
    onCancel?: () => void;
    onConfirm?: () => void;
    title?: ComponentChildren;
    showCloseButton?: boolean;
    clickOutsideCancel?: boolean;
    children?: ComponentChildren;
    header?: ComponentChildren;
    footer?: ComponentChildren;
};

export type DialogProps = DialogHookProps & {
    isOpen?: boolean;
};

const CLASS_NAME_OPENING = [
    "tinyui_dialog_bg_shadow animate__animated animate__fadeIn animate__faster",
    "tinyui_dialog_container animate__animated animate__zoomIn animate__faster",
];

const CLASS_NAME_CLOSING = [
    "tinyui_dialog_bg_shadow animate__animated animate__fadeOut animate__faster",
    "tinyui_dialog_container animate__animated animate__zoomOut animate__faster",
];

export const useDialog = (props: DialogHookProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [styleClassNames, setStyleClassNames] = useState(CLASS_NAME_CLOSING);
    const classNameContent = useMergedClassName(styleClassNames[1], props.class);
    const onCancel = useMemo(() => props.onCancel ? props.onCancel : () => {}, [props.onCancel]);
    const onConfirm = useMemo(() => props.onConfirm ? props.onConfirm : () => {}, [props.onConfirm]);
    const t = useCommonTranslator();
    const showCloseButton = props.showCloseButton ?? false;
    const clickOutsideCancel = props.clickOutsideCancel ?? false;
    const ovl = useOverlay({
        children: (
            <>
                <div class={styleClassNames[0]}></div>
                <div class="tinyui_dialog_wrapper" onClick={clickOutsideCancel ? onCancel : undefined}>
                    <article
                        {...props}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        class={classNameContent}
                    >
                        {(!showCloseButton) && (!props.title) && (!props.header)
                            ? null
                            : (
                                <header class="tinyui_dialog_header">
                                    {props.header ? props.header : (
                                        <>
                                            {typeof props.title === "string" ? <h3>{props.title}</h3> : props.title}
                                            {showCloseButton
                                                ? (
                                                    <button
                                                        type="button"
                                                        class="tinyui_dialog_header_close"
                                                        onClick={onCancel}
                                                    >
                                                        <Icon name="x"></Icon>
                                                    </button>
                                                )
                                                : null}
                                        </>
                                    )}
                                </header>
                            )}

                        {props.children}
                        <footer class="tinyui_dialog_footer">
                            {props.footer ? props.footer : (
                                <>
                                    <button type="button" class="secondary" onClick={onCancel}>{t.cancel}</button>
                                    <button type="button" class="primary" onClick={onConfirm}>{t.confirm}</button>
                                </>
                            )}
                        </footer>
                    </article>
                </div>
            </>
        ),
    });

    useEffect(() => {
        if (isOpen) {
            ovl.open();
            setStyleClassNames(CLASS_NAME_OPENING);
            return () => {};
        } else {
            setStyleClassNames(CLASS_NAME_CLOSING);
            const timer = setTimeout(() => {
                ovl.close();
            }, 500);
            return () => {
                clearTimeout(timer);
            };
        }
    }, [isOpen]);

    const api = useMemo(() => {
        return {
            setIsOpen,
            open: () => setIsOpen(true),
            close: () => setIsOpen(false),
            closeAndWait: () => {
                setIsOpen(false);
                return new Promise((r) => setTimeout(r, 500)) as Promise<void>;
            },
        };
    }, [setIsOpen]);
    return api;
};

export const Dialog: FunctionComponent<DialogProps> = (props: DialogProps) => {
    const api = useDialog(props);

    useEffect(() => {
        if (props.isOpen) {
            api.open();
        } else {
            api.close();
        }
    }, [props.isOpen]);

    return null;
};

export default Dialog;

export const usePrompt = () => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [hint, setHint] = useState("");
    const resolveRef = useRef((_: string | undefined) => {});
    const inputRef = useRef<HTMLInputElement | null>(null);
    const onConfirm = useMemo(() => () => {
        resolveRef.current(inputRef.current?.value ?? "");
    }, [resolveRef, inputRef]);
    const onCancel = useMemo(() => () => {
        resolveRef.current(undefined);
    }, [resolveRef]);
    const dlg = useDialog({
        title: title,
        showCloseButton: false,
        children: (
            <>
                <label>{message}</label>
                <input ref={inputRef} placeholder={hint}></input>
            </>
        ),
        onConfirm,
        onCancel,
    });

    return useMemo(() => async (message: string, hint: string = "", title: string = "") => {
        const res = await new Promise((resolve: (_: string | undefined) => void) => {
            resolveRef.current = resolve as (__2: string | undefined) => void;
            setTitle(title);
            setMessage(message);
            setHint(hint);
            dlg.open();
        });
        await dlg.closeAndWait();
        return res;
    }, [setTitle, setMessage, dlg, resolveRef]);
};

export const useConfirm = () => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const resolveRef = useRef((_: boolean) => {});
    const onConfirm = useMemo(() => () => {
        resolveRef.current(true);
    }, [resolveRef]);
    const onCancel = useMemo(() => () => {
        resolveRef.current(false);
    }, [resolveRef]);
    const dlg = useDialog({
        title: title,
        showCloseButton: false,
        children: message,
        onConfirm,
        onCancel,
    });

    return useMemo(() => async (message: string, title: string = "") => {
        const res = await new Promise((resolve: (_: boolean) => void) => {
            resolveRef.current = resolve as (__2: boolean) => void;
            setTitle(title);
            setMessage(message);
            dlg.open();
        });
        await dlg.closeAndWait();
        return res;
    }, [setTitle, setMessage, dlg, resolveRef]);
};

export const useAlart = () => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const resolveRef = useRef(() => {});
    const t = useCommonTranslator();
    const okButton = useMemo(() => (
        <button
            type="button"
            onClick={() => {
                resolveRef.current();
            }}
        >
            {t.ok}
        </button>
    ), [resolveRef]);
    const onCancel = useMemo(() => () => {
        resolveRef.current();
    }, [resolveRef]);
    const dlg = useDialog({
        title: title,
        showCloseButton: false,
        children: message,
        footer: okButton,
        onCancel,
    });

    return useMemo(() => async (message: string, title: string = "") => {
        await new Promise((resolve) => {
            resolveRef.current = resolve as () => void;
            setTitle(title);
            setMessage(message);
            dlg.open();
        });
        await dlg.closeAndWait();
    }, [setTitle, setMessage, dlg, resolveRef]);
};
