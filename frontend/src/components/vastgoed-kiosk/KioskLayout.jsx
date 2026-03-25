import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Building2 } from 'lucide-react';
import axios from 'axios';
import KioskWelcome from './KioskWelcome';
import KioskPinEntry from './KioskPinEntry';
import KioskApartmentSelect from './KioskApartmentSelect';
import KioskTenantOverview from './KioskTenantOverview';
import KioskPaymentSelect from './KioskPaymentSelect';
import KioskPaymentConfirm from './KioskPaymentConfirm';
import KioskReceipt from './KioskReceipt';
import KioskAdminDashboard from './KioskAdminDashboard';
import VirtualKeyboard from './VirtualKeyboard';

// Local API
const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

const slideVariants = {
  enter: { opacity: 0, x: 100 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

export default function KioskLayout() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('loading');
  const [tenant, setTenant] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company`).then(res => {
        setCompanyName(res.data.name);
        const hasPin = res.data.has_pin;
        setRequiresPin(hasPin);
        
        // Check if already verified in this session (via email+password or PIN login)
        const alreadyVerified = sessionStorage.getItem(`kiosk_pin_verified_${companyId}`) === 'true';
        
        if (alreadyVerified) {
          // User already authenticated - skip all PIN checks
          setPinVerified(true);
          setStep('welcome');
          return;
        }
        
        if (!hasPin) {
          // No PIN set and not authenticated - block access
          setStep('no-pin');
          return;
        }
        
        // Has PIN but not verified - show PIN entry
        setStep('pin');
      }).catch(() => {
        setCompanyNotFound(true);
        setStep('welcome');
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
    setStep('welcome');
  }, []);

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
          <div className="min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm mx-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Kiosk Niet Beschikbaar</h1>
              <p className="text-sm text-slate-400 mb-6">De beheerder heeft nog geen PIN code ingesteld.</p>
              <button 
                onClick={() => navigate('/vastgoed')}
                className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition shadow-lg shadow-orange-500/25"
              >
                Terug naar Home
              </button>
            </div>
          </div>
        );
      case 'pin':
        return (
          <KioskPinEntry
            companyId={companyId}
            companyName={companyName}
            onSuccess={() => { setPinVerified(true); goTo('welcome'); }}
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
          />
        );
      case 'admin':
        return (
          <KioskAdminDashboard 
            companyId={companyId}
            pinAuthenticated={pinVerified}
            onBack={() => goTo('welcome')}
          />
        );
      case 'select':
        return (
          <KioskApartmentSelect
            onBack={() => goTo('welcome')}
            onSelect={(t) => { setTenant(t); goTo('overview'); }}
            companyId={companyId}
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
    <div className="kiosk-fullscreen">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0 overflow-hidden"
          style={{ paddingBottom: '12vh' }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
      <VirtualKeyboard />
      {/* Floating bottom bar - kiosk machine style */}
      {step !== 'loading' && step !== 'not-found' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white flex items-center justify-between px-8 sm:px-12" style={{ height: '12vh' }} data-testid="kiosk-bottom-bar">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-wide">{companyName || 'Kiosk'}</span>
          </div>
          {tenant && step !== 'welcome' && step !== 'pin' && step !== 'select' && (
            <div className="flex items-center gap-6 text-base">
              <span className="text-slate-400 font-medium">{tenant.name}</span>
              <span className="font-bold text-slate-800">Appt. {tenant.apartment_number}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
