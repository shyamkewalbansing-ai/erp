/**
 * Offline Preload Manager Component
 * Shows preload progress and manages offline data caching
 */

import React, { useState, useEffect } from 'react';
import { preloadAllModules, isPreloadComplete, resetPreload } from '../lib/preloadModules';
import { Download, CheckCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export default function OfflinePreloadManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preloadDone, setPreloadDone] = useState(isPreloadComplete());
  const [showBanner, setShowBanner] = useState(false);
  const [stats, setStats] = useState({ loaded: 0, failed: 0 });

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

  // Show banner if not preloaded and online
  useEffect(() => {
    if (isOnline && !preloadDone && !isPreloading) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000); // Show after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isOnline, preloadDone, isPreloading]);

  const startPreload = async () => {
    if (!isOnline) {
      toast.error('Je moet online zijn om offline data te downloaden');
      return;
    }
    
    setIsPreloading(true);
    setProgress(0);
    toast.info('Offline data wordt gedownload...');
    
    try {
      const result = await preloadAllModules(
        (prog, loaded, failed) => {
          setProgress(prog);
          setStats({ loaded, failed });
        },
        (loaded, failed) => {
          setIsPreloading(false);
          setPreloadDone(true);
          setShowBanner(false);
          
          if (failed === 0) {
            toast.success('✅ Offline data volledig gedownload! De app werkt nu offline.');
          } else {
            toast.warning(`⚠️ Offline data gedownload met ${failed} fouten. Sommige pagina's werken mogelijk niet offline.`);
          }
        }
      );
    } catch (error) {
      setIsPreloading(false);
      toast.error('Fout bij downloaden van offline data');
    }
  };

  const forceReload = () => {
    resetPreload();
    setPreloadDone(false);
    setProgress(0);
    startPreload();
  };

  // Don't render if preload is done and online
  if (preloadDone && isOnline && !showBanner) {
    return null;
  }

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
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
          <div>
            <p className="text-sm font-medium">Offline data downloaden...</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-32 h-2 bg-blue-400 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs">{progress}%</span>
            </div>
          </div>
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
              Download alle pagina's zodat de app ook zonder internet werkt.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={startPreload}>
                Downloaden
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
