const CACHE_NAME = 'team-simulator-cache-v1.3'; // Increment version
const urlsToCache = [
  './', // Represents the root of the subdirectory (e.g., /repo-name/)
  './index.html',
  './index.css',
  './index.js', // Changed from index.tsx to index.js
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json' // Good to cache the manifest as well
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache app shell:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch:', event.request.url);
  
  // For navigation requests, try network first, then cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback to the cached index.html for navigation.
          // Ensure this path is relative to the service worker's scope.
          return caches.match('./index.html'); 
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }
        console.log('[ServiceWorker] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Optionally, cache new resources dynamically if needed
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
              // Check if the request is for one of the URLs we intend to cache to avoid caching unintended resources.
              // A more robust check might involve comparing against the urlsToCache array or specific patterns.
              const requestUrlString = event.request.url;
              const shouldCache = urlsToCache.some(urlToCache => {
                // Adjust for relative paths by ensuring the request URL ends with the relevant part of urlToCache
                const cleanUrlToCache = urlToCache.startsWith('./') ? urlToCache.substring(2) : urlToCache;
                return requestUrlString.endsWith(cleanUrlToCache);
              });

              if (shouldCache) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('[ServiceWorker] Fetch failed for:', event.request.url, error);
            // Optionally, return a generic offline placeholder for certain asset types if not found in cache.
        });
      })
  );
});