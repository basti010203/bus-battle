// Bei jeder Änderung die Version hochzählen, sonst bleibt die alte im Cache.
const CACHE = 'busbattle-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/app.css', './css/blackjack.css', './css/roulette.css', './css/slots.css', './css/crash.css', './css/race.css',
  './js/core.js', './js/party.js', './js/blackjack.js', './js/roulette.js', './js/slots.js', './js/crash.js', './js/race.js', './js/home.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Sofort aus dem Cache (schnell auch bei schlechtem Netz), im Hintergrund aktualisieren.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
