import { Overlay } from "../overlay/overlay.tsx";
import { useMergedClassName } from "../utils.ts";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";

export type DrawerProps = JSX.HTMLAttributes<HTMLDivElement> & {
    /** open status */
    isOpen?: boolean;
    /** callback when closed by the inner component, usually () => setIsOpen(false) */
    onClose?: () => void;
    children?: ComponentChildren;
};

const CLASS_NAME_OPENING = [
    "tinyui_drawer_bg_shadow animate__animated animate__fadeIn animate__faster",
    "tinyui_drawer_container animate__animated animate__slideInDown animate__faster",
];

const CLASS_NAME_CLOSING = [
    "tinyui_drawer_bg_shadow animate__animated animate__fadeOut animate__faster",
    "tinyui_drawer_container animate__animated animate__slideOutUp animate__faster",
];

export const Drawer: FunctionComponent<DrawerProps> = (props: DrawerProps) => {
    const [isRealOverlayOpen, setRealOverlayIsOpen] = useState(props.isOpen ?? false);
    const [styleClassNames, setStyleClassNames] = useState(props.isOpen ? CLASS_NAME_OPENING : CLASS_NAME_CLOSING);
    const classNameContent = useMergedClassName(styleClassNames[1], props.class);

    useEffect(() => {
        if (props.isOpen) {
            setRealOverlayIsOpen(true);
            setStyleClassNames(CLASS_NAME_OPENING);
            return () => {};
        } else {
            setStyleClassNames(CLASS_NAME_CLOSING);
            const timer = setTimeout(() => {
                setRealOverlayIsOpen(false);
            }, 500);
            return () => {
                clearTimeout(timer);
            };
        }
    }, [props.isOpen]);

    const onClose = useMemo(() => props.onClose ? props.onClose : () => {}, [props.onClose]);

    return (
        <Overlay isOpen={isRealOverlayOpen}>
            <div class={styleClassNames[0]}></div>
            <div class="tinyui_drawer_wrapper" onClick={onClose}>
                <div
                    {...props}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    class={classNameContent}
                >
                    {props.children}
                </div>
            </div>
        </Overlay>
    );
};
