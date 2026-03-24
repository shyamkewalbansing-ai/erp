import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
};

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
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-full bg-orange-600/30 rounded-l-[80px] pointer-events-none" />

      {/* Back */}
      <div className="absolute top-5 left-6 z-20">
        <button onClick={onBack} disabled={processing} className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium disabled:opacity-50">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Bevestig betaling</h1>
      </div>

      {/* Main card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-6">
        {/* Amount */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-center mb-5 shadow-lg shadow-orange-500/20">
          <p className="text-orange-100 text-sm mb-1">Te betalen bedrag</p>
          <p className="text-3xl sm:text-4xl font-bold text-white mb-2" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
          <div className="flex items-center justify-center gap-2 text-orange-100 text-xs">
            <Banknote className="w-4 h-4" />
            <span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
          </div>
        </div>

        {/* Tenant */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{tenant.name}</p>
            <p className="text-xs text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-slate-50 p-4 mb-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Type</span>
              <span className="text-slate-900">{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bedrag</span>
              <span className="text-slate-900 font-bold">{formatSRD(paymentData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Methode</span>
              <span className="text-slate-900">Contant</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium">{error}</div>
        )}

        {/* Confirm */}
        <button onClick={handlePayment} disabled={processing} data-testid="confirm-payment-btn"
          className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 transition bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-lg shadow-green-500/25 active:scale-[0.98]">
          {processing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>Verwerken...</span></>
          ) : (
            <><CheckCircle className="w-5 h-5" /><span>Bevestig betaling</span></>
          )}
        </button>
        <p className="text-center text-slate-400 text-xs mt-3">Contant bedrag is ontvangen</p>
      </div>
    </div>
  );
}
