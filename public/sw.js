importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')

workbox.core.skipWaiting()
workbox.core.clientsClaim()

// Cache page shell
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document',
  new workbox.strategies.NetworkFirst({ cacheName: 'pages' })
)

// Cache JS/CSS/fonts
workbox.routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new workbox.strategies.StaleWhileRevalidate({ cacheName: 'assets' })
)

// Cache images/icons
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// PMTiles — large, cache aggressively
workbox.routing.registerRoute(
  ({ url }) => url.pathname.endsWith('.pmtiles'),
  new workbox.strategies.CacheFirst({
    cacheName: 'pmtiles',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
)

// Weather API — short-lived
workbox.routing.registerRoute(
  ({ url }) => url.hostname === 'api.open-meteo.com',
  new workbox.strategies.NetworkFirst({
    cacheName: 'weather',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 6 * 60 * 60 })],
  })
)
