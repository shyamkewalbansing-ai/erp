import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';
const BG_IMAGE = 'https://static.prod-images.emergentagent.com/jobs/543d1584-8ed8-49c0-9f0d-1f4c4dcb9d22/images/1adb050b1ae8a688c85b3259ce0b713f0f1738f2fcb84aa25a0ed33f6888be4d.png';

const TYPE_LABELS = { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' };
const METHOD_LABELS = { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank' };

function formatSRD(v) { return `SRD ${Number(v || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.6);
    });
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'triangle'; shimmer.frequency.value = 1568;
    sGain.gain.setValueAtTime(0, t + 0.25);
    sGain.gain.linearRampToValueAtTime(0.08, t + 0.3);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    shimmer.connect(sGain).connect(ctx.destination);
    shimmer.start(t + 0.25); shimmer.stop(t + 1);
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

export default function HuurdersReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const timerRef = useRef(null);
  const soundRef = useRef(false);

  useEffect(() => {
    if (companyId) axios.get(`${API}/public/${companyId}/company/stamp`).then(r => setStampData(r.data)).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (payment && !soundRef.current) { soundRef.current = true; playSuccessSound(); silentPrint(); }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    const delay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return p - 1; });
      }, 1000);
    }, 1000);
    return () => { clearTimeout(delay); clearInterval(timerRef.current); };
  }, [payment, onDone]);

  const silentPrint = useCallback(async () => {
    if (!payment) return;
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: stampData?.stamp_company_name || 'Vastgoed',
            receipt_number: payment.kwitantie_nummer || payment.receipt_number || '',
            date: new Date(payment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: new Date(payment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
            tenant_name: payment.tenant_name || tenant?.name || '',
            apartment: `${payment.apartment_number || ''} / ${payment.tenant_code || ''}`,
            payment_type: TYPE_LABELS[payment.payment_type] || payment.payment_type,
            amount: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            payment_method: METHOD_LABELS[payment.payment_method] || 'Contant',
            remaining_total: Number((payment.remaining_rent || 0) + (payment.remaining_service || 0) + (payment.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          })
        });
      }
    } catch {}
  }, [payment, tenant, stampData]);

  if (!payment) return null;

  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';
  const date = new Date(payment.created_at);
  const remaining = (payment.remaining_rent || 0) + (payment.remaining_service || 0) + (payment.remaining_fines || 0);

  const DataPair = ({ label, value }) => (
    <div className="flex flex-col gap-1">
      <span className="uppercase tracking-widest text-slate-400 font-bold" style={{ fontSize: 'clamp(10px, 1.2vh, 14px)' }}>{label}</span>
      <span className="text-slate-900 font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(14px, 2vh, 22px)' }}>{value}</span>
    </div>
  );

  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden"
      style={{ background: `#F8FAFC url(${BG_IMAGE}) center/cover no-repeat`, fontFamily: "'Outfit', sans-serif" }}
      data-testid="huurders-receipt-screen">

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl mx-4 bg-white/95 backdrop-blur-xl rounded-[32px] border border-white flex flex-col overflow-hidden"
        style={{ boxShadow: '0 30px 100px -15px rgba(0,0,0,0.12)', maxHeight: '90vh' }}
        data-testid="huurders-receipt-card"
      >
        {/* Success Header */}
        <div className="flex flex-col items-center justify-center text-center pt-10 pb-6 px-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.8, delay: 0.2 }}
          >
            <div className="rounded-full bg-emerald-50 flex items-center justify-center" style={{ width: 'clamp(80px, 12vh, 120px)', height: 'clamp(80px, 12vh, 120px)' }}>
              <CheckCircle className="text-emerald-500" style={{ width: 'clamp(40px, 6vh, 64px)', height: 'clamp(40px, 6vh, 64px)' }} />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="font-black tracking-tighter text-slate-900 mt-5"
            style={{ fontSize: 'clamp(28px, 5vh, 52px)' }}
          >
            Betaling geslaagd
          </motion.h1>
        </div>

        {/* Amount Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mx-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center text-center py-6"
          data-testid="huurders-receipt-amount"
        >
          <span className="uppercase tracking-widest text-emerald-600/60 font-bold mb-1" style={{ fontSize: 'clamp(10px, 1.3vh, 14px)' }}>Betaald bedrag</span>
          <span className="font-black text-emerald-600 tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(36px, 7vh, 72px)' }}>
            {formatSRD(payment.amount)}
          </span>
        </motion.div>

        {/* Receipt Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 px-10 py-7"
        >
          <DataPair label="Kwitantie" value={kwNr} />
          <DataPair label="Datum" value={date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <DataPair label="Betaalwijze" value={METHOD_LABELS[payment.payment_method] || payment.payment_method || 'Contant'} />
          <DataPair label="Type" value={TYPE_LABELS[payment.payment_type] || payment.payment_type} />
          <DataPair label="Huurder" value={payment.tenant_name || tenant?.name || ''} />
          <DataPair label="Appartement" value={`${payment.apartment_number || tenant?.apartment_number || ''}`} />
          <DataPair label="Openstaand" value={remaining > 0 ? formatSRD(remaining) : 'Voldaan'} />
          <DataPair label="Tijd" value={date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} />
        </motion.div>

        {/* Divider */}
        <div className="mx-10 border-t border-slate-100" />

        {/* Done Button with Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="px-8 py-6 flex flex-col items-center gap-3"
        >
          <button
            onClick={onDone}
            data-testid="huurders-receipt-done-btn"
            className="relative overflow-hidden w-full max-w-xl rounded-2xl text-white font-bold flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"
            style={{ height: 'clamp(56px, 9vh, 88px)', fontSize: 'clamp(18px, 2.8vh, 28px)', background: '#111827', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)' }}
          >
            {/* Progress bar shrinking */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 12, ease: 'linear' }}
              className="absolute inset-0 bg-white/10 origin-left"
            />
            <span className="relative z-10 flex items-center gap-3">
              <Home style={{ width: 'clamp(20px, 3vh, 28px)', height: 'clamp(20px, 3vh, 28px)' }} />
              Klaar — {countdown}s
            </span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
