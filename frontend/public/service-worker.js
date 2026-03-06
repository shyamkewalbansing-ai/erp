/**
 * Service Worker - Complete Boekhouding Offline
 * Cachet pagina's EN API responses voor echte offline werking
 */

const CACHE_NAME = 'boekhouding-complete-v1';
const API_CACHE = 'boekhouding-api-v1';

// Boekhouding API endpoints die gecached moeten worden
const BOEKHOUDING_API_PATTERNS = [
  '/api/boekhouding/',
  '/api/facturen',
  '/api/offertes',
  '/api/debiteuren',
  '/api/crediteuren',
  '/api/producten',
  '/api/voorraad',
];

self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => !k.includes('boekhouding')).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;
  
  const isBoekhouding = url.pathname.includes('/boekhouding');
  const isBoekhoudingApi = BOEKHOUDING_API_PATTERNS.some(p => url.pathname.includes(p));
  const isStatic = url.pathname.includes('/static/');
  const isNavigation = event.request.mode === 'navigate';

  // Handle boekhouding navigation
  if (isNavigation && isBoekhouding) {
    event.respondWith(handleBoekhoudingNavigation(event.request));
    return;
  }

  // Handle boekhouding API calls
  if (isBoekhoudingApi) {
    event.respondWith(handleBoekhoudingApi(event.request));
    return;
  }

  // Handle static assets for boekhouding
  if (isStatic) {
    event.respondWith(handleStatic(event.request));
    return;
  }

  // Handle other navigation
  if (isNavigation) {
    event.respondWith(handleNavigation(event.request));
  }
});

// Boekhouding pagina navigatie - cache first when offline
async function handleBoekhoudingNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache index.html voor boekhouding
      cache.put('/index.html', response.clone());
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline - serve from cache
    console.log('[SW] Offline - serving cached boekhouding page');
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    
    return offlineResponse();
  }
}

// Boekhouding API - cache responses for offline
async function handleBoekhoudingApi(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache the API response
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline - return cached API data
    console.log('[SW] Offline - serving cached API:', request.url);
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // Return empty array/object for missing data
    return new Response(JSON.stringify({ offline: true, data: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Static assets - stale while revalidate
async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  return cached || await fetchPromise || new Response('', { status: 404 });
}

// Regular navigation
async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (e) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match('/index.html');
    return cached || offlineResponse();
  }
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'CACHE_BOEKHOUDING' || event.data === 'CACHE_INDEX') {
    cacheIndex();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
    caches.delete(API_CACHE);
  }
});

async function cacheIndex() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch('/');
    if (response.ok) {
      await cache.put('/', response.clone());
      await cache.put('/index.html', response);
      console.log('[SW] Cached index.html');
    }
  } catch (e) {
    console.log('[SW] Could not cache index');
  }
}

function offlineResponse() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline</title>
      <style>
        body{font-family:system-ui;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
        .box{background:white;padding:2rem;border-radius:1rem;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}
        h1{color:#111;font-size:1.25rem;margin:0 0 .5rem}
        p{color:#666;margin:0 0 1rem}
        button{background:#10b981;color:white;border:none;padding:.75rem 1.5rem;border-radius:.5rem;cursor:pointer;font-size:1rem}
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Je bent offline</h1>
        <p>Download eerst de boekhouding voor offline gebruik.</p>
        <button onclick="location.reload()">Opnieuw proberen</button>
      </div>
      <script>addEventListener('online',()=>location.reload())</script>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

console.log('[SW] Boekhouding Complete Offline Worker loaded');
