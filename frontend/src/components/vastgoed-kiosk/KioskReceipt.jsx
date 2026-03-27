import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Home } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

// Printer sound generator using Web Audio API
function playPrinterSound(durationMs = 3500) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Layer 1: Paper feed motor hum (low frequency)
    const motorOsc = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 85;
    motorGain.gain.value = 0.04;
    motorOsc.connect(motorGain).connect(ctx.destination);

    // Layer 2: Thermal head clicking (rapid noise bursts)
    const clickInterval = 60; // ms between clicks
    const totalClicks = Math.floor(durationMs / clickInterval);

    for (let i = 0; i < totalClicks; i++) {
      const startTime = ctx.currentTime + (i * clickInterval) / 1000;
      const bufferSize = 200;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const clickGain = ctx.createGain();
      const vol = 0.03 + Math.random() * 0.02;
      clickGain.gain.setValueAtTime(vol, startTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000 + Math.random() * 1500;
      filter.Q.value = 5;

      noise.connect(filter).connect(clickGain).connect(ctx.destination);
      noise.start(startTime);
      noise.stop(startTime + 0.04);
    }

    // Layer 3: Paper tear sound at end
    const tearTime = ctx.currentTime + durationMs / 1000 - 0.2;
    const tearBuffer = ctx.createBuffer(1, 4000, ctx.sampleRate);
    const tearData = tearBuffer.getChannelData(0);
    for (let j = 0; j < 4000; j++) {
      tearData[j] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-j / 800);
    }
    const tearNoise = ctx.createBufferSource();
    tearNoise.buffer = tearBuffer;
    const tearGain = ctx.createGain();
    tearGain.gain.setValueAtTime(0.08, tearTime);
    tearGain.gain.exponentialRampToValueAtTime(0.001, tearTime + 0.3);
    tearNoise.connect(tearGain).connect(ctx.destination);
    tearNoise.start(tearTime);

    // Start motor
    motorOsc.start();
    motorOsc.stop(ctx.currentTime + durationMs / 1000);

    // Cleanup
    setTimeout(() => ctx.close(), durationMs + 500);
  } catch {}
}

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const [phase, setPhase] = useState('show'); // show → ejecting → done
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => setStampData(res.data)).catch(() => {});
    }
  }, [companyId]);

  // Phase flow: show receipt → wait → eject with sound → done
  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Show receipt for 2.5 seconds, then start eject animation
      setTimeout(() => {
        setPhase('ejecting');
        playPrinterSound(3500);
        silentPrint();
      }, 2500);
      // After eject animation finishes
      setTimeout(() => {
        setPhase('done');
      }, 6500);
    }
  }, [payment]);

  // Countdown timer
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

  const silentPrint = useCallback(async () => {
    if (!payment) return;
    const printData = {
      company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
      address: stampData?.stamp_address || '',
      phone: stampData?.stamp_phone || '',
      receipt_number: kwNr,
      date: new Date(payment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: new Date(payment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      tenant_name: payment.tenant_name || tenant?.name || '',
      apartment: `${payment.apartment_number || tenant?.apartment_number || ''} / ${payment.tenant_code || tenant?.tenant_code || ''}`,
      payment_type: { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[payment.payment_type] || payment.payment_type,
      amount: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      total: Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank' }[payment.payment_method] || payment.payment_method || 'Contant',
      remaining_total: Number((payment.remaining_rent || 0) + (payment.remaining_service || 0) + (payment.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        await fetch(`${PRINT_SERVER_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(printData)
        });
      }
    } catch {}
  }, [payment, tenant, stampData, kwNr]);

  if (!payment) return null;

  return (
    <div className="h-full bg-orange-500 flex flex-col overflow-hidden" style={{ padding: '1.5vh 1.5vw 0' }}>
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
          /* ============ DONE: Full success screen ============ */
          <div className="flex-1 kiosk-card flex flex-col items-center justify-center text-center" style={{ padding: 'clamp(16px, 3vh, 40px)' }}>
            <div style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', width: '12vh', height: '12vh', marginBottom: '3vh' }}
              className="rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle style={{ width: '6vh', height: '6vh' }} className="text-green-500" />
            </div>
            <h1 style={{ animation: 'fadeUp 0.5s ease-out 0.2s forwards', opacity: 0, marginBottom: '1vh' }}
              className="kiosk-title text-slate-900">Betaling geslaagd!</h1>
            <p style={{ animation: 'fadeUp 0.5s ease-out 0.35s forwards', opacity: 0, marginBottom: '1vh' }}
              className="kiosk-body text-slate-400">Kwitantie: {kwNr}</p>
            <p style={{ animation: 'fadeUp 0.5s ease-out 0.5s forwards', opacity: 0, marginBottom: '4vh' }}
              className="kiosk-body text-green-500 font-bold">Uw bon is geprint</p>

            <div style={{ animation: 'fadeUp 0.5s ease-out 0.7s forwards', opacity: 0, width: '100%', maxWidth: '20vw' }}>
              <button onClick={onDone} data-testid="receipt-done-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center gap-2 transition kiosk-body font-bold active:scale-95"
                style={{ padding: 'clamp(12px, 2.5vh, 28px)' }}>
                <Home style={{ width: '2.5vh', height: '2.5vh' }} /> Klaar
              </button>
            </div>

            <div style={{ animation: 'fadeUp 0.5s ease-out 0.9s forwards', opacity: 0, marginTop: '4vh' }}>
              <div className="text-slate-200 font-black" style={{ fontSize: 'clamp(44px, 9vh, 100px)', lineHeight: 1 }}>{countdown}</div>
              <p className="kiosk-small text-slate-400 mt-1">sec</p>
            </div>
          </div>

        ) : (
          /* ============ SHOW + EJECT: Receipt visible ============ */
          <div className="flex-1 flex gap-[1.5vw]">
            {/* Left: Mini success */}
            <div className="kiosk-card flex flex-col items-center justify-center text-center" style={{ flex: '1', padding: 'clamp(16px, 3vh, 40px)' }}>
              <div style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', width: '10vh', height: '10vh', marginBottom: '2.5vh' }}
                className="rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-green-500" />
              </div>
              <h1 className="kiosk-title text-slate-900" style={{ marginBottom: '0.8vh' }}>Betaling geslaagd!</h1>
              <p className="kiosk-body text-slate-400" style={{ marginBottom: '2vh' }}>Kwitantie: {kwNr}</p>
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

      {/* Hidden print content for USB printer */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
