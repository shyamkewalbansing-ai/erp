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
    switch (type) { case 'rent': return tenant.outstanding_rent || 0; case 'service_costs': return tenant.service_costs || 0; case 'fines': return tenant.fines || 0; default: return 0; }
  };
  const isTypeDisabled = (type) => getAmountForType(type) <= 0;
  const toggleType = (typeId) => { if (useCustomAmount) return; const next = new Set(selectedTypes); if (next.has(typeId)) next.delete(typeId); else next.add(typeId); setSelectedTypes(next); };
  const toggleCustom = () => { if (!useCustomAmount) { setSelectedTypes(new Set()); setUseCustomAmount(true); } else { setUseCustomAmount(false); setCustomAmount(''); } };
  const selectedTotal = [...selectedTypes].reduce((sum, t) => sum + getAmountForType(t), 0);
  const buildDescription = () => { const l = []; if (selectedTypes.has('rent')) l.push('Huur'); if (selectedTypes.has('service_costs')) l.push('Servicekosten'); if (selectedTypes.has('fines')) l.push('Boetes'); return l.join(' + '); };
  const getPaymentType = () => { if (useCustomAmount) return 'partial_rent'; if (selectedTypes.size === 1) { const t = [...selectedTypes][0]; return t; } return 'rent'; };
  const handleConfirm = () => {
    let amount, description, paymentType;
    if (useCustomAmount) { amount = parseFloat(customAmount); if (isNaN(amount) || amount <= 0) return; description = `Gedeeltelijke betaling - ${formatSRD(amount)}`; paymentType = 'partial_rent'; }
    else { amount = selectedTotal; description = buildDescription(); paymentType = getPaymentType(); }
    onConfirm({ payment_type: paymentType, amount, description, payment_method: 'cash', rent_month: null });
  };
  const canProceed = useCustomAmount ? (customAmount && parseFloat(customAmount) > 0) : selectedTypes.size > 0;
  const handleKeypadPress = (val) => { if (val === 'DEL') setCustomAmount(prev => prev.slice(0, -1)); else if (val === '.') { if (!customAmount.includes('.')) setCustomAmount(prev => prev + '.'); } else setCustomAmount(prev => prev + val); };
  const totalDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const selectAll = () => { if (useCustomAmount) return; const all = new Set(); PAYMENT_TYPES.forEach(t => { if (!isTypeDisabled(t.id)) all.add(t.id); }); setSelectedTypes(all); };
  const allSelected = PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).every(t => selectedTypes.has(t.id));

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
        <div className="absolute bottom-[10%] left-[8%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-[50%] right-[5%] w-28 h-28 border-[3px] border-white/8 rounded-full" />
        <div className="absolute top-0 left-[35%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        <div className="absolute top-[40%] left-[3%] w-3 h-3 bg-white/15 rounded-full" />
        <div className="absolute top-[25%] right-[20%] w-4 h-4 bg-white/10 rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5">
        <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Wat wilt u betalen?</h1>
        <div className="text-right hidden sm:block">
          <p className="text-white font-semibold">{tenant.name}</p>
          <p className="text-white/60 text-sm">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-start justify-center gap-6 md:gap-8 px-6 sm:px-10 lg:px-12 pb-8 overflow-auto">
        {/* Left - Options card */}
        <div className="bg-white rounded-2xl shadow-lg p-7 sm:p-8 lg:p-10 w-full max-w-xl min-w-0">
          {/* Select All */}
          {!useCustomAmount && PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).length > 1 && (
            <button onClick={allSelected ? () => setSelectedTypes(new Set()) : selectAll}
              className={`w-full mb-4 p-4 sm:p-5 rounded-2xl border-2 transition flex items-center justify-between ${
                allSelected ? 'bg-orange-50 border-orange-400' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-orange-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${allSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                  {allSelected && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <span className="text-base sm:text-lg font-bold text-slate-900">Alles betalen</span>
              </div>
              <span className="text-lg sm:text-xl font-extrabold text-orange-600 whitespace-nowrap">{formatSRD(totalDebt)}</span>
            </button>
          )}

          {/* Options */}
          <div className="space-y-3">
            {PAYMENT_TYPES.map((type) => {
              const disabled = isTypeDisabled(type.id) || useCustomAmount;
              const isSelected = selectedTypes.has(type.id);
              const amount = getAmountForType(type.id);
              const Icon = type.icon;
              return (
                <button key={type.id} disabled={disabled} onClick={() => toggleType(type.id)} data-testid={`pay-type-${type.id}`}
                  className={`flex items-center justify-between w-full p-4 sm:p-5 rounded-2xl border-2 transition ${
                    disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                    : isSelected ? 'bg-orange-50 border-orange-400' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-orange-300'
                  }`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isSelected ? 'bg-orange-100 border border-orange-200' : 'bg-slate-50 border border-slate-100'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-base sm:text-lg font-bold text-slate-900">{type.label}</p>
                      <p className="text-sm text-slate-400 hidden sm:block">{type.desc}</p>
                    </div>
                  </div>
                  <p className={`text-lg sm:text-xl font-extrabold flex-shrink-0 ml-3 whitespace-nowrap ${disabled ? 'text-slate-300' : isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                    {formatSRD(amount)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom */}
          <button onClick={toggleCustom} data-testid="pay-type-custom"
            className={`mt-3 flex items-center justify-between w-full p-4 sm:p-5 rounded-2xl border-2 transition ${
              useCustomAmount ? 'bg-orange-50 border-orange-400' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-orange-300'}`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${useCustomAmount ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                {useCustomAmount && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-sm ${useCustomAmount ? 'bg-orange-100 border border-orange-200' : 'bg-slate-50 border border-slate-100'}`}>
                <Wallet className={`w-6 h-6 ${useCustomAmount ? 'text-orange-500' : 'text-slate-400'}`} />
              </div>
              <div className="text-left">
                <p className="text-base sm:text-lg font-bold text-slate-900">Ander bedrag</p>
                <p className="text-sm text-slate-400 hidden sm:block">Voer zelf een bedrag in</p>
              </div>
            </div>
          </button>

          {/* Total */}
          {!useCustomAmount && selectedTypes.size > 0 && (
            <div className="mt-4 rounded-2xl bg-slate-900 p-5 sm:p-6 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{selectedTypes.size} item{selectedTypes.size > 1 ? 's' : ''} geselecteerd</p>
                <p className="text-white text-sm">{buildDescription()}</p>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white whitespace-nowrap">{formatSRD(selectedTotal)}</p>
            </div>
          )}

          {/* Next button */}
          <button onClick={handleConfirm} disabled={!canProceed} data-testid="payment-next-btn"
            className="mt-5 w-full py-5 sm:py-6 px-8 rounded-2xl text-lg sm:text-xl font-bold flex items-center justify-center gap-3 transition bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-xl shadow-orange-500/30 active:scale-[0.98]">
            <span>Volgende — {formatSRD(useCustomAmount ? (parseFloat(customAmount) || 0) : selectedTotal)}</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Right - Keypad card */}
        {useCustomAmount && (
          <div className="bg-white rounded-2xl shadow-lg p-7 sm:p-8 lg:p-10 w-full max-w-sm min-w-0">
            <h4 className="text-lg font-bold text-slate-900 mb-1">Bedrag invoeren</h4>
            <p className="text-sm text-slate-400 mb-4">Totaal: {formatSRD(totalDebt)}</p>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 mb-4">
              <p className="text-slate-400 text-xs mb-1">SRD</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">{customAmount || '0.00'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((key) => (
                <button key={key} onClick={() => handleKeypadPress(key)}
                  className={`h-14 sm:h-16 text-xl font-bold rounded-xl transition active:scale-95 ${
                    key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50 border border-slate-100'
                    : 'bg-gradient-to-b from-white to-slate-50 text-slate-900 hover:from-orange-50 hover:to-orange-100 hover:text-orange-600 border border-slate-100'
                  }`}>
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
