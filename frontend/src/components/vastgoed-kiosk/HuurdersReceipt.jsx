import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home, User, FileText, AlertTriangle, Building2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

const TYPE_LABELS = { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' };
const METHOD_LABELS = { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank' };

function formatSRD(v) {
  return `SRD ${Number(v || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.6);
    });
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 1568;
    sGain.gain.setValueAtTime(0, t + 0.25);
    sGain.gain.linearRampToValueAtTime(0.08, t + 0.3);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    shimmer.connect(sGain).connect(ctx.destination);
    shimmer.start(t + 0.25);
    shimmer.stop(t + 1);
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

export default function HuurdersReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(15);
  const [stampData, setStampData] = useState(null);
  const timerRef = useRef(null);
  const soundRef = useRef(false);

  useEffect(() => {
    if (companyId) axios.get(`${API}/public/${companyId}/company/stamp`).then(r => setStampData(r.data)).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (payment && !soundRef.current) {
      soundRef.current = true;
      playSuccessSound();
      silentPrint();
    }
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
        const remaining = (payment.remaining_rent || 0) + (payment.remaining_service || 0) + (payment.remaining_fines || 0);
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
            address: stampData?.stamp_address || '',
            phone: stampData?.stamp_phone || '',
            receipt_number: payment.kwitantie_nummer || payment.receipt_number || '',
            date: new Date(payment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: new Date(payment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
            tenant_name: payment.tenant_name || tenant?.name || '',
            apartment: `${payment.apartment_number || ''} / ${payment.tenant_code || ''}`,
            payment_type: TYPE_LABELS[payment.payment_type] || payment.payment_type,
            amount: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            payment_method: METHOD_LABELS[payment.payment_method] || payment.payment_method || 'Contant',
            remaining_total: Number(remaining).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          })
        });
      }
    } catch {}
  }, [payment, tenant, stampData]);

  if (!payment) return null;

  const remainingRent = payment.remaining_rent ?? 0;
  const remainingService = payment.remaining_service ?? 0;
  const remainingFines = payment.remaining_fines ?? 0;
  const totalRemaining = remainingRent + remainingService + remainingFines;
  const allPaid = totalRemaining <= 0;

  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}
      data-testid="huurders-receipt-screen">

      {/* Header */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ height: '7vh', padding: '0 0.5vw' }}>
        <span className="kiosk-subtitle text-white font-black tracking-wide" style={{ fontStyle: 'italic' }}>Uw overzicht</span>
      </div>

      {/* Two-panel content */}
      <div className="flex-1 flex min-h-0 overflow-hidden" style={{ gap: '1.5vw', paddingBottom: '1.5vh' }}>

        {/* LEFT PANEL: Tenant financial overview */}
        <div className="kiosk-card flex flex-col" style={{ flex: '1.4', padding: 0, overflow: 'hidden' }}>

          {/* Tenant header */}
          <div className="flex items-center justify-between" style={{ padding: 'clamp(16px, 2.5vh, 32px) clamp(16px, 2vw, 32px)' }}>
            <div className="flex items-center" style={{ gap: 'clamp(10px, 1.2vw, 20px)' }}>
              <div className="rounded-xl bg-orange-50 flex items-center justify-center" style={{ width: 'clamp(40px, 6vh, 60px)', height: 'clamp(40px, 6vh, 60px)' }}>
                <User style={{ width: '3vh', height: '3vh' }} className="text-orange-400" />
              </div>
              <div>
                <p className="font-bold text-slate-900" style={{ fontSize: 'clamp(16px, 2.2vh, 24px)' }}>
                  {payment.tenant_name || tenant?.name || ''}
                </p>
                <p className="text-slate-400" style={{ fontSize: 'clamp(12px, 1.5vh, 16px)' }}>
                  Appt. {payment.apartment_number || tenant?.apartment_number || ''} - {payment.tenant_code || tenant?.tenant_code || ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="uppercase tracking-wider text-slate-400 font-bold" style={{ fontSize: 'clamp(9px, 1vh, 12px)' }}>Maandhuur</p>
              <p className="font-black text-slate-900" style={{ fontSize: 'clamp(18px, 2.8vh, 30px)' }}>
                {formatSRD(tenant?.monthly_rent || tenant?.rent_amount || 0)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderBottom: '1px solid #f1f5f9', margin: '0 clamp(16px, 2vw, 32px)' }} />

          {/* Financial breakdown */}
          <div className="flex-1 flex flex-col justify-center" style={{ padding: 'clamp(12px, 1.5vh, 20px) clamp(16px, 2vw, 32px)' }}>

            {/* Openstaande huur */}
            <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 1.8vh, 24px) 0', borderBottom: '1px solid #f8fafc' }}>
              <div className="flex items-center" style={{ gap: 'clamp(10px, 1vw, 16px)' }}>
                <div className="rounded-lg bg-slate-50 flex items-center justify-center" style={{ width: 'clamp(32px, 4.5vh, 48px)', height: 'clamp(32px, 4.5vh, 48px)' }}>
                  <Building2 style={{ width: '2.2vh', height: '2.2vh' }} className="text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800" style={{ fontSize: 'clamp(14px, 1.8vh, 20px)' }}>Openstaande huur</p>
                  <p className="text-slate-400" style={{ fontSize: 'clamp(11px, 1.3vh, 14px)' }}>
                    {remainingRent <= 0 ? 'Geen achterstand' : 'Achterstallig bedrag'}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${remainingRent <= 0 ? 'text-emerald-500' : 'text-orange-500'}`} style={{ fontSize: 'clamp(15px, 2vh, 22px)' }}>
                {formatSRD(remainingRent)}
              </span>
            </div>

            {/* Servicekosten */}
            <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 1.8vh, 24px) 0', borderBottom: '1px solid #f8fafc' }}>
              <div className="flex items-center" style={{ gap: 'clamp(10px, 1vw, 16px)' }}>
                <div className="rounded-lg bg-slate-50 flex items-center justify-center" style={{ width: 'clamp(32px, 4.5vh, 48px)', height: 'clamp(32px, 4.5vh, 48px)' }}>
                  <FileText style={{ width: '2.2vh', height: '2.2vh' }} className="text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800" style={{ fontSize: 'clamp(14px, 1.8vh, 20px)' }}>Servicekosten</p>
                  <p className="text-slate-400" style={{ fontSize: 'clamp(11px, 1.3vh, 14px)' }}>Water, stroom, overig</p>
                </div>
              </div>
              <span className={`font-bold ${remainingService <= 0 ? 'text-emerald-500' : 'text-orange-500'}`} style={{ fontSize: 'clamp(15px, 2vh, 22px)' }}>
                {formatSRD(remainingService)}
              </span>
            </div>

            {/* Boetes */}
            <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 1.8vh, 24px) 0' }}>
              <div className="flex items-center" style={{ gap: 'clamp(10px, 1vw, 16px)' }}>
                <div className="rounded-lg bg-slate-50 flex items-center justify-center" style={{ width: 'clamp(32px, 4.5vh, 48px)', height: 'clamp(32px, 4.5vh, 48px)' }}>
                  <AlertTriangle style={{ width: '2.2vh', height: '2.2vh' }} className="text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800" style={{ fontSize: 'clamp(14px, 1.8vh, 20px)' }}>Boetes</p>
                  <p className="text-slate-400" style={{ fontSize: 'clamp(11px, 1.3vh, 14px)' }}>Openstaande boetes</p>
                </div>
              </div>
              <span className={`font-bold ${remainingFines <= 0 ? 'text-emerald-500' : 'text-orange-500'}`} style={{ fontSize: 'clamp(15px, 2vh, 22px)' }}>
                {formatSRD(remainingFines)}
              </span>
            </div>
          </div>

          {/* Total outstanding bar */}
          <div className="flex items-center justify-between" style={{
            background: '#0f172a',
            padding: 'clamp(14px, 2.5vh, 28px) clamp(16px, 2vw, 32px)',
            borderRadius: '0 0 clamp(12px, 1.5vh, 20px) clamp(12px, 1.5vh, 20px)'
          }}>
            <span className="text-slate-400 font-medium" style={{ fontSize: 'clamp(13px, 1.6vh, 18px)' }}>Totaal openstaand</span>
            <span className="text-white font-black" style={{
              fontSize: 'clamp(22px, 3.5vh, 36px)',
              fontFamily: "'JetBrains Mono', monospace",
              fontStyle: 'italic'
            }}>
              {formatSRD(totalRemaining)}
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: Success / Status card */}
        <div className="kiosk-card flex flex-col items-center justify-center text-center" style={{ flex: '0.8', padding: 'clamp(16px, 3vh, 40px)' }}>

          {/* Success icon */}
          <div className="rounded-full bg-emerald-50 flex items-center justify-center" style={{
            width: 'clamp(64px, 10vh, 100px)', height: 'clamp(64px, 10vh, 100px)',
            marginBottom: 'clamp(12px, 2.5vh, 28px)',
            border: '3px solid #bbf7d0'
          }}>
            <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-emerald-500" />
          </div>

          {/* Status text */}
          <h2 className="font-black text-emerald-500 tracking-tight" style={{
            fontSize: 'clamp(24px, 4vh, 42px)',
            marginBottom: 'clamp(4px, 0.8vh, 10px)'
          }}>
            {allPaid ? 'Alles betaald!' : 'Betaling geslaagd!'}
          </h2>
          <p className="text-slate-400 font-medium" style={{
            fontSize: 'clamp(13px, 1.6vh, 18px)',
            marginBottom: 'clamp(20px, 4vh, 40px)'
          }}>
            {allPaid ? 'Geen openstaand saldo' : `Openstaand: ${formatSRD(totalRemaining)}`}
          </p>

          {/* Done button */}
          <button onClick={onDone} data-testid="huurders-receipt-done-btn"
            className="w-full rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              maxWidth: 'clamp(200px, 22vw, 340px)',
              padding: 'clamp(14px, 2.5vh, 28px)',
              fontSize: 'clamp(16px, 2.2vh, 22px)',
              background: '#f97316',
              boxShadow: '0 8px 30px -8px rgba(249,115,22,0.4)'
            }}>
            <Home style={{ width: '2.2vh', height: '2.2vh' }} />
            Terug naar start
          </button>

          {/* Countdown */}
          <div style={{ marginTop: 'clamp(16px, 3vh, 32px)', position: 'relative', width: 'clamp(44px, 6vh, 64px)', height: 'clamp(44px, 6vh, 64px)' }}>
            <svg viewBox="0 0 60 60" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <circle cx="30" cy="30" r="26" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle cx="30" cy="30" r="26" fill="none" stroke="#f97316" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 15)}`}
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dashoffset 0.9s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(16px, 2.5vh, 26px)', fontWeight: 900, color: '#64748b',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {countdown}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
