/**
 * Offline Sync Indicator
 * Shows sync status and pending items
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { processSyncQueue, getPendingSyncItems } from '../lib/offlineDatabase';

export default function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Check pending items
  useEffect(() => {
    const checkPending = async () => {
      try {
        const items = await getPendingSyncItems();
        const unsynced = items.filter(i => !i.synced);
        setPendingCount(unsynced.length);
      } catch (e) {
        console.error('Error checking pending items:', e);
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Auto-sync when back online
      if (pendingCount > 0) {
        toast.info(`Synchroniseren van ${pendingCount} items...`);
        setIsSyncing(true);
        
        try {
          const result = await processSyncQueue();
          setLastSyncResult(result);
          
          if (result.synced > 0) {
            toast.success(`${result.synced} items gesynchroniseerd!`);
            // Refresh pending count
            const items = await getPendingSyncItems();
            setPendingCount(items.filter(i => !i.synced).length);
          }
          if (result.failed > 0) {
            toast.error(`${result.failed} items konden niet worden gesynchroniseerd`);
          }
        } catch (e) {
          toast.error('Synchronisatie mislukt');
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Je bent offline. Wijzigingen worden lokaal opgeslagen.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount]);

  // Manual sync
  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await processSyncQueue();
      setLastSyncResult(result);
      
      if (result.synced > 0) {
        toast.success(`${result.synced} items gesynchroniseerd!`);
        const items = await getPendingSyncItems();
        setPendingCount(items.filter(i => !i.synced).length);
      } else if (pendingCount === 0) {
        toast.info('Alles is al gesynchroniseerd');
      }
    } catch (e) {
      toast.error('Synchronisatie mislukt');
    } finally {
      setIsSyncing(false);
    }
  };

  // Only show on boekhouding pages
  const isBoekhouding = typeof window !== 'undefined' && 
    window.location.pathname.includes('/boekhouding');
  
  if (!isBoekhouding) return null;

  // Syncing indicator
  if (isSyncing) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Synchroniseren...</span>
      </div>
    );
  }

  // Offline with pending items
  if (!isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <CloudOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          Offline - {pendingCount} wachtend
        </span>
      </div>
    );
  }

  // Offline without pending
  if (!isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-gray-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <CloudOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline</span>
      </div>
    );
  }

  // Online with pending items
  if (pendingCount > 0) {
    return (
      <button 
        onClick={handleManualSync}
        className="fixed top-4 right-4 z-50 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-colors"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">{pendingCount} te synchroniseren</span>
      </button>
    );
  }

  // Online, all synced
  return null;
}
