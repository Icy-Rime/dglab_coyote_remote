import type { FunctionComponent } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { acquireWakeLock, releaseWakeLock } from "../../store/browser_var.ts";

export const ScreenSaverOverlay: FunctionComponent<{ isOpen: boolean; onClose: () => void }> = (
    { isOpen, onClose },
) => {
    const t = useTranslator();
    const [xy, setXY] = useState([50, 50]);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const outterStyle = useMemo(() => {
        let style = "width: 100%; height: 100%; background-color: #000; overflow: hidden;";
        if (!isOpen) {
            style += " display: none; position: absolute;";
        } else {
            style += " display: block; position: fixed; cursor: pointer;";
        }
        return style;
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setXY([50, 50]);
        const handler = setInterval(() => {
            // move xy randomly
            setXY([Math.random() * 100, Math.random() * 100]);
        }, 5000);
        return () => clearInterval(handler);
    }, [setXY, isOpen]);
    useEffect(() => {
        if (isOpen) {
            fullscreenRef.current?.requestFullscreen().then(() => {
                return acquireWakeLock();
            }).catch(() => {
                releaseWakeLock();
            });
        } else {
            document.exitFullscreen();
            releaseWakeLock();
        }
    }, [isOpen]);
    return (
        <div style={outterStyle} ref={fullscreenRef} onClick={onClose}>
            <span
                style={{
                    fontSize: "32px",
                    color: "#888",
                    position: "absolute",
                    top: `${xy[0]}%`,
                    left: `${xy[1]}%`,
                    transform: "translate(-50%, -50%)",
                    overflow: "hidden",
                    overflowWrap: "nowrap",
                    whiteSpace: "pre",
                }}
            >
                {t({ zh: "屏幕保护", en: "Screen Saver" })}
            </span>
        </div>
    );
};
export default ScreenSaverOverlay;
