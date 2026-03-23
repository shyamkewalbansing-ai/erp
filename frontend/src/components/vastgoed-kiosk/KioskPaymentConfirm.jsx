import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Volledige huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
};

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
    <div className="kiosk-fullscreen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <button onClick={onBack} disabled={processing} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-lg font-medium disabled:opacity-50">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Bevestig betaling</h1>
        <div className="w-32" />
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex gap-8">
        {/* Left - Amount Display */}
        <div className="flex-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-12 flex flex-col items-center justify-center shadow-lg shadow-orange-500/30">
          <p className="text-orange-100 text-2xl mb-4">Te betalen bedrag</p>
          <p className="text-8xl font-bold text-white mb-6" data-testid="confirm-amount">
            {formatSRD(paymentData.amount)}
          </p>
          <div className="flex items-center gap-3 text-orange-100 text-xl">
            <Banknote className="w-6 h-6" />
            <span>{TYPE_LABELS[paymentData.payment_type]}</span>
          </div>
          <p className="text-orange-200 mt-4">Betaalmethode: Contant</p>
        </div>

        {/* Right - Details + Confirm */}
        <div className="w-[450px] flex flex-col">
          {/* Tenant Card */}
          <div className="bg-white rounded-2xl p-6 flex items-center gap-6 mb-6 border-2 border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{tenant.name}</p>
              <p className="text-slate-500">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-slate-100 shadow-sm flex-1">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Betalingsoverzicht</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="text-slate-900">{TYPE_LABELS[paymentData.payment_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bedrag</span>
                <span className="text-slate-900 font-bold">{formatSRD(paymentData.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Methode</span>
                <span className="text-slate-900">Contant</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            data-testid="confirm-payment-btn"
            className="kiosk-btn-xl bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white shadow-lg shadow-green-500/30"
          >
            {processing ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Verwerken...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-8 h-8" />
                <span>Bevestig betaling</span>
              </>
            )}
          </button>
          <p className="text-center text-slate-500 mt-4">
            Door te bevestigen geeft u aan dat het contante bedrag is ontvangen
          </p>
        </div>
      </div>
    </div>
  );
}
