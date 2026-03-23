import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Wallet, Droplets, AlertCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Volledige huur', icon: Banknote, desc: 'Betaal het volledige openstaande huurbedrag' },
  { id: 'partial_rent', label: 'Gedeeltelijk', icon: Wallet, desc: 'Betaal een deel van de huur' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige kosten' },
  { id: 'fines', label: 'Boetes', icon: AlertCircle, desc: 'Openstaande boetes betalen' },
];

export default function PaymentSelect({ tenant, onBack, onConfirm }) {
  const [selectedType, setSelectedType] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  if (!tenant) return null;

  const getAmountForType = (type) => {
    switch (type) {
      case 'rent': return tenant.outstanding_rent || 0;
      case 'service_costs': return tenant.service_costs || 0;
      case 'fines': return tenant.fines || 0;
      default: return 0;
    }
  };

  const isTypeDisabled = (type) => {
    if (type === 'partial_rent') return (tenant.outstanding_rent || 0) <= 0;
    return getAmountForType(type) <= 0;
  };

  const handleConfirm = () => {
    let amount = 0;
    let description = '';
    if (selectedType === 'rent') {
      amount = tenant.outstanding_rent;
      description = 'Volledige huurbetaling';
    } else if (selectedType === 'partial_rent') {
      amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0 || amount > tenant.outstanding_rent) return;
      description = 'Gedeeltelijke huurbetaling';
    } else if (selectedType === 'service_costs') {
      amount = tenant.service_costs;
      description = 'Servicekosten betaling';
    } else if (selectedType === 'fines') {
      amount = tenant.fines;
      description = 'Boetes betaling';
    }
    onConfirm({ payment_type: selectedType, amount, description, payment_method: 'cash', rent_month: new Date().toISOString().slice(0, 7) });
  };

  const canProceed = selectedType && (selectedType !== 'partial_rent' || (customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) <= tenant.outstanding_rent));

  const handleKeypadPress = (val) => {
    if (val === 'DEL') {
      setCustomAmount(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!customAmount.includes('.')) setCustomAmount(prev => prev + '.');
    } else {
      setCustomAmount(prev => prev + val);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1e293b] text-white p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          Terug
        </button>
        <h2 className="text-2xl font-bold">Wat wilt u betalen?</h2>
        <div className="text-right">
          <p className="text-sm text-[#94a3b8]">{tenant.name}</p>
          <p className="text-xs text-[#64748b]">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex gap-6">
        {/* Left - Options */}
        <div className="flex-1">
          <div className="space-y-4">
            {PAYMENT_TYPES.map((type) => {
              const disabled = isTypeDisabled(type.id);
              const isSelected = selectedType === type.id;
              const amount = getAmountForType(type.id);
              const Icon = type.icon;

              return (
                <button
                  key={type.id}
                  disabled={disabled}
                  onClick={() => setSelectedType(type.id)}
                  className={`kiosk-option-card ${
                    disabled ? 'kiosk-option-disabled' :
                    isSelected ? 'kiosk-option-selected' : 'kiosk-option-default'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#f97316]/20' : 'bg-[#f8fafc]'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-[#f97316]' : 'text-[#64748b]'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[#0f172a]">{type.label}</p>
                      <p className="text-sm text-[#64748b]">{type.desc}</p>
                    </div>
                  </div>
                  {type.id !== 'partial_rent' && (
                    <p className={`text-xl font-bold ${disabled ? 'text-[#94a3b8]' : 'text-[#0f172a]'}`}>
                      {formatSRD(amount)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="w-full mt-6 bg-[#f97316] hover:bg-[#ea580c] disabled:bg-[#94a3b8] text-white py-5 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 transition shadow-lg"
          >
            Volgende
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Right - Custom amount (only for partial) */}
        {selectedType === 'partial_rent' && (
          <div className="w-80 bg-[#f8fafc] rounded-2xl p-6 border border-[#e2e8f0]">
            <h4 className="text-lg font-semibold text-[#0f172a] mb-2">Bedrag invoeren</h4>
            <p className="text-sm text-[#64748b] mb-6">Max: {formatSRD(tenant.outstanding_rent)}</p>

            <div className="bg-white border-2 border-[#e2e8f0] rounded-xl p-4 mb-6">
              <span className="text-sm text-[#64748b]">SRD</span>
              <p className="text-3xl font-bold text-[#0f172a]">{customAmount || '0.00'}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad-btn text-lg ${
                    key === 'DEL' ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-white text-[#0f172a]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
