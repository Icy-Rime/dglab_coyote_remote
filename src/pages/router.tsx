import type { FunctionComponent } from "preact";
import { Route, Router } from "wouter-preact";
import { useHashLocation } from "wouter-preact/use-hash-location";
import { TestPage } from "./test/test.tsx";
import { DevicesPage } from "./devices/devices.tsx";
import { LoginPage } from "./login/login.tsx";
import { RedirectPage } from "./redirect/redirect.tsx";
import { ManageInfoPage } from "./info/manage_info.tsx";

export const AppRouter: FunctionComponent = (_) => (
    <Router hook={useHashLocation}>
        <Route path="/" component={DevicesPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/_test_" component={TestPage} />
        <Route path="/_info_" component={ManageInfoPage} />
        <Route path="/r/:target/*" component={RedirectPage} />
        {/* ... */}
    </Router>
);
export default AppRouter;
