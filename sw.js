// PC Gaffer — Service Worker kill switch
// Older mobile/PWA installs could keep stale lazy chunks. This SW immediately
// clears every cache, takes control once, then unregisters itself.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.clients.claim();
    const registration = await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'PCGAFFER_CACHE_CLEARED', registration });
    }
  })());
});

self.addEventListener('fetch', () => {
  // Deliberately do nothing: always let the network/browser handle requests.
});
