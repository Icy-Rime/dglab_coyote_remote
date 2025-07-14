// @ts-check
/// <reference lib="ESNext" />
/// <reference lib="webworker" />

// convert self type for ts-check
const self: ServiceWorkerGlobalScope = globalThis.self as unknown as ServiceWorkerGlobalScope;

import { registerRoute, Route } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

const cachedRoute = new Route(
    ({ url, sameOrigin }) => {
        // console.log(url, sameOrigin);
        return sameOrigin && !(["127.0.0.1", "localhost"].includes(url.hostname));
        // return sameOrigin;
    },
    new CacheFirst({
        cacheName: "cached-route",
        plugins: [
            new ExpirationPlugin({
                maxAgeSeconds: 24 * 60 * 60,
            }),
        ],
    }),
);

registerRoute(cachedRoute);

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
    console.log("Service Worker Actived.");
});
