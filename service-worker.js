/* Conservative PWA caching: never cache HTML pages or third-party requests. */
const CACHE_VERSION = 'acl-static-v1';
const APP_SHELL = [
  '/offline.html',
  '/styles.css',
  '/site.js',
  '/logo.png',
  '/pwa-192.png',
  '/pwa-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('acl-static-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigation is network-first. Do not cache page HTML, redirects, or 404s,
  // so search engines and visitors receive current canonical page content.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || Response.error();
      })
    );
    return;
  }

  // Cache only known static app-shell files. Everything else remains network-only.
  if (!APP_SHELL.includes(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') cache.put(request, response.clone());
        return response;
      }).catch(() => null);

      // Use the cached asset for speed while refreshing it in the background.
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return (await network) || Response.error();
    })
  );
});
