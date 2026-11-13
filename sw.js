// ASN – Service Worker: App offline verfügbar, Fotos der Pendenzen zwischenspeichern.
const VERSION = 'asn-v5';
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
  if (u.origin === location.origin) {
    // App selbst: Netz zuerst (neueste Version) – aber höchstens 3 s warten, sonst sofort aus dem Speicher (kein Hängen bei schwachem/keinem Empfang)
    const ausSpeicher = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
    if (u.pathname.endsWith('version.txt')) return;               // Versionsprüfung immer direkt vom Netz
    const netz = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; });
    e.respondWith(new Promise(ok => {
      let fertig = false;
      const t = setTimeout(() => { ausSpeicher().then(r => { if (!fertig && r) { fertig = true; ok(r); } }); }, 3000);
      netz.then(r => { if (!fertig) { fertig = true; clearTimeout(t); ok(r); } })
          .catch(() => { clearTimeout(t); ausSpeicher().then(r => { if (!fertig) { fertig = true; ok(r || new Response('Offline', { status: 503 })); } }); });
    }));
  }
});
