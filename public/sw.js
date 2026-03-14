// Zolara Service Worker — Cache-first for assets, network-first for API
const CACHE_NAME = "zolara-v1";
const STATIC_CACHE = "zolara-static-v1";

// Assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/book",
  "/manifest.json",
  "/favicon.ico",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Supabase API, analytics, and non-GET requests
  if (
    request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("paystack.co") ||
    url.hostname.includes("arkesel.com") ||
    url.href.includes("/rest/v1/") ||
    url.href.includes("/auth/v1/") ||
    url.href.includes("/storage/v1/")
  ) {
    return; // let it go to network
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    url.hostname === self.location.hostname &&
    (request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image" ||
      request.destination === "font" ||
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/icons/"))
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // Network-first for navigation (HTML pages) — app shell pattern
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((c) => c || caches.match("/"))
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
