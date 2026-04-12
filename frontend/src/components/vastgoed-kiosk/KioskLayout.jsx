import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Building2, Hand, Monitor, Smartphone, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import KioskWelcome from './KioskWelcome';
import KioskPinEntry from './KioskPinEntry';
import KioskApartmentSelect from './KioskApartmentSelect';
import KioskTenantOverview from './KioskTenantOverview';
import KioskPaymentSelect from './KioskPaymentSelect';
import KioskPaymentConfirm from './KioskPaymentConfirm';
import KioskReceipt from './KioskReceipt';
import SetPinScreen from './SetPinScreen';
import KioskAdminDashboard from './KioskAdminDashboard';

// Local API
const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

const slideVariants = {
  enter: { opacity: 0, x: 100 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

function useKioskMode() {
  const [mode, setMode] = useState({ isTouch: false, screenSize: 'normal' });

  useEffect(() => { document.title = 'Vastgoed Kiosk'; }, []);

  // Dynamic PWA manifest for kiosk — so "Add to Home Screen" opens the kiosk URL
  useEffect(() => {
    const kioskPath = window.location.pathname;
    const kioskManifest = {
      name: 'Vastgoed Kiosk',
      short_name: 'Kiosk',
      start_url: kioskPath,
      scope: kioskPath,
      display: 'standalone',
      background_color: '#f97316',
      theme_color: '#f97316',
      orientation: 'any',
      icons: [
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };
    const blob = new Blob([JSON.stringify(kioskManifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    // Replace existing manifest link
    let link = document.querySelector('link[rel="manifest"]');
    if (link) {
      link.href = url;
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = url;
      document.head.appendChild(link);
    }
    // Also set theme-color meta for mobile browser chrome
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#f97316';

    return () => URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const detect = () => {
      const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
      const h = window.innerHeight;
      const screenSize = h <= 800 ? 'compact' : h > 1080 ? 'large' : 'normal';
      setMode({ isTouch, screenSize });
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  return mode;
}

export default function KioskLayout() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const kioskMode = useKioskMode();
  const [step, setStep] = useState('loading');
  const [tenant, setTenant] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [startScreen, setStartScreen] = useState('kiosk');

  const modeClasses = [
    kioskMode.isTouch ? 'kiosk-touch' : '',
    kioskMode.screenSize === 'compact' ? 'kiosk-compact' : '',
    kioskMode.screenSize === 'large' ? 'kiosk-large' : '',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (companyId) {
      // Preload company info for fast navigation
      Promise.all([
        axios.get(`${API}/public/${companyId}/company`),
      ]).then(([compRes]) => {
        setCompanyName(compRes.data.name);
        const screen = compRes.data.start_screen || 'kiosk';
        setStartScreen(screen);
        
        if (compRes.data.subscription_blocked) {
          setSubscriptionBlocked(true);
          return;
        }
        
        const hasPin = compRes.data.has_pin;
        setRequiresPin(hasPin);
        const alreadyVerified = sessionStorage.getItem(`kiosk_pin_verified_${companyId}`) === 'true';
        
        if (alreadyVerified) {
          setPinVerified(true);
          setStep(screen === 'dashboard' ? 'admin' : 'select');
          return;
        }
        
        if (!hasPin) { setStep('no-pin'); return; }
        setStep('pin');
      }).catch(() => {
        setCompanyNotFound(true);
        setStep('select');
      });
    }
  }, [companyId]);

  // Set fullscreen kiosk mode (allow scrolling for content pages)
  useEffect(() => {
    document.body.style.touchAction = 'manipulation';
    return () => {
      document.body.style.touchAction = '';
    };
  }, []);

  const goTo = useCallback((newStep) => setStep(newStep), []);

  const reset = useCallback(() => {
    setTenant(null);
    setPaymentData(null);
    setPaymentResult(null);
    setStep('select');
  }, []);

  if (subscriptionBlocked) {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm mx-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2" data-testid="subscription-blocked-title">Abonnement Verlopen</h1>
          <p className="text-sm text-slate-500 mb-2">{companyName}</p>
          <p className="text-sm text-slate-400 mb-6">Uw abonnement is verlopen. Neem contact op met de beheerder.</p>
          <button 
            onClick={() => navigate('/vastgoed')}
            className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition shadow-lg shadow-orange-500/25"
          >
            Terug naar Home
          </button>
        </div>
      </div>
    );
  }

  if (companyNotFound) {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm mx-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Bedrijf niet gevonden</h1>
          <p className="text-sm text-slate-400 mb-6">Deze kiosk is niet geconfigureerd.</p>
          <button 
            onClick={() => navigate('/vastgoed')}
            className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition shadow-lg shadow-orange-500/25"
          >
            Terug naar Home
          </button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-base text-white/80">Laden...</p>
            </div>
          </div>
        );
      case 'no-pin':
        return (
          <SetPinScreen
            companyId={companyId}
            companyName={companyName}
            onSuccess={() => {
              setRequiresPin(true);
              setPinVerified(true);
              goTo('welcome');
            }}
            onBack={() => navigate('/vastgoed')}
          />
        );
      case 'pin':
        return (
          <KioskPinEntry
            companyId={companyId}
            companyName={companyName}
            onSuccess={() => { setPinVerified(true); goTo(startScreen === 'dashboard' ? 'admin' : 'select'); }}
            onBack={() => navigate('/vastgoed')}
          />
        );
      case 'welcome':
        return (
          <KioskWelcome 
            onStart={() => goTo('select')} 
            onAdmin={() => goTo('admin')}
            companyName={companyName} 
            companyId={companyId}
            onLock={() => {
              localStorage.removeItem('kiosk_token');
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
              });
              setPinVerified(false);
              goTo('pin');
            }}
          />
        );
      case 'admin':
        return (
          <KioskAdminDashboard 
            companyId={companyId}
            pinAuthenticated={pinVerified}
            onBack={() => goTo('select')}
            onLock={() => {
              localStorage.removeItem('kiosk_token');
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
              });
              setPinVerified(false);
              goTo('pin');
            }}
          />
        );
      case 'select':
        return (
          <KioskApartmentSelect
            onBack={() => goTo('select')}
            onSelect={(t) => { setTenant(t); goTo('overview'); }}
            companyId={companyId}
            onAdmin={() => goTo('admin')}
            onLock={() => {
              localStorage.removeItem('kiosk_token');
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
              });
              setPinVerified(false);
              goTo('pin');
            }}
          />
        );
      case 'overview':
        return (
          <KioskTenantOverview
            tenant={tenant}
            companyId={companyId}
            onBack={() => goTo('select')}
            onPay={() => goTo('payment')}
          />
        );
      case 'payment':
        return (
          <KioskPaymentSelect
            tenant={tenant}
            onBack={() => goTo('overview')}
            onConfirm={(data) => { setPaymentData(data); goTo('confirm'); }}
          />
        );
      case 'confirm':
        return (
          <KioskPaymentConfirm
            tenant={tenant}
            paymentData={paymentData}
            onBack={() => goTo('payment')}
            onSuccess={(result) => { setPaymentResult(result); goTo('receipt'); }}
            companyId={companyId}
          />
        );
      case 'receipt':
        return (
          <KioskReceipt
            payment={paymentResult}
            tenant={tenant}
            companyId={companyId}
            onDone={reset}
          />
        );
      default:
        return (
          <KioskWelcome 
            onStart={() => goTo('select')} 
            companyName={companyName} 
            companyId={companyId} 
          />
        );
    }
  };

  return (
    <div className={`kiosk-fullscreen ${modeClasses}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`absolute inset-0 overflow-y-auto overflow-x-hidden`}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
