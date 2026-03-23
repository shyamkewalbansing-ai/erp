import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer, Home } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(15);
  const [stampData, setStampData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [autoPrinted, setAutoPrinted] = useState(false);
  const timerRef = useRef(null);
  const printFrameRef = useRef(null);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => {
        setStampData(res.data);
      }).catch(() => {});
    }
  }, [companyId]);

  // Auto-print on mount
  useEffect(() => {
    if (payment && stampData !== null && !autoPrinted) {
      // Wait a moment for the receipt to render, then auto-print
      const autoPrintTimer = setTimeout(() => {
        handlePrint(true);
        setAutoPrinted(true);
      }, 1500);
      return () => clearTimeout(autoPrintTimer);
    }
  }, [payment, stampData, autoPrinted]);

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

  const handlePrint = (isAutoPrint = false) => {
    setIsPrinting(true);
    clearInterval(timerRef.current);

    // Create a hidden iframe for printing
    const printContent = document.getElementById('receipt-print-content');
    if (!printContent) {
      setIsPrinting(false);
      return;
    }

    // Create iframe for silent printing
    let printFrame = printFrameRef.current;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.top = '-9999px';
      printFrame.style.left = '-9999px';
      printFrame.style.width = '210mm';
      printFrame.style.height = '297mm';
      document.body.appendChild(printFrame);
      printFrameRef.current = printFrame;
    }

    const printDocument = printFrame.contentWindow || printFrame.contentDocument;
    const doc = printDocument.document || printDocument;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
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
            }
            body {
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Wait for content to load then print
    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (e) {
          // Fallback to regular window.print()
          window.print();
        }
        
        setIsPrinting(false);
        
        // Restart countdown
        setCountdown(isAutoPrint ? 12 : 8);
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
      }, 500);
    };
  };

  return (
    <div className="kiosk-fullscreen flex bg-slate-50">
      {/* Left Panel - Success */}
      <div className="w-1/2 bg-gradient-to-br from-green-500 to-green-600 flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-green-400/30 rounded-full" />
        
        <div className="relative z-10 text-center">
          <CheckCircle className="w-40 h-40 mx-auto mb-8" />
          <h1 className="text-6xl font-bold mb-4">Betaling geslaagd!</h1>
          <p className="text-3xl text-green-100 mb-4">Kwitantie: {kwNr}</p>
          
          {autoPrinted && (
            <p className="text-xl text-green-200 mb-8 flex items-center justify-center gap-2">
              <Printer className="w-6 h-6" />
              Kwitantie wordt automatisch geprint...
            </p>
          )}
          
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handlePrint(false)}
              disabled={isPrinting}
              className="kiosk-btn-xl bg-white text-green-600 hover:bg-green-50 shadow-lg disabled:opacity-50"
            >
              <Printer className="w-8 h-8" />
              <span>{isPrinting ? 'Bezig met printen...' : 'Kwitantie opnieuw printen'}</span>
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

      {/* Right Panel - Receipt Preview */}
      <div className="w-1/2 bg-slate-100 flex items-center justify-center p-8 overflow-auto">
        <div className="text-center">
          <p className="text-slate-500 mb-6 text-lg font-medium">Kwitantie voorbeeld</p>
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200">
            <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
          </div>
        </div>
      </div>

      {/* Hidden print content */}
      <div id="receipt-print-content" style={{ display: 'none' }}>
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
