import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import KioskWelcome from './KioskWelcome';
import KioskPinEntry from './KioskPinEntry';
import KioskApartmentSelect from './KioskApartmentSelect';
import KioskTenantOverview from './KioskTenantOverview';
import KioskPaymentSelect from './KioskPaymentSelect';
import KioskPaymentConfirm from './KioskPaymentConfirm';
import KioskReceipt from './KioskReceipt';
import KioskAdminDashboard from './KioskAdminDashboard';

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
        
        // Check if already verified in this session
        const alreadyVerified = sessionStorage.getItem(`kiosk_pin_verified_${companyId}`) === 'true';
        
        if (hasPin && !alreadyVerified) {
          setStep('pin');
        } else {
          setPinVerified(true);
          setStep('welcome');
        }
      }).catch(() => {
        setCompanyNotFound(true);
        setStep('welcome');
      });
    }
  }, [companyId]);

  // Disable scroll and set fullscreen kiosk mode
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
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
      <div className="kiosk-fullscreen kiosk-bg-gradient flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-9xl mb-8">🏢</div>
          <h1 className="text-5xl font-bold mb-4">Bedrijf niet gevonden</h1>
          <p className="text-2xl text-white/70 mb-8">Deze kiosk is niet geconfigureerd.</p>
          <button 
            onClick={() => navigate('/vastgoed')}
            className="kiosk-btn-lg bg-white text-slate-900"
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
          <div className="kiosk-fullscreen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl text-slate-500">Laden...</p>
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
          className="kiosk-fullscreen"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
