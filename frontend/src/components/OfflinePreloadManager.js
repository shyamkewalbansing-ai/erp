/**
 * Offline Preload Manager Component - Simplified version
 * Only caches current page resources, not all modules
 */

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Check if offline data was downloaded
function isPreloadComplete() {
  return localStorage.getItem('offlinePreloadComplete') === 'true';
}

// Cache current page resources via Service Worker
async function cacheCurrentPage() {
  if (!navigator.serviceWorker?.controller) {
    return false;
  }
  
  try {
    // Only cache essential resources already loaded on the page
    const urlsToCache = [
      '/',
      '/index.html',
      '/manifest.json'
    ];
    
    // Send to service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_INDEX'
    });
    
    return true;
  } catch (e) {
    console.error('[Offline] Failed to cache:', e);
    return false;
  }
}

export default function OfflinePreloadManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadDone, setPreloadDone] = useState(isPreloadComplete());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show banner if not preloaded and online (after 10 seconds, not 5)
  useEffect(() => {
    if (isOnline && !preloadDone && !isPreloading) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, preloadDone, isPreloading]);

  const startPreload = async () => {
    if (!isOnline) {
      toast.error('Je moet online zijn om offline data te downloaden');
      return;
    }
    
    setIsPreloading(true);
    toast.info('Basis offline data wordt gedownload...');
    
    try {
      // Just cache the current page shell
      await cacheCurrentPage();
      
      // Mark as complete
      localStorage.setItem('offlinePreloadComplete', 'true');
      localStorage.setItem('offlinePreloadDate', new Date().toISOString());
      
      setIsPreloading(false);
      setPreloadDone(true);
      setShowBanner(false);
      
      toast.success('Basis offline ondersteuning ingeschakeld. Pagina\'s die je bezoekt worden automatisch gecached.');
    } catch (error) {
      setIsPreloading(false);
      toast.error('Fout bij downloaden van offline data');
    }
  };

  // Don't render if preload is done and online
  if (preloadDone && isOnline && !showBanner) {
    return null;
  }

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline modus</span>
      </div>
    );
  }

  // Preloading indicator
  if (isPreloading) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-blue-500 text-white px-4 py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Offline data voorbereiden...</span>
        </div>
      </div>
    );
  }

  // Preload complete indicator
  if (preloadDone) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Offline beschikbaar</span>
      </div>
    );
  }

  // Banner to start preload
  if (showBanner) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Offline beschikbaar maken?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Pagina's die je bezoekt worden gecached voor offline gebruik.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={startPreload}>
                Activeren
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowBanner(false)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Smaller inline indicator
export function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline</span>
    </div>
  );
}
