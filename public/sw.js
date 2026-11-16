const CACHE_NAME = "bloodlink-shell-v7";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/splash-512.png",
  "/logo.svg",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          fetch(asset, { cache: "reload" })
            .then((res) => {
              if (res.ok) return cache.put(asset, res);
            })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API routes
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never intercept Vite internal dev server requests
  if (
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/@fs/") ||
    url.pathname.startsWith("/@id/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/")
  ) {
    return;
  }

  // Navigation requests (HTML page loads): Always try Network first for fresh content
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/index.html", resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallback
          return caches.match("/index.html").then((cached) => {
            if (cached) return cached;
            return caches.match("/");
          });
        })
    );
    return;
  }

  // Static assets (hashed JS, CSS, images, fonts)
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req);
        })
    );
  }
});
