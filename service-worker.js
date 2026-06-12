const CACHE_NAME = 'smart-clinic-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/services.html',
  '/appointments.html',
  '/patient-dashboard.html',
  '/admin-dashboard.html',
  '/contact.html',
  '/css/style.css',
  '/js/app.js',
  '/js/appointments.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/validation.js',
  '/js/ui.js',
  '/manifest.json'
];

// Install Event - Cache Static Assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Hybrid Caching Strategy
self.addEventListener('fetch', (e) => {
  // Avoid caching non-GET requests or non-http/https schemes (e.g. chrome extensions)
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  // 1. Navigation requests (HTML pages) -> Network-First (falling back to cache/offline homepage)
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. Static assets (CSS, JS, Images, Web Manifest) -> Cache-First with Stale-While-Revalidate background update
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Swallow background fetch errors for static assets so they don't reject the promise chain
          return null;
        });

      return cachedResponse || fetchPromise.then(res => res || new Response('Resource unavailable', { status: 404 }));
    })
  );
});
