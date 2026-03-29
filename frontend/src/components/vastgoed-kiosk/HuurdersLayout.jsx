import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Hand, ScanFace, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import KioskTenantOverview from './KioskTenantOverview';
import KioskPaymentSelect from './KioskPaymentSelect';
import KioskPaymentConfirm from './KioskPaymentConfirm';
import HuurdersReceipt from './HuurdersReceipt';
import FaceCapture from './FaceCapture';
import VirtualKeyboard from './VirtualKeyboard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function HuurdersLayout() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('loading');
  const [tenant, setTenant] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [faceKey, setFaceKey] = useState(0);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company`).then(res => {
        setCompanyName(res.data.name);
        if (res.data.subscription_blocked) {
          setSubscriptionBlocked(true);
          setStep('blocked');
          return;
        }
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
    setFaceKey(k => k + 1);
    setStep('select');
  }, []);

  // Error/blocked states
  if (subscriptionBlocked) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 sm:mb-5">
            <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-2" data-testid="subscription-blocked-title">Abonnement Verlopen</h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-1">{companyName}</p>
          <p className="text-xs sm:text-sm text-slate-400">Uw abonnement is verlopen. Neem contact op met de beheerder.</p>
        </div>
      </div>
    );
  }

  if (companyNotFound) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 sm:mb-5">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Bedrijf niet gevonden</h1>
          <p className="text-xs sm:text-sm text-slate-400">Deze kiosk is niet geconfigureerd.</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm sm:text-base text-white/80">Laden...</p>
            </div>
          </div>
        );
      case 'select':
        return (
          <div className="h-full bg-orange-500 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center py-3 sm:py-4 px-4">
              <div className="flex items-center gap-2">
                <ScanFace className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="text-base sm:text-lg text-white font-bold">Face ID Inloggen</span>
              </div>
            </div>
            {/* Face capture card — centered and responsive */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center p-5 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Welkom</h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4 sm:mb-5 text-center">Kijk in de camera om in te loggen</p>
                <FaceCapture key={faceKey} mode="verify-continuous" onCapture={async (descriptor) => {
                  try {
                    const res = await axios.post(`${API}/public/${companyId}/face/verify-tenant`, { descriptor });
                    setTenant(res.data);
                    setTimeout(() => goTo('overview'), 500);
                  } catch {
                    // Niet herkend — FaceCapture blijft doordraaien
                  }
                }} />
              </div>
            </div>
          </div>
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
    <div className="fixed inset-0 flex flex-col bg-slate-100 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
      <VirtualKeyboard />

      {/* Bottom bar — responsive */}
      {step !== 'loading' && step !== 'not-found' && (
        <div className="shrink-0 bg-white border-t border-slate-200 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 z-40"
          data-testid="huurders-bottom-bar"
          style={{ minHeight: '48px' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0 rounded-lg bg-orange-500 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-800 truncate">{companyName || 'Kiosk'}</span>
          </div>
          {tenant && step !== 'select' && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-right min-w-0">
              <span className="text-xs sm:text-sm text-slate-400 font-medium truncate hidden xs:inline">{tenant.name}</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0">Appt. {tenant.apartment_number}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
