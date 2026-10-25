self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Intentionally no fetch handler and no CRM data caching.
// Sales OS always uses the network for authenticated business data.
