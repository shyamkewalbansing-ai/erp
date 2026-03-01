import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = (now - dismissedDate) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) return; // Don't show for 7 days after dismissal
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after delay if not standalone
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or no prompt available
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Installeer Facturatie App
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isIOS 
                ? 'Tik op "Deel" en dan "Zet op beginscherm"'
                : 'Installeer de app voor snellere toegang en offline gebruik'
              }
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {!isIOS && deferredPrompt && (
          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Later
            </Button>
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Installeren
            </Button>
          </div>
        )}

        {isIOS && (
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
              Tik op <span className="font-medium">⎙</span> onderaan → "Zet op beginscherm"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
