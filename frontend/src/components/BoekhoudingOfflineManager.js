/**
 * Boekhouding Offline Manager
 * Veilig - laadt modules één voor één met pauzes
 */

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, WifiOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Alleen essentiële boekhouding pagina's
const BOEKHOUDING_MODULES = [
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
];

export default function BoekhoudingOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(() => localStorage.getItem('boekhouding_offline') === 'true');
  const [showBanner, setShowBanner] = useState(false);

  // Check of we op boekhouding pagina zijn
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

  // Toon banner na 8 seconden op boekhouding pagina's
  useEffect(() => {
    if (isBoekhouding && isOnline && !isDone && !isDownloading) {
      const timer = setTimeout(() => setShowBanner(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [isBoekhouding, isOnline, isDone, isDownloading]);

  const download = async () => {
    setIsDownloading(true);
    setProgress(0);
    
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/service-worker.js');
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage('CACHE_BOEKHOUDING');
      }

      // Laad modules één voor één met pauze
      for (let i = 0; i < BOEKHOUDING_MODULES.length; i++) {
        try {
          await BOEKHOUDING_MODULES[i]();
        } catch (e) {
          // Negeer fouten, ga door
        }
        setProgress(Math.round(((i + 1) / BOEKHOUDING_MODULES.length) * 100));
        // Wacht 200ms tussen elke module
        await new Promise(r => setTimeout(r, 200));
      }

      localStorage.setItem('boekhouding_offline', 'true');
      setIsDone(true);
      setShowBanner(false);
      toast.success('Boekhouding is offline beschikbaar!');
    } catch (e) {
      toast.error('Download mislukt');
    } finally {
      setIsDownloading(false);
    }
  };

  // Niet tonen buiten boekhouding
  if (!isBoekhouding) return null;

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>Offline</span>
      </div>
    );
  }

  // Downloading
  if (isDownloading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          <div>
            <div className="text-sm font-medium">Downloaden... {progress}%</div>
            <div className="w-24 h-1.5 bg-blue-400 rounded mt-1">
              <div className="h-full bg-white rounded" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Done indicator
  if (isDone) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Offline klaar</span>
      </div>
    );
  }

  // Download banner
  if (showBanner) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-xl border p-4 max-w-xs">
        <div className="flex gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Offline werken?</div>
            <p className="text-xs text-gray-500 mt-0.5">Download boekhouding voor offline gebruik</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={download} className="h-7 text-xs">
                Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowBanner(false)} className="h-7 text-xs">
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
