import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, CreditCard, Wifi, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijke betaling', service_costs: 'Servicekosten', fines: 'Boetes' };

export default function KioskPaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState(null); // null = choose, 'cash', 'card', 'mope'
  const [sumupEnabled, setSumupEnabled] = useState(false);
  const [sumupCurrency, setSumupCurrency] = useState('EUR');
  const [sumupExchangeRate, setSumupExchangeRate] = useState(1);
  const [sumupLoading, setSumupLoading] = useState(true);
  const [cardStatus, setCardStatus] = useState('idle');
  const [checkoutId, setCheckoutId] = useState(null);
  const widgetMounted = useRef(false);
  const pollRef = useRef(null);
  // Mope state
  const [mopeEnabled, setMopeEnabled] = useState(false);
  const [mopeLoading, setMopeLoading] = useState(true);
  const [mopeStatus, setMopeStatus] = useState('idle'); // idle, creating, qr, polling, done, error
  const [mopePaymentUrl, setMopePaymentUrl] = useState('');
  const [mopePaymentId, setMopePaymentId] = useState(null);
  const mopePollRef = useRef(null);

  // Check if SumUp is enabled
  useEffect(() => {
    if (!companyId) return;
    axios.get(`${API}/public/${companyId}/sumup/enabled`)
      .then(res => { 
        setSumupEnabled(res.data.enabled); 
        setSumupCurrency(res.data.currency || 'EUR'); 
        setSumupExchangeRate(res.data.exchange_rate || 1);
      })
      .catch(() => {})
      .finally(() => setSumupLoading(false));
  }, [companyId]);

  // Check if Mope is enabled
  useEffect(() => {
    if (!companyId) return;
    axios.get(`${API}/public/${companyId}/mope/enabled`)
      .then(res => setMopeEnabled(res.data.enabled))
      .catch(() => {})
      .finally(() => setMopeLoading(false));
  }, [companyId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { 
      if (pollRef.current) clearInterval(pollRef.current);
      if (mopePollRef.current) clearInterval(mopePollRef.current);
    };
  }, []);

  if (!tenant || !paymentData) return null;

  const handleCashPayment = async () => {
    setProcessing(true); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'cash',
        description: paymentData.description, rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 800);
    } catch { setError('Betaling mislukt. Probeer opnieuw.'); setProcessing(false); }
  };

  const handleCardPayment = async () => {
    setCardStatus('creating'); setError('');
    try {
      // Create SumUp checkout
      const res = await axios.post(`${API}/public/${companyId}/sumup/checkout`, {
        amount: paymentData.amount,
        description: paymentData.description || TYPE_LABELS[paymentData.payment_type],
        tenant_id: tenant.tenant_id,
        payment_type: paymentData.payment_type,
      });

      const chkId = res.data.checkout_id;
      setCheckoutId(chkId);
      setCardStatus('widget');

      // Load SumUp SDK and mount widget
      await loadSumUpSDK();
      
      setTimeout(() => {
        if (!widgetMounted.current) {
          mountSumUpWidget(chkId);
        }
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Kon SumUp checkout niet aanmaken');
      setCardStatus('error');
    }
  };

  const loadSumUpSDK = () => {
    return new Promise((resolve) => {
      if (window.SumUpCard) { resolve(); return; }
      const existing = document.getElementById('sumup-sdk');
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.id = 'sumup-sdk';
      script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
      script.onload = () => resolve();
      script.onerror = () => resolve(); // still try
      document.head.appendChild(script);
    });
  };

  const mountSumUpWidget = (chkId) => {
    if (widgetMounted.current) return;
    widgetMounted.current = true;
    
    const container = document.getElementById('sumup-card-container');
    if (!container) { setError('Widget container niet gevonden'); setCardStatus('error'); return; }

    if (window.SumUpCard) {
      try {
        const card = window.SumUpCard.mount({
          id: 'sumup-card-container',
          checkoutId: chkId,
          onResponse: (type, body) => {
            if (type === 'success' || body?.status === 'PAID') {
              handleCardSuccess();
            } else if (type === 'error') {
              setError('Kaartbetaling mislukt. Probeer opnieuw.');
              setCardStatus('error');
              widgetMounted.current = false;
            }
          },
        });
      } catch (e) {
        // If SDK mount fails, fall back to polling
        startPolling(chkId);
      }
    } else {
      // SDK not loaded, fall back to polling
      startPolling(chkId);
    }
  };

  const startPolling = (chkId) => {
    setCardStatus('polling');
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { // 2 min timeout
        clearInterval(pollRef.current);
        setError('Betaling timeout. Probeer opnieuw.');
        setCardStatus('error');
        return;
      }
      try {
        const res = await axios.get(`${API}/public/${companyId}/sumup/checkout/${chkId}/status`);
        if (res.data.status === 'PAID') {
          clearInterval(pollRef.current);
          handleCardSuccess();
        } else if (res.data.status === 'FAILED') {
          clearInterval(pollRef.current);
          setError('Kaartbetaling mislukt.');
          setCardStatus('error');
        }
      } catch {}
    }, 2000);
  };

  const handleCardSuccess = async () => {
    setCardStatus('done');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'card',
        description: `${paymentData.description} (SumUp Pinpas)`,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 1000);
    } catch {
      setError('Betaling geregistreerd bij SumUp maar opslaan mislukt.');
    }
  };

  // ============== MOPE FUNCTIONS ==============
  const handleMopePayment = async () => {
    setMopeStatus('creating'); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/mope/checkout`, {
        amount: paymentData.amount,
        description: paymentData.description || TYPE_LABELS[paymentData.payment_type],
        tenant_id: tenant.tenant_id,
        payment_type: paymentData.payment_type,
      });
      setMopePaymentId(res.data.payment_id);
      setMopePaymentUrl(res.data.payment_url);
      setMopeStatus('qr');
      // Start polling for payment status
      startMopePolling(res.data.payment_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Kon Mope betaalverzoek niet aanmaken');
      setMopeStatus('error');
    }
  };

  const startMopePolling = (payId) => {
    let attempts = 0;
    mopePollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 180) { // 6 min timeout (payment requests last 1 day but don't wait forever)
        clearInterval(mopePollRef.current);
        setError('Betaling timeout. Probeer opnieuw.');
        setMopeStatus('error');
        return;
      }
      try {
        const res = await axios.get(`${API}/public/${companyId}/mope/status/${payId}`);
        if (res.data.status === 'paid') {
          clearInterval(mopePollRef.current);
          handleMopeSuccess();
        }
      } catch {}
    }, 2000);
  };

  const handleMopeSuccess = async () => {
    setMopeStatus('done');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'mope',
        description: `${paymentData.description} (Mope)`,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 1000);
    } catch {
      setError('Betaling geregistreerd bij Mope maar opslaan mislukt.');
    }
  };

  // Choose method screen
  if (!payMethod) {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
          <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
          <div className="absolute bottom-[15%] left-[10%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
          <div className="absolute top-0 left-[45%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        </div>

        <div className="absolute top-5 left-8 z-20">
          <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
            <ArrowLeft className="w-5 h-5" /><span>Terug</span>
          </button>
        </div>

        <div className="relative z-10 text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Hoe wilt u betalen?</h1>
          <p className="text-white/70 mt-2 text-lg">{formatSRD(paymentData.amount)}</p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-5 px-6 w-full max-w-3xl flex-wrap justify-center">
          {/* Cash option */}
          <button onClick={() => setPayMethod('cash')} data-testid="pay-method-cash"
            className="flex-1 min-w-[200px] bg-white rounded-2xl shadow-lg p-8 sm:p-10 flex flex-col items-center text-center hover:scale-[1.02] transition active:scale-[0.98]">
            <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mb-5 shadow-sm border border-green-100">
              <Banknote className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mb-2">Contant</p>
            <p className="text-sm text-slate-400">Betaal met contant geld</p>
          </button>

          {/* Mope option */}
          {!mopeLoading && mopeEnabled && (
            <button onClick={() => { setPayMethod('mope'); handleMopePayment(); }} data-testid="pay-method-mope"
              className="flex-1 min-w-[200px] bg-white rounded-2xl shadow-lg p-8 sm:p-10 flex flex-col items-center text-center hover:scale-[1.02] transition active:scale-[0.98]">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 shadow-sm border border-emerald-100">
                <QrCode className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mb-2">Mope</p>
              <p className="text-sm text-slate-400">Scan QR-code met Mope app</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{formatSRD(paymentData.amount)}</p>
            </button>
          )}

          {/* Card option */}
          {!sumupLoading && sumupEnabled && (
            <button onClick={() => { setPayMethod('card'); handleCardPayment(); }} data-testid="pay-method-card"
              className="flex-1 min-w-[200px] bg-white rounded-2xl shadow-lg p-8 sm:p-10 flex flex-col items-center text-center hover:scale-[1.02] transition active:scale-[0.98]">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 shadow-sm border border-blue-100">
                <CreditCard className="w-10 h-10 text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mb-2">Pinpas</p>
              <p className="text-sm text-slate-400">Betaal met pinpas via SumUp</p>
              {sumupExchangeRate > 1 && (
                <p className="text-xs text-blue-600 font-semibold mt-1 whitespace-nowrap">
                  {formatSRD(paymentData.amount)} = {sumupCurrency} {(paymentData.amount / sumupExchangeRate).toFixed(2)}
                </p>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Cash confirmation screen
  if (payMethod === 'cash') {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
          <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
          <div className="absolute bottom-[15%] left-[10%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
          <div className="absolute top-0 left-[45%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        </div>

        <div className="absolute top-5 left-8 z-20">
          <button onClick={() => setPayMethod(null)} disabled={processing} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm disabled:opacity-50">
            <ArrowLeft className="w-5 h-5" /><span>Terug</span>
          </button>
        </div>

        <div className="relative z-10 text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Bevestig contante betaling</h1>
        </div>

        <div className="relative z-10 bg-white rounded-2xl shadow-lg p-8 sm:p-10 lg:p-12 w-full max-w-lg mx-6">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 sm:p-10 text-center mb-6 shadow-xl shadow-orange-500/20">
            <p className="text-orange-100 text-base mb-2">Te betalen bedrag</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight whitespace-nowrap" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
            <div className="flex items-center justify-center gap-2 text-orange-100 text-sm">
              <Banknote className="w-5 h-5" /><span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-100 mb-5">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-slate-900">{tenant.name}</p>
              <p className="text-sm text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-semibold">{error}</div>}

          <button onClick={handleCashPayment} disabled={processing} data-testid="confirm-payment-btn"
            className="w-full py-5 sm:py-6 px-8 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 transition bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-xl shadow-green-500/25 active:scale-[0.98]">
            {processing ? (<><Loader2 className="w-6 h-6 animate-spin" /><span>Verwerken...</span></>) : (<><CheckCircle className="w-6 h-6" /><span>Bevestig betaling</span></>)}
          </button>
          <p className="text-center text-slate-400 text-sm mt-4">Contant bedrag is ontvangen</p>
        </div>
      </div>
    );
  }

  // Mope QR code payment screen
  if (payMethod === 'mope') {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
          <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
          <div className="absolute bottom-[15%] left-[10%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
          <div className="absolute top-0 left-[45%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        </div>

        <div className="absolute top-5 left-8 z-20">
          <button onClick={() => { setPayMethod(null); setMopeStatus('idle'); setError(''); if (mopePollRef.current) clearInterval(mopePollRef.current); }}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
            <ArrowLeft className="w-5 h-5" /><span>Terug</span>
          </button>
        </div>

        <div className="relative z-10 text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Mope Betaling</h1>
          <p className="text-white/70 mt-2 text-lg whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
        </div>

        <div className="relative z-10 bg-white rounded-2xl shadow-lg p-8 sm:p-10 lg:p-12 w-full max-w-lg mx-6">
          {mopeStatus === 'creating' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900">Betaalverzoek aanmaken...</p>
              <p className="text-sm text-slate-400 mt-1">Even geduld</p>
            </div>
          )}

          {mopeStatus === 'qr' && mopePaymentUrl && (
            <div className="text-center" data-testid="mope-qr-screen">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-center mb-6 shadow-lg">
                <QrCode className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-white whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
                <p className="text-emerald-100 text-sm mt-1">{tenant.name} · Appt. {tenant.apartment_number}</p>
              </div>

              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-5 inline-block" data-testid="mope-qr-code">
                <QRCodeSVG 
                  value={mopePaymentUrl} 
                  size={220} 
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <p className="text-lg font-bold text-slate-900 mb-1">Scan met uw Mope app</p>
              <p className="text-sm text-slate-400 mb-4">Open de Mope app en scan deze QR-code om te betalen</p>

              <div className="flex items-center justify-center gap-3 text-emerald-500 py-3 animate-pulse">
                <Smartphone className="w-5 h-5" />
                <p className="text-base font-semibold">Wacht op betaling...</p>
              </div>
            </div>
          )}

          {mopeStatus === 'done' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xl font-extrabold text-green-700">Betaling geslaagd!</p>
              <p className="text-sm text-slate-400 mt-1">Kwitantie wordt afgedrukt...</p>
            </div>
          )}

          {mopeStatus === 'error' && (
            <div className="text-center py-6">
              {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-semibold">{error}</div>}
              <button onClick={() => { setMopeStatus('idle'); setError(''); handleMopePayment(); }}
                className="px-8 py-4 rounded-2xl text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition" data-testid="mope-retry-btn">
                Opnieuw proberen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card payment screen (SumUp)
  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
        <div className="absolute bottom-[15%] left-[10%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-0 left-[45%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
      </div>

      <div className="absolute top-5 left-8 z-20">
        <button onClick={() => { setPayMethod(null); setCardStatus('idle'); setError(''); widgetMounted.current = false; if (pollRef.current) clearInterval(pollRef.current); }}
          className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
      </div>

      <div className="relative z-10 text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Pinbetaling</h1>
        <p className="text-white/70 mt-2 text-lg whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
      </div>

      <div className="relative z-10 bg-white rounded-2xl shadow-lg p-8 sm:p-10 lg:p-12 w-full max-w-lg mx-6">
        {cardStatus === 'creating' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900">Checkout aanmaken...</p>
            <p className="text-sm text-slate-400 mt-1">Even geduld</p>
          </div>
        )}

        {(cardStatus === 'widget' || cardStatus === 'polling') && (
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-center mb-6 shadow-lg">
              <CreditCard className="w-10 h-10 text-white mx-auto mb-3" />
              <p className="text-2xl font-extrabold text-white whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
              {sumupExchangeRate > 1 && (
                <p className="text-lg font-bold text-blue-100 mt-1 whitespace-nowrap">
                  = {sumupCurrency} {(paymentData.amount / sumupExchangeRate).toFixed(2)}
                </p>
              )}
              <p className="text-blue-100 text-sm mt-1">{tenant.name} · Appt. {tenant.apartment_number}</p>
            </div>
            
            {/* SumUp widget container */}
            <div id="sumup-card-container" className="mb-4 min-h-[200px]" />
            
            {cardStatus === 'polling' && (
              <div className="flex items-center justify-center gap-3 text-orange-500 py-4">
                <Wifi className="w-5 h-5 animate-pulse" />
                <p className="text-base font-semibold">Wacht op kaartbetaling...</p>
              </div>
            )}
          </div>
        )}

        {cardStatus === 'done' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xl font-extrabold text-green-700">Betaling geslaagd!</p>
            <p className="text-sm text-slate-400 mt-1">Kwitantie wordt afgedrukt...</p>
          </div>
        )}

        {cardStatus === 'error' && (
          <div className="text-center py-6">
            {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-semibold">{error}</div>}
            <button onClick={() => { setCardStatus('idle'); setError(''); widgetMounted.current = false; handleCardPayment(); }}
              className="px-8 py-4 rounded-2xl text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 transition">
              Opnieuw proberen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
