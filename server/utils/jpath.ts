const DEFAULT_MAX_ITERATE_LIMIT = 100;

export class ExceedIterateLimitError extends Error {
    //
}

type PathIteratorYieldType = string | number | string[];
/**
 * path iterator, split path by '.' and '[]'
 */
export class PathIterator extends Iterator<PathIteratorYieldType, void, unknown>
    implements Generator<PathIteratorYieldType, void, unknown> {
    #path: string;
    #leadingChar: string;
    #maxIterateLimit: number;
    #currentIterate: number;
    constructor(
        path: string,
        maxIterateLimit: number = DEFAULT_MAX_ITERATE_LIMIT,
    ) {
        super();
        this.#path = path;
        this.#leadingChar = ".";
        this.#maxIterateLimit = maxIterateLimit;
        this.#currentIterate = 0;
        if (path.startsWith("[")) {
            this.#leadingChar = "[";
            this.#path = this.#path.substring(1);
        }
    }
    #processPathPart(nextAt: number) {
        let part: string | number = "";
        if (this.#leadingChar === "[") {
            if (nextAt <= 0) {
                return ""; // empty part
            }
            const indexText = this.#path.substring(0, nextAt - 1);
            if (indexText === "*") {
                part = indexText;
            } else {
                part = Number.parseInt(indexText);
            }
        } else {
            if (nextAt < 0) {
                return ""; // empty part
            }
            part = this.#path.substring(0, nextAt);
            if (part.startsWith("{")) {
                const attrs = part.substring(1, part.length - 1).split(",").map(item => item.trim());
                return attrs;
            }
            return part;
        }
        return part;
    }
    #toNextPathPart(nextAt: number) {
        this.#leadingChar = this.#path.substring(nextAt, nextAt + 1);
        this.#path = this.#path.substring(nextAt + 1);
    }
    next(): IteratorResult<PathIteratorYieldType, void> {
        // check iterate limit
        if (this.#currentIterate > this.#maxIterateLimit) {
            throw new ExceedIterateLimitError();
        }
        this.#currentIterate += 1;
        // next '.' or '['
        let nextAt = this.#path.search(/[.\[]/g);
        if (nextAt < 0) {
            if (this.#path.length > 0) {
                nextAt = this.#path.length; // to the end.
            } else {
                return {
                    done: true,
                    value: undefined,
                }; // last part finished, return.
            }
        }
        // parse current iterated part
        const result: IteratorYieldResult<PathIteratorYieldType> = {
            done: false,
            value: this.#processPathPart(nextAt),
        };
        this.#toNextPathPart(nextAt);
        return result;
    }
    override return(): IteratorResult<PathIteratorYieldType, void> {
        return {
            done: true,
            value: undefined,
        };
    }
    override throw(): IteratorResult<PathIteratorYieldType, void> {
        return {
            done: true,
            value: undefined,
        };
    }
    override [Symbol.iterator](): Generator<PathIteratorYieldType, void, unknown> {
        return this;
    }
    clone(): PathIterator {
        const newPathIterator = new PathIterator(
            this.#path,
            this.#maxIterateLimit,
        );
        newPathIterator.#path = this.#path;
        newPathIterator.#leadingChar = this.#leadingChar;
        newPathIterator.#maxIterateLimit = this.#maxIterateLimit;
        newPathIterator.#currentIterate = this.#currentIterate;
        return newPathIterator;
    }
}

/**
 * Get value in plain object, return defaultValue if not found
 */
export const objectGet = <T1, T2>(
    obj: T1,
    path: string | PathIterator,
    defaultValue: T2,
    maxIterateLimit: number = DEFAULT_MAX_ITERATE_LIMIT,
) => {
    // deno-lint-ignore no-explicit-any
    let currentObj: any = obj;
    let itor;
    if (path instanceof PathIterator) {
        itor = path;
    } else {
        itor = new PathIterator(path, maxIterateLimit);
    }
    for (const part of itor) {
        if (Array.isArray(part)) {
            // deno-lint-ignore no-explicit-any
            const obj: any = {};
            for (const attr of part) {
                const partObj = currentObj[attr];
                const result = objectGet(partObj, itor.clone(), undefined);
                obj[attr] = result;
            }
            return obj as T2;
        } else if (Object.prototype.hasOwnProperty.call(currentObj, part)) {
            currentObj = currentObj[part];
        } else if (part === "*" && Array.isArray(currentObj)) {
            // deno-lint-ignore no-explicit-any
            const list: any[] = Array.prototype.map.call(
                currentObj,
                (innerObject) => {
                    return objectGet(innerObject, itor.clone(), undefined);
                },
            );
            return list as T2;
        } else {
            return defaultValue;
        }
    }
    return currentObj as T2;
};

/**
 * Set value in plain object, return true if successful
 */
export const objectSet = <T1, T2>(
    obj: T1,
    path: string | PathIterator,
    value: T2,
    maxIterateLimit: number = DEFAULT_MAX_ITERATE_LIMIT,
) => {
    // deno-lint-ignore no-explicit-any
    let currentObj: any = obj;
    let lastObj = undefined;
    let lastKey = undefined;
    let itor;
    if (path instanceof PathIterator) {
        itor = path;
    } else {
        itor = new PathIterator(path, maxIterateLimit);
    }
    for (const part of itor) {
        if (Array.isArray(part)) {
            return false; // can't set muti attrs
        } else if (Object.prototype.hasOwnProperty.call(currentObj, part)) {
            lastObj = currentObj;
            lastKey = part;
            currentObj = currentObj[part];
        } else if (part === "*" && Array.isArray(currentObj)) {
            const list: boolean[] = Array.prototype.map.call(
                currentObj,
                (innerObject) => {
                    return objectSet(innerObject, itor.clone(), value);
                },
            ) as boolean[];
            return Array.prototype.some.call(list, (val) => val);
        } else {
            return false;
        }
    }
    if (lastObj !== undefined && lastKey !== undefined) {
        lastObj[lastKey] = value;
        return true;
    }
    return false;
};
