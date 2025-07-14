import { h, render } from "preact";
// init store
import "./store/browser_var.ts";
import "./store/user_info.ts";
import { $debug } from "./store/browser_var.ts";

import App from "./app.tsx";

// register sw
if (self.navigator?.serviceWorker) {
    self.navigator.serviceWorker.register("sw.js").then((sw) => {
        console.log("Service Worker Registed.");
        $debug.subscribe((value) => {
            sw.active?.postMessage(value ? "debugon" : "debugoff");
            if (!value) {
                // clear cache when debug is off.
                self.caches.delete("cached-route");
            }
        });
    });
}

globalThis.addEventListener("load", () => {
    const root = document.querySelector("#app")!;
    render(h(App, {}), root);
});
