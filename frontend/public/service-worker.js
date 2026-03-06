/**
 * Enhanced Service Worker for Facturatie N.V.
 * Handles offline caching with special support for code-split chunks
 */

const CACHE_NAME = 'facturatie-v5';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW v5] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW v5] Activating...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(keys => 
        Promise.all(
          keys.filter(k => k.startsWith('facturatie-') && k !== CACHE_NAME)
              .map(k => caches.delete(k))
        )
      ),
      self.clients.claim()
    ])
  );
});

// Fetch event - the main logic
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }
  
  // Skip WebSocket and auth endpoints
  if (url.pathname.includes('/ws/') || 
      url.pathname.includes('/api/auth') ||
      url.pathname.includes('/api/login') ||
      url.pathname.includes('/api/ai/chat')) {
    return;
  }

  // Special handling for JavaScript chunks
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.chunk.js')) {
    event.respondWith(handleJSChunk(request));
    return;
  }
  
  // CSS files
  if (url.pathname.endsWith('.css')) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Images and fonts
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPI(request));
    return;
  }
  
  // Navigation requests (HTML)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Default: network first
  event.respondWith(handleDefault(request));
});

// Handle JavaScript chunks - critical for lazy loading
async function handleJSChunk(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first for JS chunks (they're immutable due to hash)
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  
  // Not in cache, try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache for future use
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline and not cached - return error that React can handle
    console.error('[SW] Failed to load JS chunk:', request.url);
    
    // Return a response that will trigger the error boundary
    return new Response(
      'throw new Error("Chunk loading failed - offline");',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/javascript' }
      }
    );
  }
}

// Handle static assets - cache first
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  const cached = await cache.match(request);
  if (cached) {
    // Update cache in background
    fetch(request).then(r => {
      if (r.ok) cache.put(request, r);
    }).catch(() => {});
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('', { status: 404 });
  }
}

// Handle API requests - network first, cache fallback
async function handleAPI(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
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

// Handle navigation - network first, fallback to index.html
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      // Also cache index.html
      cache.put(new Request('/'), response.clone());
    }
    return response;
  } catch (error) {
    // Try to return cached version of the page
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Fallback to index.html (for SPA routing)
    const index = await cache.match('/');
    if (index) {
      return index;
    }
    
    // Last resort: offline page
    return new Response(getOfflineHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
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
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then(cache => {
      urls.forEach(url => {
        fetch(url).then(r => {
          if (r.ok) cache.put(url, r);
        }).catch(() => {});
      });
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
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
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
    setInterval(() => { if(navigator.onLine) location.reload(); }, 3000);
  </script>
</body>
</html>`;
}

console.log('[SW v5] Loaded');
