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
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => setStampData(res.data)).catch(() => {});
    }
  }, [companyId]);

  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      setTimeout(() => triggerAutoPrint(), 800);
    }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; });
    }, 1000);
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
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kwitantie ${kwNr}</title>
<style>@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important}
html,body{width:210mm;min-height:297mm;background:white!important;font-family:'Segoe UI','Inter',system-ui,sans-serif}</style></head><body>${html}</body></html>`);
    doc.close();
    iframe.onload = () => { setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch {} setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000); }, 500); };
    iframe.contentWindow.focus();
    setTimeout(() => { try { iframe.contentWindow.print(); } catch {} setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000); }, 800);
  };

  const triggerAutoPrint = async () => {
    setPrintStatus('printing');
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const html = getReceiptHTML();
        if (html) {
          const r = await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, receipt_number: kwNr }) });
          if (r.ok) { setPrintMethod('server'); setPrintStatus('done'); setCountdown(10); return; }
        }
      }
    } catch {}
    setPrintMethod('browser');
    setTimeout(() => { printReceipt(); setPrintStatus('done'); setCountdown(10); }, 200);
  };

  const handleManualPrint = async () => {
    setPrintStatus('printing'); clearInterval(timerRef.current);
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const html = getReceiptHTML();
        if (html) {
          const r = await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, receipt_number: kwNr }) });
          if (r.ok) { setPrintMethod('server'); setPrintStatus('done'); restartCountdown(8); return; }
        }
      }
    } catch {}
    setPrintMethod('browser'); printReceipt(); setPrintStatus('done'); restartCountdown(8);
  };

  const restartCountdown = (s) => {
    setCountdown(s);
    timerRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; } return prev - 1; }); }, 1000);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-green-500 to-green-600 flex flex-col lg:flex-row relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-green-400/20 rounded-full pointer-events-none" />

      {/* Left - Success card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative z-10 print:hidden">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Betaling geslaagd!</h1>
          <p className="text-sm text-slate-400 mb-6">Kwitantie: {kwNr}</p>

          {/* Print status */}
          <div className="mb-6 text-xs">
            {printStatus === 'waiting' && <p className="text-slate-400 flex items-center justify-center gap-1"><Printer className="w-3 h-3" /> Voorbereiden...</p>}
            {printStatus === 'printing' && <p className="text-orange-500 flex items-center justify-center gap-1 animate-pulse"><Printer className="w-3 h-3" /> Afdrukken...</p>}
            {printStatus === 'done' && <p className="text-green-500 flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Afgedrukt{printMethod === 'server' ? ' (Server)' : ''}</p>}
            {printStatus === 'error' && <p className="text-red-500 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Mislukt</p>}
          </div>

          <div className="space-y-2.5">
            <button onClick={handleManualPrint}
              className="w-full py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
              <Printer className="w-4 h-4" /> Opnieuw afdrukken
            </button>
            <button onClick={onDone}
              className="w-full py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25 transition">
              <Home className="w-4 h-4" /> Klaar
            </button>
          </div>

          <div className="mt-6">
            <div className="text-4xl font-bold text-slate-200">{countdown}</div>
            <p className="text-[10px] text-slate-400 mt-1">Automatisch terug</p>
          </div>
        </div>
      </div>

      {/* Right - Receipt Preview */}
      <div className="w-full lg:w-1/2 bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-auto p-4 print:hidden">
        <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
      </div>

      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
      <div className="print-receipt-area" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
