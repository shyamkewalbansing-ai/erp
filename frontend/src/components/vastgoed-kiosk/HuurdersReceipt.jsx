import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home, Receipt, Clock } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
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

function playPaperFeedSound(durationMs = 3500) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const dur = durationMs / 1000;
    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.12;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 1.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, t);
    noiseGain.gain.linearRampToValueAtTime(0.1, t + 0.3);
    noiseGain.gain.setValueAtTime(0.1, t + dur - 0.4);
    noiseGain.gain.linearRampToValueAtTime(0, t + dur);
    noise.connect(bandpass).connect(noiseGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
    const tickRate = 40;
    const totalTicks = Math.floor(dur * tickRate);
    for (let i = 0; i < totalTicks; i++) {
      const tickTime = t + (i / tickRate);
      const tickBuf = ctx.createBuffer(1, 80, ctx.sampleRate);
      const tickData = tickBuf.getChannelData(0);
      for (let j = 0; j < 80; j++) tickData[j] = (Math.random() * 2 - 1) * 0.2 * Math.exp(-j / 15);
      const tick = ctx.createBufferSource();
      tick.buffer = tickBuf;
      const tickGain = ctx.createGain();
      tickGain.gain.value = 0.04;
      const tickFilter = ctx.createBiquadFilter();
      tickFilter.type = 'highpass';
      tickFilter.frequency.value = 800;
      tick.connect(tickFilter).connect(tickGain).connect(ctx.destination);
      tick.start(tickTime);
      tick.stop(tickTime + 0.015);
    }
    const tearTime = t + dur - 0.15;
    const tearBuf = ctx.createBuffer(1, 3000, ctx.sampleRate);
    const tearData = tearBuf.getChannelData(0);
    for (let j = 0; j < 3000; j++) tearData[j] = (Math.random() * 2 - 1) * 0.4 * Math.exp(-j / 500);
    const tear = ctx.createBufferSource();
    tear.buffer = tearBuf;
    const tearGain = ctx.createGain();
    tearGain.gain.value = 0.12;
    tear.connect(tearGain).connect(ctx.destination);
    tear.start(tearTime);
    setTimeout(() => ctx.close(), durationMs + 500);
  } catch {}
}

export default function HuurdersReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const [phase, setPhase] = useState('show');
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) axios.get(`${API}/public/${companyId}/company/stamp`).then(r => setStampData(r.data)).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      playSuccessSound();
      setTimeout(() => {
        setPhase('ejecting');
        playPaperFeedSound(3500);
        silentPrint();
      }, 2500);
      setTimeout(() => setPhase('done'), 6500);
    }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, 6800);
    return () => { clearTimeout(startDelay); clearInterval(timerRef.current); };
  }, [payment, onDone]);

  const kwNr = payment?.kwitantie_nummer || payment?.receipt_number || '';
  const remaining = (payment?.remaining_rent || 0) + (payment?.remaining_service || 0) + (payment?.remaining_fines || 0);

  const silentPrint = useCallback(async () => {
    if (!payment) return;
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
            address: stampData?.stamp_address || '',
            phone: stampData?.stamp_phone || '',
            receipt_number: kwNr,
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
  }, [payment, tenant, stampData, kwNr, remaining]);

  if (!payment) return null;

  const date = new Date(payment.created_at);

  return (
    <div className="h-full bg-orange-500 flex flex-col overflow-hidden" style={{ padding: '1.5vh 1.5vw 0' }}
      data-testid="huurders-receipt-screen">
      <style>{`
        @keyframes ejectDown {
          0% { transform: translateY(0); }
          100% { transform: translateY(115vh); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes receiptAppear {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes countdownPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .receipt-eject {
          animation: ejectDown 3.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .receipt-appear {
          animation: receiptAppear 0.4s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
        <span className="kiosk-subtitle text-white">Betaling voltooid</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden" style={{ paddingBottom: '1.5vh' }}>

        {phase === 'done' ? (
          /* ============ DONE: Modern huurders success layout ============ */
          <div className="flex-1 kiosk-card flex flex-col items-center justify-center text-center relative" style={{ padding: 'clamp(16px, 2.5vh, 32px)' }}>
            {/* Success icon with pulse ring */}
            <div style={{
              animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
              width: 'clamp(64px, 10vh, 100px)', height: 'clamp(64px, 10vh, 100px)',
              marginBottom: '2vh',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animationDelay: '0s'
            }}>
              <div style={{ animation: 'pulseRing 2s ease-out infinite', borderRadius: '50%', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-white" />
              </div>
            </div>

            <h1 style={{ animation: 'fadeUp 0.5s ease-out 0.15s forwards', opacity: 0, marginBottom: '0.5vh' }}
              className="kiosk-title text-slate-900 tracking-tight">Betaling geslaagd!</h1>

            {/* Big amount display */}
            <div style={{
              animation: 'fadeUp 0.5s ease-out 0.3s forwards', opacity: 0,
              marginBottom: '2.5vh', marginTop: '1vh',
              background: '#f0fdf4', borderRadius: 'clamp(12px, 1.5vh, 20px)',
              padding: 'clamp(12px, 2vh, 28px) clamp(24px, 4vw, 60px)',
              border: '2px solid #bbf7d0'
            }}>
              <span className="text-green-600 font-black tracking-tight" style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: 'clamp(28px, 5.5vh, 56px)'
              }}>
                {formatSRD(payment.amount)}
              </span>
            </div>

            {/* Details row */}
            <div style={{
              animation: 'fadeUp 0.5s ease-out 0.45s forwards', opacity: 0,
              display: 'flex', gap: 'clamp(16px, 3vw, 48px)',
              marginBottom: '2.5vh', flexWrap: 'wrap', justifyContent: 'center'
            }}>
              {[
                { label: 'Kwitantie', value: kwNr },
                { label: 'Betaalwijze', value: METHOD_LABELS[payment.payment_method] || 'Contant' },
                { label: 'Huurder', value: payment.tenant_name || tenant?.name || '' },
                { label: 'Openstaand', value: remaining > 0 ? formatSRD(remaining) : 'Voldaan' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center" style={{ minWidth: '80px' }}>
                  <span className="uppercase tracking-widest text-slate-400 font-bold" style={{ fontSize: 'clamp(9px, 1.1vh, 12px)', marginBottom: '2px' }}>{item.label}</span>
                  <span className="text-slate-800 font-semibold" style={{ fontSize: 'clamp(13px, 1.8vh, 18px)' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Receipt printed badge */}
            <div style={{ animation: 'fadeUp 0.5s ease-out 0.55s forwards', opacity: 0, marginBottom: '2vh' }}>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full" style={{ padding: 'clamp(6px, 1vh, 12px) clamp(14px, 2vw, 24px)' }}>
                <Receipt style={{ width: '1.8vh', height: '1.8vh' }} className="text-orange-500" />
                <span className="text-orange-600 font-bold" style={{ fontSize: 'clamp(11px, 1.4vh, 16px)' }}>Uw bon is geprint</span>
              </div>
            </div>

            {/* Done button */}
            <div style={{ animation: 'fadeUp 0.5s ease-out 0.7s forwards', opacity: 0, width: '100%', maxWidth: '22vw' }}>
              <button onClick={onDone} data-testid="huurders-receipt-done-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center gap-2 transition kiosk-body font-bold active:scale-95"
                style={{ padding: 'clamp(12px, 2.5vh, 28px)' }}>
                <Home style={{ width: '2.5vh', height: '2.5vh' }} /> Klaar
              </button>
            </div>

            {/* Countdown */}
            <div style={{ animation: 'fadeUp 0.5s ease-out 0.85s forwards', opacity: 0, marginTop: '2.5vh' }}>
              <div className="flex items-center justify-center gap-2">
                <Clock style={{ width: '2vh', height: '2vh' }} className="text-slate-300" />
                <div className="text-slate-300 font-black" style={{
                  fontSize: 'clamp(36px, 7vh, 80px)', lineHeight: 1,
                  animation: 'countdownPulse 1s ease-in-out infinite'
                }}>{countdown}</div>
              </div>
              <p className="kiosk-small text-slate-400 mt-1">sec</p>
            </div>
          </div>

        ) : (
          /* ============ SHOW + EJECT: Receipt visible (same animation) ============ */
          <div className="flex-1 flex gap-[1.5vw]">
            {/* Left: Success message panel */}
            <div className="kiosk-card flex flex-col items-center justify-center text-center" style={{ flex: '1', padding: 'clamp(16px, 3vh, 40px)' }}>
              <div style={{
                animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
                width: '10vh', height: '10vh', marginBottom: '2.5vh',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-white" />
              </div>
              <h1 className="kiosk-title text-slate-900" style={{ marginBottom: '0.8vh' }}>Betaling geslaagd!</h1>
              <p className="kiosk-body text-slate-400" style={{ marginBottom: '1vh' }}>Kwitantie: {kwNr}</p>
              {/* Amount shown during print phase too */}
              <div style={{
                background: '#f0fdf4', borderRadius: '12px',
                padding: 'clamp(8px, 1.5vh, 16px) clamp(16px, 2.5vw, 32px)',
                border: '1px solid #bbf7d0', marginBottom: '2vh'
              }}>
                <span className="text-green-600 font-bold" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(20px, 3.5vh, 36px)'
                }}>
                  {formatSRD(payment.amount)}
                </span>
              </div>
              {phase === 'ejecting' && (
                <p className="kiosk-body text-orange-500 font-bold animate-pulse">Bon wordt geprint...</p>
              )}
            </div>

            {/* Right: Receipt (appears, then ejects down) */}
            <div className="flex flex-col items-center justify-start overflow-hidden" style={{ flex: '0.7', maxWidth: '360px' }}>
              <div
                className={phase === 'show' ? 'receipt-appear' : phase === 'ejecting' ? 'receipt-eject' : ''}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                data-testid="receipt-paper"
              >
                <div className="bg-white rounded-lg shadow-lg" style={{ overflow: 'hidden' }}>
                  <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print content */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
