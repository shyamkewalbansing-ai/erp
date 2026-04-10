import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Droplets, AlertCircle, CheckCircle, Wifi } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Huur', icon: Banknote, desc: 'Openstaand huurbedrag' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige' },
  { id: 'fines', label: 'Boetes', icon: AlertCircle, desc: 'Openstaande boetes' },
  { id: 'internet', label: 'Internet', icon: Wifi, desc: 'Internetaansluiting' },
];

export default function KioskPaymentSelect({ tenant, onBack, onConfirm }) {
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [customAmount, setCustomAmount] = useState('');

  if (!tenant) return null;

  const getAmountForType = (type) => {
    switch (type) { case 'rent': return tenant.outstanding_rent || 0; case 'service_costs': return tenant.service_costs || 0; case 'fines': return tenant.fines || 0; case 'internet': return tenant.internet_outstanding || 0; default: return 0; }
  };
  const isTypeDisabled = (type) => getAmountForType(type) <= 0;
  const toggleType = (typeId) => {
    const next = new Set(selectedTypes);
    if (next.has(typeId)) next.delete(typeId); else next.add(typeId);
    setSelectedTypes(next);
    setCustomAmount('');
  };
  const selectedTotal = [...selectedTypes].reduce((sum, t) => sum + getAmountForType(t), 0);
  const buildDescription = () => { const l = []; if (selectedTypes.has('rent')) l.push('Huur'); if (selectedTypes.has('service_costs')) l.push('Servicekosten'); if (selectedTypes.has('fines')) l.push('Boetes'); if (selectedTypes.has('internet')) l.push('Internet'); return l.join(' + '); };
  const getPaymentType = () => { if (selectedTypes.size === 1) return [...selectedTypes][0]; return 'rent'; };
  const totalDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) + (tenant.internet_outstanding || 0);
  const selectAll = () => { const all = new Set(); PAYMENT_TYPES.forEach(t => { if (!isTypeDisabled(t.id)) all.add(t.id); }); setSelectedTypes(all); setCustomAmount(''); };
  const allSelected = PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).every(t => selectedTypes.has(t.id));

  const hasCustom = customAmount && parseFloat(customAmount) > 0;
  const activeAmount = hasCustom ? parseFloat(customAmount) : selectedTotal;
  const canProceed = activeAmount > 0;

  const handleKeypadPress = (val) => {
    if (val === 'DEL') setCustomAmount(prev => prev.slice(0, -1));
    else if (val === '.') { if (!customAmount.includes('.')) setCustomAmount(prev => prev + '.'); }
    else setCustomAmount(prev => prev + val);
    setSelectedTypes(new Set());
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    let amount, description, paymentType;
    if (hasCustom) {
      amount = parseFloat(customAmount);
      description = `Gedeeltelijke betaling - ${formatSRD(amount)}`;
      paymentType = 'partial_rent';
    } else {
      amount = selectedTotal;
      description = buildDescription();
      paymentType = getPaymentType();
    }
    onConfirm({ payment_type: paymentType, amount, description, payment_method: 'cash', rent_month: null });
  };

  return (
    <div className="h-full bg-orange-500 flex flex-col px-3 sm:px-6 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-2 sm:py-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="payselect-back-btn">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">Terug</span>
        </button>
        <span className="text-sm sm:text-base font-semibold text-white">Wat wilt u betalen?</span>
        <div className="text-right text-white hidden sm:block">
          <p className="text-sm font-semibold">{tenant.name}</p>
          <p className="text-xs opacity-70">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content — single column on mobile, side-by-side on desktop */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 sm:gap-3 min-h-0 pb-2">
        {/* Left — Payment type options */}
        <div className="kiosk-card flex-1 md:flex-[3] flex flex-col min-w-0 p-2 sm:p-3">
          {/* Select All */}
          {PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).length > 1 && (
            <button onClick={allSelected ? () => setSelectedTypes(new Set()) : selectAll} data-testid="pay-select-all"
              className={`w-full flex items-center justify-between rounded-lg border-2 transition px-2.5 py-2 sm:px-3 sm:py-2.5 mb-1.5 ${
                allSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center rounded border-2 w-5 h-5 ${allSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                  {allSelected && <CheckCircle className="text-white w-3.5 h-3.5" />}
                </div>
                <span className="text-sm font-bold text-slate-900">Alles betalen</span>
              </div>
              <span className="text-sm sm:text-base font-semibold text-orange-600 whitespace-nowrap">{formatSRD(totalDebt)}</span>
            </button>
          )}

          {/* Payment type rows */}
          <div className="flex flex-col gap-1 sm:gap-1.5 flex-1">
            {PAYMENT_TYPES.map((type) => {
              const disabled = isTypeDisabled(type.id);
              const isSelected = selectedTypes.has(type.id);
              const amount = getAmountForType(type.id);
              const Icon = type.icon;
              return (
                <button key={type.id} disabled={disabled} onClick={() => toggleType(type.id)} data-testid={`pay-type-${type.id}`}
                  className={`flex items-center justify-between w-full rounded-lg border-2 transition px-2.5 py-2 sm:px-3 sm:py-2.5 ${
                    disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                    : isSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center rounded border-2 flex-shrink-0 w-5 h-5 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                      {isSelected && <CheckCircle className="text-white w-3.5 h-3.5" />}
                    </div>
                    <div className={`rounded-lg flex items-center justify-center flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 ${isSelected ? 'bg-orange-100' : 'bg-slate-50'}`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{type.label}</span>
                  </div>
                  <p className={`text-sm sm:text-base flex-shrink-0 ml-2 whitespace-nowrap font-semibold ${disabled ? 'text-slate-300' : isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                    {formatSRD(amount)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Total bar */}
          {selectedTypes.size > 0 && (
            <div className="bg-slate-900 rounded-lg flex items-center justify-between px-3 py-2 sm:py-2.5 mt-1.5">
              <div>
                <p className="text-xs text-slate-400">{selectedTypes.size} item{selectedTypes.size > 1 ? 's' : ''}</p>
                <p className="text-xs text-white">{buildDescription()}</p>
              </div>
              <p className="text-base sm:text-lg font-bold text-white whitespace-nowrap">{formatSRD(selectedTotal)}</p>
            </div>
          )}

          {/* Next button */}
          <button onClick={handleConfirm} disabled={!canProceed} data-testid="payment-next-btn"
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] py-3 sm:py-3.5 mt-1.5 text-sm sm:text-base font-bold">
            <span>Volgende — {formatSRD(activeAmount)}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right — Keypad (hidden on mobile, visible on desktop) */}
        <div className="kiosk-card hidden md:flex flex-none md:flex-[2] flex-col min-w-0 p-4 sm:p-5">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-0.5">Bedrag invoeren</h4>
          <p className="text-xs text-slate-400 mb-3">Totaal openstaand: {formatSRD(totalDebt)}</p>
          <div className={`border-2 rounded-lg transition px-3 py-3 mb-3 ${hasCustom ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-xs text-slate-400 mb-0.5">SRD</p>
            <p className={`font-extrabold font-mono text-2xl sm:text-3xl ${hasCustom ? 'text-orange-600' : 'text-slate-900'}`}>{customAmount || '0.00'}</p>
          </div>
          <div className="grid grid-cols-3 flex-1 gap-1.5">
            {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((key) => (
              <button key={key} onClick={() => handleKeypadPress(key)} data-testid={`custom-key-${key}`}
                className={`rounded-lg font-bold transition active:scale-95 flex items-center justify-center text-base sm:text-lg ${
                  key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50 border border-slate-100'
                  : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                }`}>
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
