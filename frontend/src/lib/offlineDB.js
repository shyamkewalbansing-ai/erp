/**
 * IndexedDB Database Manager for Offline Support
 * Handles all local data storage and retrieval
 */

const DB_NAME = 'facturatie_offline_db';
const DB_VERSION = 1;

// All stores (tables) in our offline database
const STORES = {
  // User & Auth
  user: 'user',
  settings: 'settings',
  
  // Sync Queue
  syncQueue: 'syncQueue',
  
  // Module Data
  tenants: 'tenants',
  apartments: 'apartments',
  payments: 'payments',
  contracts: 'contracts',
  maintenance: 'maintenance',
  
  // HRM
  employees: 'employees',
  departments: 'departments',
  leave_requests: 'leave_requests',
  
  // Autodealer
  vehicles: 'vehicles',
  vehicle_customers: 'vehicle_customers',
  vehicle_sales: 'vehicle_sales',
  
  // Beauty/Spa
  spa_services: 'spa_services',
  spa_customers: 'spa_customers',
  spa_appointments: 'spa_appointments',
  spa_staff: 'spa_staff',
  
  // Boekhouding
  invoices: 'invoices',
  customers: 'customers',
  suppliers: 'suppliers',
  products: 'products',
  transactions: 'transactions',
  accounts: 'accounts',
  
  // Schuldbeheer
  debts: 'debts',
  debt_payments: 'debt_payments',
  
  // General
  notifications: 'notifications',
  dashboard_data: 'dashboard_data',
  
  // Cache metadata
  cache_meta: 'cache_meta'
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.readyPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create all object stores
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // Add indexes based on store type
            if (storeName === 'syncQueue') {
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('type', 'type', { unique: false });
            } else if (storeName === 'cache_meta') {
              store.createIndex('store', 'store', { unique: false });
              store.createIndex('lastSync', 'lastSync', { unique: false });
            } else {
              // Common indexes
              store.createIndex('created_at', 'created_at', { unique: false });
              store.createIndex('updated_at', 'updated_at', { unique: false });
              store.createIndex('user_id', 'user_id', { unique: false });
            }
          }
        });
        
        console.log('IndexedDB upgrade complete');
      };
    });
  }

  async ensureReady() {
    if (!this.isReady) {
      await this.readyPromise;
    }
    return this.db;
  }

  // ==================== CRUD Operations ====================

  async add(storeName, data) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Ensure data has an id
      if (!data.id) {
        data.id = this.generateId();
      }
      
      // Add timestamps
      data.offline_created = new Date().toISOString();
      data.synced = false;
      
      const request = store.add(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async put(storeName, data) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      data.offline_updated = new Date().toISOString();
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async get(storeName, id) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAll(storeName, query = null) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result || [];
        
        // Apply query filter if provided
        if (query && typeof query === 'function') {
          results = results.filter(query);
        }
        
        resolve(results);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async delete(storeName, id) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async clear(storeName) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async count(storeName) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // ==================== Sync Queue Operations ====================

  async addToSyncQueue(operation) {
    const queueItem = {
      id: this.generateId(),
      ...operation,
      status: 'pending',
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    };
    
    return this.add(STORES.syncQueue, queueItem);
  }

  async getPendingSyncItems() {
    const items = await this.getAll(STORES.syncQueue);
    return items.filter(item => item.status === 'pending').sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  async markSynced(id) {
    const item = await this.get(STORES.syncQueue, id);
    if (item) {
      item.status = 'synced';
      item.syncedAt = new Date().toISOString();
      await this.put(STORES.syncQueue, item);
    }
  }

  async markFailed(id, error) {
    const item = await this.get(STORES.syncQueue, id);
    if (item) {
      item.retries++;
      if (item.retries >= item.maxRetries) {
        item.status = 'failed';
      }
      item.lastError = error;
      item.lastAttempt = new Date().toISOString();
      await this.put(STORES.syncQueue, item);
    }
  }

  async clearSyncedItems() {
    const items = await this.getAll(STORES.syncQueue);
    const syncedItems = items.filter(item => item.status === 'synced');
    
    for (const item of syncedItems) {
      await this.delete(STORES.syncQueue, item.id);
    }
    
    return syncedItems.length;
  }

  // ==================== Bulk Operations ====================

  async bulkPut(storeName, items) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const errors = [];
      
      items.forEach(item => {
        if (!item.id) {
          item.id = this.generateId();
        }
        item.synced = true;
        item.lastSync = new Date().toISOString();
        
        const request = store.put(item);
        
        request.onsuccess = () => {
          completed++;
          if (completed === items.length) {
            resolve({ success: true, count: completed, errors });
          }
        };
        
        request.onerror = (event) => {
          errors.push({ item, error: event.target.error });
          completed++;
          if (completed === items.length) {
            resolve({ success: errors.length === 0, count: completed - errors.length, errors });
          }
        };
      });
      
      if (items.length === 0) {
        resolve({ success: true, count: 0, errors: [] });
      }
    });
  }

  // ==================== Cache Metadata ====================

  async updateCacheMeta(storeName) {
    const meta = {
      id: storeName,
      store: storeName,
      lastSync: new Date().toISOString(),
      itemCount: await this.count(storeName)
    };
    
    return this.put(STORES.cache_meta, meta);
  }

  async getCacheMeta(storeName) {
    return this.get(STORES.cache_meta, storeName);
  }

  async getAllCacheMeta() {
    return this.getAll(STORES.cache_meta);
  }

  // ==================== Utilities ====================

  generateId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }

  async exportStore(storeName) {
    const data = await this.getAll(storeName);
    return JSON.stringify(data, null, 2);
  }

  async importStore(storeName, jsonData) {
    const data = JSON.parse(jsonData);
    return this.bulkPut(storeName, data);
  }
}

// Export singleton instance
const offlineDB = new OfflineDB();

export { offlineDB, STORES };
export default offlineDB;
