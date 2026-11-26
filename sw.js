/* Service worker de Alika: guarda la app en el equipo para que abra sin internet.
   Los DATOS no pasan por aquí: viven en IndexedDB del navegador.
   Al publicar una versión nueva de index.html, sube el número de CACHE. */
const CACHE = 'alika-v1.2.2';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // solo borra cachés viejos de ESTA app (alika-…); nunca los de otras apps del mismo dominio
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('alika-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Red primero para la página (así toma las actualizaciones cuando hay internet),
   y caché si no hay conexión. Para lo demás: caché primero. */
self.addEventListener('fetch', e => {
  const req = e.request;
  // no-store = la revisión de versión nueva: va directo a la red y no se guarda (antes dejaba una copia por cada revisión)
  if (req.method !== 'GET' || req.cache === 'no-store' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        // solo guarda la página de la app si llegó bien; una página de error o de otra ruta no debe reemplazar la copia sin internet
        if (r.ok && !r.redirected && /\/(index\.html)?$/.test(new URL(req.url).pathname)){ const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); }
        return r;
      })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return res;
  })));
});
