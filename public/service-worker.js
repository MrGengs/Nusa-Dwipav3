// Service Worker for Nusa-Dwipa PWA
const CACHE_NAME = 'nusa-dwipa-v1.0.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/auth.html',
  '/manifest.json',
  '/assets/image/logo.png',
  '/assets/image/tittle.png',
  '/assets/image/enuma.png',
  '/assets/image/mersiflab.png',
  '/assets/baju_adat/baaceh.png',
  '/assets/baju_adat/basumatra.png',
  '/assets/baju_adat/bajawa.png',
  '/assets/baju_adat/badayak.png',
  '/assets/baju_adat/basulsel.png',
  '/assets/baju_adat/bapapua.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page if available
        if (event.request.destination === 'document') {
          // Try auth.html first (start_url), then fallback to index.html
          return caches.match('/auth.html').then((response) => {
            return response || caches.match('/index.html');
          });
        }
      })
  );
});

