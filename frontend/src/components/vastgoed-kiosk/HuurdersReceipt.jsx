import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home, Clock } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

const TYPE_LABELS = { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom', internet: 'Internet' };
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
  const [countdown, setCountdown] = useState(5);
  const [stampData, setStampData] = useState(null);
  const [phase, setPhase] = useState('show'); // show -> ejecting -> done
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
        setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return p - 1; });
      }, 1000);
    }, 6800);
    return () => { clearTimeout(startDelay); clearInterval(timerRef.current); };
  }, [payment, onDone]);

  const kwNr = payment?.kwitantie_nummer || payment?.receipt_number || '';

  const silentPrint = useCallback(async () => {
    if (!payment) return;
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const rem = (payment.remaining_rent || 0) + (payment.remaining_service || 0) + (payment.remaining_fines || 0) + (payment.remaining_internet || 0);
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
            address: stampData?.stamp_address || '', phone: stampData?.stamp_phone || '',
            receipt_number: kwNr,
            date: new Date(payment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: new Date(payment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
            tenant_name: payment.tenant_name || tenant?.name || '',
            apartment: `${payment.apartment_number || ''} / ${payment.tenant_code || ''}`,
            payment_type: TYPE_LABELS[payment.payment_type] || payment.payment_type,
            amount: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            payment_method: METHOD_LABELS[payment.payment_method] || payment.payment_method || 'Contant',
            remaining_total: Number(rem).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          })
        });
      }
    } catch {}
  }, [payment, tenant, stampData, kwNr]);

  if (!payment) return null;

  const remainingRent = payment.remaining_rent ?? 0;
  const remainingService = payment.remaining_service ?? 0;
  const remainingFines = payment.remaining_fines ?? 0;
  const remainingInternet = payment.remaining_internet ?? 0;
  const totalRemaining = remainingRent + remainingService + remainingFines + remainingInternet;
  const allPaid = totalRemaining <= 0;

  return (
    <div className="h-full bg-orange-500 flex flex-col overflow-hidden" style={{ padding: '1.5vh 1.5vw 0' }}
      data-testid="huurders-receipt-screen">
      <style>{`
        @keyframes ejectDown {
          0% { transform: translateY(0); }
          100% { transform: translateY(120vh); }
        }
        @keyframes receiptAppear {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .receipt-eject { animation: ejectDown 3.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .receipt-appear { animation: receiptAppear 0.5s ease-out forwards; }
      `}</style>

      {phase !== 'done' ? (
        /* ===== SHOW: Pending approval message ===== */
        <>
          {/* Header */}
          <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
            <span className="kiosk-subtitle text-white font-bold">Betaling ingediend</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden" style={{ paddingBottom: '1.5vh' }}>
            {/* Success text block */}
            <div className="flex flex-col items-center text-center flex-shrink-0">
              <div style={{
                animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
                width: 'clamp(48px, 7vh, 72px)', height: 'clamp(48px, 7vh, 72px)',
                borderRadius: '50%', marginBottom: 'clamp(10px, 1.5vh, 18px)',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock style={{ width: '3.5vh', height: '3.5vh' }} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-white font-black" style={{ fontSize: 'clamp(18px, 2.8vh, 30px)', marginBottom: '0.5vh' }}>
                Betaling ontvangen
              </h1>
              <p className="text-white/80 font-bold" style={{ fontSize: 'clamp(14px, 2vh, 22px)', marginBottom: '0.5vh' }}>
                {formatSRD(payment.amount)}
              </p>
              <p className="text-white/60 font-medium" style={{ fontSize: 'clamp(12px, 1.5vh, 16px)' }}>
                Wacht op goedkeuring van beheerder
              </p>
              <p className="text-white/40 font-mono" style={{ fontSize: 'clamp(11px, 1.3vh, 14px)', marginTop: '0.5vh' }}>
                {kwNr}
              </p>
            </div>
          </div>
        </>

      ) : (
        /* ===== DONE: Wacht op goedkeuring ===== */
        <>
          <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
            <span className="kiosk-subtitle text-white font-bold">Betaling ingediend</span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
            <div className="kiosk-card flex flex-col items-center text-center" style={{
              width: 'clamp(320px, 50vw, 600px)',
              padding: 'clamp(20px, 3vh, 40px) clamp(24px, 3vw, 48px)',
              animation: 'fadeUp 0.5s ease-out forwards'
            }}>
              {/* Pending icon */}
              <div className="rounded-full bg-amber-50 flex items-center justify-center" style={{
                width: 'clamp(56px, 8vh, 84px)', height: 'clamp(56px, 8vh, 84px)',
                border: '3px solid #fde68a', marginBottom: 'clamp(8px, 1.5vh, 16px)',
                animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards', opacity: 0
              }}>
                <Clock style={{ width: '4vh', height: '4vh' }} className="text-amber-500" />
              </div>

              <h2 className="font-black text-amber-600 tracking-tight" style={{
                fontSize: 'clamp(20px, 3vh, 34px)', marginBottom: '0.5vh',
                animation: 'fadeUp 0.4s ease-out 0.35s forwards', opacity: 0
              }}>Wacht op goedkeuring</h2>

              <p className="text-slate-400 font-medium" style={{
                fontSize: 'clamp(12px, 1.5vh, 16px)', marginBottom: 'clamp(12px, 2vh, 24px)',
                animation: 'fadeUp 0.4s ease-out 0.45s forwards', opacity: 0
              }}>Uw betaling wordt verwerkt door de beheerder</p>

              {/* Details */}
              <div style={{
                width: '100%', marginBottom: 'clamp(12px, 2vh, 24px)',
                animation: 'fadeUp 0.4s ease-out 0.55s forwards', opacity: 0
              }}>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f1f5f9' }}>
                  {[
                    { label: 'Bedrag', value: formatSRD(payment.amount), bold: true },
                    { label: 'Kwitantie', value: kwNr },
                    { label: 'Betaalwijze', value: METHOD_LABELS[payment.payment_method] || 'Contant' },
                    { label: 'Status', value: 'In afwachting', pending: true },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between" style={{
                      padding: 'clamp(8px, 1.2vh, 14px) clamp(14px, 1.8vw, 24px)',
                      background: i % 2 === 0 ? '#f8fafc' : 'white'
                    }}>
                      <span className="text-slate-500" style={{ fontSize: 'clamp(12px, 1.5vh, 16px)' }}>{row.label}</span>
                      <span className={`font-bold ${row.pending ? 'text-amber-600' : row.bold ? 'text-slate-900' : 'text-slate-700'}`}
                        style={{ fontSize: 'clamp(13px, 1.6vh, 17px)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Total bar */}
                <div className="flex items-center justify-between rounded-b-xl" style={{
                  background: '#0f172a', padding: 'clamp(10px, 1.8vh, 20px) clamp(14px, 1.8vw, 24px)',
                  marginTop: '-1px'
                }}>
                  <span className="text-slate-400 font-medium" style={{ fontSize: 'clamp(12px, 1.5vh, 16px)' }}>Totaal openstaand</span>
                  <span className="text-white font-black" style={{
                    fontSize: 'clamp(18px, 2.8vh, 28px)',
                    fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic'
                  }}>{formatSRD(totalRemaining)}</span>
                </div>
              </div>

              {/* Button */}
              <button onClick={onDone} data-testid="huurders-receipt-done-btn"
                className="rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                style={{
                  width: 'clamp(200px, 20vw, 320px)', padding: 'clamp(12px, 2vh, 24px)',
                  fontSize: 'clamp(15px, 2vh, 20px)', background: '#f97316',
                  boxShadow: '0 8px 30px -8px rgba(249,115,22,0.4)',
                  animation: 'fadeUp 0.4s ease-out 0.65s forwards', opacity: 0
                }}>
                <Home style={{ width: '2vh', height: '2vh' }} /> Terug naar start
              </button>

              {/* Countdown */}
              <div style={{
                marginTop: 'clamp(12px, 2vh, 20px)', position: 'relative',
                width: 'clamp(40px, 5vh, 56px)', height: 'clamp(40px, 5vh, 56px)',
                animation: 'fadeUp 0.4s ease-out 0.75s forwards', opacity: 0
              }}>
                <svg viewBox="0 0 60 60" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#f97316" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 5)}`}
                    transform="rotate(-90 30 30)" style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(14px, 2vh, 22px)', fontWeight: 900, color: '#64748b',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>{countdown}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden print content */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
