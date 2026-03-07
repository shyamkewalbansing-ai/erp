/**
 * Offline Sync Indicator
 * Shows sync status and pending items - ONLY shows pending count, not offline status
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { processSyncQueue, getPendingSyncItems } from '../lib/offlineDatabase';

export default function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check pending items
  useEffect(() => {
    const checkPending = async () => {
      try {
        const items = await getPendingSyncItems();
        const unsynced = items.filter(i => !i.synced);
        setPendingCount(unsynced.length);
      } catch (e) {
        // Ignore errors
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Online/offline detection and auto-sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Auto-sync when back online
      if (pendingCount > 0) {
        toast.info(`Synchroniseren van ${pendingCount} items...`);
        setIsSyncing(true);
        
        try {
          const result = await processSyncQueue();
          
          if (result.synced > 0) {
            toast.success(`${result.synced} items gesynchroniseerd!`);
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

  // Online with pending items - show sync button
  if (isOnline && pendingCount > 0) {
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

  // Don't show anything else - BoekhoudingOfflineManager handles offline status
  return null;
}
