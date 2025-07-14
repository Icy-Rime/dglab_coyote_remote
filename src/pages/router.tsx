import { Route, Router } from "wouter-preact";
import { useHashLocation } from "wouter-preact/use-hash-location";
import { TestPage } from "./test/test.tsx";
import type { FunctionComponent } from "preact";

export const AppRouter: FunctionComponent = (_) => (
    <Router hook={useHashLocation}>
        <Route path="/" component={TestPage} />
        <Route path="/_test_" component={TestPage} />
        {/* ... */}
    </Router>
);
export default AppRouter;
