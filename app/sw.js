/**
 * Offline cache for the kiosk.
 *
 * The whole point of this app is that it keeps working when the venue's wifi
 * does not, so the install step pre-caches the shell *and* the ~14 MB model.
 * Bump CACHE when anything in the app changes; the activate step deletes every
 * older cache so a stale model can never linger.
 */
const CACHE = 'green-trace-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/themes.css',
  './css/app.css',
  './css/anim.css',
  './vendor/tf.min.js',
  './js/app.js',
  './js/model.js',
  './js/health.js',
  './js/i18n.js',
  './js/themes.js',
  './js/motion.js',
  './js/icons.js',
  './js/nearby.js',
  './js/data/species.js',
  './js/data/team.js',
  './js/data/about.js',
  './js/data/treatments.js',
  './js/data/suppliers.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-180.png',
  './assets/icons/icon-maskable.png',
  './assets/qr.svg',
  './img/zayed.jpg',
  './img/mbz.jpg',
  './img/mbr.jpg',
  './model/metadata.json',
  './model/ood.json',
  './model/head/model.json',
  './model/head/weights.bin',
  './model/mobilenet/model.json',
  './model/mobilenet/group1-shard1of4',
  './model/mobilenet/group1-shard2of4',
  './model/mobilenet/group1-shard3of4',
  './model/mobilenet/group1-shard4of4',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll() is all-or-nothing; one 404 would leave the kiosk with no cache
    // at all, so each entry is allowed to fail on its own.
    await Promise.all(SHELL.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let fonts go straight to the network

  // Navigations: network first so a redeploy is picked up, cache as the safety net.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: cache first. Model weights never change without a version
  // bump, and this is what makes an offline scan possible.
  event.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
