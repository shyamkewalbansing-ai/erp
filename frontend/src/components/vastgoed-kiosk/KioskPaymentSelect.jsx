import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Wallet, Droplets, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Generate month options for selection
function getMonthOptions() {
  const months = [];
  const now = new Date();
  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                      'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  
  // Current month and 3 previous months
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    months.push({ value, label });
  }
  return months;
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const monthOptions = getMonthOptions();

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
    const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    
    if (selectedType === 'rent') {
      amount = tenant.outstanding_rent;
      description = `Volledige huurbetaling - ${selectedMonthLabel}`;
    } else if (selectedType === 'partial_rent') {
      amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0 || amount > tenant.outstanding_rent) return;
      description = `Gedeeltelijke huurbetaling - ${selectedMonthLabel}`;
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
      rent_month: (selectedType === 'rent' || selectedType === 'partial_rent') ? selectedMonth : null 
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
    <div className="kiosk-fullscreen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-lg font-medium">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Wat wilt u betalen?</h1>
        <div className="text-right">
          <p className="text-slate-900 font-medium">{tenant.name}</p>
          <p className="text-slate-500">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 p-6 flex gap-6 overflow-auto">
        {/* Left - Payment Options */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="space-y-3">
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
                  className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition ${
                    disabled 
                      ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-orange-50 border-orange-500' 
                        : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-orange-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-orange-500' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-slate-900">{type.label}</p>
                      <p className="text-sm text-slate-500">{type.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {type.id !== 'partial_rent' && (
                      <p className={`text-xl font-bold ${disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                        {formatSRD(amount)}
                      </p>
                    )}
                    {isSelected && <CheckCircle className="w-6 h-6 text-orange-500" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Month Selection - shown when rent or partial_rent selected */}
          {(selectedType === 'rent' || selectedType === 'partial_rent') && (
            <div className="bg-white rounded-xl p-4 border-2 border-slate-100 shadow-sm mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-orange-500" />
                <h4 className="text-lg font-bold text-slate-900">Voor welke maand?</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {monthOptions.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => setSelectedMonth(month.value)}
                    className={`p-3 rounded-lg text-left transition ${
                      selectedMonth === month.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <p className="font-semibold text-sm">{month.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Custom Amount Keypad (only for partial) */}
        {selectedType === 'partial_rent' && (
          <div className="w-80 bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-sm shrink-0">
            <h4 className="text-xl font-bold text-slate-900 mb-1">Bedrag invoeren</h4>
            <p className="text-slate-500 text-sm mb-4">Max: {formatSRD(tenant.outstanding_rent)}</p>

            {/* Amount Display */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mb-4">
              <p className="text-slate-500 text-xs mb-1">SRD</p>
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {customAmount || '0.00'}
              </p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`h-12 text-lg font-bold rounded-lg transition active:scale-95 ${
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

      {/* Fixed Bottom - Confirm Button */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <button
          onClick={handleConfirm}
          disabled={!canProceed}
          className="w-full py-4 px-8 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-lg shadow-orange-500/30"
        >
          <span>Volgende</span>
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
