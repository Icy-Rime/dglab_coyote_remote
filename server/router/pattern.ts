const pathToParts = (path: string): string[] => {
    // strip "/"
    while (path.startsWith("/")) {
        path = path.substring(1);
    }
    while (path.endsWith("/")) {
        path = path.substring(0, path.length - 1);
    }
    return path.split("/");
};

/** # Path Pattern
 * Match patterns for each part in the url path, which is devided by "/"
 * | mark           | desc |
 * |:-------------- |:---- |
 * | :*name         | match the whole section, assign whole part to 'name' |
 * | :>name:prefix  | match the prefix, assign prefix-stripped part to 'name' |
 * | :<name:postfix | match the postfix, assign postfix-stripped part to 'name' |
 * | :~name         | match all remain parts, assign parts to 'name' |
 */
export class PathPattern {
    #parts: string[] = [];
    #onlyMatchSubPattern: boolean;
    #sub: PathPattern[];
    #recentMatchedPath: string = "";
    #recentMatchedPattern: PathPattern | undefined = undefined;
    #recentMatchedParams: Record<string, string> = {};
    constructor(pattern: string, onlyMatchSubPattern: boolean = false, ...subPattern: PathPattern[]) {
        this.#parts = pathToParts(pattern);
        this.#onlyMatchSubPattern = onlyMatchSubPattern;
        this.#sub = subPattern;
    }

    _i_match(path: string | string[]): [PathPattern | undefined, Record<string, string> | undefined] {
        const pathParts = typeof path === "string" ? pathToParts(path) : path;
        // try cache
        const cachePath = typeof path === "string" ? path : path.join("/");
        if (cachePath === this.#recentMatchedPath) {
            return [this.#recentMatchedPattern, this.#recentMatchedParams];
        }
        // match path
        const pathArgs: Record<string, string> = {};
        let pathIndex = 0;
        for (const pattern of this.#parts) {
            if (pathIndex >= pathParts.length) {
                return [undefined, undefined]; // not enough part, match failed.
            }
            if (pattern.startsWith(":")) {
                let tmpIdx = pattern.indexOf(":", 2);
                if (tmpIdx < 0) {
                    tmpIdx = pattern.length;
                }
                const fieldName = pattern.substring(2, tmpIdx);
                if (pattern.startsWith(":*")) {
                    pathArgs[fieldName] = pathParts[pathIndex];
                    pathIndex += 1;
                } else if (pattern.startsWith(":~")) {
                    pathArgs[fieldName] = pathParts.slice(pathIndex, pathParts.length).join("/");
                    pathIndex = pathParts.length;
                } else if (pattern.startsWith(":>")) {
                    const pat = pattern.substring(tmpIdx + 1);
                    const part = pathParts[pathIndex];
                    if (part.startsWith(pat)) {
                        pathArgs[fieldName] = part.substring(pat.length);
                    } else {
                        return [undefined, undefined]; // not matched
                    }
                    pathIndex += 1;
                } else if (pattern.startsWith(":<")) {
                    const pat = pattern.substring(tmpIdx + 1);
                    const part = pathParts[pathIndex];
                    if (part.endsWith(pat)) {
                        pathArgs[fieldName] = part.substring(0, part.length - pat.length);
                    } else {
                        return [undefined, undefined]; // not matched
                    }
                    pathIndex += 1;
                } else {
                    throw Error("Pattern not support: '" + pattern + "'");
                }
            } else {
                const part = pathParts[pathIndex];
                if (pattern !== part) {
                    return [undefined, undefined]; // not matched
                }
                pathIndex += 1;
            }
        }
        // match sub patterns
        if (pathIndex !== pathParts.length) {
            if (this.#sub.length <= 0) {
                return [undefined, undefined]; // not match all path parts.
            }
            const remainParts = pathParts.slice(pathIndex);
            for (const pa of this.#sub) {
                const [subPa, mt] = pa._i_match(remainParts);
                if (mt !== undefined) {
                    this.#recentMatchedPath = typeof path === "string" ? path : pathParts.join("/");
                    this.#recentMatchedPattern = subPa;
                    this.#recentMatchedParams = mt;
                    return [subPa, mt];
                }
            }
            return [undefined, undefined]; // no match
        }
        if (this.#onlyMatchSubPattern) {
            return [undefined, undefined];
        }
        this.#recentMatchedPath = typeof path === "string" ? path : pathParts.join("/");
        this.#recentMatchedPattern = this;
        this.#recentMatchedParams = pathArgs;
        return [this, pathArgs];
    }

    match(path: string | string[]): Record<string, string> | undefined {
        const [_pat, mt] = this._i_match(path);
        if (mt !== undefined) {
            return mt;
        }
        return undefined;
    }

    matchSubPattern(path: string | string[]): PathPattern | undefined {
        const [pat, _mt] = this._i_match(path);
        if (pat !== undefined) {
            return pat;
        }
        return undefined;
    }
}
