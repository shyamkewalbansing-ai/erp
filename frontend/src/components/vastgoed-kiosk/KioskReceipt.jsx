import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer, Home, Check, AlertCircle } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(15);
  const [stampData, setStampData] = useState(null);
  const [printStatus, setPrintStatus] = useState('waiting');
  const [printMethod, setPrintMethod] = useState(null);
  const [printPhase, setPrintPhase] = useState('idle'); // idle → feeding → printing → done
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) { axios.get(`${API}/public/${companyId}/company/stamp`).then(res => setStampData(res.data)).catch(() => {}); }
  }, [companyId]);

  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Start the print animation sequence
      setPrintPhase('feeding');
      setTimeout(() => setPrintPhase('printing'), 600);
      setTimeout(() => {
        setPrintPhase('done');
        triggerAutoPrint();
      }, 3200);
    }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    // Start countdown only after animation is done
    const startDelay = setTimeout(() => {
      timerRef.current = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; });
      }, 1000);
    }, 3500);
    return () => { clearTimeout(startDelay); clearInterval(timerRef.current); };
  }, [payment, onDone]);

  if (!payment) return null;
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';
  const getReceiptHTML = () => { const el = document.querySelector('.print-receipt-content'); return el ? el.innerHTML : null; };

  const printReceipt = () => {
    const el = document.querySelector('.print-receipt-content');
    if (!el) { alert('Kwitantie kon niet worden afgedrukt.'); return; }
    const html = el.innerHTML;
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none', visibility: 'hidden' });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kwitantie ${kwNr}</title><style>@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important}html,body{width:210mm;min-height:297mm;background:white!important;font-family:'Segoe UI','Inter',system-ui,sans-serif}</style></head><body>${html}</body></html>`);
    doc.close();
    iframe.onload = () => { setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch {} setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000); }, 500); };
  };

  const triggerAutoPrint = async () => {
    setPrintStatus('printing');
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) { const html = getReceiptHTML(); if (html) { const r = await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, receipt_number: kwNr }) }); if (r.ok) { setPrintMethod('server'); setPrintStatus('done'); return; } } }
    } catch {}
    setPrintMethod('browser'); setTimeout(() => { printReceipt(); setPrintStatus('done'); }, 200);
  };

  const handleManualPrint = async () => {
    setPrintStatus('printing'); clearInterval(timerRef.current);
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) { const html = getReceiptHTML(); if (html) { const r = await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, receipt_number: kwNr }) }); if (r.ok) { setPrintMethod('server'); setPrintStatus('done'); restartCountdown(8); return; } } }
    } catch {}
    setPrintMethod('browser'); printReceipt(); setPrintStatus('done'); restartCountdown(8);
  };

  const restartCountdown = (s) => { setCountdown(s); timerRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; }); }, 1000); };

  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      {/* Print animation keyframes */}
      <style>{`
        @keyframes receiptPrint {
          0% { transform: translateY(-105%); }
          5% { transform: translateY(-100%); }
          100% { transform: translateY(0%); }
        }
        @keyframes receiptFeedPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes printerNoise {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .receipt-printing {
          animation: receiptPrint 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .printer-feeding {
          animation: printerNoise 0.08s linear infinite;
        }
        .fade-slide-up {
          animation: fadeSlideUp 0.5s ease-out forwards;
        }
        .check-pop {
          animation: checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-center" style={{ height: '7vh' }}>
        <span className="kiosk-subtitle text-white">Betaling voltooid</span>
      </div>

      {/* Content - two panels */}
      <div className="flex-1 flex gap-[1vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>
        {/* Left - Success card */}
        <div className="kiosk-card flex flex-col items-center justify-center text-center min-w-0" style={{ flex: '1.2', padding: 'clamp(12px, 2vh, 32px) clamp(12px, 2vw, 40px)' }}>
          {/* Animated check icon */}
          <div className="check-pop rounded-full bg-green-50 flex items-center justify-center" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
            <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
          </div>
          <h1 className="fade-slide-up kiosk-title text-slate-900" style={{ marginBottom: '0.5vh', animationDelay: '0.2s', opacity: 0 }}>Betaling geslaagd!</h1>
          <p className="fade-slide-up kiosk-body text-slate-400" style={{ marginBottom: '3vh', animationDelay: '0.4s', opacity: 0 }}>Kwitantie: {kwNr}</p>

          <div className="fade-slide-up" style={{ marginBottom: '3vh', animationDelay: '0.6s', opacity: 0 }}>
            {printPhase !== 'done' && <p className="kiosk-body text-orange-500 flex items-center justify-center gap-2 animate-pulse"><Printer style={{ width: '2vh', height: '2vh' }} /> Printen...</p>}
            {printPhase === 'done' && printStatus === 'waiting' && <p className="kiosk-body text-slate-400 flex items-center justify-center gap-2"><Printer style={{ width: '2vh', height: '2vh' }} /> Voorbereiden...</p>}
            {printPhase === 'done' && printStatus === 'printing' && <p className="kiosk-body text-orange-500 flex items-center justify-center gap-2 animate-pulse"><Printer style={{ width: '2vh', height: '2vh' }} /> Afdrukken...</p>}
            {printPhase === 'done' && printStatus === 'done' && <p className="kiosk-body text-green-500 flex items-center justify-center gap-2"><Check style={{ width: '2vh', height: '2vh' }} /> Afgedrukt{printMethod === 'server' ? ' (Server)' : ''}</p>}
            {printPhase === 'done' && printStatus === 'error' && <p className="kiosk-body text-red-500 flex items-center justify-center gap-2"><AlertCircle style={{ width: '2vh', height: '2vh' }} /> Mislukt</p>}
          </div>

          <div className="fade-slide-up w-full" style={{ maxWidth: '20vw', animationDelay: '3.2s', opacity: 0 }}>
            <button onClick={handleManualPrint} data-testid="reprint-btn"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition kiosk-body font-bold"
              style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '1vh' }}>
              <Printer style={{ width: '2vh', height: '2vh' }} /> Opnieuw afdrukken
            </button>
            <button onClick={onDone} data-testid="receipt-done-btn"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 transition kiosk-body font-bold"
              style={{ padding: 'clamp(8px, 1.5vh, 20px)' }}>
              <Home style={{ width: '2vh', height: '2vh' }} /> Klaar
            </button>
          </div>

          <div className="fade-slide-up" style={{ marginTop: '3vh', animationDelay: '3.4s', opacity: 0 }}>
            <div className="text-slate-200 font-extrabold" style={{ fontSize: 'clamp(32px, 6vh, 72px)' }}>{countdown}</div>
            <p className="kiosk-small text-slate-400">Automatisch terug</p>
          </div>
        </div>

        {/* Right - Receipt with print animation */}
        <div className="kiosk-card flex flex-col min-w-0 relative" style={{ flex: '0.8', maxWidth: '380px', padding: 0, overflow: 'hidden' }}>
          {/* Printer slot - the dark bar at the top */}
          <div className="relative z-20 flex-shrink-0" style={{ height: 'clamp(14px, 2.2vh, 22px)', background: '#1e293b', borderRadius: '12px 12px 0 0' }}>
            {/* Paper slot opening */}
            <div style={{ position: 'absolute', left: '15%', right: '15%', bottom: 0, height: 'clamp(3px, 0.5vh, 6px)', background: '#0f172a', borderRadius: '2px 2px 0 0' }} />
            {/* Feeding indicator dots */}
            {(printPhase === 'feeding' || printPhase === 'printing') && (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-full bg-green-400" style={{ width: 'clamp(4px, 0.6vh, 8px)', height: 'clamp(4px, 0.6vh, 8px)', animation: `receiptFeedPulse 0.6s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            )}
            {printPhase === 'done' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-green-400" style={{ width: 'clamp(5px, 0.7vh, 9px)', height: 'clamp(5px, 0.7vh, 9px)' }} />
              </div>
            )}
          </div>

          {/* Receipt container with overflow hidden for the slide effect */}
          <div className={`flex-1 relative overflow-y-auto overflow-x-hidden ${printPhase === 'feeding' ? 'printer-feeding' : ''}`} style={{ background: '#f8fafc' }}>
            {/* The receipt paper that slides down */}
            <div
              className={printPhase === 'printing' || printPhase === 'done' ? 'receipt-printing' : ''}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                padding: 'clamp(4px, 0.5vh, 8px)',
                transform: printPhase === 'idle' || printPhase === 'feeding' ? 'translateY(-105%)' : undefined
              }}
              data-testid="receipt-paper"
            >
              <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
            </div>

            {/* Paper edge shadow at the top */}
            {(printPhase === 'printing' || printPhase === 'done') && (
              <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none" style={{ height: '20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), transparent)' }} />
            )}
          </div>

          {/* Subtle paper tear edge at the bottom */}
          <div className="flex-shrink-0" style={{ height: 'clamp(4px, 0.6vh, 8px)', background: 'linear-gradient(to bottom, #e2e8f0, transparent)' }} />
        </div>
      </div>

      {/* Hidden print elements */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
      <div className="print-receipt-area" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
