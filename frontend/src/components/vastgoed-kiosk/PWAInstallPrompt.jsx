import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';

const STORAGE_KEY = 'vastgoed_pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

/**
 * PWAInstallPrompt — shows a bottom-sheet prompt to install the Vastgoed
 * admin dashboard as a PWA on mobile. Handles both Chrome/Edge/Android
 * (native beforeinstallprompt) and iOS (custom instructions).
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // Hide if running standalone or previously dismissed recently
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && (Date.now() - dismissedAt) < DISMISS_DAYS * 86400000) return;

    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome path: wait for native event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
    setShowIOSHelp(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShow(false);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
      setDeferredPrompt(null);
    } else {
      // iOS: show instructions
      setShowIOSHelp(true);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] pb-safe pointer-events-none md:hidden" data-testid="pwa-install-prompt">
      <div className="mx-3 mb-3 pointer-events-auto rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}>
        {!showIOSHelp ? (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm leading-tight">Installeer Kiosk Beheerder app</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">Snellere toegang, volledig scherm, push-meldingen direct op je telefoon.</p>
              </div>
              <button onClick={dismiss} data-testid="pwa-dismiss" aria-label="Sluiten"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={install} data-testid="pwa-install-btn"
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 flex items-center justify-center gap-2 shadow-md">
                <Download className="w-4 h-4" /> {deferredPrompt ? 'Installeren' : 'Toon instructies'}
              </button>
              <button onClick={dismiss} data-testid="pwa-later-btn"
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200">
                Later
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4" data-testid="pwa-ios-help">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Toevoegen aan beginscherm</h3>
              <button onClick={dismiss} aria-label="Sluiten"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Tik op de <Share className="inline w-4 h-4 mx-1 text-blue-500" /> <b>Deel</b>-knop in de browserbalk onderaan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Kies <Plus className="inline w-4 h-4 mx-1" /> <b>"Zet op beginscherm"</b></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Tik op <b>"Voeg toe"</b> rechtsboven</span>
              </li>
            </ol>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(110%); } to { transform: translateY(0); } }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}
