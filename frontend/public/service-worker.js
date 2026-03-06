/**
 * Simple but Effective Service Worker for Facturatie N.V.
 * Uses runtime caching for all assets
 */

const CACHE_NAME = 'facturatie-v4';
const OFFLINE_URL = '/offline.html';

// Install: Cache offline page only
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v4...');
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => 
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

// Fetch: Cache everything on the fly
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET, cross-origin, and WebSocket
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }
  
  // Skip certain paths
  if (url.pathname.includes('/ws/') || 
      url.pathname.includes('/api/auth') ||
      url.pathname.includes('/api/login') ||
      url.pathname.includes('/api/ai/chat')) {
    return;
  }
  
  // For API calls: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(r => r || new Response(
          JSON.stringify({ offline: true }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )))
    );
    return;
  }
  
  // For navigation (HTML): network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // Try index.html for SPA routing
          const index = await caches.match('/');
          if (index) return index;
          
          // Offline page
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          
          return new Response(getOfflineHTML(), {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }
  
  // For everything else: cache first, network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Update cache in background
        fetch(request).then(r => {
          if (r.ok) caches.open(CACHE_NAME).then(c => c.put(request, r));
        }).catch(() => {});
        return cached;
      }
      
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#10b981;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .box{background:#fff;border-radius:20px;padding:40px;max-width:380px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.2)}
    h1{font-size:22px;margin:20px 0 10px}
    p{color:#666;margin-bottom:20px}
    button{background:#10b981;color:#fff;border:0;padding:12px 24px;border-radius:10px;font-size:15px;cursor:pointer}
    button:hover{background:#059669}
  </style>
</head>
<body>
  <div class="box">
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M1 1l22 22M9 9a3 3 0 0 0 4.24 4.24M5 12.55a11 11 0 0 1 14.08 1.86l1.42-1.42A13 13 0 0 0 3.5 11.13L5 12.55z"/></svg>
    <h1>Je bent offline</h1>
    <p>Open de app eerst met internet om offline te kunnen werken.</p>
    <button onclick="location.reload()">Opnieuw proberen</button>
  </div>
  <script>addEventListener('online',()=>location.reload())</script>
</body>
</html>`;
}

console.log('[SW] v4 loaded');
