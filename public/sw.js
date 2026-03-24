const CACHE_NAME = "lavinderia-v1";
const OFFLINE_URL = "/";

// Assets to pre-cache during install
const PRE_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.jpeg",
];

// Install: pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Supabase API calls - network only (offline-db handles caching)
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) return;

  // For navigation requests, use network-first then fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL) || caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/) ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CACHE_ALL") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Cache current page and all sub-resources
        const keys = await cache.keys();
        return cache.addAll(PRE_CACHE);
      })
    );
  }
});
