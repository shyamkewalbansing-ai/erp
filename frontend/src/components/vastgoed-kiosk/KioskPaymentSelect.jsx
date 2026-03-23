import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Wallet, Droplets, AlertCircle, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Volledige huur', icon: Banknote, desc: 'Betaal het volledige openstaande huurbedrag' },
  { id: 'partial_rent', label: 'Gedeeltelijk', icon: Wallet, desc: 'Betaal een deel van de huur' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige kosten' },
  { id: 'fines', label: 'Boetes', icon: AlertCircle, desc: 'Openstaande boetes betalen' },
];

export default function KioskPaymentSelect({ tenant, onBack, onConfirm }) {
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
    onConfirm({ 
      payment_type: selectedType, 
      amount, 
      description, 
      payment_method: 'cash', 
      rent_month: new Date().toISOString().slice(0, 7) 
    });
  };

  const canProceed = selectedType && (
    selectedType !== 'partial_rent' || 
    (customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) <= tenant.outstanding_rent)
  );

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
    <div className="kiosk-fullscreen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-lg font-medium">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Wat wilt u betalen?</h1>
        <div className="text-right">
          <p className="text-slate-900 font-medium">{tenant.name}</p>
          <p className="text-slate-500">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex gap-8">
        {/* Left - Payment Options */}
        <div className="flex-1 flex flex-col">
          <div className="space-y-5 flex-1">
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
                  className={`flex items-center justify-between w-full p-6 rounded-2xl border-3 transition ${
                    disabled 
                      ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-orange-50 border-orange-500' 
                        : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-orange-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-orange-500' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-bold text-slate-900">{type.label}</p>
                      <p className="text-slate-500">{type.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {type.id !== 'partial_rent' && (
                      <p className={`text-2xl font-bold ${disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                        {formatSRD(amount)}
                      </p>
                    )}
                    {isSelected && <CheckCircle className="w-8 h-8 text-orange-500" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 text-white mt-8 shadow-lg shadow-orange-500/30"
          >
            <span>Volgende</span>
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>

        {/* Right - Custom Amount Keypad (only for partial) */}
        {selectedType === 'partial_rent' && (
          <div className="w-96 bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm">
            <h4 className="text-2xl font-bold text-slate-900 mb-2">Bedrag invoeren</h4>
            <p className="text-slate-500 mb-8">Max: {formatSRD(tenant.outstanding_rent)}</p>

            {/* Amount Display */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 mb-8">
              <p className="text-slate-500 text-sm mb-1">SRD</p>
              <p className="text-4xl font-bold text-slate-900 font-mono">
                {customAmount || '0.00'}
              </p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`h-16 text-xl font-bold rounded-xl transition active:scale-95 ${
                    key === 'DEL' 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
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
