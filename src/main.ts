import { h, render } from "preact";
// init store
import "./store/browser_var.ts"
import "./store/user_info.ts"

import App from "./app.tsx";

// register sw
if (self.navigator?.serviceWorker) {
    self.navigator.serviceWorker.register("sw.js").then(() => {
        console.log("Service Worker Registed.");
    });
}

globalThis.addEventListener("load", () => {
    const root = document.querySelector("#app")!;
    render(h(App, {}), root);
});
