/**
 * Sync Manager - Handles synchronization between offline storage and server
 */

import { offlineDB, STORES } from './offlineDB';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Mapping van stores naar API endpoints
const STORE_API_MAP = {
  tenants: '/api/tenants',
  apartments: '/api/apartments',
  payments: '/api/payments',
  contracts: '/api/contracts',
  maintenance: '/api/maintenance',
  employees: '/api/hrm/employees',
  departments: '/api/hrm/departments',
  leave_requests: '/api/hrm/leave-requests',
  vehicles: '/api/autodealer/vehicles',
  vehicle_customers: '/api/autodealer/customers',
  vehicle_sales: '/api/autodealer/sales',
  spa_services: '/api/beautyspa/services',
  spa_customers: '/api/beautyspa/customers',
  spa_appointments: '/api/beautyspa/appointments',
  spa_staff: '/api/beautyspa/staff',
  invoices: '/api/boekhouding/facturen',
  customers: '/api/boekhouding/klanten',
  suppliers: '/api/boekhouding/leveranciers',
  products: '/api/boekhouding/producten',
  transactions: '/api/boekhouding/transacties',
  debts: '/api/schuldbeheer/schulden',
  debt_payments: '/api/schuldbeheer/betalingen'
};

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = [];
    this.token = null;
    this.lastSyncTime = null;
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());
    }
  }

  // ==================== Event Listeners ====================

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    });
  }

  // ==================== Online/Offline Handlers ====================

  onOnline() {
    console.log('🟢 Back online - starting sync');
    this.notify('online', { timestamp: new Date().toISOString() });
    this.syncAll();
  }

  onOffline() {
    console.log('🔴 Gone offline');
    this.notify('offline', { timestamp: new Date().toISOString() });
  }

  isOnline() {
    return navigator.onLine;
  }

  // ==================== Token Management ====================

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ==================== Fetch with Offline Support ====================

  async fetchWithOffline(storeName, endpoint, options = {}) {
    const { method = 'GET', body = null, forceOnline = false } = options;
    
    // If offline and not forcing online, return from IndexedDB
    if (!this.isOnline() && !forceOnline) {
      console.log(`📴 Offline - returning data from IndexedDB: ${storeName}`);
      return this.getFromOffline(storeName, options);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : null
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response in IndexedDB
      if (method === 'GET' && Array.isArray(data)) {
        await this.cacheData(storeName, data);
      }
      
      return { success: true, data, fromCache: false };
    } catch (error) {
      console.warn(`⚠️ Fetch failed, falling back to offline: ${error.message}`);
      return this.getFromOffline(storeName, options);
    }
  }

  async getFromOffline(storeName, options = {}) {
    try {
      const data = await offlineDB.getAll(storeName);
      return { success: true, data, fromCache: true };
    } catch (error) {
      console.error('IndexedDB error:', error);
      return { success: false, data: [], fromCache: true, error };
    }
  }

  // ==================== Cache Data ====================

  async cacheData(storeName, data) {
    if (!data || !Array.isArray(data)) return;
    
    try {
      await offlineDB.bulkPut(storeName, data);
      await offlineDB.updateCacheMeta(storeName);
      console.log(`✅ Cached ${data.length} items to ${storeName}`);
    } catch (error) {
      console.error(`Failed to cache data for ${storeName}:`, error);
    }
  }

  // ==================== CRUD with Offline Support ====================

  async create(storeName, data) {
    // Always save locally first
    const localData = {
      ...data,
      id: data.id || offlineDB.generateId(),
      created_at: new Date().toISOString(),
      _offline_created: true
    };
    
    await offlineDB.add(storeName, localData);
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'create',
      store: storeName,
      endpoint: STORE_API_MAP[storeName],
      data: localData
    });
    
    // If online, sync immediately
    if (this.isOnline()) {
      this.syncPendingItems();
    }
    
    return { success: true, data: localData };
  }

  async update(storeName, id, data) {
    // Update locally first
    const existingData = await offlineDB.get(storeName, id);
    const updatedData = {
      ...existingData,
      ...data,
      updated_at: new Date().toISOString(),
      _offline_updated: true
    };
    
    await offlineDB.put(storeName, updatedData);
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'update',
      store: storeName,
      endpoint: `${STORE_API_MAP[storeName]}/${id}`,
      data: updatedData
    });
    
    // If online, sync immediately
    if (this.isOnline()) {
      this.syncPendingItems();
    }
    
    return { success: true, data: updatedData };
  }

  async remove(storeName, id) {
    // Mark as deleted locally (soft delete for sync)
    const existingData = await offlineDB.get(storeName, id);
    if (existingData) {
      existingData._deleted = true;
      existingData._deleted_at = new Date().toISOString();
      await offlineDB.put(storeName, existingData);
    }
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'delete',
      store: storeName,
      endpoint: `${STORE_API_MAP[storeName]}/${id}`,
      data: { id }
    });
    
    // If online, sync immediately
    if (this.isOnline()) {
      this.syncPendingItems();
    }
    
    return { success: true };
  }

  // ==================== Sync Operations ====================

  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return;
    }
    
    if (!this.isOnline()) {
      console.log('📴 Cannot sync - offline');
      return;
    }
    
    this.isSyncing = true;
    this.notify('syncStart', { timestamp: new Date().toISOString() });
    
    try {
      // First, push pending changes
      await this.syncPendingItems();
      
      // Then, pull fresh data from server
      await this.pullFromServer();
      
      this.lastSyncTime = new Date().toISOString();
      this.notify('syncComplete', { 
        timestamp: this.lastSyncTime,
        success: true 
      });
      
      console.log('✅ Full sync complete');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notify('syncError', { error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }

  async syncPendingItems() {
    const pendingItems = await offlineDB.getPendingSyncItems();
    console.log(`📤 Syncing ${pendingItems.length} pending items`);
    
    for (const item of pendingItems) {
      try {
        let response;
        
        switch (item.type) {
          case 'create':
            response = await fetch(`${API_URL}${item.endpoint}`, {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify(item.data)
            });
            break;
            
          case 'update':
            response = await fetch(`${API_URL}${item.endpoint}`, {
              method: 'PUT',
              headers: this.getHeaders(),
              body: JSON.stringify(item.data)
            });
            break;
            
          case 'delete':
            response = await fetch(`${API_URL}${item.endpoint}`, {
              method: 'DELETE',
              headers: this.getHeaders()
            });
            break;
        }
        
        if (response && response.ok) {
          await offlineDB.markSynced(item.id);
          
          // Update local data with server response if available
          if (item.type !== 'delete') {
            const serverData = await response.json();
            if (serverData && serverData.id) {
              await offlineDB.put(item.store, { 
                ...serverData, 
                synced: true,
                _offline_created: false,
                _offline_updated: false
              });
            }
          } else {
            // Remove deleted item from local storage
            await offlineDB.delete(item.store, item.data.id);
          }
          
          console.log(`✅ Synced: ${item.type} ${item.store}`);
        } else {
          throw new Error(`HTTP ${response?.status || 'unknown'}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync item:`, error);
        await offlineDB.markFailed(item.id, error.message);
      }
    }
    
    // Clean up synced items
    await offlineDB.clearSyncedItems();
  }

  async pullFromServer() {
    const storesToSync = Object.entries(STORE_API_MAP);
    
    for (const [storeName, endpoint] of storesToSync) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: this.getHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            await this.cacheData(storeName, data);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to pull ${storeName}:`, error.message);
      }
    }
  }

  // ==================== Status Methods ====================

  async getSyncStatus() {
    const pendingCount = (await offlineDB.getPendingSyncItems()).length;
    const cacheMeta = await offlineDB.getAllCacheMeta();
    const storageInfo = await offlineDB.getStorageInfo();
    
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: pendingCount,
      cachedStores: cacheMeta,
      storage: storageInfo
    };
  }

  async getPendingChangesCount() {
    return (await offlineDB.getPendingSyncItems()).length;
  }
}

// Export singleton instance
const syncManager = new SyncManager();

export { syncManager };
export default syncManager;
