/**
 * Manabi service worker.
 *
 * Studying happens on trains and planes. Progress already lives in
 * localStorage, so once the shell and the JS are cached the whole review loop
 * works with no network at all — which is the entire point.
 *
 * Strategy:
 *   · navigations  — network first, cache fallback, offline page as last resort
 *   · static build — cache first (immutable, content-hashed by Next)
 *   · data/fonts   — stale-while-revalidate
 * Anything non-GET or cross-origin is passed straight through.
 */

const VERSION = "manabi-v3";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

const PRECACHE = [
  "/",
  "/review",
  "/kana",
  "/vocabulary",
  "/kanji",
  "/verbs",
  "/grammar",
  "/progress",
  "/offline",
  // Only the N5 files are precached: they are the beginner path, and the full
  // corpus is ~4 MB across five levels. Everything else caches on first use.
  "/data/index.json",
  "/data/vocab/n5.json",
  "/data/kanji/n5.json",
  "/data/verbs/n5.json",
  "/data/grammar/n5.json",
  "/data/reading/n5.json",
  "/data/strokes/n5.json",
  "/mark.svg",
  "/manifest.json",
];

// Let the page promote a waiting worker instead of stranding a stale bundle.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) =>
      // Individually, so one 404 cannot fail the whole install.
      Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(SHELL);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline");
    if (offline) return offline;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, fresh.clone());
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Next's dev/HMR or server actions.
  if (url.pathname.startsWith("/_next/webpack") || url.pathname.startsWith("/api")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  if (
    url.pathname.startsWith("/data/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/avatars/") ||
    /\.(svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, ASSETS));
  }
});
