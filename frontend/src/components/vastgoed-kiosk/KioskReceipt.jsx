import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Home } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(15);
  const [stampData, setStampData] = useState(null);
  const [printPhase, setPrintPhase] = useState('idle'); // idle → feeding → printing → done
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) { axios.get(`${API}/public/${companyId}/company/stamp`).then(res => setStampData(res.data)).catch(() => {}); }
  }, [companyId]);

  // Start animation + silent auto-print
  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Animation sequence: feeding → printing → done
      setPrintPhase('feeding');
      setTimeout(() => setPrintPhase('printing'), 800);
      setTimeout(() => {
        setPrintPhase('done');
        silentPrint(); // Auto-print to USB receipt printer
      }, 4000);
    }
  }, [payment]);

  // Countdown timer - starts after animation
  useEffect(() => {
    if (!payment) return;
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; });
      }, 1000);
    }, 4500);
    return () => { clearTimeout(startDelay); clearInterval(timerRef.current); };
  }, [payment, onDone]);

  if (!payment) return null;
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  // Silent print - tries local print server (USB printer) first, falls back to browser print
  const silentPrint = async () => {
    const getHTML = () => { const el = document.querySelector('.print-receipt-content'); return el ? el.innerHTML : null; };
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const html = getHTML();
        if (html) {
          await fetch(`${PRINT_SERVER_URL}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html, receipt_number: kwNr })
          });
          return;
        }
      }
    } catch {}
    // Fallback: silent iframe print
    try {
      const html = getHTML();
      if (!html) return;
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none', visibility: 'hidden' });
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kwitantie ${kwNr}</title><style>@page{size:80mm auto;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{width:80mm;background:white;font-family:'Courier New',monospace}</style></head><body>${html}</body></html>`);
      doc.close();
      iframe.onload = () => { setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch {} setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000); }, 500); };
    } catch {}
  };

  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      <style>{`
        @keyframes receiptSlideDown {
          0% { transform: translateY(-102%); }
          3% { transform: translateY(-100%); }
          100% { transform: translateY(0%); }
        }
        @keyframes feedPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes printerVibrate {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-0.5px); }
          75% { transform: translateX(0.5px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .receipt-slide {
          animation: receiptSlideDown 3s cubic-bezier(0.15, 0.6, 0.35, 1) forwards;
        }
        .printer-vibrate {
          animation: printerVibrate 0.06s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-center" style={{ height: '6vh' }}>
        <span className="kiosk-subtitle text-white">Betaling voltooid</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-[1.5vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>

        {/* Left - Success + Done */}
        <div className="kiosk-card flex flex-col items-center justify-center text-center" style={{ flex: '1', padding: 'clamp(16px, 3vh, 40px) clamp(12px, 2vw, 40px)' }}>
          {/* Check icon */}
          <div style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', width: '10vh', height: '10vh', marginBottom: '2.5vh' }}
            className="rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle style={{ width: '5vh', height: '5vh' }} className="text-green-500" />
          </div>

          <h1 style={{ animation: 'fadeUp 0.5s ease-out 0.2s forwards', opacity: 0, marginBottom: '0.8vh' }}
            className="kiosk-title text-slate-900">Betaling geslaagd!</h1>
          <p style={{ animation: 'fadeUp 0.5s ease-out 0.4s forwards', opacity: 0, marginBottom: '4vh' }}
            className="kiosk-body text-slate-400">Kwitantie: {kwNr}</p>

          {/* Klaar button */}
          <div style={{ animation: 'fadeUp 0.5s ease-out 4s forwards', opacity: 0, width: '100%', maxWidth: '18vw' }}>
            <button onClick={onDone} data-testid="receipt-done-btn"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center gap-2 transition kiosk-body font-bold active:scale-95"
              style={{ padding: 'clamp(10px, 2vh, 24px)' }}>
              <Home style={{ width: '2.5vh', height: '2.5vh' }} /> Klaar
            </button>
          </div>

          {/* Countdown */}
          <div style={{ animation: 'fadeUp 0.5s ease-out 4.2s forwards', opacity: 0, marginTop: '4vh' }}>
            <div className="text-slate-200 font-black" style={{ fontSize: 'clamp(40px, 8vh, 90px)', lineHeight: 1 }}>{countdown}</div>
            <p className="kiosk-small text-slate-400 mt-1">sec</p>
          </div>
        </div>

        {/* Right - Receipt Printer */}
        <div className="flex flex-col" style={{ flex: '0.7', maxWidth: '360px' }}>
          {/* Printer body top */}
          <div className="rounded-t-2xl flex-shrink-0 relative" style={{ height: 'clamp(28px, 4vh, 44px)', background: '#1e293b' }}>
            {/* Printer brand label */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <span style={{ fontSize: 'clamp(8px, 1.2vh, 12px)', color: '#475569', fontFamily: 'monospace', letterSpacing: '2px' }}>KIOSK</span>
            </div>
            {/* Status LED */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {printPhase === 'done' ? (
                <div className="rounded-full bg-green-400" style={{ width: 'clamp(6px, 0.8vh, 10px)', height: 'clamp(6px, 0.8vh, 10px)' }} />
              ) : (
                <>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-full" style={{
                      width: 'clamp(5px, 0.7vh, 8px)', height: 'clamp(5px, 0.7vh, 8px)',
                      background: printPhase === 'feeding' || printPhase === 'printing' ? '#4ade80' : '#334155',
                      animation: printPhase !== 'idle' ? `feedPulse 0.5s ease-in-out ${i * 0.12}s infinite` : 'none'
                    }} />
                  ))}
                </>
              )}
            </div>
            {/* Paper slot */}
            <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 0, height: 'clamp(4px, 0.6vh, 7px)', background: '#0f172a', borderRadius: '3px 3px 0 0' }} />
          </div>

          {/* Receipt paper area */}
          <div
            className={`flex-1 relative bg-[#f1f5f9] overflow-hidden ${printPhase === 'feeding' ? 'printer-vibrate' : ''}`}
            style={{ borderLeft: '2px solid #1e293b', borderRight: '2px solid #1e293b' }}
          >
            {/* The receipt that slides out */}
            <div
              className={printPhase === 'printing' ? 'receipt-slide' : ''}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                padding: 'clamp(4px, 0.5vh, 8px) clamp(2px, 0.3vw, 6px)',
                transform: printPhase === 'done' ? 'translateY(0%)' : (printPhase === 'idle' || printPhase === 'feeding') ? 'translateY(-102%)' : undefined
              }}
              data-testid="receipt-paper"
            >
              <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
            </div>

            {/* Top shadow (paper edge coming out of slot) */}
            {(printPhase === 'printing' || printPhase === 'done') && (
              <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none" style={{ height: '12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)' }} />
            )}
          </div>

          {/* Printer body bottom */}
          <div className="rounded-b-2xl flex-shrink-0" style={{ height: 'clamp(10px, 1.5vh, 16px)', background: '#1e293b' }} />
        </div>
      </div>

      {/* Hidden receipt for USB printer */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
