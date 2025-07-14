import { DrawerNav } from "./components/drawer_nav/drawer_nav.tsx";
import { AppRouter } from "./pages/router.tsx";
import type { FunctionComponent } from "preact";

export const App: FunctionComponent = (_) => {
    return (
        <>
            <DrawerNav />
            <AppRouter />
        </>
    );
};
export default App;
