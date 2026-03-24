import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Wallet, Droplets, AlertCircle, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Huur', icon: Banknote, desc: 'Openstaand huurbedrag' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige' },
  { id: 'fines', label: 'Boetes', icon: AlertCircle, desc: 'Openstaande boetes' },
];

export default function KioskPaymentSelect({ tenant, onBack, onConfirm }) {
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [useCustomAmount, setUseCustomAmount] = useState(false);
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

  const isTypeDisabled = (type) => getAmountForType(type) <= 0;

  const toggleType = (typeId) => {
    if (useCustomAmount) return;
    const next = new Set(selectedTypes);
    if (next.has(typeId)) { next.delete(typeId); } else { next.add(typeId); }
    setSelectedTypes(next);
  };

  const toggleCustom = () => {
    if (!useCustomAmount) { setSelectedTypes(new Set()); setUseCustomAmount(true); }
    else { setUseCustomAmount(false); setCustomAmount(''); }
  };

  const selectedTotal = [...selectedTypes].reduce((sum, t) => sum + getAmountForType(t), 0);

  const buildDescription = () => {
    const labels = [];
    if (selectedTypes.has('rent')) labels.push('Huur');
    if (selectedTypes.has('service_costs')) labels.push('Servicekosten');
    if (selectedTypes.has('fines')) labels.push('Boetes');
    return labels.join(' + ');
  };

  const getPaymentType = () => {
    if (useCustomAmount) return 'partial_rent';
    if (selectedTypes.size === 1) {
      const t = [...selectedTypes][0];
      if (t === 'rent') return 'rent';
      if (t === 'service_costs') return 'service_costs';
      if (t === 'fines') return 'fines';
    }
    return 'rent';
  };

  const handleConfirm = () => {
    let amount, description, paymentType;
    if (useCustomAmount) {
      amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) return;
      description = `Gedeeltelijke betaling - ${formatSRD(amount)}`;
      paymentType = 'partial_rent';
    } else {
      amount = selectedTotal;
      description = buildDescription();
      paymentType = getPaymentType();
    }
    onConfirm({ payment_type: paymentType, amount, description, payment_method: 'cash', rent_month: null });
  };

  const canProceed = useCustomAmount ? (customAmount && parseFloat(customAmount) > 0) : selectedTypes.size > 0;

  const handleKeypadPress = (val) => {
    if (val === 'DEL') { setCustomAmount(prev => prev.slice(0, -1)); }
    else if (val === '.') { if (!customAmount.includes('.')) setCustomAmount(prev => prev + '.'); }
    else { setCustomAmount(prev => prev + val); }
  };

  const totalDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);

  const selectAll = () => {
    if (useCustomAmount) return;
    const all = new Set();
    PAYMENT_TYPES.forEach(t => { if (!isTypeDisabled(t.id)) all.add(t.id); });
    setSelectedTypes(all);
  };

  const allSelected = PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).every(t => selectedTypes.has(t.id));

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Wat wilt u betalen?</h1>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-slate-900 font-medium">{tenant.name}</p>
          <p className="text-xs text-slate-400">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-start px-4 sm:px-6 py-6 gap-6 overflow-auto">
        {/* Left - Payment Options */}
        <div className="flex-1 w-full max-w-lg mx-auto lg:mx-0">
          {/* Select All */}
          {!useCustomAmount && PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).length > 1 && (
            <button
              onClick={allSelected ? () => setSelectedTypes(new Set()) : selectAll}
              className={`w-full mb-3 p-3.5 rounded-2xl border transition flex items-center justify-between ${
                allSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  allSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
                }`}>
                  {allSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm font-bold text-slate-900">Alles betalen</span>
              </div>
              <span className="text-base font-bold text-orange-600">{formatSRD(totalDebt)}</span>
            </button>
          )}

          {/* Individual options */}
          <div className="space-y-2.5">
            {PAYMENT_TYPES.map((type) => {
              const disabled = isTypeDisabled(type.id) || useCustomAmount;
              const isSelected = selectedTypes.has(type.id);
              const amount = getAmountForType(type.id);
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  disabled={disabled}
                  onClick={() => toggleType(type.id)}
                  data-testid={`pay-type-${type.id}`}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition ${
                    disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      : isSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-orange-100' : 'bg-slate-50'
                    }`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">{type.label}</p>
                      <p className="text-xs text-slate-400 hidden sm:block">{type.desc}</p>
                    </div>
                  </div>
                  <p className={`text-base font-bold flex-shrink-0 ml-2 ${disabled ? 'text-slate-300' : isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                    {formatSRD(amount)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom amount toggle */}
          <button
            onClick={toggleCustom}
            data-testid="pay-type-custom"
            className={`mt-2.5 flex items-center justify-between w-full p-4 rounded-2xl border transition ${
              useCustomAmount ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                useCustomAmount ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
              }`}>
                {useCustomAmount && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                useCustomAmount ? 'bg-orange-100' : 'bg-slate-50'
              }`}>
                <Wallet className={`w-5 h-5 ${useCustomAmount ? 'text-orange-500' : 'text-slate-400'}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Ander bedrag</p>
                <p className="text-xs text-slate-400 hidden sm:block">Voer zelf een bedrag in</p>
              </div>
            </div>
          </button>

          {/* Selected total */}
          {!useCustomAmount && selectedTypes.size > 0 && (
            <div className="mt-3 rounded-2xl bg-slate-900 p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{selectedTypes.size} item{selectedTypes.size > 1 ? 's' : ''} geselecteerd</p>
                <p className="text-white text-xs">{buildDescription()}</p>
              </div>
              <p className="text-xl font-bold text-white">{formatSRD(selectedTotal)}</p>
            </div>
          )}
        </div>

        {/* Right - Custom Keypad */}
        {useCustomAmount && (
          <div className="w-full lg:w-72 bg-slate-50 rounded-2xl p-5 border border-slate-100 mx-auto lg:mx-0 max-w-md">
            <h4 className="text-sm font-bold text-slate-900 mb-1">Bedrag invoeren</h4>
            <p className="text-xs text-slate-400 mb-3">Totaal openstaand: {formatSRD(totalDebt)}</p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
              <p className="text-slate-400 text-xs mb-1">SRD</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{customAmount || '0.00'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`h-11 text-base font-bold rounded-lg transition active:scale-95 ${
                    key === 'DEL' ? 'bg-slate-200 text-red-500 hover:bg-red-50' : 'bg-white text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-4 sm:px-6 py-4 border-t border-slate-100">
        <div className="max-w-lg mx-auto lg:max-w-none">
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            data-testid="payment-next-btn"
            className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]"
          >
            <span>Volgende — {formatSRD(useCustomAmount ? (parseFloat(customAmount) || 0) : selectedTotal)}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
