/**
 * Boekhouding Offline Manager - COMPLETE VERSIE
 * Download alle boekhouding pagina's en cache API data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// ALLE boekhouding pagina's
const BOEKHOUDING_PAGES = [
  () => import('../pages/boekhouding/BoekhoudingLayout'),
  () => import('../pages/boekhouding/DashboardPage'),
  () => import('../pages/boekhouding/VerkoopPage'),
  () => import('../pages/boekhouding/InkoopPage'),
  () => import('../pages/boekhouding/BankKasPage'),
  () => import('../pages/boekhouding/DebiteruenPage'),
  () => import('../pages/boekhouding/CrediteruenPage'),
  () => import('../pages/boekhouding/GrootboekPage'),
  () => import('../pages/boekhouding/BTWPage'),
  () => import('../pages/boekhouding/VoorraadPage'),
  () => import('../pages/boekhouding/RapportagesPage'),
  () => import('../pages/boekhouding/InstellingenPage'),
  () => import('../pages/boekhouding/NieuweFactuurPage'),
  () => import('../pages/boekhouding/NieuweOffertePage'),
  () => import('../pages/boekhouding/NieuweDebiteurPage'),
  () => import('../pages/boekhouding/NieuweLeverancierPage'),
  () => import('../pages/boekhouding/NieuweBTWAangiftePage'),
  () => import('../pages/boekhouding/POSPage'),
  () => import('../pages/boekhouding/POSMobileScannerPage'),
  () => import('../pages/boekhouding/POSPermanentScannerPage'),
  () => import('../pages/boekhouding/POSPublicScannerPage'),
  () => import('../pages/boekhouding/VasteActivaPage'),
  () => import('../pages/boekhouding/ProjectenPage'),
  () => import('../pages/boekhouding/HRMPage'),
  () => import('../pages/boekhouding/HerinneringenPage'),
  () => import('../pages/boekhouding/DocumentenPage'),
  () => import('../pages/boekhouding/AuditTrailPage'),
  () => import('../pages/boekhouding/WisselkoersenPage'),
];

// API endpoints die gecached moeten worden voor boekhouding
const BOEKHOUDING_API_ENDPOINTS = [
  '/boekhouding/dashboard',
  '/boekhouding/dashboard/charts',
  '/boekhouding/facturen',
  '/boekhouding/offertes',
  '/boekhouding/debiteuren',
  '/boekhouding/crediteuren',
  '/boekhouding/grootboek',
  '/boekhouding/grootboek/rekeningen',
  '/boekhouding/btw',
  '/boekhouding/btw/aangiftes',
  '/boekhouding/voorraad',
  '/boekhouding/voorraad/producten',
  '/boekhouding/bank',
  '/boekhouding/kas',
  '/boekhouding/instellingen',
  '/boekhouding/wisselkoersen',
  '/boekhouding/projecten',
  '/boekhouding/vaste-activa',
  '/boekhouding/documenten',
  '/boekhouding/herinneringen',
];

export default function BoekhoudingOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isDone, setIsDone] = useState(() => localStorage.getItem('boekhouding_offline_v2') === 'true');
  const [showBanner, setShowBanner] = useState(false);

  const isBoekhouding = typeof window !== 'undefined' && 
    window.location.pathname.includes('/boekhouding');

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isBoekhouding && isOnline && !isDone && !isDownloading) {
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isBoekhouding, isOnline, isDone, isDownloading]);

  const downloadAll = useCallback(async () => {
    setIsDownloading(true);
    setProgress(0);
    setStatus('Service Worker registreren...');

    try {
      // 1. Register service worker and wait for it to be active
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        // Wait for the service worker to be active
        let sw = registration.active;
        if (!sw) {
          sw = registration.installing || registration.waiting;
          if (sw) {
            await new Promise(resolve => {
              sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') resolve();
              });
              if (sw.state === 'activated') resolve();
            });
          }
        }
        
        // Now cache index.html
        const reg = await navigator.serviceWorker.ready;
        if (reg.active) {
          reg.active.postMessage('CACHE_BOEKHOUDING');
          // Wait a bit for caching to complete
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // 2. Download alle pagina's parallel (sneller)
      setStatus('Pagina\'s downloaden...');
      const totalItems = BOEKHOUDING_PAGES.length + BOEKHOUDING_API_ENDPOINTS.length;
      let completed = 0;

      // Download pagina's in batches van 5
      for (let i = 0; i < BOEKHOUDING_PAGES.length; i += 5) {
        const batch = BOEKHOUDING_PAGES.slice(i, i + 5);
        await Promise.allSettled(batch.map(loader => loader()));
        completed += batch.length;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // 3. Cache API data
      setStatus('Data cachen...');
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
      
      for (const endpoint of BOEKHOUDING_API_ENDPOINTS) {
        try {
          const response = await fetch(`${baseUrl}/api${endpoint}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (response.ok) {
            const data = await response.json();
            // Use same cache key format as boekhoudingApi.js
            localStorage.setItem(`boekhouding_cache_${endpoint}`, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        } catch (e) {
          // Skip failed endpoints
        }
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // 4. Cache index.html via service worker
      setStatus('Afronden...');
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('CACHE_INDEX');
      }

      // Done!
      localStorage.setItem('boekhouding_offline_v2', 'true');
      localStorage.setItem('boekhouding_offline_date', new Date().toISOString());
      setIsDone(true);
      setShowBanner(false);
      toast.success('Boekhouding is volledig offline beschikbaar!');

    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download mislukt: ' + error.message);
    } finally {
      setIsDownloading(false);
      setStatus('');
    }
  }, []);

  const resetOffline = () => {
    localStorage.removeItem('boekhouding_offline_v2');
    localStorage.removeItem('boekhouding_offline_date');
    // Remove cached API data
    BOEKHOUDING_API_ENDPOINTS.forEach(endpoint => {
      localStorage.removeItem(`offline_${endpoint}`);
    });
    setIsDone(false);
    toast.info('Offline data verwijderd');
  };

  if (!isBoekhouding) return null;

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline modus</span>
      </div>
    );
  }

  // Downloading
  if (isDownloading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg min-w-[280px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium">Boekhouding downloaden</div>
            <div className="text-xs opacity-80 mt-0.5">{status}</div>
            <div className="w-full h-2 bg-blue-400 rounded mt-2">
              <div 
                className="h-full bg-white rounded transition-all duration-300" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="text-xs mt-1">{progress}% voltooid</div>
          </div>
        </div>
      </div>
    );
  }

  // Done indicator with refresh option
  if (isDone) {
    const offlineDate = localStorage.getItem('boekhouding_offline_date');
    const dateStr = offlineDate ? new Date(offlineDate).toLocaleDateString('nl-NL') : '';
    
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-3">
        <CheckCircle className="w-4 h-4" />
        <div>
          <span className="text-sm font-medium">Offline beschikbaar</span>
          {dateStr && <span className="text-xs opacity-80 ml-1">({dateStr})</span>}
        </div>
        <button 
          onClick={downloadAll}
          className="p-1 hover:bg-emerald-600 rounded"
          title="Opnieuw downloaden"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Download banner
  if (showBanner) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-2xl border p-4 max-w-sm">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Boekhouding offline?</div>
            <p className="text-sm text-gray-500 mt-1">
              Download alle {BOEKHOUDING_PAGES.length} pagina's om offline te kunnen werken.
            </p>
            <div className="flex gap-2 mt-3">
              <Button onClick={downloadAll} className="bg-emerald-500 hover:bg-emerald-600">
                <Download className="w-4 h-4 mr-1" />
                Download alles
              </Button>
              <Button variant="ghost" onClick={() => setShowBanner(false)}>
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
