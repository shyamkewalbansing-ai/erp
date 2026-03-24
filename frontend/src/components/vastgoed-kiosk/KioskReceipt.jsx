import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer, Home, Check, AlertCircle } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRINT_SERVER_URL = 'http://localhost:5555';

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(12);
  const [stampData, setStampData] = useState(null);
  const [printStatus, setPrintStatus] = useState('waiting'); // waiting, printing, done, error
  const [printMethod, setPrintMethod] = useState(null); // 'server' or 'browser'
  const timerRef = useRef(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => {
        setStampData(res.data);
      }).catch(() => {});
    }
  }, [companyId]);

  // Auto-print immediately when component mounts and payment is ready
  useEffect(() => {
    if (payment && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Small delay to ensure receipt is rendered
      setTimeout(() => {
        triggerAutoPrint();
      }, 800);
    }
  }, [payment]);

  // Countdown timer
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

  // Get the receipt HTML for print server
  const getReceiptHTML = () => {
    const printContent = document.querySelector('.print-receipt-content');
    if (printContent) {
      return printContent.innerHTML;
    }
    return null;
  };

  // Direct print function that uses an iframe (more reliable than popup)
  const printReceipt = () => {
    const printContent = document.querySelector('.print-receipt-content');
    if (!printContent) {
      console.error('Print content not found');
      alert('Kwitantie kon niet worden afgedrukt. Probeer opnieuw.');
      return;
    }

    // Get the inner HTML of the receipt
    const receiptHTML = printContent.innerHTML;
    
    // Create iframe for printing (more reliable than popup)
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
<html>
<head>
  <meta charset="UTF-8">
  <title>Kwitantie ${kwNr}</title>
  <style>
    @page { 
      size: A4; 
      margin: 0; 
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body { 
      width: 210mm; 
      min-height: 297mm; 
      background: white !important;
      font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  ${receiptHTML}
</body>
</html>
    `);
    printDoc.close();
    
    // Wait for content to render, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Print error:', e);
        }
        // Remove iframe after printing
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 500);
    };
    
    // Trigger load for inline content
    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print error:', e);
      }
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 800);
  };

  // Try to print via local print server first, fallback to browser print
  const triggerAutoPrint = async () => {
    setPrintStatus('printing');
    
    // First, try the local print server
    try {
      const healthCheck = await fetch(`${PRINT_SERVER_URL}/health`, {
        method: 'GET',
        mode: 'cors',
      }).catch(() => null);
      
      if (healthCheck && healthCheck.ok) {
        // Print server is running - use it
        const html = getReceiptHTML();
        if (html) {
          const response = await fetch(`${PRINT_SERVER_URL}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html: html,
              receipt_number: kwNr
            })
          });
          
          if (response.ok) {
            setPrintMethod('server');
            setPrintStatus('done');
            setCountdown(10);
            return;
          }
        }
      }
    } catch (e) {
      console.log('Print server niet beschikbaar, gebruik browser print');
    }
    
    // Fallback: use browser print
    setPrintMethod('browser');
    setTimeout(() => {
      printReceipt();
      setPrintStatus('done');
      setCountdown(10);
    }, 200);
  };

  // Manual reprint function
  const handleManualPrint = async () => {
    setPrintStatus('printing');
    clearInterval(timerRef.current);
    
    // Try print server first
    try {
      const healthCheck = await fetch(`${PRINT_SERVER_URL}/health`, {
        method: 'GET',
        mode: 'cors',
      }).catch(() => null);
      
      if (healthCheck && healthCheck.ok) {
        const html = getReceiptHTML();
        if (html) {
          const response = await fetch(`${PRINT_SERVER_URL}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html: html,
              receipt_number: kwNr
            })
          });
          
          if (response.ok) {
            setPrintMethod('server');
            setPrintStatus('done');
            restartCountdown(8);
            return;
          }
        }
      }
    } catch (e) {
      // Fall through to browser print
    }
    
    // Fallback to browser print
    setPrintMethod('browser');
    printReceipt();
    setPrintStatus('done');
    restartCountdown(8);
  };

  const restartCountdown = (seconds) => {
    setCountdown(seconds);
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
  };

  return (
    <div className="min-h-full flex bg-slate-50">
      {/* Left Panel - Success */}
      <div className="w-1/2 bg-gradient-to-br from-green-500 to-green-600 flex flex-col items-center justify-center p-12 text-white relative overflow-hidden print:hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-green-400/30 rounded-full" />
        
        <div className="relative z-10 text-center">
          <CheckCircle className="w-40 h-40 mx-auto mb-8" />
          <h1 className="text-6xl font-bold mb-4">Betaling geslaagd!</h1>
          <p className="text-3xl text-green-100 mb-4">Kwitantie: {kwNr}</p>
          
          {/* Print Status */}
          <div className="mb-8">
            {printStatus === 'waiting' && (
              <p className="text-xl text-green-200 flex items-center justify-center gap-2">
                <Printer className="w-6 h-6" />
                Voorbereiden...
              </p>
            )}
            {printStatus === 'printing' && (
              <p className="text-xl text-yellow-200 flex items-center justify-center gap-2 animate-pulse">
                <Printer className="w-6 h-6" />
                Kwitantie wordt afgedrukt...
              </p>
            )}
            {printStatus === 'done' && (
              <div>
                <p className="text-xl text-green-200 flex items-center justify-center gap-2">
                  <Check className="w-6 h-6" />
                  Kwitantie afgedrukt!
                </p>
                {printMethod === 'server' && (
                  <p className="text-sm text-green-300 mt-1">via Print Server</p>
                )}
              </div>
            )}
            {printStatus === 'error' && (
              <p className="text-xl text-red-200 flex items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Printen mislukt - probeer opnieuw
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={handleManualPrint}
              className="kiosk-btn-xl bg-white text-green-600 hover:bg-green-50 shadow-lg"
            >
              <Printer className="w-8 h-8" />
              <span>Opnieuw afdrukken</span>
            </button>
            
            <button
              onClick={onDone}
              className="kiosk-btn-lg bg-green-400/30 hover:bg-green-400/50 text-white border-2 border-white/30"
            >
              <Home className="w-6 h-6" />
              <span>Klaar</span>
            </button>
          </div>

          {/* Countdown */}
          <div className="mt-12">
            <div className="text-9xl font-bold">{countdown}</div>
            <p className="text-green-100 text-xl">Automatisch terug naar welkomscherm</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Receipt Preview FULL SIZE */}
      <div className="w-1/2 bg-white flex items-stretch justify-center overflow-hidden print:hidden">
        <div className="w-full h-full overflow-auto flex items-center justify-center" style={{ background: '#f8fafc' }}>
          <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
        </div>
      </div>

      {/* Hidden print content for print server */}
      <div className="print-receipt-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>

      {/* Print version - hidden on screen, visible when printing */}
      <div className="print-receipt-area" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
