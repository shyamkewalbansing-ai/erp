import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, Home, ShieldAlert } from 'lucide-react';
import axios from 'axios';

// External KIOSK API URL
const API = 'https://kiosk-huur.preview.emergentagent.com/api';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Volledige huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
};

export default function PaymentConfirm({ tenant, paymentData, onBack, onSuccess, companyId }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!tenant || !paymentData) return null;

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post(`${API}/kiosk/${companyId}/payments`, {
        tenant_id: tenant.tenant_id,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        payment_method: paymentData.payment_method,
        description: paymentData.description,
        rent_month: paymentData.rent_month || null,
      });
      setTimeout(() => onSuccess(res.data), 600);
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1e293b] text-white p-6 flex items-center justify-between">
        <button onClick={onBack} disabled={processing} className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition disabled:opacity-50">
          <ArrowLeft className="w-5 h-5" />
          Terug
        </button>
        <h2 className="text-2xl font-bold">Bevestig betaling</h2>
        <div className="w-24"></div>
      </div>

      {/* Content - full kiosk split */}
      <div className="flex-1 p-6 flex gap-6">
        {/* Left - Amount display */}
        <div className="w-1/2 flex flex-col items-center justify-center bg-[#f8fafc] rounded-2xl p-8">
          <p className="text-[#64748b] mb-2">Te betalen bedrag</p>
          <p className="text-6xl font-bold text-[#0f172a] mb-4" data-testid="confirm-amount">{formatSRD(paymentData.amount)}</p>
          <div className="flex items-center gap-2 text-[#64748b]">
            <Banknote className="w-5 h-5" />
            <span>{TYPE_LABELS[paymentData.payment_type]}</span>
          </div>
          <p className="text-sm text-[#94a3b8] mt-2">Betaalmethode: Contant</p>
        </div>

        {/* Right - Details + Confirm */}
        <div className="w-1/2 flex flex-col">
          {/* Tenant mini card */}
          <div className="bg-[#f8fafc] rounded-xl p-4 flex items-center gap-4 mb-6 border border-[#e2e8f0]">
            <div className="w-12 h-12 rounded-full bg-[#1e293b] text-white flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-[#0f172a]">{tenant.name}</p>
              <p className="text-sm text-[#64748b]">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#fee2e2] border border-[#fca5a5] text-[#dc2626] rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            data-testid="confirm-payment-btn"
            className="mt-auto w-full bg-[#16a34a] hover:bg-[#15803d] disabled:bg-[#94a3b8] text-white py-6 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 transition shadow-lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Verwerken...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Bevestig betaling
              </>
            )}
          </button>
          <p className="text-center text-sm text-[#94a3b8] mt-4">
            Door te bevestigen geeft u aan dat het contante bedrag is ontvangen
          </p>
        </div>
      </div>
    </div>
  );
}
