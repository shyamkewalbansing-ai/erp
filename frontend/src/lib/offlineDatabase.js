/**
 * Boekhouding Offline Database & Sync
 * Slaat data lokaal op en synchroniseert met server
 */

const DB_NAME = 'BoekhoudingOfflineDB';
const DB_VERSION = 1;

// Stores voor offline data
const STORES = {
  debiteuren: 'debiteuren',
  crediteuren: 'crediteuren',
  facturen: 'facturen',
  offertes: 'offertes',
  producten: 'producten',
  transacties: 'transacties',
  pendingSync: 'pendingSync', // Wachtende sync items
  cache: 'cache' // Gecachte API responses
};

let db = null;

// Open database
export async function openDatabase() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineDB] Database opened');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create stores
      Object.values(STORES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          console.log('[OfflineDB] Created store:', storeName);
        }
      });
    };
  });
}

// Save item to store
export async function saveOffline(storeName, data) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const item = {
      ...data,
      id: data.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
      isOffline: true
    };
    
    const request = store.put(item);
    
    request.onsuccess = () => {
      console.log('[OfflineDB] Saved to', storeName, ':', item.id);
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all items from store
export async function getAllOffline(storeName) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Get unsynced items
export async function getUnsyncedItems(storeName) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('synced');
    const request = index.getAll(false);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Mark item as synced
export async function markAsSynced(storeName, id) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        item.syncedAt = Date.now();
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve(item);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Delete item from store
export async function deleteOffline(storeName, id) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Add to pending sync queue
export async function addToPendingSync(action, endpoint, data) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.pendingSync], 'readwrite');
    const store = transaction.objectStore(STORES.pendingSync);
    
    const item = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action, // 'CREATE', 'UPDATE', 'DELETE'
      endpoint,
      data,
      timestamp: Date.now(),
      synced: false,
      retries: 0
    };
    
    const request = store.add(item);
    request.onsuccess = () => {
      console.log('[OfflineDB] Added to sync queue:', action, endpoint);
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all pending sync items
export async function getPendingSyncItems() {
  return getAllOffline(STORES.pendingSync);
}

// Process sync queue
export async function processSyncQueue() {
  if (!navigator.onLine) {
    console.log('[OfflineDB] Still offline, skipping sync');
    return { synced: 0, failed: 0 };
  }
  
  const pendingItems = await getPendingSyncItems();
  const unsynced = pendingItems.filter(item => !item.synced);
  
  if (unsynced.length === 0) {
    console.log('[OfflineDB] No items to sync');
    return { synced: 0, failed: 0 };
  }
  
  console.log('[OfflineDB] Syncing', unsynced.length, 'items...');
  
  const token = localStorage.getItem('token');
  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
  let synced = 0;
  let failed = 0;
  
  for (const item of unsynced) {
    try {
      const method = item.action === 'DELETE' ? 'DELETE' : 
                     item.action === 'UPDATE' ? 'PUT' : 'POST';
      
      const response = await fetch(`${baseUrl}${item.endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined
      });
      
      if (response.ok) {
        await markAsSynced(STORES.pendingSync, item.id);
        synced++;
        console.log('[OfflineDB] Synced:', item.action, item.endpoint);
      } else {
        failed++;
        console.error('[OfflineDB] Sync failed:', response.status);
      }
    } catch (error) {
      failed++;
      console.error('[OfflineDB] Sync error:', error);
    }
  }
  
  console.log('[OfflineDB] Sync complete:', synced, 'synced,', failed, 'failed');
  return { synced, failed };
}

// Cache API response
export async function cacheApiResponse(endpoint, data) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.cache], 'readwrite');
    const store = transaction.objectStore(STORES.cache);
    
    const item = {
      id: endpoint,
      data,
      timestamp: Date.now(),
      synced: true
    };
    
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

// Get cached API response
export async function getCachedApiResponse(endpoint) {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.cache], 'readonly');
    const store = transaction.objectStore(STORES.cache);
    const request = store.get(endpoint);
    
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        // Check if cache is still valid (24 hours)
        const isValid = Date.now() - result.timestamp < 24 * 60 * 60 * 1000;
        resolve(isValid ? result.data : null);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear all offline data
export async function clearAllOfflineData() {
  const database = await openDatabase();
  
  const promises = Object.values(STORES).map(storeName => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
  
  await Promise.all(promises);
  console.log('[OfflineDB] All data cleared');
}

// Export stores for reference
export { STORES };
