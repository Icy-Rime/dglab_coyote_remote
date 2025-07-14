import type { FunctionComponent, JSX } from "preact";
import type { IconName } from "./feather_icon_name.d.ts";
import { useMemo } from "preact/hooks";
import { useMergedClassName } from "../utils.ts";

export type IconProps = JSX.SVGAttributes<SVGSVGElement> & {
    name: IconName;
};

const SVG_ICON_BASE_PATH = "svg/feather-sprite.svg#";

export const Icon: FunctionComponent<IconProps> = (props: IconProps) => {
    const className = useMergedClassName("tinyui_svg_icon", props.class);
    const iconHref = useMemo(() => {
        return SVG_ICON_BASE_PATH + props.name;
    }, [props.name]);
    return (
        <svg
            {...props}
            class={className}
            width="24"
            height="24"
        >
            <use href={iconHref} />
        </svg>
    );
};
export default Icon;
