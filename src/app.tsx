import { DrawerNav } from "./components/drawer_nav/drawer_nav.tsx";
import { HeaderNav } from "./components/header_nav/header_nav.tsx";
import { AppRouter } from "./pages/router.tsx";
import { $inited } from "./store/init.ts";
import { $pageLoading } from "./store/browser_var.ts";
import { useStore } from "@nanostores/preact";
import type { FunctionComponent } from "preact";

export const App: FunctionComponent = (_) => {
    const inited = useStore($inited);
    const pageLoading = useStore($pageLoading);
    return (
        <>
            {(inited && (!pageLoading))
                ? null
                : (
                    <div style="position: fixed; width: 100vw; left: 0px; height: 100vh; top: 0px; background: color-mix(in srgb, var(--pico-background-color) 90%, transparent); z-index: 999999;display: flex;justify-content: center;align-items: center;">
                        <div class="app_loader"></div>
                    </div>
                )}
            <DrawerNav />
            <div style="width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: start;">
                <HeaderNav style="width: 100%; flex: 0 0 auto;" />
                <div style="width: 100%; flex: 1 1 auto; display: flex; flex-direction: column; contain: strict;">
                    {inited ? <AppRouter /> : null}
                </div>
            </div>
        </>
    );
};
export default App;
