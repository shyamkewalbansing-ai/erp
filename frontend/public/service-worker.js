/**
 * Service Worker - Alleen Boekhouding Offline
 * Veilig en lichtgewicht
 */

const CACHE_NAME = 'boekhouding-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Alleen same-origin GET requests
  if (url.origin !== location.origin || event.request.method !== 'GET') return;
  
  // Skip API en websockets
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/ws/')) return;
  
  // Alleen boekhouding pagina's en static assets cachen
  const isBoekhouding = url.pathname.includes('/boekhouding');
  const isStatic = url.pathname.includes('/static/');
  const isNavigation = event.request.mode === 'navigate';
  
  if (isNavigation) {
    event.respondWith(handleNavigation(event.request, isBoekhouding));
  } else if (isStatic) {
    event.respondWith(handleStatic(event.request));
  }
});

async function handleNavigation(request, isBoekhouding) {
  try {
    const response = await fetch(request);
    if (response.ok && isBoekhouding) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch (e) {
    if (isBoekhouding) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('/index.html');
      if (cached) return cached;
    }
    return new Response('<html><body><h1>Offline</h1><p>Geen internet. <a href="javascript:location.reload()">Opnieuw</a></p></body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return new Response('', { status: 404 });
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'CACHE_BOEKHOUDING') {
    cacheBoekhouding();
  }
});

async function cacheBoekhouding() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch('/');
    if (response.ok) {
      await cache.put('/index.html', response);
    }
  } catch (e) {}
}
