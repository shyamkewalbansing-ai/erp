/**
 * Service Worker v8 - Simplified and Memory-Efficient
 * Strategy: Cache only essential files, lazy cache on demand
 */

const CACHE_NAME = 'facturatie-v8';

// Install: Just activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW v8] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate: Clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW v8] Activating...');
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('facturatie-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      
      // Take control immediately
      await self.clients.claim();
      console.log('[SW v8] Activated');
    })()
  );
});

// Fetch: Handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip non-GET requests and certain paths
  if (request.method !== 'GET') return;
  if (url.pathname.includes('/ws/')) return;
  if (url.pathname.includes('/api/auth')) return;
  if (url.pathname.includes('/api/ai/')) return;
  
  // Handle navigation requests (page loads)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Handle API requests - network only, no caching
  if (url.pathname.startsWith('/api/')) {
    return; // Let browser handle API requests normally
  }
  
  // Handle static assets - cache on demand
  event.respondWith(handleAsset(request));
});

/**
 * Handle navigation - serve cached index.html when offline
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache index.html for offline use
      cache.put('/', response.clone());
      cache.put('/index.html', response.clone());
    }
    
    return response;
  } catch (error) {
    // Offline - try cache
    console.log('[SW v8] Offline, trying cache...');
    
    let cached = await cache.match('/index.html');
    if (cached) return cached;
    
    cached = await cache.match('/');
    if (cached) return cached;
    
    // Return offline message
    return new Response(getOfflineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Handle static assets - stale-while-revalidate
 */
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Check cache first
  const cached = await cache.match(request);
  
  // Fetch from network in background
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached if available, otherwise wait for network
  if (cached) {
    return cached;
  }
  
  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  // Asset not available
  return new Response('', { status: 404 });
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_INDEX') {
    cacheIndex();
  }
});

async function cacheIndex() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch('/');
    if (response.ok) {
      await cache.put('/', response.clone());
      await cache.put('/index.html', response);
      console.log('[SW v8] Cached index.html');
    }
  } catch (e) {
    console.log('[SW v8] Could not cache index');
  }
}

function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Facturatie N.V.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#10b981;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .box{background:#fff;border-radius:16px;padding:32px;max-width:360px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.2)}
    h1{font-size:20px;margin-bottom:8px;color:#111}
    p{color:#666;margin-bottom:20px;font-size:14px}
    button{background:#10b981;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer;width:100%}
    button:hover{background:#059669}
  </style>
</head>
<body>
  <div class="box">
    <h1>Je bent offline</h1>
    <p>Controleer je internetverbinding en probeer opnieuw.</p>
    <button onclick="location.reload()">Opnieuw proberen</button>
  </div>
  <script>window.addEventListener('online',()=>location.reload())</script>
</body>
</html>`;
}

console.log('[SW v8] Loaded');
