import type { FunctionComponent, SVGAttributes } from "preact";
import type { IconName } from "./feather_icon_name.d.ts";
import { useMemo, useState } from "preact/hooks";
import { useMergedClassName } from "../utils.ts";

export type IconProps = SVGAttributes<SVGSVGElement> & {
    name: IconName;
};

const SVG_ICON_BASE_PATH = "svg/feather-sprite.svg";

const cache = (() => {
    const api = {
        loaded: false,
        blobUrl: "",
        loadedCallback: [] as Array<() => void>,
    };
    (async () => {
        const response = await fetch(SVG_ICON_BASE_PATH);
        const blob = await response.blob();
        api.blobUrl = URL.createObjectURL(blob);
        api.loaded = true;
        while (api.loadedCallback.length > 0) {
            api.loadedCallback.shift()!();
        }
    })();
    return api;
})();

export const Icon: FunctionComponent<IconProps> = (props: IconProps) => {
    const [loaded, setLoaded] = useState(cache.loaded);
    const className = useMergedClassName("tinyui_svg_icon", props.class);
    const iconHref = useMemo(() => {
        if (loaded) {
            return cache.blobUrl + "#" + props.name;
        } else {
            cache.loadedCallback.push(() => {
                setLoaded(true);
            });
        }
        return "";
    }, [props.name, loaded]);
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
