// Service Worker: App-Shell offline verfügbar machen. Benutzerdaten (ROMs, Spielstände)
// liegen in IndexedDB und werden hier nicht berührt.
// Bei jeder Version CACHE_VERSION erhöhen, damit alte Dateien ersetzt werden.

const CACHE_VERSION = 'retrobase-0.1.4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './js/app.js',
  './js/db.js',
  './js/input.js',
  './js/cores/handheld.js',
  './js/cores/cube.js',
  './vendor/wasmboy/wasmboy.esm.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netz zuerst: Updates erscheinen beim nächsten Laden. Offline greift der Cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
