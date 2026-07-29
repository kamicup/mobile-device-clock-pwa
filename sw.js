(function () {
  "use strict";

  var CACHE_NAME = "mobile-clock-v10";
  var ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.webmanifest",
    "./icon.svg",
    "./apple-touch-icon.png",
    "./icon-192.png",
    "./icon-512.png"
  ];

  self.addEventListener("install", function (event) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(ASSETS);
      })
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", function (event) {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        }));
      })
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") {
      return;
    }

    if (event.request.mode === "navigate") {
      event.respondWith(
        fetch(event.request).then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put("./index.html", copy);
          });
          return response;
        }).catch(function () {
          return caches.match("./index.html");
        })
      );
      return;
    }

    event.respondWith(
      fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
  });
}());
