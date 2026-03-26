const CACHE_NAME = 'joinup-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/router.js',
  './js/utils/validation.js',
  './js/views/home.js',
  './js/views/register.js'
];

// Helper to check for localhost
const isLocalhost = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Install Event
self.addEventListener('install', (event) => {
  if (isLocalhost) {
    console.log('[Service Worker] Localhost detected. Skipping caching.');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  if (isLocalhost) {
    console.log('[Service Worker] Claiming clients for localhost immediate control');
    self.clients.claim();
  }
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (isLocalhost) {
    // Network only for localhost
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
