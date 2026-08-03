// Service Worker de Control de Despachos
// IMPORTANTE: cada vez que se suba una nueva versión de index.html a GitHub,
// hay que cambiar CACHE_VERSION (ej. v2, v3...) para que a todos los
// celulares/computadores les llegue la actualización sin que tengan que
// borrar datos del navegador a mano.
const CACHE_VERSION = 'v5';
const CACHE_NAME = `control-despachos-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './icons/icon-32.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== 'GET') return;

  // Nunca cachear datos dinámicos: base de datos, fotos, avisos
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('cloudinary.com') ||
    url.includes('api.telegram.org') ||
    url.includes('googleapis.com')
  ) {
    return;
  }

  // El documento principal: primero intenta traer la versión más nueva de
  // internet; si no hay conexión, usa la última copia guardada.
  if (req.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Librerías externas (Firebase, Excel, OCR): como sus URLs ya incluyen la
  // versión, se pueden guardar en caché y reusar sin volver a descargarlas.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        return resp;
      });
    })
  );
});
