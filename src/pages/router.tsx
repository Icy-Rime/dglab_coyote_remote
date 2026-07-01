import { Route, Router } from "wouter-preact";
import { useHashLocation } from "wouter-preact/use-hash-location";
import { TestPage } from "./test/test.tsx";
import { ControllerPage } from "./controller/controller.tsx";
import { LoginPage } from "./login/login.tsx";
import { RedirectPage } from "./redirect/redirect.tsx";
import type { FunctionComponent } from "preact";

export const AppRouter: FunctionComponent = (_) => (
    <Router hook={useHashLocation}>
        <Route path="/" component={ControllerPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/_test_" component={TestPage} />
        <Route path="/r/:target/*" component={RedirectPage} />
        {/* ... */}
    </Router>
);
export default AppRouter;
