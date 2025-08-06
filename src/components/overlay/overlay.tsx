import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { h, render } from "preact";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useMergedClassName } from "../utils.ts";

export type OverlayHookOptions = {
    children?: ComponentChildren;
} & JSX.HTMLAttributes<HTMLDivElement>;

export type OverlayProps = OverlayHookOptions & {
    isOpen?: boolean;
};

type OverlayRootProps = Omit<OverlayProps, "isOpen">;

const OverlayRoot: FunctionComponent<OverlayRootProps> = (props: OverlayRootProps) => {
    const className = useMergedClassName("tinyui_overlay_layer", props.class);
    return (
        <div {...props} class={className}>
            {props.children}
        </div>
    );
};

export const useOverlay = (props: OverlayHookOptions = {}) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // render overlay
            if (rootRef.current === null) {
                rootRef.current = document.createElement("div");
                rootRef.current.className = "tinyui_overlay_container";
            }
            const vnode = h(OverlayRoot, props);
            render(vnode, rootRef.current);
            document.body.appendChild(rootRef.current);
        }
        return () => {
            // clean when unmount
            if (rootRef.current !== null) {
                document.body.removeChild(rootRef.current);
                rootRef.current = null;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && rootRef.current) {
            // update render overlay
            const vnode = h(OverlayRoot, props);
            render(vnode, rootRef.current);
        }
    }, [props]);

    const api = useMemo(() => {
        return {
            setIsOpen,
            open: () => setIsOpen(true),
            close: () => setIsOpen(false),
        };
    }, [setIsOpen]);
    return api;
};

export const Overlay: FunctionComponent<OverlayProps> = (props: OverlayProps = {}) => {
    const api = useOverlay(props);

    useEffect(() => {
        if (props.isOpen) {
            api.open();
        } else {
            api.close();
        }
    }, [props.isOpen]);

    return null;
};

export default Overlay;
