const DEFAULT_ENV = {
    APP_DB_PREFIX: "dglab_remote",
    SL_REQUEST_SIGN_KEY: "123456",
    ALLOW_SL_USER_AGENT_PART: "Second-Life-LSL",
    SL_ADMIN_LIST: "12345678-1234-1234-1234-123456789012",
};

type EnvGetter = {
    [K in keyof typeof DEFAULT_ENV]: string;
};

export const [_reload, env] = (() => {
    const innerEnv = {} as Record<keyof EnvGetter, string | undefined>;
    const _reload = () => {
        for (const k in innerEnv) {
            if (Object.prototype.hasOwnProperty.call(innerEnv, k)) {
                delete innerEnv[k as keyof EnvGetter];
            }
        }
    };
    return [
        _reload,
        new Proxy({} as EnvGetter, {
            get(_target, prop: string) {
                if (Object.prototype.hasOwnProperty.call(innerEnv, prop)) {
                    return innerEnv[prop as keyof EnvGetter];
                } else if (Object.prototype.hasOwnProperty.call(DEFAULT_ENV, prop)) {
                    let val = Deno.env.get(prop);
                    if (val === undefined) {
                        val = DEFAULT_ENV[prop as keyof EnvGetter];
                    }
                    val = new String(val).toString();
                    innerEnv[prop as keyof EnvGetter] = val;
                    return val.toString();
                }
                throw new Error(`No Env: ${prop}`);
            },
        }),
    ];
})();
