import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, CreditCard, Wifi, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijke betaling', service_costs: 'Servicekosten', fines: 'Boetes' };

export default function KioskPaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId, hideCash = false }) {
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
            if (type === 'success' || body?.status === 'PAID') { handleCardSuccess(); }
            else if (type === 'error') { setError('Kaartbetaling mislukt.'); setCardStatus('error'); widgetMounted.current = false; }
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
      if (attempts > 180) { clearInterval(mopePollRef.current); setError('Betaling timeout.'); setMopeStatus('error'); return; }
      try {
        const res = await axios.get(`${API}/public/${companyId}/mope/status/${payId}`);
        if (res.data.status === 'paid') { clearInterval(mopePollRef.current); handleMopeSuccess(); }
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
    } catch { setError('Betaling geregistreerd bij Mope maar opslaan mislukt.'); }
  };

  // ====== CHOOSE METHOD SCREEN ======
  if (!payMethod) {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
        <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
          <button onClick={onBack} className="flex items-center gap-2 font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="back-btn-confirm">
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} className="text-white" />
            <span className="kiosk-body text-white">Terug</span>
          </button>
          <div className="text-white text-center">
            <span className="kiosk-subtitle">Hoe wilt u betalen?</span>
            <span className="kiosk-body opacity-70 ml-3">{formatSRD(paymentData.amount)}</span>
          </div>
          <div style={{ width: '6vw' }} />
        </div>
        <div className="flex-1 flex items-center justify-center gap-[1.5vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>
          {/* Cash */}
          {!hideCash && (
            <button onClick={() => setPayMethod('cash')} data-testid="pay-method-cash"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1"
              style={{ width: 'clamp(240px, 28vw, 440px)', height: 'clamp(240px, 52vh, 480px)', borderRadius: 'clamp(12px, 1.8vh, 24px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)', border: '2px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div className="rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                <Banknote style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
              </div>
              <p className="kiosk-subtitle text-slate-900 font-bold" style={{ marginBottom: '0.5vh' }}>Contant</p>
              <p className="kiosk-small text-slate-400">Betaal met contant geld</p>
            </button>
          )}
          {/* Mope */}
          {!mopeLoading && mopeEnabled && (
            <button onClick={() => { setPayMethod('mope'); handleMopePayment(); }} data-testid="pay-method-mope"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 relative"
              style={{ width: 'clamp(240px, 28vw, 440px)', height: 'clamp(240px, 52vh, 480px)', borderRadius: 'clamp(12px, 1.8vh, 24px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)', border: '2px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div className="rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                <QrCode style={{ width: '4vh', height: '4vh' }} className="text-emerald-600" />
              </div>
              <p className="kiosk-subtitle text-slate-900 font-bold" style={{ marginBottom: '0.5vh' }}>Mope</p>
              <p className="kiosk-small text-slate-400">Scan QR-code met Mope app</p>
              <p className="kiosk-small text-emerald-600 font-semibold" style={{ marginTop: '1vh' }}>{formatSRD(paymentData.amount)}</p>
              <img src="/mope-logo.png" alt="Mopé" style={{ height: 'clamp(24px, 4vh, 44px)', width: 'auto', objectFit: 'contain', marginTop: '1vh', borderRadius: 'clamp(4px, 0.6vh, 8px)' }} />
            </button>
          )}
          {/* Card/SumUp */}
          {!sumupLoading && sumupEnabled && (
            <button onClick={() => { setPayMethod('card'); handleCardPayment(); }} data-testid="pay-method-card"
              className="group bg-white flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 relative"
              style={{ width: 'clamp(240px, 28vw, 440px)', height: 'clamp(240px, 52vh, 480px)', borderRadius: 'clamp(12px, 1.8vh, 24px)', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)', border: '2px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div className="rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
                <CreditCard style={{ width: '4vh', height: '4vh' }} className="text-blue-500" />
              </div>
              <p className="kiosk-subtitle text-slate-900 font-bold" style={{ marginBottom: '0.5vh' }}>Pinpas</p>
              <p className="kiosk-small text-slate-400">Betaal met pinpas via SumUp</p>
              {sumupExchangeRate > 1 && (
                <p className="kiosk-small text-blue-600 font-semibold whitespace-nowrap" style={{ marginTop: '1vh' }}>
                  {formatSRD(paymentData.amount)} = {sumupCurrency} {(paymentData.amount / sumupExchangeRate).toFixed(2)}
                </p>
              )}
              <div className="flex items-center justify-center" style={{ gap: 'clamp(8px, 1vw, 16px)', marginTop: '1.5vh' }}>
                <img src="/hakrinbank-logo.png" alt="Hakrinbank" style={{ height: 'clamp(20px, 3.5vh, 40px)', width: 'auto', objectFit: 'contain' }} />
                <img src="/dsb-logo.png" alt="DSB Bank" style={{ height: 'clamp(20px, 3.5vh, 40px)', width: 'auto', objectFit: 'contain' }} />
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ====== CASH CONFIRMATION ======
  if (payMethod === 'cash') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
        <div className="flex items-center" style={{ height: '7vh', padding: '0 0.5vw' }}>
          <button onClick={() => setPayMethod(null)} disabled={processing}
            className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg disabled:opacity-50" style={{ padding: '0.8vh 1.2vw' }}>
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
          <div className="kiosk-card flex flex-col items-center text-center" style={{ width: 'clamp(300px, 35vw, 520px)', padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2vw, 40px)' }}>
            <div className="bg-orange-500 rounded-lg w-full text-center" style={{ padding: 'clamp(12px, 2vh, 28px)', marginBottom: '2vh' }}>
              <p className="kiosk-small text-orange-100" style={{ marginBottom: '0.5vh' }}>Te betalen bedrag</p>
              <p className="kiosk-amount-lg text-white whitespace-nowrap" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
              <div className="flex items-center justify-center gap-2 text-orange-100 kiosk-small" style={{ marginTop: '0.5vh' }}>
                <Banknote style={{ width: '2vh', height: '2vh' }} />
                <span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full bg-slate-50 rounded-lg" style={{ padding: 'clamp(8px, 1.2vh, 18px) clamp(10px, 1vw, 16px)', marginBottom: '2vh' }}>
              <div className="rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0" style={{ width: '4vh', height: '4vh' }}>
                <User style={{ width: '2vh', height: '2vh' }} className="text-orange-500" />
              </div>
              <div className="text-left">
                <p className="kiosk-body font-bold text-slate-900">{tenant.name}</p>
                <p className="kiosk-small text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
              </div>
            </div>

            {error && <div className="kiosk-body w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-center font-semibold" style={{ padding: '1vh', marginBottom: '1.5vh' }}>{error}</div>}

            <button onClick={handleCashPayment} disabled={processing} data-testid="confirm-payment-btn"
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg flex items-center justify-center gap-2 transition active:scale-[0.98]"
              style={{ padding: 'clamp(12px, 2vh, 24px)', fontSize: 'clamp(14px, 2vh, 22px)', fontWeight: 700 }}>
              {processing ? (<><Loader2 style={{ width: '2.5vh', height: '2.5vh' }} className="animate-spin" /><span>Verwerken...</span></>) : (<><CheckCircle style={{ width: '2.5vh', height: '2.5vh' }} /><span>Bevestig betaling</span></>)}
            </button>
            <p className="kiosk-small text-slate-400" style={{ marginTop: '1vh' }}>Contant bedrag is ontvangen</p>
          </div>
        </div>
      </div>
    );
  }

  // ====== MOPE QR CODE ======
  if (payMethod === 'mope') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
        <div className="flex items-center" style={{ height: '7vh', padding: '0 0.5vw' }}>
          <button onClick={() => { setPayMethod(null); setMopeStatus('idle'); setError(''); if (mopePollRef.current) clearInterval(mopePollRef.current); }}
            className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }}>
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
          <div className="kiosk-card flex flex-col items-center text-center" style={{ width: 'clamp(300px, 35vw, 520px)', padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2vw, 40px)' }}>
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

  // ====== CARD PAYMENT (SUMUP) ======
  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      <div className="flex items-center" style={{ height: '7vh', padding: '0 0.5vw' }}>
        <button onClick={() => { setPayMethod(null); setCardStatus('idle'); setError(''); widgetMounted.current = false; if (pollRef.current) clearInterval(pollRef.current); }}
          className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }}>
          <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
          <span className="kiosk-body">Terug</span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
        <div className="kiosk-card flex flex-col items-center text-center" style={{ width: 'clamp(300px, 35vw, 520px)', padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2vw, 40px)' }}>
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
