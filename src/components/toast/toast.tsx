import { useEffect, useState } from "preact/hooks";
import { useOverlay } from "../overlay/overlay.tsx";

export type ToastType = "normal" | "warn" | "error" | "success";
export type ToastLength = "short" | "long";

const CLASS_NAME_OPENING = [
    "tinyui_toast_wrapper animate__animated animate__fadeIn animate__faster",
];

const CLASS_NAME_CLOSING = [
    "tinyui_toast_wrapper animate__animated animate__fadeOut animate__faster",
];

export const useToast = () => {
    const [toastType, setToastType] = useState("normal" as ToastType);
    const [toastLength, setToastLength] = useState("short" as ToastLength);
    const [text, setText] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // overlay
    const ovl = useOverlay({
        style: { pointerEvents: "none" },
        children: (
            <div class={isOpen ? CLASS_NAME_OPENING[0] : CLASS_NAME_CLOSING[0]}>
                <div class="tinyui_toast_inner" data-type={toastType}>{text}</div>
            </div>
        ),
    });

    useEffect(() => {
        let timer = -1;
        if (isOpen) {
            timer = setTimeout(() => {
                setIsOpen(false);
            }, toastLength === "long" ? 10_000 : 4_000);
        } else {
            // close
            timer = timer = setTimeout(() => {
                ovl.close();
            }, 500);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [isOpen, text, toastType, toastLength]);

    return (
        msg: string,
        type: ToastType = "normal",
        length: ToastLength = "short",
    ) => {
        // show toast
        setText(msg);
        setToastType(type);
        setToastLength(length);
        setIsOpen(true);
        ovl.open();
    };
};
