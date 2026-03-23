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
    <div className="kiosk-fullscreen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="kiosk-header">
        <button onClick={onBack} className="kiosk-back-btn">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-3xl font-bold text-white">Wat wilt u betalen?</h1>
        <div className="text-right">
          <p className="text-white font-medium">{tenant.name}</p>
          <p className="text-slate-400">Appt. {tenant.apartment_number}</p>
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
                  className={`kiosk-payment-option ${
                    disabled ? 'kiosk-payment-disabled' :
                    isSelected ? 'kiosk-payment-selected' : 'kiosk-payment-default'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-orange-500/30' : 'bg-slate-700'
                    }`}>
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-bold text-white">{type.label}</p>
                      <p className="text-slate-400">{type.desc}</p>
                    </div>
                  </div>
                  {type.id !== 'partial_rent' && (
                    <div className="flex items-center gap-3">
                      <p className={`text-2xl font-bold ${disabled ? 'text-slate-600' : 'text-white'}`}>
                        {formatSRD(amount)}
                      </p>
                      {isSelected && <CheckCircle className="w-8 h-8 text-orange-500" />}
                    </div>
                  )}
                  {type.id === 'partial_rent' && isSelected && (
                    <CheckCircle className="w-8 h-8 text-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white mt-8"
          >
            <span>Volgende</span>
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>

        {/* Right - Custom Amount Keypad (only for partial) */}
        {selectedType === 'partial_rent' && (
          <div className="w-96 bg-slate-800 rounded-3xl p-8 border border-slate-700">
            <h4 className="text-2xl font-bold text-white mb-2">Bedrag invoeren</h4>
            <p className="text-slate-400 mb-8">Max: {formatSRD(tenant.outstanding_rent)}</p>

            {/* Amount Display */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 mb-8">
              <p className="text-slate-400 text-sm mb-1">SRD</p>
              <p className="text-4xl font-bold text-white font-mono">
                {customAmount || '0.00'}
              </p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad-sm ${
                    key === 'DEL' ? 'kiosk-keypad-del' : 'kiosk-keypad-default'
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
