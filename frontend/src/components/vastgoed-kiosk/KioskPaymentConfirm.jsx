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

function formatRentMonth(monthStr) {
  if (!monthStr) return null;
  if (monthStr.includes('-')) {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) return `${monthNames[monthIndex]} ${year}`;
  }
  return monthStr;
}

export default function KioskPaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!tenant || !paymentData) return null;

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post(`${API}/public/${companyId}/payments`, {
        tenant_id: tenant.tenant_id,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        payment_method: paymentData.payment_method,
        description: paymentData.description,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 800);
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} disabled={processing} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm font-medium disabled:opacity-50">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Bevestig betaling</h1>
        <div className="w-16" />
      </div>

      {/* Content - centered */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6 overflow-auto">
        <div className="w-full max-w-md">
          {/* Amount display */}
          <div className="bg-orange-500 rounded-2xl p-8 text-center mb-6 shadow-lg shadow-orange-500/20">
            <p className="text-orange-100 text-sm mb-2">Te betalen bedrag</p>
            <p className="text-4xl sm:text-5xl font-bold text-white mb-3" data-testid="confirm-amount">
              {formatSRD(paymentData.amount)}
            </p>
            <div className="flex items-center justify-center gap-2 text-orange-100 text-sm">
              <Banknote className="w-4 h-4" />
              <span>{paymentData.description || TYPE_LABELS[paymentData.payment_type]}</span>
            </div>
          </div>

          {/* Tenant */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{tenant.name}</p>
              <p className="text-xs text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {/* Payment details */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-6">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Betalingsoverzicht</h4>
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center font-medium text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-4 sm:px-6 py-4 border-t border-slate-100">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={handlePayment}
            disabled={processing}
            data-testid="confirm-payment-btn"
            className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-lg shadow-green-500/25 active:scale-[0.98]"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verwerken...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Bevestig betaling</span>
              </>
            )}
          </button>
          <p className="text-center text-slate-400 text-xs">
            Door te bevestigen geeft u aan dat het contante bedrag is ontvangen
          </p>
        </div>
      </div>
    </div>
  );
}
