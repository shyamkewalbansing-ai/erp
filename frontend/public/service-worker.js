/**
 * Service Worker v7 - Robust Offline Support for React SPA
 * Strategy: Network-first for navigation, Cache-first for assets
 */

const CACHE_NAME = 'facturatie-v7';
const APP_SHELL_CACHE = 'facturatie-shell-v7';

// Core files that MUST be cached for offline to work
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install: Pre-cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW v7] Installing...');
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(APP_SHELL_CACHE);
      
      // Cache each shell file individually, don't fail if one fails
      for (const url of APP_SHELL) {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) {
            await shellCache.put(url, response);
            console.log('[SW v7] Cached shell:', url);
          }
        } catch (e) {
          console.log('[SW v7] Could not cache:', url, e);
        }
      }
      
      // Force this version to become active
      await self.skipWaiting();
      console.log('[SW v7] Install complete');
    })()
  );
});

// Activate: Clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('[SW v7] Activating...');
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('facturatie-') && 
                         name !== CACHE_NAME && 
                         name !== APP_SHELL_CACHE)
          .map(name => {
            console.log('[SW v7] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      // Take control of all clients immediately
      await self.clients.claim();
      console.log('[SW v7] Activated and claimed clients');
    })()
  );
});

// Fetch: Main request handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip WebSocket and auth requests
  if (url.pathname.includes('/ws/') || 
      url.pathname.includes('/auth') ||
      url.pathname.includes('/login') ||
      url.pathname.includes('/ai/chat')) {
    return;
  }
  
  // CRITICAL: Handle navigation requests (page loads, F5 refresh)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Handle API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets - cache first for speed
  event.respondWith(handleStaticAsset(request));
});

/**
 * Handle navigation requests (HTML pages)
 * This is the MOST IMPORTANT handler for offline to work
 */
async function handleNavigation(request) {
  const shellCache = await caches.open(APP_SHELL_CACHE);
  const dynamicCache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update shell cache with fresh response
      shellCache.put('/', networkResponse.clone());
      shellCache.put('/index.html', networkResponse.clone());
      console.log('[SW v7] Updated shell cache from network');
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - we're offline
    console.log('[SW v7] Network failed for navigation, trying cache...');
    
    // Try to serve cached index.html - this is ESSENTIAL for SPA
    let cached = await shellCache.match('/index.html');
    if (cached) {
      console.log('[SW v7] Serving cached /index.html for offline');
      return cached;
    }
    
    cached = await shellCache.match('/');
    if (cached) {
      console.log('[SW v7] Serving cached / for offline');
      return cached;
    }
    
    // Try dynamic cache
    cached = await dynamicCache.match('/index.html');
    if (cached) {
      console.log('[SW v7] Serving from dynamic cache');
      return cached;
    }
    
    // Last resort: return offline HTML
    console.log('[SW v7] No cache available, returning offline page');
    return new Response(getOfflineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

/**
 * Handle API requests
 * Network first, fall back to cache for GET requests
 */
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Offline - try cache for GET requests
    if (request.method === 'GET') {
      const cached = await cache.match(request);
      if (cached) {
        console.log('[SW v7] Serving API from cache:', request.url);
        return cached;
      }
    }
    
    // Return offline error response
    return new Response(
      JSON.stringify({ 
        offline: true, 
        error: 'Je bent offline. Deze actie wordt uitgevoerd wanneer je weer online bent.' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Handle static assets (JS, CSS, images, fonts)
 * Cache first for speed, update in background
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Check cache first
  const cached = await cache.match(request);
  
  if (cached) {
    // Return cached, but update in background (stale-while-revalidate)
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
      // Cache the response
      cache.put(request, response.clone());
      console.log('[SW v7] Cached asset:', request.url);
    }
    
    return response;
  } catch (error) {
    console.log('[SW v7] Asset not available offline:', request.url);
    
    // Return empty response for non-critical assets
    return new Response('', { status: 404 });
  }
}

// Message handler for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW v7] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_INDEX') {
    // Cache index.html and all loaded resources
    cacheIndexAndResources();
  }
  
  if (event.data?.type === 'CACHE_ALL') {
    // Cache multiple URLs at once
    cacheCurrentResources(event.data.urls || []);
  }
  
  if (event.data?.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0]?.postMessage(status);
    });
  }
});

/**
 * Cache index.html and discover/cache all linked resources
 */
async function cacheIndexAndResources() {
  const shellCache = await caches.open(APP_SHELL_CACHE);
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Fetch fresh index.html
    const indexResponse = await fetch('/', { cache: 'reload' });
    if (indexResponse.ok) {
      const indexClone = indexResponse.clone();
      await shellCache.put('/', indexResponse.clone());
      await shellCache.put('/index.html', indexResponse);
      console.log('[SW v7] Cached index.html');
      
      // Parse the HTML to find all resources
      const html = await indexClone.text();
      const resourceUrls = extractResourceUrls(html);
      
      // Cache all discovered resources
      let cached = 0;
      for (const url of resourceUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
            cached++;
          }
        } catch (e) {
          // Ignore failed resources
        }
      }
      console.log(`[SW v7] Cached ${cached} additional resources from index.html`);
    }
  } catch (e) {
    console.log('[SW v7] Could not cache index:', e);
  }
}

/**
 * Extract resource URLs from HTML
 */
function extractResourceUrls(html) {
  const urls = [];
  
  // Find CSS links
  const cssRegex = /href=["']([^"']+\.css[^"']*)/g;
  let match;
  while ((match = cssRegex.exec(html)) !== null) {
    if (match[1].startsWith('/') || match[1].startsWith(location.origin)) {
      urls.push(match[1].startsWith('/') ? match[1] : new URL(match[1]).pathname);
    }
  }
  
  // Find JS scripts
  const jsRegex = /src=["']([^"']+\.js[^"']*)/g;
  while ((match = jsRegex.exec(html)) !== null) {
    if (match[1].startsWith('/') || match[1].startsWith(location.origin)) {
      urls.push(match[1].startsWith('/') ? match[1] : new URL(match[1]).pathname);
    }
  }
  
  // Add manifest
  urls.push('/manifest.json');
  urls.push('/favicon.ico');
  
  return [...new Set(urls)];
}

/**
 * Cache multiple URLs at once
 */
async function cacheCurrentResources(urls) {
  const cache = await caches.open(CACHE_NAME);
  const shellCache = await caches.open(APP_SHELL_CACHE);
  
  let cached = 0;
  let failed = 0;
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) {
        if (url === '/' || url === '/index.html') {
          await shellCache.put(url, response);
        } else {
          await cache.put(url, response);
        }
        cached++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }
  
  console.log(`[SW v7] Cached ${cached} resources, ${failed} failed`);
  
  // Notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_COMPLETE',
      cached,
      failed
    });
  });
}

/**
 * Get cache status
 */
async function getCacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const shellCache = await caches.open(APP_SHELL_CACHE);
  
  const cacheKeys = await cache.keys();
  const shellKeys = await shellCache.keys();
  
  return {
    totalCached: cacheKeys.length + shellKeys.length,
    shellCached: shellKeys.length,
    assetsCached: cacheKeys.length,
    hasIndexHtml: await shellCache.match('/index.html') !== undefined
  };
}

/**
 * Offline HTML fallback
 */
function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Facturatie N.V.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#10b981,#059669);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .box{background:#fff;border-radius:20px;padding:40px;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .icon{width:80px;height:80px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
    h1{font-size:24px;margin-bottom:12px;color:#111}
    p{color:#666;margin-bottom:24px;line-height:1.6}
    .steps{text-align:left;background:#f9fafb;padding:20px;border-radius:12px;margin-bottom:24px}
    .steps h3{font-size:14px;color:#111;margin-bottom:12px}
    .steps ol{margin-left:20px;color:#666;font-size:14px;line-height:1.8}
    button{background:#10b981;color:#fff;border:0;padding:14px 28px;border-radius:12px;font-size:16px;cursor:pointer;width:100%;font-weight:600}
    button:hover{background:#059669}
    .tip{margin-top:16px;font-size:13px;color:#999}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1>Offline modus niet beschikbaar</h1>
    <p>De app is nog niet klaar voor offline gebruik.</p>
    <div class="steps">
      <h3>Om offline te werken:</h3>
      <ol>
        <li>Maak verbinding met internet</li>
        <li>Open de app en log in</li>
        <li>Klik op "Downloaden voor offline gebruik"</li>
        <li>Wacht tot alle bestanden zijn gedownload</li>
      </ol>
    </div>
    <button onclick="location.reload()">Opnieuw proberen</button>
    <p class="tip">De pagina herlaadt automatisch wanneer internet terugkomt.</p>
  </div>
  <script>
    window.addEventListener('online', () => location.reload());
    setInterval(() => navigator.onLine && location.reload(), 5000);
  </script>
</body>
</html>`;
}

console.log('[SW v7] Service Worker loaded');
