/**
 * Offline Context - React Context for offline functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncManager } from '../lib/syncManager';
import { offlineDB, STORES } from '../lib/offlineDB';
import { toast } from 'sonner';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Initialize and listen for sync events
  useEffect(() => {
    // Set token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      syncManager.setToken(token);
    }

    // Listen for sync manager events
    const unsubscribe = syncManager.addListener((event, data) => {
      switch (event) {
        case 'online':
          setIsOnline(true);
          toast.success('🟢 Je bent weer online! Data wordt gesynchroniseerd...');
          break;
        case 'offline':
          setIsOnline(false);
          toast.warning('🔴 Je bent offline. Wijzigingen worden lokaal opgeslagen.');
          break;
        case 'syncStart':
          setIsSyncing(true);
          setSyncError(null);
          break;
        case 'syncComplete':
          setIsSyncing(false);
          setLastSyncTime(data.timestamp);
          updatePendingCount();
          toast.success('✅ Synchronisatie voltooid!');
          break;
        case 'syncError':
          setIsSyncing(false);
          setSyncError(data.error);
          toast.error(`❌ Synchronisatie mislukt: ${data.error}`);
          break;
        default:
          break;
      }
    });

    // Initial pending count
    updatePendingCount();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await syncManager.getPendingChangesCount();
    setPendingChanges(count);
  };

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Je bent offline. Synchronisatie niet mogelijk.');
      return;
    }
    await syncManager.syncAll();
    await updatePendingCount();
  }, [isOnline]);

  // Fetch data with offline support
  const fetchOffline = useCallback(async (storeName, endpoint, options = {}) => {
    return syncManager.fetchWithOffline(storeName, endpoint, options);
  }, []);

  // Create with offline support
  const createOffline = useCallback(async (storeName, data) => {
    const result = await syncManager.create(storeName, data);
    await updatePendingCount();
    return result;
  }, []);

  // Update with offline support
  const updateOffline = useCallback(async (storeName, id, data) => {
    const result = await syncManager.update(storeName, id, data);
    await updatePendingCount();
    return result;
  }, []);

  // Delete with offline support
  const deleteOffline = useCallback(async (storeName, id) => {
    const result = await syncManager.remove(storeName, id);
    await updatePendingCount();
    return result;
  }, []);

  // Get sync status
  const getSyncStatus = useCallback(async () => {
    return syncManager.getSyncStatus();
  }, []);

  // Clear all offline data (for logout)
  const clearOfflineData = useCallback(async () => {
    for (const store of Object.values(STORES)) {
      await offlineDB.clear(store);
    }
    setPendingChanges(0);
    setLastSyncTime(null);
  }, []);

  const value = {
    // State
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    syncError,
    
    // Actions
    triggerSync,
    fetchOffline,
    createOffline,
    updateOffline,
    deleteOffline,
    getSyncStatus,
    clearOfflineData,
    
    // Direct access to stores
    STORES
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

// Offline status indicator component
export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingChanges, triggerSync } = useOffline();

  if (isOnline && pendingChanges === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
      isOnline 
        ? isSyncing 
          ? 'bg-blue-500 text-white' 
          : 'bg-orange-500 text-white'
        : 'bg-red-500 text-white'
    }`}>
      {!isOnline && (
        <>
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">Offline</span>
          {pendingChanges > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pendingChanges} wachtend
            </span>
          )}
        </>
      )}
      
      {isOnline && isSyncing && (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Synchroniseren...</span>
        </>
      )}
      
      {isOnline && !isSyncing && pendingChanges > 0 && (
        <>
          <span className="text-sm font-medium">{pendingChanges} niet gesynchroniseerd</span>
          <button 
            onClick={triggerSync}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs"
          >
            Sync nu
          </button>
        </>
      )}
    </div>
  );
}

export default OfflineContext;
