import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijke betaling', service_costs: 'Servicekosten', fines: 'Boetes' };

export default function KioskPaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  if (!tenant || !paymentData) return null;

  const handlePayment = async () => {
    setProcessing(true); setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id, amount: paymentData.amount,
        payment_type: paymentData.payment_type, payment_method: paymentData.payment_method,
        description: paymentData.description, rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 800);
    } catch { setError('Betaling mislukt. Probeer opnieuw.'); setProcessing(false); }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
        <div className="absolute bottom-[15%] left-[10%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-[40%] right-[8%] w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute top-0 left-[45%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        <div className="absolute top-[55%] left-[5%] w-3 h-3 bg-white/15 rounded-full" />
      </div>

      <div className="absolute top-5 left-8 z-20">
        <button onClick={onBack} disabled={processing} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm disabled:opacity-50">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
      </div>

      <div className="relative z-10 text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Bevestig betaling</h1>
      </div>

      <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-8 sm:p-10 lg:p-12 w-full max-w-lg mx-6 border border-white/50">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 sm:p-10 text-center mb-6 shadow-xl shadow-orange-500/20">
          <p className="text-orange-100 text-base mb-2">Te betalen bedrag</p>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-3 tracking-tight whitespace-nowrap" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
          <div className="flex items-center justify-center gap-2 text-orange-100 text-sm">
            <Banknote className="w-5 h-5" /><span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-100 mb-5">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-900">{tenant.name}</p>
            <p className="text-sm text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-100 p-5 sm:p-6 mb-6">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Overzicht</h4>
          <div className="space-y-3 text-base">
            <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-slate-900 font-semibold">{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Bedrag</span><span className="text-slate-900 font-extrabold text-lg">{formatSRD(paymentData.amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Methode</span><span className="text-slate-900 font-semibold">Contant</span></div>
          </div>
        </div>

        {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center font-semibold">{error}</div>}

        <button onClick={handlePayment} disabled={processing} data-testid="confirm-payment-btn"
          className="w-full py-5 sm:py-6 px-8 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 transition bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-xl shadow-green-500/25 active:scale-[0.98]">
          {processing ? (<><Loader2 className="w-6 h-6 animate-spin" /><span>Verwerken...</span></>) : (<><CheckCircle className="w-6 h-6" /><span>Bevestig betaling</span></>)}
        </button>
        <p className="text-center text-slate-400 text-sm mt-4">Contant bedrag is ontvangen</p>
      </div>
    </div>
  );
}
