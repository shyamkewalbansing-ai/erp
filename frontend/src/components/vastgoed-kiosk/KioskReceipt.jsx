import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home, Clock, Lock, Delete } from 'lucide-react';
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

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(5);
  const [stampData, setStampData] = useState(null);
  const [phase, setPhase] = useState('show');
  const [currentPayment, setCurrentPayment] = useState(payment);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => { setCurrentPayment(payment); }, [payment]);

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
        if (showPinModal) return; // pause countdown while PIN modal is open
        setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return p - 1; });
      }, 1000);
    }, 6800);
    return () => { clearTimeout(startDelay); clearInterval(timerRef.current); };
  }, [payment, onDone, showPinModal]);

  const kwNr = currentPayment?.kwitantie_nummer || currentPayment?.receipt_number || '';

  const [reprintToast, setReprintToast] = useState(false);

  const handleApprovePin = async (pinCode) => {
    setApproving(true); setApproveError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments/${currentPayment.payment_id}/approve-with-pin`, { pin: pinCode });
      const updated = {
        ...currentPayment,
        status: 'approved',
        approved_by: res.data.approved_by,
        remaining_rent: res.data.remaining_rent,
        remaining_service: res.data.remaining_service,
        remaining_fines: res.data.remaining_fines,
        remaining_internet: res.data.remaining_internet,
      };
      setCurrentPayment(updated);
      setShowPinModal(false);
      setPinDigits(['', '', '', '']);
      setCountdown(20); // extend countdown so user can read the new state
      // Reprint definitieve bon + paper feed sound
      setReprintToast(true);
      playPaperFeedSound(3500);
      silentPrint(updated);
      setTimeout(() => setReprintToast(false), 4500);
    } catch (err) {
      setApproveError(err.response?.data?.detail || 'Goedkeuring mislukt');
      setPinDigits(['', '', '', '']);
    } finally {
      setApproving(false);
    }
  };

  const handlePinKey = (key) => {
    if (approving) return;
    if (key === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (pinDigits[i]) { const np = [...pinDigits]; np[i] = ''; setPinDigits(np); return; }
      }
      return;
    }
    setApproveError('');
    const idx = pinDigits.findIndex(d => d === '');
    if (idx === -1) return;
    const np = [...pinDigits]; np[idx] = key; setPinDigits(np);
    if (idx === 3 && np.every(d => d !== '')) handleApprovePin(np.join(''));
  };

  const silentPrint = useCallback(async (p) => {
    const pmt = p || payment;
    if (!pmt) return;
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const rem = (pmt.remaining_rent || 0) + (pmt.remaining_service || 0) + (pmt.remaining_fines || 0);
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
            address: stampData?.stamp_address || '', phone: stampData?.stamp_phone || '',
            receipt_number: pmt.kwitantie_nummer || pmt.receipt_number || '',
            date: new Date(pmt.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: new Date(pmt.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
            tenant_name: pmt.tenant_name || tenant?.name || '',
            apartment: `${pmt.apartment_number || tenant?.apartment_number || ''} / ${pmt.tenant_code || tenant?.tenant_code || ''}`,
            payment_type: TYPE_LABELS[pmt.payment_type] || pmt.payment_type,
            amount: Number(pmt.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total: Number(pmt.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            payment_method: METHOD_LABELS[pmt.payment_method] || pmt.payment_method || 'Contant',
            remaining_total: Number(rem).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            status: pmt.status || 'pending',
            approved_by: pmt.approved_by || '',
            reprint: Boolean(p),
          })
        });
      }
    } catch {}
  }, [payment, tenant, stampData]);

  if (!currentPayment) return null;

  const remainingRent = currentPayment.remaining_rent ?? 0;
  const remainingService = currentPayment.remaining_service ?? 0;
  const remainingFines = currentPayment.remaining_fines ?? 0;
  const totalRemaining = remainingRent + remainingService + remainingFines;
  const isPending = currentPayment.status === 'pending';
  const allPaid = !isPending && totalRemaining <= 0;

  return (
    <div className="h-full bg-orange-500 flex flex-col overflow-hidden" style={{ padding: '1.5vh 1.5vw 0' }}
      data-testid="kiosk-receipt-screen">
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
        <>
          <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
            <span className="kiosk-subtitle text-white font-bold">{isPending ? 'Betaling ingediend' : 'Betaling voltooid'}</span>
          </div>

          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden" style={{ paddingBottom: '1.5vh' }}>
            <div className="flex flex-col items-center text-center flex-shrink-0" style={{ marginBottom: 'clamp(10px, 1.5vh, 20px)' }}>
              <div style={{
                animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
                width: 'clamp(48px, 7vh, 72px)', height: 'clamp(48px, 7vh, 72px)',
                borderRadius: '50%', marginBottom: 'clamp(6px, 1vh, 12px)',
                background: isPending ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isPending ? (
                  <Clock style={{ width: '3.5vh', height: '3.5vh' }} className="text-white" strokeWidth={2.5} />
                ) : (
                  <CheckCircle style={{ width: '3.5vh', height: '3.5vh' }} className="text-white" strokeWidth={2.5} />
                )}
              </div>
              <h1 className="text-white font-black" style={{ fontSize: 'clamp(18px, 2.8vh, 30px)', marginBottom: '0.3vh' }}>
                {isPending ? 'Betaling ontvangen' : 'Betaling geslaagd!'}
              </h1>
              <p className="text-white/70 font-medium" style={{ fontSize: 'clamp(13px, 1.6vh, 18px)' }}>
                {formatSRD(currentPayment.amount)} - {kwNr}
              </p>
              {isPending && (
                <p className="text-white/80 font-semibold" style={{ fontSize: 'clamp(12px, 1.4vh, 16px)', marginTop: '0.4vh' }}>
                  Wacht op goedkeuring beheerder
                </p>
              )}
              {phase === 'ejecting' && (
                <div className="flex items-center gap-2" style={{ marginTop: '0.8vh' }}>
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <p className="text-white/80 font-bold" style={{ fontSize: 'clamp(12px, 1.4vh, 16px)' }}>Bon wordt geprint...</p>
                </div>
              )}
            </div>

            <div className="flex-1 flex justify-center overflow-hidden" style={{ width: '100%' }}>
              <div className={phase === 'show' ? 'receipt-appear' : 'receipt-eject'}
                data-testid="receipt-paper"
                style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="bg-white rounded-t-lg shadow-2xl" style={{ overflow: 'hidden' }}>
                  <ReceiptTicket payment={currentPayment} tenant={tenant} preview={true} stampData={stampData} />
                </div>
              </div>
            </div>
          </div>
        </>

      ) : (
        <>
          <div className="flex items-center justify-center flex-shrink-0" style={{ height: '6vh' }}>
            <span className="kiosk-subtitle text-white font-bold">{isPending ? 'Betaling ingediend' : 'Betaling voltooid'}</span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
            <div className="kiosk-card flex flex-col items-center text-center" style={{
              width: 'clamp(400px, 50vw, 700px)',
              padding: 'clamp(20px, 3vh, 40px) clamp(24px, 3vw, 48px)',
              animation: 'fadeUp 0.5s ease-out forwards'
            }}>
              <div className="rounded-full flex items-center justify-center" style={{
                width: 'clamp(56px, 8vh, 84px)', height: 'clamp(56px, 8vh, 84px)',
                background: isPending ? '#fef3c7' : '#ecfdf5',
                border: isPending ? '3px solid #fde68a' : '3px solid #bbf7d0',
                marginBottom: 'clamp(8px, 1.5vh, 16px)',
                animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards', opacity: 0
              }}>
                {isPending ? (
                  <Clock style={{ width: '4vh', height: '4vh' }} className="text-amber-500" />
                ) : (
                  <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-emerald-500" />
                )}
              </div>

              <h2 className={`font-black tracking-tight ${isPending ? 'text-amber-600' : 'text-emerald-500'}`} style={{
                fontSize: 'clamp(22px, 3.5vh, 38px)', marginBottom: '0.3vh',
                animation: 'fadeUp 0.4s ease-out 0.35s forwards', opacity: 0
              }}>{isPending ? 'Wacht op goedkeuring' : (allPaid ? 'Alles betaald!' : 'Betaling geslaagd!')}</h2>

              <p className="text-slate-400 font-medium" style={{
                fontSize: 'clamp(12px, 1.5vh, 16px)', marginBottom: 'clamp(12px, 2vh, 24px)',
                animation: 'fadeUp 0.4s ease-out 0.45s forwards', opacity: 0
              }}>{isPending ? 'Uw betaling wordt verwerkt door de beheerder' : `${currentPayment.tenant_name || tenant?.name || ''} - Appt. ${currentPayment.apartment_number || ''}`}</p>

              <div style={{
                width: '100%', marginBottom: 'clamp(12px, 2vh, 24px)',
                animation: 'fadeUp 0.4s ease-out 0.55s forwards', opacity: 0
              }}>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f1f5f9' }}>
                  {(isPending ? [
                    { label: 'Bedrag (in afwachting)', value: formatSRD(currentPayment.amount), bold: true, pending: true },
                    { label: 'Kwitantie', value: kwNr },
                    { label: 'Betaalwijze', value: METHOD_LABELS[currentPayment.payment_method] || 'Contant' },
                    { label: 'Status', value: 'In afwachting van goedkeuring', pending: true },
                  ] : [
                    { label: 'Betaald bedrag', value: formatSRD(currentPayment.amount), bold: true },
                    { label: 'Kwitantie', value: kwNr },
                    { label: 'Betaalwijze', value: METHOD_LABELS[currentPayment.payment_method] || 'Contant' },
                    { label: 'Openstaande huur', value: formatSRD(remainingRent), green: remainingRent <= 0 },
                    { label: 'Servicekosten', value: formatSRD(remainingService), green: remainingService <= 0 },
                    { label: 'Boetes', value: formatSRD(remainingFines), green: remainingFines <= 0 },
                  ]).map((row, i) => (
                    <div key={i} className="flex items-center justify-between" style={{
                      padding: 'clamp(8px, 1.2vh, 14px) clamp(14px, 1.8vw, 24px)',
                      background: i % 2 === 0 ? '#f8fafc' : 'white'
                    }}>
                      <span className="text-slate-500" style={{ fontSize: 'clamp(12px, 1.5vh, 16px)' }}>{row.label}</span>
                      <span className={`font-bold ${row.pending ? 'text-amber-600' : row.green ? 'text-emerald-500' : row.bold ? 'text-slate-900' : 'text-slate-700'}`}
                        style={{ fontSize: 'clamp(13px, 1.6vh, 17px)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {!isPending && (
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
                )}
              </div>

              {isPending && (
                <button onClick={() => setShowPinModal(true)} data-testid="approve-with-pin-btn"
                  className="rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                  style={{
                    width: 'clamp(200px, 20vw, 320px)', padding: 'clamp(12px, 2vh, 24px)',
                    fontSize: 'clamp(15px, 2vh, 20px)',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 8px 30px -8px rgba(217,119,6,0.5)',
                    animation: 'fadeUp 0.4s ease-out 0.6s forwards', opacity: 0,
                    marginBottom: 'clamp(8px, 1vh, 12px)'
                  }}>
                  <Lock style={{ width: '2vh', height: '2vh' }} /> Goedkeuren met Beheerder PIN
                </button>
              )}

              <button onClick={onDone} data-testid="receipt-done-btn"
                className="rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                style={{
                  width: 'clamp(200px, 20vw, 320px)', padding: 'clamp(12px, 2vh, 24px)',
                  fontSize: 'clamp(15px, 2vh, 20px)', background: '#f97316',
                  boxShadow: '0 8px 30px -8px rgba(249,115,22,0.4)',
                  animation: 'fadeUp 0.4s ease-out 0.65s forwards', opacity: 0
                }}>
                <Home style={{ width: '2vh', height: '2vh' }} /> Klaar
              </button>

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

      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={currentPayment} tenant={tenant} preview={false} stampData={stampData} />
      </div>

      {reprintToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white rounded-xl shadow-2xl flex items-center gap-2.5 px-5 py-3"
          data-testid="reprint-toast"
          style={{ animation: 'fadeUp 0.3s ease-out forwards' }}>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-bold text-sm">✓ Definitieve bon wordt geprint...</span>
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '4vh 4vw' }}
          data-testid="approve-pin-modal"
          onClick={() => { if (!approving) { setShowPinModal(false); setApproveError(''); setPinDigits(['','','','']); } }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" style={{ padding: 'clamp(20px, 3vh, 32px)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-amber-100 flex items-center justify-center" style={{ width: '2.8rem', height: '2.8rem' }}>
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900" style={{ fontSize: 'clamp(15px, 2vh, 18px)' }}>Beheerder PIN</h3>
                <p className="text-xs text-slate-400">Goedkeuren van {formatSRD(currentPayment.amount)}</p>
              </div>
            </div>

            <div className="flex justify-center gap-2.5 mb-3">
              {pinDigits.map((d, i) => (
                <div key={i} data-testid={`approve-pin-dot-${i}`}
                  className={`text-center font-bold rounded-xl border-2 transition-all flex items-center justify-center ${
                    approveError ? 'border-red-400 bg-red-50' : d ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  style={{ width: '3rem', height: '3.5rem', fontSize: '1.3rem' }}>
                  {d ? '●' : ''}
                </div>
              ))}
            </div>

            {approveError && <p className="text-sm text-red-500 text-center font-semibold mb-2" data-testid="approve-pin-error">{approveError}</p>}
            {approving && <p className="text-xs text-slate-400 text-center animate-pulse mb-2">Goedkeuren...</p>}

            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map(k => (
                k === '_e' ? <div key={k} /> : (
                  <button key={k} onClick={() => handlePinKey(k)} disabled={approving}
                    data-testid={`approve-pin-key-${k}`}
                    className={`font-bold rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center h-12 text-lg ${
                      k === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50'
                      : 'bg-slate-50 text-slate-900 hover:bg-amber-50 hover:text-amber-600 border border-slate-100'
                    }`}>
                    {k === 'DEL' ? <Delete className="w-5 h-5" /> : k}
                  </button>
                )
              ))}
            </div>

            <button onClick={() => { setShowPinModal(false); setApproveError(''); setPinDigits(['','','','']); }}
              disabled={approving} data-testid="approve-pin-cancel"
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition disabled:opacity-50">
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
