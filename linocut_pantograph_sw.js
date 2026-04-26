// ── Linocut Pantograph Service Worker ─────────────────────────────
// INCREMENT VERSION HERE on every deploy. This is the only file
// that changes between versions — the HTML URL stays permanent.
const VERSION = 'v11';
const CACHE   = 'linocut-pantograph-' + VERSION;

const ASSETS = [
  './linocut_pantograph.html',
  './linocut_pantograph_manifest.json',
  './LinoPantograph_192.png',
  './LinoPantograph_512.png',
];

// Install: cache all assets for this version
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for old SW to die
  );
});

// Activate: delete all caches from previous versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
