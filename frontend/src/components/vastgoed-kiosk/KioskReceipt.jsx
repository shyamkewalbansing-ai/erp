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
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => {
        setStampData(res.data);
      }).catch(() => {});
    }
  }, [companyId]);

  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      setTimeout(() => {
        triggerAutoPrint();
      }, 800);
    }
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [payment, onDone]);

  if (!payment) return null;

  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  const getReceiptHTML = () => {
    const printContent = document.querySelector('.print-receipt-content');
    if (printContent) return printContent.innerHTML;
    return null;
  };

  const printReceipt = () => {
    const printContent = document.querySelector('.print-receipt-content');
    if (!printContent) {
      alert('Kwitantie kon niet worden afgedrukt. Probeer opnieuw.');
      return;
    }
    const receiptHTML = printContent.innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
    const printDoc = iframe.contentDocument || iframe.contentWindow.document;
    printDoc.open();
    printDoc.write(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Kwitantie ${kwNr}</title>
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
html, body { width: 210mm; min-height: 297mm; background: white !important; font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif; }
</style></head><body>${receiptHTML}</body></html>`);
    printDoc.close();
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { console.error('Print error:', e); }
        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000);
      }, 500);
    };
    iframe.contentWindow.focus();
    setTimeout(() => {
      try { iframe.contentWindow.print(); } catch (e) { console.error('Print error:', e); }
      setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 2000);
    }, 800);
  };

  const triggerAutoPrint = async () => {
    setPrintStatus('printing');
    try {
      const healthCheck = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (healthCheck && healthCheck.ok) {
        const html = getReceiptHTML();
        if (html) {
          const response = await fetch(`${PRINT_SERVER_URL}/print`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html, receipt_number: kwNr })
          });
          if (response.ok) { setPrintMethod('server'); setPrintStatus('done'); setCountdown(10); return; }
        }
      }
    } catch { /* fallback */ }
    setPrintMethod('browser');
    setTimeout(() => { printReceipt(); setPrintStatus('done'); setCountdown(10); }, 200);
  };

  const handleManualPrint = async () => {
    setPrintStatus('printing');
    clearInterval(timerRef.current);
    try {
      const healthCheck = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (healthCheck && healthCheck.ok) {
        const html = getReceiptHTML();
        if (html) {
          const response = await fetch(`${PRINT_SERVER_URL}/print`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html, receipt_number: kwNr })
          });
          if (response.ok) { setPrintMethod('server'); setPrintStatus('done'); restartCountdown(8); return; }
        }
      }
    } catch { /* fallback */ }
    setPrintMethod('browser');
    printReceipt();
    setPrintStatus('done');
    restartCountdown(8);
  };

  const restartCountdown = (seconds) => {
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-full bg-white flex flex-col lg:flex-row">
      {/* Left - Success */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 print:hidden">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 text-center">Betaling geslaagd!</h1>
        <p className="text-base text-slate-400 mb-1">Kwitantie: {kwNr}</p>
        
        {/* Print Status */}
        <div className="mb-8 text-sm">
          {printStatus === 'waiting' && (
            <p className="text-slate-400 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Voorbereiden...</p>
          )}
          {printStatus === 'printing' && (
            <p className="text-orange-500 flex items-center gap-1.5 animate-pulse"><Printer className="w-4 h-4" /> Afdrukken...</p>
          )}
          {printStatus === 'done' && (
            <p className="text-green-500 flex items-center gap-1.5"><Check className="w-4 h-4" /> Afgedrukt{printMethod === 'server' ? ' (Print Server)' : ''}</p>
          )}
          {printStatus === 'error' && (
            <p className="text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Printen mislukt</p>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleManualPrint}
            className="w-full py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Opnieuw afdrukken</span>
          </button>
          <button
            onClick={onDone}
            className="w-full py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition"
          >
            <Home className="w-4 h-4" />
            <span>Klaar</span>
          </button>
        </div>

        {/* Countdown */}
        <div className="mt-8 text-center">
          <div className="text-5xl font-bold text-slate-200">{countdown}</div>
          <p className="text-xs text-slate-400 mt-1">Automatisch terug naar welkomscherm</p>
        </div>
      </div>

      {/* Right - Receipt Preview */}
      <div className="w-full lg:w-1/2 bg-slate-50 flex items-center justify-center overflow-auto p-4 print:hidden border-l border-slate-100">
        <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
      </div>

      {/* Hidden print content */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
      <div className="print-receipt-area" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
