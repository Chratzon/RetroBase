// Service Worker: App-Shell offline verfügbar machen und cross-origin isolation herstellen.
// Benutzerdaten (ROMs, Spielstände, Battery-Saves) liegen in IndexedDB und werden hier nicht berührt.
// Bei jeder Version CACHE_VERSION erhöhen, damit alte Dateien ersetzt werden.
//
// Warum die Header? mGBA nutzt Threads (SharedArrayBuffer). Dafür braucht die Seite
// Cross-Origin-Opener-Policy und Cross-Origin-Embedder-Policy. GitHub Pages kann keine
// eigenen Header setzen, deshalb ergänzt der Service Worker sie bei jeder eigenen Antwort.

const CACHE_VERSION = 'retrobase-0.2.0';
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
  './vendor/mgba/mgba.js',
  './vendor/mgba/mgba.wasm',
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

// Antwort mit den Headern für cross-origin isolation versehen.
function isolate(res) {
  if (!res || res.type !== 'basic') return res;
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

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
        return isolate(res);
      })
      .catch(() =>
        caches.match(req).then((cached) => (cached ? isolate(cached) : Response.error()))
      )
  );
});
