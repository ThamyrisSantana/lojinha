// Removal service worker. The installable-app (PWA) support was reverted, but browsers that opened
// the site while it was live still have the old service worker. When they check for updates they
// fetch this file, which deletes the old caches, unregisters itself and reloads open tabs.
// Nothing registers it anymore; it can be deleted once old visitors have had time to update.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
