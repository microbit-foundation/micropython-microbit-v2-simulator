function initSimulatorServiceWorker() {
  const simUrls = ["simulator.html", "build/simulator.js", "build/firmware.js"];
  let didInstall = false;
  const cacheName = "simulator";

  self.addEventListener("install", function (ev) {
    didInstall = true;
    console.log("Installing service worker...");
    ev.waitUntil(
      caches
        .open(cacheName)
        .then(function (cache) {
          console.log("Opened cache");
          return cache.addAll(simUrls);
        })
        .then(function () {
          return self.skipWaiting();
        })
    );
  });

  self.addEventListener("activate", function (ev) {
    console.log("Activating service worker...");
    ev.waitUntil(
      caches
        .keys()
        .then(function (_cacheNames) {
          // Delete old versions in cache here.
        })
        .then(function () {
          if (didInstall) {
            // Only notify clients for the first activation
            didInstall = false;
            // Necessary?
            return notifyAllClientsAsync();
          }
          return Promise.resolve();
        })
    );
  });

  self.addEventListener("fetch", function (ev) {
    ev.respondWith(
      caches.match(ev.request).then(function (response) {
        return response || fetch(ev.request);
      })
    );
  });

  function notifyAllClientsAsync() {
    var scope = self;
    return scope.clients
      .claim()
      .then(function () {
        return scope.clients.matchAll();
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          return client.postMessage({
            type: "serviceworker",
            state: "activated",
          });
        });
      });
  }
}

initSimulatorServiceWorker();
