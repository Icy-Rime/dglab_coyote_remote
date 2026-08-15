// @ts-check
/// <reference lib="ESNext" />
/// <reference lib="webworker" />

// convert self type for ts-check
const self: ServiceWorkerGlobalScope = globalThis.self as unknown as ServiceWorkerGlobalScope;

import { registerRoute, Route } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

let isDebuging = false;

registerRoute(({ url }) => url.pathname.startsWith("/api/"), new NetworkOnly());
registerRoute(
    new Route(
        ({ url, sameOrigin }) => {
            if (isDebuging) {
                return false;
            }
            const lowerPathname = url.pathname.toLowerCase();
            if (lowerPathname.endsWith("feather-sprite.svg")) {
                return true;
            }
            if (lowerPathname.endsWith("pico.min.css")) {
                return true;
            }
            if (lowerPathname.endsWith("animate.min.css")) {
                return true;
            }
            // console.log(url, sameOrigin);
            // return sameOrigin && !(["127.0.0.1", "localhost"].includes(url.hostname));
            // return sameOrigin && (!url.pathname.startsWith("/api/"));
            return false;
        },
        new CacheFirst({
            cacheName: "cached-route",
            plugins: [
                new ExpirationPlugin({
                    maxAgeSeconds: 24 * 60 * 60,
                }),
            ],
        }),
    ),
);

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(Promise.resolve());
});
self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
    console.log("Service Worker Actived.");
});
self.addEventListener("message", (event) => {
    const data = event.data;
    if (data === "debugon") {
        isDebuging = true;
    } else if (data === "debugoff") {
        isDebuging = false;
    }
});
