import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer, Home } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskReceipt({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(10);
  const [stampData, setStampData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/public/${companyId}/company/stamp`).then(res => {
        setStampData(res.data);
      }).catch(() => {});
    }
  }, [companyId]);

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

  const handlePrint = () => {
    clearInterval(timerRef.current);
    window.print();
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
    setCountdown(8);
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
          <p className="text-3xl text-green-100 mb-12">Kwitantie: {kwNr}</p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={handlePrint}
              className="kiosk-btn-xl bg-white text-green-600 hover:bg-green-50 shadow-lg"
            >
              <Printer className="w-8 h-8" />
              <span>Kwitantie printen</span>
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
          <p className="text-slate-500 mb-6 text-lg">Kwitantie voorbeeld</p>
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
          </div>
        </div>
      </div>

      {/* Hidden print version */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white">
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
