/// <reference lib="WebWorker" />
// Empty export required due to --isolatedModules flag in tsconfig.json
export type {};
declare const self: ServiceWorkerGlobalScope;
declare const clients: Clients;

const assets = ["simulator.html", "build/simulator.js", "build/firmware.js"];
const cacheName = `simulator-${process.env.VERSION}`;

self.addEventListener("install", (event) => {
  console.log("Installing simulator service worker...");
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(assets);
    })()
  );
});

self.addEventListener("activate", (event) => {
  console.log("Activating simulator service worker...");
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== cacheName) {
            return caches.delete(name);
          }
        })
      );
      await clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      const response = await fetch(event.request);
      const cache = await caches.open(cacheName);
      cache.put(event.request, response.clone());
      return response;
    })()
  );
});