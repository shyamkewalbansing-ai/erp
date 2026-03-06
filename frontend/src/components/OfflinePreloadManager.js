/**
 * Offline Preload Manager - ALLEEN BOEKHOUDING MODULE
 * Simplified: Only caches Boekhouding pages for offline use
 */

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Only Boekhouding modules for offline
const boekhoudingModules = [
  () => import('../pages/boekhouding/DashboardPage'),
  () => import('../pages/boekhouding/GrootboekPage'),
  () => import('../pages/boekhouding/DebiteruenPage'),
  () => import('../pages/boekhouding/CrediteruenPage'),
  () => import('../pages/boekhouding/BankKasPage'),
  () => import('../pages/boekhouding/BTWPage'),
  () => import('../pages/boekhouding/VerkoopPage'),
  () => import('../pages/boekhouding/InkoopPage'),
  () => import('../pages/boekhouding/VoorraadPage'),
  () => import('../pages/boekhouding/RapportagesPage'),
  () => import('../pages/boekhouding/InstellingenPage'),
  () => import('../pages/boekhouding/NieuweFactuurPage'),
  () => import('../pages/boekhouding/NieuweOffertePage'),
  () => import('../pages/boekhouding/BoekhoudingLayout'),
];

function isPreloadComplete() {
  return localStorage.getItem('boekhoudingOffline') === 'true';
}

export default function OfflinePreloadManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
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

  // Show banner only on boekhouding pages
  useEffect(() => {
    const isBoekhouding = window.location.pathname.includes('/boekhouding');
    if (isOnline && !preloadDone && !isPreloading && isBoekhouding) {
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, preloadDone, isPreloading]);

  const startPreload = async () => {
    if (!isOnline) {
      toast.error('Je moet online zijn om te downloaden');
      return;
    }
    
    setIsPreloading(true);
    setProgress(0);
    toast.info('Boekhouding wordt gedownload voor offline...');
    
    try {
      // Cache index.html first
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CACHE_INDEX' });
      }
      
      // Load boekhouding modules one by one
      let loaded = 0;
      for (const loadModule of boekhoudingModules) {
        try {
          await loadModule();
          loaded++;
          setProgress(Math.round((loaded / boekhoudingModules.length) * 100));
        } catch (e) {
          console.warn('[Offline] Module failed:', e.message);
        }
        // Small delay between modules
        await new Promise(r => setTimeout(r, 100));
      }
      
      localStorage.setItem('boekhoudingOffline', 'true');
      localStorage.setItem('boekhoudingOfflineDate', new Date().toISOString());
      
      setIsPreloading(false);
      setPreloadDone(true);
      setShowBanner(false);
      
      toast.success('Boekhouding is nu offline beschikbaar!');
    } catch (error) {
      setIsPreloading(false);
      toast.error('Fout bij downloaden');
    }
  };

  // Only show on boekhouding pages
  const isBoekhouding = typeof window !== 'undefined' && window.location.pathname.includes('/boekhouding');
  
  if (!isBoekhouding && isOnline) {
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

  // Loading indicator
  if (isPreloading) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-blue-500 text-white px-4 py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>
            <p className="text-sm font-medium">Boekhouding downloaden...</p>
            <div className="w-32 h-2 bg-blue-400 rounded-full mt-1">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete indicator
  if (preloadDone && isBoekhouding) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Offline beschikbaar</span>
      </div>
    );
  }

  // Download banner
  if (showBanner) {
    return (
      <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Boekhouding offline?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Download de boekhouding module om offline te werken.
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

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline</span>
    </div>
  );
}
