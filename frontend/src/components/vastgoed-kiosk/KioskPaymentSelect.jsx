import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Droplets, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [customAmount, setCustomAmount] = useState('');

  if (!tenant) return null;

  const getAmountForType = (type) => {
    switch (type) { case 'rent': return tenant.outstanding_rent || 0; case 'service_costs': return tenant.service_costs || 0; case 'fines': return tenant.fines || 0; default: return 0; }
  };
  const isTypeDisabled = (type) => getAmountForType(type) <= 0;
  const toggleType = (typeId) => {
    const next = new Set(selectedTypes);
    if (next.has(typeId)) next.delete(typeId); else next.add(typeId);
    setSelectedTypes(next);
    setCustomAmount('');
  };
  const selectedTotal = [...selectedTypes].reduce((sum, t) => sum + getAmountForType(t), 0);
  const buildDescription = () => { const l = []; if (selectedTypes.has('rent')) l.push('Huur'); if (selectedTypes.has('service_costs')) l.push('Servicekosten'); if (selectedTypes.has('fines')) l.push('Boetes'); return l.join(' + '); };
  const getPaymentType = () => { if (selectedTypes.size === 1) return [...selectedTypes][0]; return 'rent'; };
  const totalDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
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
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="payselect-back-btn">
          <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
          <span className="kiosk-body">Terug</span>
        </button>
        <span className="kiosk-subtitle text-white">Wat wilt u betalen?</span>
        <div className="text-right text-white hidden sm:block">
          <p className="kiosk-body font-semibold">{tenant.name}</p>
          <p className="kiosk-small opacity-70">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-[1vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>
        {/* Left - Payment type options */}
        <div className="kiosk-card flex-[3] flex flex-col min-w-0" style={{ padding: 'clamp(8px, 1.2vh, 16px) clamp(10px, 1.2vw, 20px)' }}>
          {/* Select All */}
          {PAYMENT_TYPES.filter(t => !isTypeDisabled(t.id)).length > 1 && (
            <button onClick={allSelected ? () => setSelectedTypes(new Set()) : selectAll} data-testid="pay-select-all"
              className={`w-full flex items-center justify-between rounded-lg border-2 transition ${
                allSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-200 hover:border-orange-300'}`}
              style={{ padding: 'clamp(8px, 1.2vh, 16px) clamp(8px, 1vw, 16px)', marginBottom: 'clamp(4px, 0.6vh, 10px)' }}>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center rounded border-2 ${allSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`} style={{ width: '2.2vh', height: '2.2vh' }}>
                  {allSelected && <CheckCircle className="text-white" style={{ width: '1.5vh', height: '1.5vh' }} />}
                </div>
                <span className="kiosk-body font-bold text-slate-900">Alles betalen</span>
              </div>
              <span className="kiosk-subtitle text-orange-600 whitespace-nowrap">{formatSRD(totalDebt)}</span>
            </button>
          )}

          {/* Payment type rows */}
          <div className="flex-1 flex flex-col" style={{ gap: 'clamp(3px, 0.5vh, 8px)' }}>
            {PAYMENT_TYPES.map((type) => {
              const disabled = isTypeDisabled(type.id);
              const isSelected = selectedTypes.has(type.id);
              const amount = getAmountForType(type.id);
              const Icon = type.icon;
              return (
                <button key={type.id} disabled={disabled} onClick={() => toggleType(type.id)} data-testid={`pay-type-${type.id}`}
                  className={`flex items-center justify-between w-full rounded-lg border-2 transition ${
                    disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                    : isSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}
                  style={{ padding: 'clamp(6px, 1vh, 16px) clamp(8px, 1vw, 16px)' }}>
                  <div className="flex items-center" style={{ gap: 'clamp(6px, 0.8vw, 14px)' }}>
                    <div className={`flex items-center justify-center rounded border-2 flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`} style={{ width: '2.2vh', height: '2.2vh' }}>
                      {isSelected && <CheckCircle className="text-white" style={{ width: '1.5vh', height: '1.5vh' }} />}
                    </div>
                    <div className={`rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-100' : 'bg-slate-50'}`} style={{ width: '4vh', height: '4vh' }}>
                      <Icon style={{ width: '2vh', height: '2vh' }} className={isSelected ? 'text-orange-500' : 'text-slate-400'} />
                    </div>
                    <div className="text-left">
                      <p className="kiosk-body font-bold text-slate-900">{type.label}</p>
                      <p className="kiosk-small text-slate-400 hidden sm:block">{type.desc}</p>
                    </div>
                  </div>
                  <p className={`kiosk-subtitle flex-shrink-0 ml-2 whitespace-nowrap ${disabled ? 'text-slate-300' : isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                    {formatSRD(amount)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Total bar */}
          {selectedTypes.size > 0 && (
            <div className="bg-slate-900 rounded-lg flex items-center justify-between" style={{ padding: 'clamp(8px, 1.2vh, 16px) clamp(10px, 1.2vw, 20px)', marginTop: 'clamp(4px, 0.6vh, 10px)' }}>
              <div>
                <p className="kiosk-small text-slate-400">{selectedTypes.size} item{selectedTypes.size > 1 ? 's' : ''}</p>
                <p className="kiosk-small text-white">{buildDescription()}</p>
              </div>
              <p className="kiosk-amount-md text-white whitespace-nowrap">{formatSRD(selectedTotal)}</p>
            </div>
          )}

          {/* Next button */}
          <button onClick={handleConfirm} disabled={!canProceed} data-testid="payment-next-btn"
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg flex items-center justify-center gap-2 transition active:scale-[0.98]"
            style={{ padding: 'clamp(10px, 1.8vh, 24px)', marginTop: 'clamp(4px, 0.6vh, 10px)', fontSize: 'clamp(14px, 2vh, 22px)', fontWeight: 700 }}>
            <span>Volgende — {formatSRD(activeAmount)}</span>
            <ArrowRight style={{ width: '2.5vh', height: '2.5vh' }} />
          </button>
        </div>

        {/* Right - Keypad always visible */}
        <div className="kiosk-card flex-[2] flex flex-col min-w-0" style={{ padding: 'clamp(12px, 2vh, 28px) clamp(10px, 1.5vw, 24px)' }}>
          <h4 className="kiosk-subtitle font-bold text-slate-900" style={{ marginBottom: '0.3vh' }}>Bedrag invoeren</h4>
          <p className="kiosk-small text-slate-400" style={{ marginBottom: '1.5vh' }}>Totaal openstaand: {formatSRD(totalDebt)}</p>
          <div className={`border-2 rounded-lg transition ${hasCustom ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'}`} style={{ padding: 'clamp(8px, 1.5vh, 20px)', marginBottom: '2vh' }}>
            <p className="kiosk-small text-slate-400" style={{ marginBottom: '0.3vh' }}>SRD</p>
            <p className={`font-extrabold font-mono ${hasCustom ? 'text-orange-600' : 'text-slate-900'}`} style={{ fontSize: 'clamp(20px, 3.5vh, 44px)' }}>{customAmount || '0.00'}</p>
          </div>
          <div className="grid grid-cols-3 flex-1" style={{ gap: 'clamp(4px, 0.6vh, 10px)' }}>
            {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((key) => (
              <button key={key} onClick={() => handleKeypadPress(key)} data-testid={`custom-key-${key}`}
                className={`rounded-lg font-bold transition active:scale-95 flex items-center justify-center ${
                  key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50 border border-slate-100'
                  : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                }`}
                style={{ fontSize: 'clamp(16px, 2.2vh, 26px)' }}>
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
