import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, CreditCard, Wifi, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijke betaling', service_costs: 'Servicekosten', fines: 'Boetes' };

export default function KioskPaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId, hideCash = false, kioskEmployee }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState(null);
  const [sumupEnabled, setSumupEnabled] = useState(false);
  const [sumupCurrency, setSumupCurrency] = useState('EUR');
  const [sumupExchangeRate, setSumupExchangeRate] = useState(1);
  const [sumupLoading, setSumupLoading] = useState(true);
  const [cardStatus, setCardStatus] = useState('idle');
  const [checkoutId, setCheckoutId] = useState(null);
  const widgetMounted = useRef(false);
  const pollRef = useRef(null);
  const [mopeEnabled, setMopeEnabled] = useState(false);
  const [mopeLoading, setMopeLoading] = useState(true);
  const [mopeStatus, setMopeStatus] = useState('idle');
  const [mopePaymentUrl, setMopePaymentUrl] = useState('');
  const [mopePaymentId, setMopePaymentId] = useState(null);
  const mopePollRef = useRef(null);
  // Uni5Pay
  const [uni5Enabled, setUni5Enabled] = useState(false);
  const [uni5Loading, setUni5Loading] = useState(true);
  const [uni5Status, setUni5Status] = useState('idle');
  const [uni5PaymentUrl, setUni5PaymentUrl] = useState('');
  const [uni5PaymentId, setUni5PaymentId] = useState(null);
  const uni5PollRef = useRef(null);

  useEffect(() => {
    if (!companyId) return;
    axios.get(`${API}/public/${companyId}/sumup/enabled`)
      .then(res => { setSumupEnabled(res.data.enabled); setSumupCurrency(res.data.currency || 'EUR'); setSumupExchangeRate(res.data.exchange_rate || 1); })
      .catch(() => {})
      .finally(() => setSumupLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    axios.get(`${API}/public/${companyId}/mope/enabled`)
      .then(res => setMopeEnabled(res.data.enabled))
      .catch(() => {})
      .finally(() => setMopeLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    axios.get(`${API}/public/${companyId}/uni5pay/enabled`)
      .then(res => setUni5Enabled(res.data.enabled))
      .catch(() => {})
      .finally(() => setUni5Loading(false));
  }, [companyId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (mopePollRef.current) clearInterval(mopePollRef.current);
      if (uni5PollRef.current) clearInterval(uni5PollRef.current);
    };
  }, []);

  if (!tenant || !paymentData) return null;

  const handleCashPayment = async () => {
    setProcessing(true); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'cash',
        processed_by: kioskEmployee?.name || 'Kiosk',
        processed_by_role: kioskEmployee?.role || '',
        description: paymentData.description, rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 800);
    } catch { setError('Betaling mislukt. Probeer opnieuw.'); setProcessing(false); }
  };

  const handleCardPayment = async () => {
    setCardStatus('creating'); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/sumup/checkout`, {
        amount: paymentData.amount,
        description: paymentData.description || TYPE_LABELS[paymentData.payment_type],
        tenant_id: tenant.tenant_id,
        payment_type: paymentData.payment_type,
      });
      const chkId = res.data.checkout_id;
      setCheckoutId(chkId);
      setCardStatus('widget');
      await loadSumUpSDK();
      setTimeout(() => { if (!widgetMounted.current) mountSumUpWidget(chkId); }, 500);
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
      script.onerror = () => resolve();
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
        window.SumUpCard.mount({
          id: 'sumup-card-container', checkoutId: chkId,
          onResponse: (type, body) => {
            if (body?.status === 'PAID') { handleCardSuccess(); }
            else { setError(body?.status === 'FAILED' ? 'Kaartbetaling afgewezen. Onvoldoende saldo of kaart geweigerd.' : 'Kaartbetaling mislukt.'); setCardStatus('error'); widgetMounted.current = false; }
          },
        });
      } catch { startPolling(chkId); }
    } else { startPolling(chkId); }
  };

  const startPolling = (chkId) => {
    setCardStatus('polling');
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { clearInterval(pollRef.current); setError('Betaling timeout.'); setCardStatus('error'); return; }
      try {
        const res = await axios.get(`${API}/public/${companyId}/sumup/checkout/${chkId}/status`);
        if (res.data.status === 'PAID') { clearInterval(pollRef.current); handleCardSuccess(); }
        else if (res.data.status === 'FAILED') { clearInterval(pollRef.current); setError('Kaartbetaling mislukt.'); setCardStatus('error'); }
      } catch {}
    }, 2000);
  };

  const handleCardSuccess = async () => {
    setCardStatus('done');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'card',
        processed_by: kioskEmployee?.name || 'Kiosk',
        processed_by_role: kioskEmployee?.role || '',
        description: `${paymentData.description} (SumUp Pinpas)`,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 1000);
    } catch { setError('Betaling geregistreerd bij SumUp maar opslaan mislukt.'); }
  };

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
      if (attempts > 180) { clearInterval(mopePollRef.current); setError('Betaling timeout. Probeer opnieuw.'); setMopeStatus('error'); return; }
      try {
        const res = await axios.get(`${API}/public/${companyId}/mope/status/${payId}`);
        const st = res.data.status;
        if (st === 'paid') { clearInterval(mopePollRef.current); handleMopeSuccess(); }
        else if (['failed', 'cancelled', 'expired', 'error'].includes(st)) {
          clearInterval(mopePollRef.current);
          setError('Mope betaling is mislukt of geannuleerd.');
          setMopeStatus('error');
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
        processed_by: kioskEmployee?.name || 'Kiosk',
        processed_by_role: kioskEmployee?.role || '',
        description: `${paymentData.description} (Mope)`,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 1000);
    } catch { setError('Betaling geregistreerd bij Mope maar opslaan mislukt.'); }
  };

  // ====== UNI5PAY HANDLERS ======
  const handleUni5Payment = async () => {
    setUni5Status('creating'); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/uni5pay/checkout`, {
        amount: paymentData.amount, description: paymentData.description || 'Huurbetaling',
        tenant_id: tenant.tenant_id, payment_type: paymentData.payment_type
      });
      setUni5PaymentId(res.data.payment_id);
      setUni5PaymentUrl(res.data.payment_url);
      setUni5Status('qr');
      startUni5Polling(res.data.payment_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Kon Uni5Pay betaalverzoek niet aanmaken');
      setUni5Status('error');
    }
  };

  const startUni5Polling = (payId) => {
    let attempts = 0;
    uni5PollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 180) { clearInterval(uni5PollRef.current); setError('Betaling timeout. Probeer opnieuw.'); setUni5Status('error'); return; }
      try {
        const res = await axios.get(`${API}/public/${companyId}/uni5pay/status/${payId}`);
        const st = res.data.status;
        if (st === 'paid') { clearInterval(uni5PollRef.current); handleUni5Success(); }
        else if (['failed', 'cancelled', 'expired', 'error'].includes(st)) {
          clearInterval(uni5PollRef.current);
          setError('Uni5Pay betaling is mislukt of geannuleerd.');
          setUni5Status('error');
        }
      } catch {}
    }, 2000);
  };

  const handleUni5Success = async () => {
    setUni5Status('done');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: 'uni5pay',
        processed_by: kioskEmployee?.name || 'Kiosk',
        processed_by_role: kioskEmployee?.role || '',
        description: `${paymentData.description} (Uni5Pay)`,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 1000);
    } catch { setError('Betaling geregistreerd bij Uni5Pay maar opslaan mislukt.'); }
  };

  // ====== CHOOSE METHOD SCREEN ======
  if (!payMethod) {
    return (
      <div className="h-full bg-orange-500 flex flex-col px-3 sm:px-6 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2 py-2 sm:py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="back-btn-confirm">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="text-xs sm:text-sm text-white">Terug</span>
          </button>
          <div className="text-white text-center">
            <span className="text-sm sm:text-base font-semibold">Hoe wilt u betalen?</span>
            <span className="text-xs sm:text-sm opacity-70 ml-2">{formatSRD(paymentData.amount)}</span>
          </div>
          <div className="hidden sm:block w-16" />
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 pb-3">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 w-full max-w-3xl px-1">
          {/* Cash */}
          {!hideCash && (
            <button onClick={() => setPayMethod('cash')} data-testid="pay-method-cash"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 rounded-2xl border-2 border-transparent hover:border-green-500 shadow-md p-4 sm:p-6 sm:min-w-[200px] sm:max-w-[260px] sm:h-[35vh]">
              <div className="rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 transition-colors">
                <Banknote className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              </div>
              <p className="text-sm sm:text-base text-slate-900 font-bold mb-0.5">Contant</p>
              <p className="text-xs text-slate-400 hidden sm:block">Betaal met contant geld</p>
            </button>
          )}
          {/* Mope */}
          {!mopeLoading && mopeEnabled && (
            <button onClick={() => { setPayMethod('mope'); handleMopePayment(); }} data-testid="pay-method-mope"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 rounded-2xl border-2 border-transparent hover:border-emerald-500 shadow-md p-4 sm:p-6 sm:min-w-[200px] sm:max-w-[260px] sm:h-[35vh]">
              <div className="rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 transition-colors">
                <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
              </div>
              <p className="text-sm sm:text-base text-slate-900 font-bold mb-0.5">Mope</p>
              <p className="text-xs text-slate-400 hidden sm:block">Scan QR-code</p>
            </button>
          )}
          {/* Uni5Pay */}
          {!uni5Loading && uni5Enabled && (
            <button onClick={() => { setPayMethod('uni5pay'); handleUni5Payment(); }} data-testid="pay-method-uni5pay"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 rounded-2xl border-2 border-transparent hover:border-red-500 shadow-md p-4 sm:p-6 sm:min-w-[200px] sm:max-w-[260px] sm:h-[35vh]">
              <div className="rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 transition-colors">
                <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
              <p className="text-sm sm:text-base text-slate-900 font-bold mb-0.5">Uni5Pay</p>
              <p className="text-xs text-slate-400 hidden sm:block">Scan QR-code</p>
            </button>
          )}
          {/* Card/SumUp */}
          {!sumupLoading && sumupEnabled && (
            <button onClick={() => { setPayMethod('card'); handleCardPayment(); }} data-testid="pay-method-card"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-md p-4 sm:p-6 sm:min-w-[200px] sm:max-w-[260px] sm:h-[35vh]">
              <div className="rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 transition-colors">
                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <p className="text-sm sm:text-base text-slate-900 font-bold mb-0.5">Pinpas</p>
              <p className="text-xs text-slate-400 hidden sm:block">SumUp pinpas</p>
              {sumupExchangeRate > 1 && (
                <p className="text-xs text-blue-600 font-semibold mt-1 whitespace-nowrap">
                  {sumupCurrency} {(paymentData.amount / sumupExchangeRate).toFixed(2)}
                </p>
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    );
  }

  // ====== CASH CONFIRMATION ======
  if (payMethod === 'cash') {
    return (
      <div className="h-full bg-orange-500 flex flex-col px-3 sm:px-6 pt-2">
        <div className="flex items-center py-2 sm:py-3">
          <button onClick={() => setPayMethod(null)} disabled={processing}
            className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg disabled:opacity-50 px-3 py-1.5 sm:px-4 sm:py-2">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">Terug</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 pb-3">
          <div className="kiosk-card flex flex-col items-center text-center w-full max-w-md p-4 sm:p-6">
            <div className="bg-orange-500 rounded-lg w-full text-center p-3 sm:p-5 mb-4">
              <p className="text-xs text-orange-100 mb-0.5">Te betalen bedrag</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white whitespace-nowrap" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
              <div className="flex items-center justify-center gap-2 text-orange-100 text-xs mt-1">
                <Banknote className="w-4 h-4" />
                <span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full bg-slate-50 rounded-lg p-2.5 sm:p-3 mb-4">
              <div className="rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 w-9 h-9">
                <User className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">{tenant.name}</p>
                <p className="text-xs text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
              </div>
            </div>

            {error && <div className="text-sm w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-center font-semibold p-2 mb-3">{error}</div>}

            <button onClick={handleCashPayment} disabled={processing} data-testid="confirm-payment-btn"
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] py-3 sm:py-4 text-sm sm:text-base font-bold">
              {processing ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Verwerken...</span></>) : (<><CheckCircle className="w-5 h-5" /><span>Bevestig betaling</span></>)}
            </button>
            <p className="text-xs text-slate-400 mt-2">Contant bedrag is ontvangen</p>
          </div>
        </div>
      </div>
    );
  }

  // ====== MOPE QR CODE ======
  if (payMethod === 'mope') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 3vw 0' }}>
        <div className="flex items-center" style={{ minHeight: '7vh', padding: '1vh 0.5vw' }}>
          <button onClick={() => { setPayMethod(null); setMopeStatus('idle'); setError(''); if (mopePollRef.current) clearInterval(mopePollRef.current); }}
            className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }}>
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto" style={{ paddingBottom: '1.5vh' }}>
          <div className="kiosk-card flex flex-col items-center text-center w-full max-w-[520px]" style={{ padding: 'clamp(16px, 3vh, 40px) clamp(16px, 4vw, 40px)' }}>
            {mopeStatus === 'creating' && (
              <div className="text-center" style={{ padding: '4vh 0' }}>
                <Loader2 className="text-emerald-500 animate-spin mx-auto" style={{ width: '5vh', height: '5vh', marginBottom: '2vh' }} />
                <p className="kiosk-subtitle text-slate-900">Betaalverzoek aanmaken...</p>
                <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Even geduld</p>
              </div>
            )}
            {mopeStatus === 'qr' && mopePaymentUrl && (
              <div className="text-center" data-testid="mope-qr-screen">
                <div className="bg-emerald-500 rounded-lg w-full text-center" style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '2vh' }}>
                  <QrCode className="text-white mx-auto" style={{ width: '3vh', height: '3vh', marginBottom: '0.5vh' }} />
                  <p className="kiosk-amount-md text-white whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
                  <p className="kiosk-small text-emerald-100" style={{ marginTop: '0.3vh' }}>{tenant.name} · Appt. {tenant.apartment_number}</p>
                </div>
                <div className="bg-white border-2 border-emerald-200 rounded-lg inline-block" style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '2vh' }} data-testid="mope-qr-code">
                  <QRCodeSVG value={mopePaymentUrl} size={Math.min(220, window.innerHeight * 0.25)} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className="kiosk-body font-bold text-slate-900" style={{ marginBottom: '0.3vh' }}>Scan met uw Mope app</p>
                <p className="kiosk-small text-slate-400" style={{ marginBottom: '2vh' }}>Open de Mope app en scan deze QR-code</p>
                <div className="flex items-center justify-center gap-2 text-emerald-500 animate-pulse">
                  <Smartphone style={{ width: '2vh', height: '2vh' }} />
                  <p className="kiosk-body font-semibold">Wacht op betaling...</p>
                </div>
              </div>
            )}
            {mopeStatus === 'done' && (
              <div className="text-center" style={{ padding: '4vh 0' }}>
                <div className="rounded-full bg-green-50 flex items-center justify-center mx-auto" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                  <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
                </div>
                <p className="kiosk-title text-green-700">Betaling geslaagd!</p>
                <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Kwitantie wordt afgedrukt...</p>
              </div>
            )}
            {mopeStatus === 'error' && (
              <div className="text-center" style={{ padding: '3vh 0' }}>
                {error && <div className="kiosk-body bg-red-50 border border-red-200 text-red-600 rounded-lg text-center font-semibold" style={{ padding: '1vh', marginBottom: '2vh' }}>{error}</div>}
                <button onClick={() => { setMopeStatus('idle'); setError(''); handleMopePayment(); }} data-testid="mope-retry-btn"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg kiosk-btn-text transition"
                  style={{ padding: 'clamp(10px, 1.8vh, 24px) clamp(20px, 3vw, 48px)' }}>
                  Opnieuw proberen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ====== UNI5PAY QR CODE ======
  if (payMethod === 'uni5pay') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 3vw 0' }}>
        <div className="flex items-center" style={{ minHeight: '7vh', padding: '1vh 0.5vw' }}>
          <button onClick={() => { setPayMethod(null); setUni5Status('idle'); setError(''); if (uni5PollRef.current) clearInterval(uni5PollRef.current); }}
            className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }}>
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto" style={{ paddingBottom: '1.5vh' }}>
          <div className="kiosk-card flex flex-col items-center text-center w-full max-w-[520px]" style={{ padding: 'clamp(16px, 3vh, 40px) clamp(16px, 4vw, 40px)' }}>
            {uni5Status === 'creating' && (
              <div className="text-center" style={{ padding: '4vh 0' }}>
                <Loader2 className="text-red-500 animate-spin mx-auto" style={{ width: '5vh', height: '5vh', marginBottom: '2vh' }} />
                <p className="kiosk-subtitle text-slate-900">Betaalverzoek aanmaken...</p>
                <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Even geduld</p>
              </div>
            )}
            {uni5Status === 'qr' && uni5PaymentUrl && (
              <div className="text-center" data-testid="uni5pay-qr-screen">
                <div className="bg-red-600 rounded-lg w-full text-center" style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '2vh' }}>
                  <Smartphone className="text-white mx-auto" style={{ width: '3vh', height: '3vh', marginBottom: '0.5vh' }} />
                  <p className="kiosk-amount-md text-white whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
                  <p className="kiosk-small text-red-100" style={{ marginTop: '0.3vh' }}>{tenant.name} · Appt. {tenant.apartment_number}</p>
                </div>
                <div className="bg-white border-2 border-red-200 rounded-lg inline-block" style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '2vh' }} data-testid="uni5pay-qr-code">
                  <QRCodeSVG value={uni5PaymentUrl} size={Math.min(220, window.innerHeight * 0.25)} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className="kiosk-body font-bold text-slate-900" style={{ marginBottom: '0.3vh' }}>Scan met uw Uni5Pay app</p>
                <p className="kiosk-small text-slate-400" style={{ marginBottom: '2vh' }}>Open de Uni5Pay+ app en scan deze QR-code</p>
                <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
                  <Smartphone style={{ width: '2vh', height: '2vh' }} />
                  <p className="kiosk-body font-semibold">Wacht op betaling...</p>
                </div>
              </div>
            )}
            {uni5Status === 'done' && (
              <div className="text-center" style={{ padding: '4vh 0' }}>
                <div className="rounded-full bg-green-50 flex items-center justify-center mx-auto" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                  <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
                </div>
                <p className="kiosk-title text-green-700">Betaling geslaagd!</p>
                <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Kwitantie wordt afgedrukt...</p>
              </div>
            )}
            {uni5Status === 'error' && (
              <div className="text-center" style={{ padding: '3vh 0' }}>
                {error && <div className="kiosk-body bg-red-50 border border-red-200 text-red-600 rounded-lg text-center font-semibold" style={{ padding: '1vh', marginBottom: '2vh' }}>{error}</div>}
                <button onClick={() => { setUni5Status('idle'); setError(''); handleUni5Payment(); }} data-testid="uni5pay-retry-btn"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg kiosk-btn-text transition"
                  style={{ padding: 'clamp(10px, 1.8vh, 24px) clamp(20px, 3vw, 48px)' }}>
                  Opnieuw proberen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ====== CARD PAYMENT (SUMUP) ======
  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 3vw 0' }}>
      <div className="flex items-center" style={{ minHeight: '7vh', padding: '1vh 0.5vw' }}>
        <button onClick={() => { setPayMethod(null); setCardStatus('idle'); setError(''); widgetMounted.current = false; if (pollRef.current) clearInterval(pollRef.current); }}
          className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }}>
          <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
          <span className="kiosk-body">Terug</span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto" style={{ paddingBottom: '1.5vh' }}>
        <div className="kiosk-card flex flex-col items-center text-center w-full max-w-[520px]" style={{ padding: 'clamp(16px, 3vh, 40px) clamp(16px, 4vw, 40px)' }}>
          {cardStatus === 'creating' && (
            <div className="text-center" style={{ padding: '4vh 0' }}>
              <Loader2 className="text-orange-500 animate-spin mx-auto" style={{ width: '5vh', height: '5vh', marginBottom: '2vh' }} />
              <p className="kiosk-subtitle text-slate-900">Checkout aanmaken...</p>
              <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Even geduld</p>
            </div>
          )}
          {(cardStatus === 'widget' || cardStatus === 'polling') && (
            <div className="text-center w-full">
              <div className="bg-blue-500 rounded-lg w-full text-center" style={{ padding: 'clamp(10px, 1.8vh, 24px)', marginBottom: '2vh' }}>
                <CreditCard className="text-white mx-auto" style={{ width: '3.5vh', height: '3.5vh', marginBottom: '0.5vh' }} />
                <p className="kiosk-amount-md text-white whitespace-nowrap">{formatSRD(paymentData.amount)}</p>
                {sumupExchangeRate > 1 && (
                  <p className="kiosk-body text-blue-100 whitespace-nowrap" style={{ marginTop: '0.3vh' }}>
                    = {sumupCurrency} {(paymentData.amount / sumupExchangeRate).toFixed(2)}
                  </p>
                )}
                <p className="kiosk-small text-blue-100" style={{ marginTop: '0.3vh' }}>{tenant.name} · Appt. {tenant.apartment_number}</p>
              </div>
              <div id="sumup-card-container" style={{ minHeight: '20vh', marginBottom: '1.5vh' }} />
              {cardStatus === 'polling' && (
                <div className="flex items-center justify-center gap-2 text-orange-500">
                  <Wifi style={{ width: '2vh', height: '2vh' }} className="animate-pulse" />
                  <p className="kiosk-body font-semibold">Wacht op kaartbetaling...</p>
                </div>
              )}
            </div>
          )}
          {cardStatus === 'done' && (
            <div className="text-center" style={{ padding: '4vh 0' }}>
              <div className="rounded-full bg-green-50 flex items-center justify-center mx-auto" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
              </div>
              <p className="kiosk-title text-green-700">Betaling geslaagd!</p>
              <p className="kiosk-small text-slate-400" style={{ marginTop: '0.5vh' }}>Kwitantie wordt afgedrukt...</p>
            </div>
          )}
          {cardStatus === 'error' && (
            <div className="text-center" style={{ padding: '3vh 0' }}>
              {error && <div className="kiosk-body bg-red-50 border border-red-200 text-red-600 rounded-lg text-center font-semibold" style={{ padding: '1vh', marginBottom: '2vh' }}>{error}</div>}
              <button onClick={() => { setCardStatus('idle'); setError(''); widgetMounted.current = false; handleCardPayment(); }}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg kiosk-btn-text transition"
                style={{ padding: 'clamp(10px, 1.8vh, 24px) clamp(20px, 3vw, 48px)' }}>
                Opnieuw proberen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
