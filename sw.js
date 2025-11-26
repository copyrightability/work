// sw.js — very small caching service worker
const CACHE = 'fitplan-cache-v1';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

// install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// activate
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// fetch
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
