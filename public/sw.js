const CACHE_NAME = "lavinderia-v5";
const OFFLINE_URL = "/";

// Assets to pre-cache during install
const PRE_CACHE = [
  "/",
  "/scan-lite",
  "/manifest.json",
  "/scan-lite-manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/scan-favicon.png",
  "/scan-apple-touch-icon.png",
  "/scan-icon-192.png",
  "/scan-icon-512.png",
  "/favicon.jpeg",
  "/support-lite",
  "/support-lite-manifest.json",
  "/support-icon-192.png",
  "/support-icon-512.png",
  "/support-favicon.png",
  "/support-apple-touch-icon.png",
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

  // Supabase API calls - network only
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) return;

  // Navigation requests: network-first, fallback to cached index
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cachedRequest = await caches.match(event.request);
          const routeFallback = url.pathname.startsWith("/scan-lite") ? "/scan-lite" : url.pathname.startsWith("/support-lite") ? "/support-lite" : OFFLINE_URL;
          return cachedRequest || caches.match(routeFallback) || caches.match(OFFLINE_URL);
        })
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

// ── Push Notification Handler ──
self.addEventListener("push", (event) => {
  let data = { title: "Lavinderia Support", body: "New message", url: "/support-lite" };

  try {
    if (event.data) {
      const text = event.data.text();
      if (text) {
        const parsed = JSON.parse(text);
        data = { ...data, ...parsed };
      }
    }
  } catch (e) {
    console.error("Push parse error:", e);
  }

  const options = {
    body: data.body,
    icon: "/support-icon-192.png",
    badge: "/support-icon-192.png",
    tag: data.tag || "support-message",
    renotify: true,
    data: { url: data.url || "/support-lite" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click Handler ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/support-lite";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing support-lite window
      for (const client of clientList) {
        if (client.url.includes("/support-lite") && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
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
        return cache.addAll(PRE_CACHE);
      })
    );
  }
  // Update badge from client
  if (event.data && event.data.type === "UPDATE_BADGE") {
    const count = event.data.count || 0;
    if (self.navigator && "setAppBadge" in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count);
      } else {
        self.navigator.clearAppBadge();
      }
    }
  }
});
