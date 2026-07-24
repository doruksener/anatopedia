const SHELL_CACHE = 'anatopedia-shell-v3';
const MODEL_CACHE = 'anatopedia-models-v3';
const SHELL = [
  './', './index.html', './styles.css', './app.js',
  './data/clinical-content.json', './manifest.webmanifest',
  './assets/imaging-placeholder.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, MODEL_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !keep.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.endsWith('.stl')) {
    event.respondWith(cacheFirst(event.request, MODEL_CACHE));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
