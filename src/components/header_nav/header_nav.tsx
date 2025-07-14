import type { FunctionComponent, JSX } from "preact";
import { useMemo } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { useMergedClassName } from "../utils.ts";
import { Icon } from "../icon/icon.tsx";
import { setDrawerNavOpen } from "../../store/browser_var.ts";

export type HeaderNavProps = JSX.HTMLAttributes<HTMLDivElement> & {
    title?: string;
};

export const HeaderNav: FunctionComponent<HeaderNavProps> = (props: HeaderNavProps) => {
    const [_, setLocation] = useLocation();
    const className = useMergedClassName("mysite_header_nav_container", props.class);
    const goHome = useMemo((() => () => setLocation("/")), [setLocation]);
    const openDrawerNav = useMemo((() => () => setDrawerNavOpen(true)), [setDrawerNavOpen]);
    return (
        <div {...props} class={className}>
            <div class="mysite_header_nav_icon_wrap" onClick={goHome}>
                <Icon name="home" />
            </div>
            <span>{props.title ?? ""}</span>
            <div class="mysite_header_nav_icon_wrap" onClick={openDrawerNav}>
                <Icon name="menu" />
            </div>
        </div>
    );
};
export default HeaderNav;
