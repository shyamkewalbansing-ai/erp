/**
 * Minimal Service Worker - Just handles basic caching
 * No preloading, no bulk caching, minimal memory usage
 */

const CACHE_NAME = 'app-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Unregister this service worker - we don't need offline functionality
self.addEventListener('message', (event) => {
  if (event.data === 'UNREGISTER') {
    self.registration.unregister();
  }
});

// Minimal fetch handler - just pass through to network
self.addEventListener('fetch', () => {
  // Do nothing - let all requests go to network
});
