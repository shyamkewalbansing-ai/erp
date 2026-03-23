import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer } from 'lucide-react';
import ReceiptTicket from './ReceiptTicket';
import axios from 'axios';

// External KIOSK API URL
const API = 'https://kiosk-huur.preview.emergentagent.com/api';

export default function ReceiptScreen({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(8);
  const [stampData, setStampData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/kiosk/${companyId}/company/stamp`).then(res => {
        setStampData(res.data);
      }).catch(() => {});
    }
  }, [companyId]);

  useEffect(() => {
    if (!payment) return;

    // Countdown timer - auto redirect after 8 seconds
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
    // Stop countdown during print
    clearInterval(timerRef.current);
    window.print();
    // Restart countdown after print dialog closes
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
    setCountdown(5);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex">
      {/* Full screen success */}
      <div className="flex-1 flex">
        {/* Left - Success message */}
        <div className="w-1/2 bg-[#16a34a] text-white p-8 flex flex-col items-center justify-center">
          <CheckCircle className="w-32 h-32 mb-6" />
          <h2 className="text-4xl font-bold mb-2">Betaling geslaagd!</h2>
          <p className="text-xl text-[#bbf7d0] mb-8">Kwitantie: {kwNr}</p>
          <button
            onClick={handlePrint}
            className="bg-white text-[#16a34a] py-4 px-8 rounded-xl text-xl font-semibold flex items-center gap-3 mb-4 hover:bg-[#f0fdf4] transition"
          >
            <Printer className="w-6 h-6" />
            Kwitantie printen
          </button>
          <button
            onClick={onDone}
            className="text-white/80 hover:text-white underline"
          >
            Klaar
          </button>

          {/* Countdown */}
          <div className="mt-8 text-center">
            <p className="text-6xl font-bold">{countdown}</p>
            <p className="text-[#bbf7d0]">Automatisch terug naar welkomscherm</p>
          </div>
        </div>

        {/* Right - Kwitantie preview */}
        <div className="w-1/2 p-8 bg-[#f8fafc] flex items-center justify-center overflow-auto">
          <div className="text-center">
            <p className="text-[#64748b] mb-4">Kwitantie voorbeeld</p>
            <ReceiptTicket payment={payment} tenant={tenant} preview={true} stampData={stampData} />
          </div>
        </div>
      </div>

      {/* Hidden A4 kwitantie for printing */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white">
        <ReceiptTicket payment={payment} tenant={tenant} preview={false} stampData={stampData} />
      </div>
    </div>
  );
}
