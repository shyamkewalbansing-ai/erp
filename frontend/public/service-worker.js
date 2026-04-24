/**
 * Service Worker - Boekhouding Offline
 * BELANGRIJK: Cache index.html tijdens install en serveer bij navigatie
 */

// NOTE: Bump this version on every production release to force clients to
// invalidate the old cache and fetch the new build. The activate handler
// automatically deletes all caches that don't match CACHE_NAME.
const CACHE_NAME = 'boekhouding-v7-2026-04-24';

// Bestanden die ALTIJD gecached moeten worden
const PRECACHE_FILES = [
  '/',
  '/index.html'
];

// Install: Cache index.html direct
self.addEventListener('install', (event) => {
  console.log('[SW] Installing and caching index.html...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          PRECACHE_FILES.map(url => {
            return fetch(url, { cache: 'reload' })
              .then(response => {
                if (response.ok) {
                  console.log('[SW] Cached:', url);
                  return cache.put(url, response);
                }
              })
              .catch(err => console.log('[SW] Failed to cache:', url, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => console.log('[SW] Activated and claimed clients'))
  );
});

// Fetch: Handle all requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin
  if (url.origin !== location.origin) return;
  
  // Skip non-GET
  if (event.request.method !== 'GET') return;
  
  // CRITICAL: Handle navigation requests (page loads, F5 refresh)
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigate(event.request));
    return;
  }
  
  // Handle static files (exclude face-api model files from caching)
  if ((url.pathname.startsWith('/static/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.ico')) &&
      !url.pathname.startsWith('/models/')) {
    event.respondWith(handleStatic(event.request));
    return;
  }
});

// Handle page navigation - MOST IMPORTANT for F5 to work
async function handleNavigate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update cache with fresh index.html
      cache.put('/', networkResponse.clone());
      cache.put('/index.html', networkResponse.clone());
      console.log('[SW] Updated cached index.html from network');
    }
    
    return networkResponse;
  } catch (error) {
    // OFFLINE - Serve from cache
    console.log('[SW] Offline - serving cached index.html');
    
    // Try multiple cache keys
    let cached = await cache.match('/index.html');
    if (cached) {
      console.log('[SW] Found /index.html in cache');
      return cached;
    }
    
    cached = await cache.match('/');
    if (cached) {
      console.log('[SW] Found / in cache');
      return cached;
    }
    
    cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Found request in cache');
      return cached;
    }
    
    // Nothing in cache - show custom offline page
    console.log('[SW] No cache found, showing offline message');
    return new Response(`
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Facturatie</title>
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
      padding: 48px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0,0,0,0.2);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: #f59e0b;
    }
    h1 { font-size: 24px; color: #111; margin-bottom: 12px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    .steps {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .steps h3 { font-size: 14px; color: #111; margin-bottom: 12px; }
    .steps ol { margin-left: 20px; color: #666; font-size: 14px; line-height: 2; }
    button {
      background: #10b981;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }
    button:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    </div>
    <h1>Je bent offline</h1>
    <p>De app kon niet laden omdat er geen internetverbinding is en de offline data nog niet is gedownload.</p>
    <div class="steps">
      <h3>Om offline te werken:</h3>
      <ol>
        <li>Maak verbinding met internet</li>
        <li>Ga naar Boekhouding</li>
        <li>Klik op "Download alles"</li>
        <li>Wacht tot download klaar is</li>
      </ol>
    </div>
    <button onclick="location.reload()">Opnieuw proberen</button>
  </div>
  <script>
    // Auto reload when back online
    window.addEventListener('online', () => location.reload());
    // Check every 3 seconds
    setInterval(() => { if (navigator.onLine) location.reload(); }, 3000);
  </script>
</body>
</html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// Handle static assets
async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Update in background
    fetch(request).then(r => {
      if (r.ok) cache.put(request, r);
    }).catch(() => {});
    return cached;
  }
  
  // Try network
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
  console.log('[SW] Message received:', event.data);
  
  if (event.data === 'CACHE_BOEKHOUDING' || event.data === 'CACHE_INDEX') {
    cacheIndexNow();
  }
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Force cache index.html
async function cacheIndexNow() {
  console.log('[SW] Caching index.html now...');
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch('/', { cache: 'reload' });
    if (response.ok) {
      await cache.put('/', response.clone());
      await cache.put('/index.html', response);
      console.log('[SW] Successfully cached index.html');
      
      // Notify clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHED', success: true });
      });
    }
  } catch (e) {
    console.error('[SW] Failed to cache index.html:', e);
  }
}

console.log('[SW] Service Worker loaded - boekhouding-v5-2026-04-24');

// ============== WEB PUSH NOTIFICATIONS ==============
// IndexedDB helpers (SW has no access to localStorage)
const IDB_NAME = 'kiosk-auth';
const IDB_STORE = 'tokens';

function idbGet(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction(IDB_STORE, 'readonly');
        const r = tx.objectStore(IDB_STORE).get(key);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    };
    req.onerror = () => resolve(null);
  });
}

self.addEventListener('push', (event) => {
  let data = { title: 'Notificatie', body: '', url: '/vastgoed', tag: 'kiosk' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    try { data.body = event.data ? event.data.text() : ''; } catch (_) {}
  }

  const actions = [];
  if (data.actions_hint === 'approve' && data.payment_id) {
    actions.push({ action: 'approve', title: 'Goedkeuren' });
    actions.push({ action: 'view', title: 'Bekijken' });
  }

  const options = {
    body: data.body,
    icon: '/kiosk-icons/icon-192.png',
    badge: '/kiosk-icons/icon-192.png',
    tag: data.tag,
    renotify: true,
    requireInteraction: !!data.payment_id,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/vastgoed', payment_id: data.payment_id || null, api_base: data.api_base || '' },
    silent: false,
    actions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificatie', options)
  );
});

async function approvePaymentFromNotification(paymentId, apiBase) {
  const authObj = await idbGet('auth');
  if (!authObj || !authObj.token) {
    return { ok: false, reason: 'no-token' };
  }
  const base = apiBase || authObj.api_base || '';
  try {
    const resp = await fetch(`${base}/api/kiosk/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authObj.token}`,
      },
      body: JSON.stringify({ approved_by: authObj.user_name || 'Push goedkeuring' }),
    });
    if (!resp.ok) return { ok: false, reason: `http-${resp.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const d = event.notification.data || {};
  event.notification.close();

  if (action === 'approve' && d.payment_id) {
    event.waitUntil((async () => {
      const r = await approvePaymentFromNotification(d.payment_id, d.api_base);
      if (r.ok) {
        await self.registration.showNotification('✅ Goedgekeurd', {
          body: 'Kwitantie is goedgekeurd.',
          icon: '/kiosk-icons/icon-192.png',
          tag: `approved-${d.payment_id}`,
          silent: false,
        });
      } else {
        await self.registration.showNotification('Goedkeuring mislukt', {
          body: r.reason === 'no-token'
            ? 'Log eerst in via de Admin Dashboard om vanuit meldingen goed te keuren.'
            : 'Kon niet goedkeuren. Open de app om opnieuw te proberen.',
          icon: '/kiosk-icons/icon-192.png',
          tag: `approve-fail-${d.payment_id}`,
          requireInteraction: true,
          silent: false,
        });
      }
      // Also open/focus the app
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clients.length > 0 && 'focus' in clients[0]) { clients[0].focus(); }
    })());
    return;
  }

  const targetUrl = d.url || '/vastgoed';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const u = new URL(client.url);
        if (u.pathname.startsWith(targetUrl.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      } catch (_) {}
    }
    if (allClients.length > 0 && 'navigate' in allClients[0]) {
      try { await allClients[0].navigate(targetUrl); } catch (_) {}
      return allClients[0].focus();
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});
