import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Hand, ScanFace, KeyRound } from 'lucide-react';
import axios from 'axios';
import KioskApartmentSelect from './KioskApartmentSelect';
import KioskTenantOverview from './KioskTenantOverview';
import KioskPaymentSelect from './KioskPaymentSelect';
import KioskPaymentConfirm from './KioskPaymentConfirm';
import HuurdersReceipt from './HuurdersReceipt';
import FaceCapture from './FaceCapture';
import VirtualKeyboard from './VirtualKeyboard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

const slideVariants = {
  enter: { opacity: 0, x: 100 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

function useKioskMode() {
  const [mode, setMode] = useState({ isTouch: false, screenSize: 'normal' });
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

export default function HuurdersLayout() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const kioskMode = useKioskMode();
  const [step, setStep] = useState('loading');
  const [loginMode, setLoginMode] = useState('code'); // code | face
  const [tenant, setTenant] = useState(null);
  const [faceError, setFaceError] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNotFound, setCompanyNotFound] = useState(false);

  const modeClasses = [
    kioskMode.isTouch ? 'kiosk-touch' : '',
    kioskMode.screenSize === 'compact' ? 'kiosk-compact' : '',
    kioskMode.screenSize === 'large' ? 'kiosk-large' : '',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company`).then(res => {
        setCompanyName(res.data.name);
        setStep('select');
      }).catch(() => {
        setCompanyNotFound(true);
        setStep('not-found');
      });
    }
  }, [companyId]);

  useEffect(() => {
    document.body.style.touchAction = 'manipulation';
    return () => { document.body.style.touchAction = ''; };
  }, []);

  const goTo = useCallback((newStep) => setStep(newStep), []);

  const reset = useCallback(() => {
    setTenant(null);
    setPaymentData(null);
    setPaymentResult(null);
    setLoginMode('code');
    setFaceError('');
    setStep('select');
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
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-base text-white/80">Laden...</p>
            </div>
          </div>
        );
      case 'select':
        if (loginMode === 'face') {
          return (
            <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
              <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
                <div style={{ width: '6vw' }} />
                <span className="kiosk-subtitle text-white">Inloggen</span>
                <div className="flex gap-[0.5vw]">
                  <button onClick={() => { setLoginMode('code'); setFaceError(''); }} data-testid="login-mode-code"
                    className="flex items-center gap-1 rounded-lg transition kiosk-small font-bold text-white bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    style={{ padding: '0.8vh 1.2vw' }}>
                    <KeyRound style={{ width: '1.6vh', height: '1.6vh' }} /> Code
                  </button>
                  <button data-testid="login-mode-face"
                    className="flex items-center gap-1 rounded-lg transition kiosk-small font-bold bg-white text-orange-600"
                    style={{ padding: '0.8vh 1.2vw' }}>
                    <ScanFace style={{ width: '1.6vh', height: '1.6vh' }} /> Face ID
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
                <div className="kiosk-card flex flex-col items-center" style={{ width: 'clamp(340px, 35vw, 500px)', padding: 'clamp(20px, 3vh, 44px) clamp(20px, 2.5vw, 48px)' }}>
                  <h2 className="kiosk-title text-slate-900" style={{ marginBottom: '0.5vh' }}>Face ID</h2>
                  <p className="kiosk-body text-slate-400" style={{ marginBottom: '2vh' }}>Kijk in de camera om in te loggen</p>
                  {faceError && <p className="kiosk-body text-red-500 text-center font-semibold" style={{ marginBottom: '1.5vh' }}>{faceError}</p>}
                  <FaceCapture mode="verify" onCapture={async (descriptor) => {
                    setFaceError('');
                    try {
                      const res = await axios.post(`${API}/public/${companyId}/face/verify-tenant`, { descriptor });
                      setTenant(res.data);
                      setTimeout(() => goTo('overview'), 600);
                    } catch {
                      setFaceError('Gezicht niet herkend. Probeer opnieuw.');
                      setLoginMode('code');
                    }
                  }} onCancel={() => setLoginMode('code')} />
                </div>
              </div>
            </div>
          );
        }
        return (
          <KioskApartmentSelect
            onBack={() => reset()}
            onSelect={(t) => { setTenant(t); goTo('overview'); }}
            companyId={companyId}
            codeOnly={true}
            onSwitchToFace={() => { setLoginMode('face'); setFaceError(''); }}
          />
        );
      case 'overview':
        return (
          <KioskTenantOverview
            tenant={tenant}
            companyId={companyId}
            onBack={() => goTo('select')}
            onPay={() => goTo('payment')}
            variant="huurder"
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
            hideCash={true}
          />
        );
      case 'receipt':
        return (
          <HuurdersReceipt
            payment={paymentResult}
            tenant={tenant}
            companyId={companyId}
            onDone={reset}
          />
        );
      default:
        return null;
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
          className="absolute inset-0 overflow-hidden"
          style={{ paddingBottom: '12vh' }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
      <VirtualKeyboard />
      {step !== 'loading' && step !== 'not-found' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white flex items-center justify-between" style={{ height: '12vh', padding: '0 clamp(16px, 2vw, 48px)' }} data-testid="huurders-bottom-bar">
          <div className="flex items-center" style={{ gap: 'clamp(8px, 1vw, 16px)' }}>
            <div className="rounded-lg bg-orange-500 flex items-center justify-center" style={{ width: 'clamp(32px, 4vh, 48px)', height: 'clamp(32px, 4vh, 48px)' }}>
              <Building2 style={{ width: '2.5vh', height: '2.5vh' }} className="text-white" />
            </div>
            <span className="kiosk-subtitle font-bold text-slate-800 tracking-wide">{companyName || 'Kiosk'}</span>
          </div>
          <div className="flex items-center" style={{ gap: 'clamp(8px, 1.5vw, 24px)' }}>
            {tenant && step !== 'select' && (
              <div className="flex items-center gap-2">
                <span className="kiosk-body text-slate-400 font-medium">{tenant.name}</span>
                <span className="kiosk-body font-bold text-slate-800">Appt. {tenant.apartment_number}</span>
              </div>
            )}
            <span className={`kiosk-mode-badge ${kioskMode.isTouch ? 'touch' : 'desktop'}`} style={{ display: kioskMode.isTouch ? 'inline-flex' : 'none' }}>
              <Hand style={{ width: '1.3vh', height: '1.3vh' }} /> Touch
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
