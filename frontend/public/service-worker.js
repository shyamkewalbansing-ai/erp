/**
 * Advanced Service Worker for Facturatie N.V.
 * Handles offline caching, background sync, and push notifications
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `facturatie-${CACHE_VERSION}`;

// Core files die altijd gecached moeten worden
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/login',
  '/register'
];

// Extensies die gecached moeten worden
const CACHEABLE_EXTENSIONS = [
  '.js',
  '.css',
  '.html',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
];

// URLs die NIET gecached moeten worden
const NO_CACHE_PATTERNS = [
  '/api/auth',
  '/api/login',
  '/api/register',
  '/api/logout',
  '/api/ai/chat',
  '/api/live-chat/ws',
  'chrome-extension',
  'hot-update'
];

// ==================== Helper Functions ====================

function shouldCache(url) {
  // Niet cachen als het in de no-cache lijst staat
  if (NO_CACHE_PATTERNS.some(pattern => url.includes(pattern))) {
    return false;
  }
  
  // Niet cachen als het een externe URL is (behalve fonts)
  const urlObj = new URL(url);
  if (urlObj.origin !== self.location.origin) {
    // Cache alleen externe fonts
    return url.includes('fonts.googleapis.com') || 
           url.includes('fonts.gstatic.com');
  }
  
  return true;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext)) ||
         url.includes('/static/');
}

// ==================== Install Event ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets');
        // Cache core assets, maar fail niet als sommige mislukken
        return Promise.allSettled(
          CORE_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// ==================== Activate Event ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('facturatie-') && name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ==================== Fetch Event ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip requests that shouldn't be cached
  if (!shouldCache(url)) {
    return;
  }
  
  // For navigation requests (HTML pages) - Network first, then cache, then offline page
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Try to get from cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fall back to index.html for SPA routing
          const indexResponse = await caches.match('/index.html');
          if (indexResponse) {
            return indexResponse;
          }
          
          // Last resort: show offline page
          return new Response(getOfflineHTML(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }
  
  // For static assets - Cache first, then network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version, but also fetch and update cache in background
            fetch(request)
              .then(response => {
                if (response.ok) {
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, response);
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          
          // Not in cache, fetch and cache
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // For API requests - Network first, fall back to cache
  if (url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful GET responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline API response
          return new Response(JSON.stringify({
            offline: true,
            message: 'Je bent offline. Data kan niet worden geladen.'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // Default: Network first
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ==================== Offline HTML ====================
function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facturatie N.V. - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0,0,0,0.25);
    }
    .icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
    }
    .icon svg {
      width: 50px;
      height: 50px;
      color: #ef4444;
    }
    h1 {
      color: #111827;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #fef3c7;
      color: #92400e;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    button {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      width: 100%;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .hint {
      margin-top: 24px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
    </div>
    
    <div class="status">
      <span class="status-dot"></span>
      Geen internetverbinding
    </div>
    
    <h1>Je bent offline</h1>
    <p>Controleer je internetverbinding en probeer het opnieuw. Je data wordt automatisch gesynchroniseerd zodra je weer online bent.</p>
    
    <button onclick="window.location.reload()">
      Opnieuw proberen
    </button>
    
    <p class="hint">Tip: Deze app werkt offline nadat je minimaal één keer bent ingelogd.</p>
  </div>
  
  <script>
    // Auto-reload wanneer weer online
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>`;
}

// ==================== Message Handler ====================
self.addEventListener('message', (event) => {
  console.log('[SW] Message:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_ALL') {
    // Cache alle resources van de huidige pagina
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHING_STARTED' });
        });
      })
    );
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared');
      })
    );
  }
});

// ==================== Background Sync ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});

// ==================== Push Notifications ====================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'Facturatie N.V.',
    body: 'Je hebt een nieuwe melding',
    icon: '/icons/icon-192x192.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: data.actions || []
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('[SW] Service Worker v3 loaded');
