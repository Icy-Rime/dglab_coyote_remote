import type { FunctionComponent } from "preact";
import { useLocation } from "../../hooks/router.ts";
import { useRoute } from "wouter-preact";
import { useEffect, useState } from "preact/hooks";
import { $inited } from "../../store/init.ts";
import { authByCode } from "../../store/user_auth.ts";

export const RedirectPage: FunctionComponent = (_) => {
    const inited = useState($inited);
    const [location, setLocation] = useLocation();
    const [match, params] = useRoute("/r/:target/*");
    useEffect(() => {
        if (!inited) {
            return;
        }
        if (!match) {
            return;
        }
        const target = params["target"];
        const args = params["*"];
        console.log("Redirecting...", location, match, params);
        switch (target) {
            case "login":
                if (args.length !== 16) {
                    setLocation("/login", { replace: true });
                    break;
                }
                authByCode(args).then((result) => {
                    if (result) {
                        setLocation("/", { replace: true });
                    } else {
                        setLocation("/login", { replace: true });
                    }
                }).catch(() => {
                    setLocation("/login", { replace: true });
                });
                break;
            default:
                // no match? to the home page.
                setLocation("/", { replace: true });
                break;
        }
    }, [inited, location, match, params]);
    return (
        <>
            {/* ... */}
            <div style="width: 100%;height: 100%;display: flex;justify-content: center;align-items: center;">
                <div class="app_loader"></div>
            </div>
        </>
    );
};

export default RedirectPage;
