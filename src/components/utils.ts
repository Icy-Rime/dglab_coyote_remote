import { useMemo } from "preact/hooks";
import type { JSX } from "preact";

type ReactCSSProperties = JSX.Signalish<string | JSX.CSSProperties | undefined>;

export const styleIsDOMCSSProperties = (style: ReactCSSProperties) => {
    if (!style) return false; // undefined | null | empty
    if (typeof style === "string") return false; // string
    if (typeof style.peek === "function" || typeof style.subscribe === "function") return false; // JSX.SignalLike
    if (typeof (style as JSX.CSSProperties).cssText === "string") return false; // JSX.CSSProperties
    return true;
};

export const deepMergeDataObjectsAppendArray = <T>(...objs: T[]) => {
    let result = {} as T;
    let resultIsArray = false;
    for (const source of objs) {
        if (typeof source !== "object") continue;
        if (Array.isArray(source)) {
            if (resultIsArray) {
                // append array
                (result as unknown[]).splice((result as unknown[]).length, 0, ...source);
            } else {
                // replace result with array
                result = source;
                resultIsArray = true;
            }
        } else {
            if (resultIsArray) {
                // replace result with object
                result = source;
                resultIsArray = false;
            } else {
                // merge object
                for (const key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        const element = source[key];
                        // ignore some types
                        if (["function", "symbol", "undefined"].includes(typeof element)) continue;
                        if (
                            Object.prototype.hasOwnProperty.call(result, key) &&
                            typeof result[key] === "object" &&
                            typeof element === "object"
                        ) {
                            // deep merge object
                            result[key] = deepMergeDataObjectsAppendArray(result[key], element);
                        } else {
                            // just replace
                            result[key] = element;
                        }
                    }
                }
            }
        }
    }
    return result;
};

export const useMergedStyle = (lowerStyle: ReactCSSProperties, upperStyle: ReactCSSProperties) => {
    const style = useMemo(() => {
        if (styleIsDOMCSSProperties(lowerStyle) && styleIsDOMCSSProperties(upperStyle)) {
            // merge DOMCSSProperties
            return deepMergeDataObjectsAppendArray(lowerStyle, upperStyle);
        } else {
            if (upperStyle) {
                return upperStyle;
            }
            return lowerStyle;
        }
    }, [lowerStyle, upperStyle]);
    return style;
};

export const useMergedClassName = (className1: JSX.Signalish<string | undefined>, className2: JSX.Signalish<string | undefined>) => {
    const classNames = useMemo(() => {
        if (typeof className1 !== "string") {
            className1 = "";
        }
        const classSet1 = new Set(className1.split(" ").map((cn) => cn.trim()).filter((cn) => cn));
        if (typeof className2 !== "string") {
            className2 = "";
        }
        const classSet2 = new Set(className2.split(" ").map((cn) => cn.trim()).filter((cn) => cn));
        const classList = new Array(...(classSet1.union(classSet2)));
        classList.sort();
        return classList.join(" ");
    }, [className1, className2]);
    return classNames;
};
