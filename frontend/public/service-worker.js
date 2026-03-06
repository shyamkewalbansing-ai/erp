/**
 * Service Worker v9 - ALLEEN BOEKHOUDING OFFLINE
 * Simple and efficient - only caches boekhouding pages
 */

const CACHE_NAME = 'boekhouding-offline-v1';

// Install
self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin GET requests
  if (url.origin !== location.origin || event.request.method !== 'GET') {
    return;
  }
  
  // Skip API, websocket, auth
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('/ws/') ||
      url.pathname.includes('/auth')) {
    return;
  }
  
  // Handle navigation (page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request, url));
    return;
  }
  
  // Handle static assets (JS, CSS)
  if (url.pathname.includes('/static/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css')) {
    event.respondWith(handleAsset(event.request));
    return;
  }
});

// Handle page navigation
async function handleNavigation(request, url) {
  const cache = await caches.open(CACHE_NAME);
  const isBoekhouding = url.pathname.includes('/boekhouding');
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache index.html for boekhouding pages
    if (response.ok && isBoekhouding) {
      cache.put('/index.html', response.clone());
      cache.put('/', response.clone());
    }
    
    return response;
  } catch (error) {
    // Offline - serve cached index.html for boekhouding
    if (isBoekhouding) {
      const cached = await cache.match('/index.html') || await cache.match('/');
      if (cached) {
        console.log('[SW] Serving cached page for boekhouding');
        return cached;
      }
    }
    
    // Not boekhouding or not cached - show offline page
    return new Response(offlineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle static assets
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Update in background
    fetch(request).then(r => r.ok && cache.put(request, r)).catch(() => {});
    return cached;
  }
  
  // Fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('', { status: 404 });
  }
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_INDEX') {
    caches.open(CACHE_NAME).then(async cache => {
      try {
        const r = await fetch('/');
        if (r.ok) {
          await cache.put('/', r.clone());
          await cache.put('/index.html', r);
        }
      } catch (e) {}
    });
  }
});

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#10b981;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .box{background:#fff;border-radius:16px;padding:32px;max-width:340px;text-align:center}
    h1{font-size:18px;margin-bottom:8px}
    p{color:#666;font-size:14px;margin-bottom:16px}
    button{background:#10b981;color:#fff;border:0;padding:10px 20px;border-radius:8px;cursor:pointer}
  </style>
</head>
<body>
  <div class="box">
    <h1>Je bent offline</h1>
    <p>Alleen de Boekhouding module werkt offline. Andere pagina's hebben internet nodig.</p>
    <button onclick="location.reload()">Opnieuw</button>
  </div>
  <script>addEventListener('online',()=>location.reload())</script>
</body>
</html>`;
}

console.log('[SW] Boekhouding Offline Worker loaded');
