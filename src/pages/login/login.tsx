import type {
    ComponentChildren,
    CSSProperties,
    FunctionComponent,
    HTMLAttributes,
    PointerEventHandler,
    Ref,
} from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { setPageLoading } from "../../store/browser_var.ts";
import { authByCode } from "../../store/user_auth.ts";
import { useToast } from "../../components/toast/toast.tsx";
import { useTranslator } from "../../hooks/i18n.ts";
import { useLocation } from "../../hooks/router.ts";

type SegmentDisplayProp = HTMLAttributes<HTMLDivElement> & {
    segments: number;
    fontSize?: string;
    color?: string;
    hintColor?: string;
    children?: ComponentChildren;
};
const SegmentDisplay: FunctionComponent<SegmentDisplayProp> = (props) => {
    const hintText = useMemo(() => "8".repeat(props.segments), [props.segments]);
    const baseStyleText = useMemo(() => {
        let text = "line-height: 1.0;direction: ltr;";
        if (props.fontSize) text = text + "font-size: " + props.fontSize + ";";
        return text;
    }, [props.fontSize]);
    const hintStyleText = useMemo(() => {
        let text = baseStyleText + "z-index: -1;position: relative;";
        if (props.hintColor) text += "color: " + props.hintColor + ";";
        if (props.hintColor) {
            text += "color: " + props.hintColor + ";";
        } else {
            if (props.color) {
                text += "color: color-mix(in srgb, " + props.color + " 10%, transparent);";
            } else {
                text += "color: color-mix(in srgb, currentcolor 10%, transparent);";
            }
        }
        return text;
    }, [baseStyleText, props.hintColor, props.color]);
    const dispStyleText = useMemo(() => {
        let text = baseStyleText + "z-index: 1;position: absolute;top: 0;left: 0;";
        if (props.color) text += "color: " + props.color + ";";
        return text;
    }, [baseStyleText, props.color]);
    const divProps = (() => {
        const p: Partial<SegmentDisplayProp> = { ...props };
        delete p.segments;
        delete p.children;
        delete p.fontSize;
        delete p.color;
        delete p.hintColor;
        return p as HTMLAttributes<HTMLDivElement>;
    })();
    return (
        <div {...divProps}>
            <div style="font-family: DSEG7Modern-Italic; position: relative;pointer-events: none;user-select: none;">
                <div style={hintStyleText}>
                    <span>{hintText}</span>
                </div>
                <div style={dispStyleText}>
                    <span>{props.children}</span>
                </div>
            </div>
        </div>
    );
};

const enum KeyButton {
    K1 = "1",
    K2 = "2",
    K3 = "3",
    K4 = "4",
    K5 = "5",
    K6 = "6",
    K7 = "7",
    K8 = "8",
    K9 = "9",
    K0 = "0",
    KCONFIRM = "✓",
    KBACKSPACE = "⌫",
}
type KPadVKProp = HTMLAttributes<HTMLDivElement> & {
    onKeypadClick?: (key: KeyButton) => void | Promise<void>;
    children?: ComponentChildren;
};
const KPadVK: FunctionComponent<KPadVKProp> = (props) => {
    const kpadParentRef = useRef(undefined as HTMLDivElement | undefined);
    const [kpadByWidth, setKpadByWidth] = useState(true);
    const kpadStyle = useMemo(() => {
        return {
            boxSizing: "border-box",
            aspectRatio: "3 / 4",
            display: "grid",
            grid: "1fr 1fr 1fr 1fr / 1fr 1fr 1fr",
            maxWidth: "100%",
            maxHeight: "100%",
            width: kpadByWidth ? "100%" : "auto",
            height: kpadByWidth ? "auto" : "100%",
            borderRadius: "1px",
            gap: "0.5rem",
            margin: "0 1rem",
            userSelect: "none",
        } as CSSProperties;
    }, [kpadByWidth]);
    const keyStyle = useMemo(() => {
        return {
            boxSizing: "border-box",
            aspectRatio: "1",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            borderTop: "1px var(--pico-primary) solid",
            borderRadius: "1rem",
            boxShadow: "inset color-mix(in srgb, var(--pico-primary) 20%, transparent) 0 -0.2rem 0.1rem 0.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            contain: "strict",
            cursor: "pointer",
        } as CSSProperties;
    }, []);
    const keyHandler = useMemo(() => {
        let cb = (_: KeyButton) => {};
        if (props.onKeypadClick) {
            cb = props.onKeypadClick;
        }
        //PointerEventHandler<HTMLDivElement>
        return ((event) => {
            const div = event.target as HTMLDivElement;
            const keyText = div.innerText.trim();
            cb(keyText as KeyButton);
        }) as PointerEventHandler<HTMLDivElement>;
    }, [props.onKeypadClick]);
    useEffect(() => {
        if (kpadParentRef.current) {
            // listen to the size change
            const div = kpadParentRef.current;
            const onResize = () => {
                const w = div.clientWidth;
                const h = div.clientHeight;
                if ((w / h) >= (3 / 4)) {
                    // limit by height
                    setKpadByWidth(false);
                } else {
                    // limit by width
                    setKpadByWidth(true);
                }
            };
            onResize();
            window.addEventListener("resize", onResize);
            return () => window.removeEventListener("resize", onResize);
        }
    }, [kpadParentRef.current, setKpadByWidth]);
    return (
        <div ref={kpadParentRef as Ref<HTMLDivElement>} {...props}>
            <div style={kpadStyle}>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K1}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K2}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K3}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K4}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K5}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K6}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K7}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K8}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K9}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.KCONFIRM}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.K0}</div>
                <div style={keyStyle} onPointerDown={keyHandler}>{KeyButton.KBACKSPACE}</div>
            </div>
        </div>
    );
};

export const LoginPage: FunctionComponent = (_p) => {
    const [_r, setLocation] = useLocation();
    const t = useTranslator();
    const toast = useToast();
    const [code, setCode] = useState("");
    const doLogin = useMemo(() => async () => {
        if (code.length !== 16) {
            return;
        }
        try {
            setPageLoading(true);
            const success = await authByCode(code);
            await new Promise((r) => setTimeout(r, 1000));
            if (!success) {
                await new Promise((r) => setTimeout(r, 1000));
                toast(
                    t({ zh: "登录失败", en: "Failed to login" }),
                    "error",
                    "long",
                );
            } else {
                setLocation("/");
            }
        } finally {
            setPageLoading(false);
        }
    }, [code, setLocation, t, toast]);
    const onKeypadClick = useMemo(() => (k: KeyButton) => {
        let newCode = code;
        switch (k) {
            case KeyButton.K1:
            case KeyButton.K2:
            case KeyButton.K3:
            case KeyButton.K4:
            case KeyButton.K5:
            case KeyButton.K6:
            case KeyButton.K7:
            case KeyButton.K8:
            case KeyButton.K9:
            case KeyButton.K0:
                newCode += k;
                break;
            case KeyButton.KBACKSPACE:
                newCode = newCode.substring(0, newCode.length - 1);
                break;
            case KeyButton.KCONFIRM:
                doLogin();
                break;
            default:
                return;
        }
        newCode = newCode.substring(0, 16);
        setCode(newCode);
    }, [code, setCode]);
    useEffect(() => {
        const callback = (event: KeyboardEvent) => {
            const k = event.key;
            let newCode = code;
            let changed = false;
            if ("0123456789".includes(k)) {
                newCode += k;
                changed = true;
            } else if (["Backspace", "Delete"].includes(k)) {
                newCode = newCode.substring(0, newCode.length - 1);
                changed = true;
            } else if (["Enter"].includes(k)) {
                // login
                doLogin();
            }
            if (changed) {
                newCode = newCode.substring(0, 16);
                setCode(newCode);
            }
        };
        globalThis.addEventListener("keydown", callback);
        return () => globalThis.removeEventListener("keydown", callback);
    }, [code, setCode]);
    return (
        <div style="width: 100%; flex: 1 1 auto; display: flex; flex-direction: column;justify-content: space-between;">
            {/* code display */}
            <div style="flex: 0 0 auto; width: 100%; display: flex; justify-content: center; align-items: center;">
                <div style="width: 90vw; height: 30vw; margin: 5vw auto; border: none; border-radius: 2vw;  box-shadow: color-mix(in srgb, var(--pico-primary) 20%, transparent) 0.25vw 0.5vw 1vw 1vw inset;display: flex;flex-direction: column;justify-content: space-evenly;align-items: center;">
                    <div style="display: flex;justify-content: space-evenly;width: 100%;">
                        <SegmentDisplay segments={4} fontSize="10vw">{code.substring(0, 4)}</SegmentDisplay>
                        <SegmentDisplay segments={4} fontSize="10vw">{code.substring(4, 8)}</SegmentDisplay>
                    </div>
                    <div style="display: flex;justify-content: space-evenly;width: 100%;">
                        <SegmentDisplay segments={4} fontSize="10vw">{code.substring(8, 12)}</SegmentDisplay>
                        <SegmentDisplay segments={4} fontSize="10vw">{code.substring(12, 16)}</SegmentDisplay>
                    </div>
                </div>
            </div>
            {/* keyboard */}
            <KPadVK
                style="flex: 1 1 auto;width: 100%;display: flex;justify-content: center;align-items: start;contain: strict;padding-bottom: 1rem;"
                onKeypadClick={onKeypadClick}
            />
        </div>
    );
};

export default LoginPage;
