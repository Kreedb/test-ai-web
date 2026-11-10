// Tombstone for the retired offline cache. The old worker answered cache-first
// from a precached index.html, so removing it silently would leave visitors on
// the last offline build; this one clears the caches and unregisters itself.
// A 404 on an update check would leave the old worker installed, so keep this
// file until no client can still hold the old registration.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('convbin-')).map((key) => caches.delete(key))))
      .then(() => self.registration.unregister()),
  )
})
