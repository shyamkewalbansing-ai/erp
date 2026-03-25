import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer, Home, Check, AlertCircle } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const [printStatus, setPrintStatus] = useState('waiting');
  const [printMethod, setPrintMethod] = useState(null);
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) { axios.get(`${API}/public/${companyId}/company/stamp`).then(res => setStampData(res.data)).catch(() => {}); }
  }, [companyId]);

  useEffect(() => {
    if (payment && !hasPrintedRef.current) { hasPrintedRef.current = true; setTimeout(() => triggerAutoPrint(), 800); }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    timerRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; }); }, 1000);
    return () => clearInterval(timerRef.current);
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
      if (hc?.ok) { const html = getReceiptHTML(); if (html) { const r = await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, receipt_number: kwNr }) }); if (r.ok) { setPrintMethod('server'); setPrintStatus('done'); setCountdown(10); return; } } }
    } catch {}
    setPrintMethod('browser'); setTimeout(() => { printReceipt(); setPrintStatus('done'); setCountdown(10); }, 200);
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
      {/* Header */}
      <div className="flex items-center justify-center" style={{ height: '7vh' }}>
        <span className="kiosk-subtitle text-white">Betaling voltooid</span>
      </div>

      {/* Content - two panels */}
      <div className="flex-1 flex gap-[1vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>
        {/* Left - Success card */}
        <div className="kiosk-card flex-1 flex flex-col items-center justify-center text-center min-w-0" style={{ padding: 'clamp(12px, 2vh, 32px) clamp(12px, 2vw, 40px)' }}>
          <div className="rounded-full bg-green-50 flex items-center justify-center" style={{ width: '8vh', height: '8vh', marginBottom: '2vh' }}>
            <CheckCircle style={{ width: '4vh', height: '4vh' }} className="text-green-500" />
          </div>
          <h1 className="kiosk-title text-slate-900" style={{ marginBottom: '0.5vh' }}>Betaling geslaagd!</h1>
          <p className="kiosk-body text-slate-400" style={{ marginBottom: '3vh' }}>Kwitantie: {kwNr}</p>

          <div style={{ marginBottom: '3vh' }}>
            {printStatus === 'waiting' && <p className="kiosk-body text-slate-400 flex items-center justify-center gap-2"><Printer style={{ width: '2vh', height: '2vh' }} /> Voorbereiden...</p>}
            {printStatus === 'printing' && <p className="kiosk-body text-orange-500 flex items-center justify-center gap-2 animate-pulse"><Printer style={{ width: '2vh', height: '2vh' }} /> Afdrukken...</p>}
            {printStatus === 'done' && <p className="kiosk-body text-green-500 flex items-center justify-center gap-2"><Check style={{ width: '2vh', height: '2vh' }} /> Afgedrukt{printMethod === 'server' ? ' (Server)' : ''}</p>}
            {printStatus === 'error' && <p className="kiosk-body text-red-500 flex items-center justify-center gap-2"><AlertCircle style={{ width: '2vh', height: '2vh' }} /> Mislukt</p>}
          </div>

          <div className="w-full" style={{ maxWidth: '20vw' }}>
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

          <div style={{ marginTop: '3vh' }}>
            <div className="text-slate-200 font-extrabold" style={{ fontSize: 'clamp(32px, 6vh, 72px)' }}>{countdown}</div>
            <p className="kiosk-small text-slate-400">Automatisch terug</p>
          </div>
        </div>

        {/* Right - Receipt preview */}
        <div className="kiosk-card flex-1 flex items-center justify-center min-w-0 overflow-auto" style={{ padding: 'clamp(8px, 1vh, 16px)' }}>
          <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
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
