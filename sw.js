// ASN – Service Worker: App offline verfügbar, Fotos der Pendenzen zwischenspeichern.
const VERSION = 'asn-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './logo.png', './i18n.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'asn-bilder').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;                    // API-Aufrufe (POST) nie zwischenspeichern
  if (u.hostname.endsWith('script.google.com') || u.hostname.endsWith('googleusercontent.com') && u.pathname.includes('/macros/')) return;
  if (u.hostname === 'drive.google.com' && u.pathname.startsWith('/thumbnail')) {   // Pendenz-Fotos: erst Speicher, sonst Netz
    e.respondWith(caches.open('asn-bilder').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (u.origin === location.origin) {                          // App selbst: Netz zuerst (immer neueste Version), sonst Speicher
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
