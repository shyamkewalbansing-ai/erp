/**
 * Service Worker v6 - Fixed caching for React SPA
 */

const CACHE_NAME = 'facturatie-v6';

// Install: Pre-cache the index.html immediately
self.addEventListener('install', (event) => {
  console.log('[SW v6] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Fetch and cache the main index.html
      try {
        const response = await fetch('/');
        if (response.ok) {
          await cache.put('/', response.clone());
          await cache.put('/index.html', response.clone());
          console.log('[SW v6] Cached index.html');
        }
      } catch (e) {
        console.log('[SW v6] Could not cache index.html:', e);
      }
      return self.skipWaiting();
    })
  );
});

// Activate: Clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW v6] Activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => 
        Promise.all(
          keys.filter(k => k.startsWith('facturatie-') && k !== CACHE_NAME)
              .map(k => {
                console.log('[SW v6] Deleting old cache:', k);
                return caches.delete(k);
              })
        )
      ),
      self.clients.claim()
    ]).then(() => {
      console.log('[SW v6] Activated and claimed clients');
    })
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip WebSocket requests
  if (url.pathname.includes('/ws/')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Skip auth endpoints
    if (url.pathname.includes('/auth') || 
        url.pathname.includes('/login') ||
        url.pathname.includes('/ai/chat')) {
      return;
    }
    event.respondWith(handleAPI(request));
    return;
  }
  
  // Handle static assets (JS, CSS, images)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStatic(request));
    return;
  }
  
  // Default: try network, fallback to cache
  event.respondWith(handleDefault(request));
});

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/) ||
         pathname.includes('/static/');
}

// Handle navigation requests - THIS IS THE KEY FUNCTION
async function handleNavigate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response for offline use
      cache.put('/', networkResponse.clone());
      cache.put('/index.html', networkResponse.clone());
      cache.put(request, networkResponse.clone());
      console.log('[SW v6] Cached navigation response');
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW v6] Network failed, trying cache...');
    
    // Network failed, try cache
    // First try the exact URL
    let cached = await cache.match(request);
    if (cached) {
      console.log('[SW v6] Found exact match in cache');
      return cached;
    }
    
    // Try index.html (for SPA routing)
    cached = await cache.match('/index.html');
    if (cached) {
      console.log('[SW v6] Returning cached index.html');
      return cached;
    }
    
    // Try root
    cached = await cache.match('/');
    if (cached) {
      console.log('[SW v6] Returning cached /');
      return cached;
    }
    
    // Nothing in cache, return offline page
    console.log('[SW v6] Nothing in cache, returning offline page');
    return new Response(getOfflineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// Handle API requests
async function handleAPI(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({ offline: true, message: 'Je bent offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle static assets - cache first for performance
async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Update cache in background (stale-while-revalidate)
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {});
    return cached;
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return empty response for missing assets
    console.log('[SW v6] Static asset not available:', request.url);
    return new Response('', { status: 404 });
  }
}

// Default handler
async function handleDefault(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('', { status: 404 });
  }
}

// Message handler
self.addEventListener('message', (event) => {
  console.log('[SW v6] Message:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_INDEX') {
    // Force cache the index.html
    caches.open(CACHE_NAME).then(async (cache) => {
      const response = await fetch('/');
      if (response.ok) {
        await cache.put('/', response.clone());
        await cache.put('/index.html', response);
        console.log('[SW v6] Force cached index.html');
      }
    });
  }
});

function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Facturatie N.V.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#10b981,#059669);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .box{background:#fff;border-radius:20px;padding:40px;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .icon{width:80px;height:80px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    h1{font-size:24px;margin-bottom:12px;color:#111}
    p{color:#666;margin-bottom:24px;line-height:1.5}
    button{background:#10b981;color:#fff;border:0;padding:14px 28px;border-radius:12px;font-size:16px;cursor:pointer;width:100%}
    button:hover{background:#059669}
    .tip{margin-top:20px;font-size:13px;color:#999}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    </div>
    <h1>Je bent offline</h1>
    <p>Om offline te werken moet je eerst de app openen met internet en op "Downloaden voor offline" klikken.</p>
    <button onclick="location.reload()">Opnieuw proberen</button>
    <p class="tip">De pagina herlaadt automatisch wanneer internet terugkomt.</p>
  </div>
  <script>
    window.addEventListener('online', () => location.reload());
  </script>
</body>
</html>`;
}

console.log('[SW v6] Loaded');
