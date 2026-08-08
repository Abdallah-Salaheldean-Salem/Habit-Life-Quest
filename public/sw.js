// Network-first service worker.
//
// The previous version was a no-op that cached nothing but still registered a
// worker, so there was nothing to force a client onto a fresh deploy — a
// redeploy could look like "nothing changed". This one always prefers the
// network when online (so the latest deploy wins), falls back to cache when
// offline, and takes control immediately via skipWaiting + clients.claim.
const CACHE = 'hlq-cache-v2';

self.addEventListener('install', () => {
  // Activate this version as soon as it is installed, without waiting for all
  // tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches from older versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // Take control of open pages right away.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GETs; let everything else (POSTs, cross-origin) go
  // straight to the network.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // Cache a copy for offline use.
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        // Offline: serve whatever we cached; for navigations fall back to the
        // app shell.
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
