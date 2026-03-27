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

/* Confetti canvas burst */
function launchConfetti(canvasEl) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  const W = canvasEl.width = canvasEl.offsetWidth;
  const H = canvasEl.height = canvasEl.offsetHeight;
  const colors = ['#22c55e','#f97316','#3b82f6','#eab308','#ec4899','#14b8a6','#ffffff'];
  const particles = Array.from({ length: 80 }, () => ({
    x: W / 2, y: H * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 1) * 12 - 2,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 15,
    gravity: 0.18 + Math.random() * 0.08,
    opacity: 1,
    decay: 0.008 + Math.random() * 0.006
  }));
  let raf;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    particles.forEach(p => {
      if (p.opacity <= 0) return;
      alive = true;
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rot += p.rotV;
      p.opacity -= p.decay;
      p.vx *= 0.99;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  setTimeout(() => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }, 4000);
}

export default function HuurdersReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const [phase, setPhase] = useState('show');
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);
  const confettiRef = useRef(null);

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
      setTimeout(() => {
        setPhase('done');
        setTimeout(() => launchConfetti(confettiRef.current), 300);
      }, 6500);
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

  return (
    <div className="h-full bg-orange-500 flex flex-col overflow-hidden" style={{ padding: '1.5vh 1.5vw 0' }}
      data-testid="huurders-receipt-screen">
      <style>{`
        @keyframes ejectDown {
          0% { transform: translateY(0); }
          100% { transform: translateY(115vh); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes receiptAppear {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1); }
          50% { box-shadow: 0 0 30px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.2); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes countTick {
          0% { transform: scale(1); }
          15% { transform: scale(1.12); }
          30% { transform: scale(1); }
        }
        @keyframes badgeSlide {
          from { opacity: 0; transform: translateY(10px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes progressShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .receipt-eject {
          animation: ejectDown 3.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .receipt-appear {
          animation: receiptAppear 0.4s ease-out forwards;
        }
        .done-icon { animation: scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .done-title { animation: slideUp 0.5s ease-out 0.2s forwards; opacity: 0; }
        .done-amount { animation: slideUp 0.5s ease-out 0.35s forwards; opacity: 0; }
        .done-details { animation: slideUp 0.5s ease-out 0.5s forwards; opacity: 0; }
        .done-badge { animation: badgeSlide 0.4s ease-out 0.65s forwards; opacity: 0; }
        .done-btn { animation: slideUp 0.4s ease-out 0.75s forwards; opacity: 0; }
        .done-countdown { animation: slideUp 0.4s ease-out 0.85s forwards; opacity: 0; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
        <span className="kiosk-subtitle text-white font-bold tracking-wide">Betaling voltooid</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden" style={{ paddingBottom: '1.5vh' }}>

        {phase === 'done' ? (
          /* ============ DONE: Modern huurders success layout ============ */
          <div className="flex-1 kiosk-card flex flex-col items-center justify-center text-center relative overflow-hidden"
            style={{ padding: 'clamp(16px, 2vh, 28px)' }}>

            {/* Confetti canvas overlay */}
            <canvas ref={confettiRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }} />

            {/* Success icon with glow */}
            <div className="done-icon" style={{
              width: 'clamp(72px, 11vh, 110px)', height: 'clamp(72px, 11vh, 110px)',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, glowPulse 2s ease-in-out 0.8s infinite',
              marginBottom: 'clamp(8px, 1.5vh, 16px)'
            }}>
              <CheckCircle style={{ width: '5.5vh', height: '5.5vh' }} className="text-white" strokeWidth={2.5} />
            </div>

            <h1 className="done-title font-black tracking-tight text-slate-900"
              style={{ fontSize: 'clamp(22px, 4vh, 40px)', marginBottom: 'clamp(4px, 0.8vh, 10px)' }}>
              Betaling geslaagd!
            </h1>

            {/* Amount with shimmer effect */}
            <div className="done-amount" style={{
              marginBottom: 'clamp(12px, 2vh, 24px)',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: 'clamp(16px, 2vh, 24px)',
              padding: 'clamp(12px, 2vh, 24px) clamp(28px, 5vw, 72px)',
              border: '2px solid #86efac',
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Shimmer overlay */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.4,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite'
              }} />
              <span className="relative text-green-600 font-black tracking-tighter" style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: 'clamp(32px, 6vh, 64px)', zIndex: 1
              }}>
                {formatSRD(payment.amount)}
              </span>
            </div>

            {/* Details chips */}
            <div className="done-details flex flex-wrap justify-center" style={{ gap: 'clamp(8px, 1vw, 16px)', marginBottom: 'clamp(12px, 2vh, 20px)' }}>
              {[
                { label: 'Kwitantie', value: kwNr },
                { label: 'Betaalwijze', value: METHOD_LABELS[payment.payment_method] || 'Contant' },
                { label: 'Huurder', value: payment.tenant_name || tenant?.name || '' },
                { label: 'Openstaand', value: remaining > 0 ? formatSRD(remaining) : 'Voldaan', accent: remaining <= 0 },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center rounded-xl" style={{
                  background: item.accent ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${item.accent ? '#bbf7d0' : '#e2e8f0'}`,
                  padding: 'clamp(6px, 1vh, 12px) clamp(12px, 1.5vw, 24px)',
                  minWidth: 'clamp(80px, 10vw, 140px)'
                }}>
                  <span className="uppercase tracking-widest font-bold" style={{
                    fontSize: 'clamp(8px, 1vh, 11px)',
                    color: item.accent ? '#16a34a' : '#94a3b8',
                    marginBottom: '2px'
                  }}>{item.label}</span>
                  <span className="font-semibold" style={{
                    fontSize: 'clamp(12px, 1.6vh, 17px)',
                    color: item.accent ? '#16a34a' : '#1e293b'
                  }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Receipt printed badge */}
            <div className="done-badge" style={{ marginBottom: 'clamp(10px, 1.8vh, 20px)' }}>
              <div className="flex items-center gap-2 rounded-full" style={{
                padding: 'clamp(6px, 1vh, 12px) clamp(14px, 2vw, 24px)',
                background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                border: '1px solid #fdba74'
              }}>
                <Receipt style={{ width: 'clamp(14px, 1.8vh, 20px)', height: 'clamp(14px, 1.8vh, 20px)' }} className="text-orange-500" />
                <span className="text-orange-600 font-bold" style={{ fontSize: 'clamp(11px, 1.4vh, 16px)' }}>Uw bon is geprint</span>
              </div>
            </div>

            {/* Done button with progress bar */}
            <div className="done-btn" style={{ width: '100%', maxWidth: 'clamp(200px, 24vw, 380px)' }}>
              <button onClick={onDone} data-testid="huurders-receipt-done-btn"
                className="w-full text-white rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer font-bold relative overflow-hidden"
                style={{
                  padding: 'clamp(12px, 2.2vh, 24px)',
                  fontSize: 'clamp(15px, 2.2vh, 22px)',
                  background: 'linear-gradient(135deg, #ea580c, #f97316)',
                  boxShadow: '0 8px 30px -8px rgba(249,115,22,0.5)'
                }}>
                <Home style={{ width: '2.2vh', height: '2.2vh' }} />
                <span>Klaar</span>
              </button>
            </div>

            {/* Countdown with circular progress */}
            <div className="done-countdown flex flex-col items-center" style={{ marginTop: 'clamp(10px, 1.5vh, 20px)' }}>
              <div style={{ position: 'relative', width: 'clamp(48px, 7vh, 72px)', height: 'clamp(48px, 7vh, 72px)' }}>
                {/* Background ring */}
                <svg viewBox="0 0 60 60" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#f97316" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 12)}`}
                    transform="rotate(-90 30 30)"
                    style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(18px, 3vh, 30px)', fontWeight: 900, color: '#334155',
                  fontFamily: "'JetBrains Mono', monospace",
                  animation: 'countTick 1s ease-in-out infinite'
                }}>
                  {countdown}
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* ============ SHOW + EJECT: Receipt visible (same animation) ============ */
          <div className="flex-1 flex gap-[1.5vw]">
            {/* Left: Success message */}
            <div className="kiosk-card flex flex-col items-center justify-center text-center" style={{ flex: '1', padding: 'clamp(16px, 3vh, 40px)' }}>
              <div className="done-icon" style={{
                width: 'clamp(64px, 10vh, 96px)', height: 'clamp(64px, 10vh, 96px)',
                marginBottom: 'clamp(12px, 2.5vh, 28px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, glowPulse 2s ease-in-out 0.8s infinite'
              }}>
                <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="kiosk-title text-slate-900 font-black tracking-tight" style={{ marginBottom: '0.8vh' }}>Betaling geslaagd!</h1>
              <p className="kiosk-body text-slate-400" style={{ marginBottom: '1.2vh' }}>Kwitantie: {kwNr}</p>

              {/* Amount display */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                borderRadius: '16px',
                padding: 'clamp(10px, 1.5vh, 20px) clamp(20px, 3vw, 40px)',
                border: '2px solid #86efac',
                marginBottom: '2vh',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.4,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s ease-in-out infinite'
                }} />
                <span className="relative text-green-600 font-bold" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'clamp(22px, 3.8vh, 40px)', zIndex: 1
                }}>
                  {formatSRD(payment.amount)}
                </span>
              </div>

              {phase === 'ejecting' && (
                <div className="flex items-center gap-2" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <p className="kiosk-body text-orange-500 font-bold">Bon wordt geprint...</p>
                </div>
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
