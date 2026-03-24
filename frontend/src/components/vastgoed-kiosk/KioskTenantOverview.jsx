import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KioskTenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  const items = [
    {
      label: 'Maandhuur',
      sub: `Gefactureerd t/m ${tenant.rent_billed_through ? (() => {
        const [y, m] = tenant.rent_billed_through.split('-');
        return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      })() : new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
      amount: tenant.monthly_rent || 0,
      icon: Home,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-slate-200',
      amountColor: 'text-slate-900',
    },
    {
      label: 'Openstaande huur',
      sub: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : null,
      amount: tenant.outstanding_rent || 0,
      icon: Wallet,
      iconBg: (tenant.outstanding_rent || 0) > 0 ? 'bg-red-100' : 'bg-green-100',
      iconColor: (tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600',
      borderColor: (tenant.outstanding_rent || 0) > 0 ? 'border-red-200' : 'border-green-200',
      amountColor: (tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      label: 'Servicekosten',
      sub: 'Water, stroom, overig',
      amount: tenant.service_costs || 0,
      icon: FileText,
      iconBg: (tenant.service_costs || 0) > 0 ? 'bg-orange-100' : 'bg-green-100',
      iconColor: (tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600',
      borderColor: (tenant.service_costs || 0) > 0 ? 'border-orange-200' : 'border-green-200',
      amountColor: (tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600',
    },
    {
      label: 'Boetes',
      amount: tenant.fines || 0,
      icon: AlertTriangle,
      iconBg: (tenant.fines || 0) > 0 ? 'bg-red-100' : 'bg-green-100',
      iconColor: (tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600',
      borderColor: (tenant.fines || 0) > 0 ? 'border-red-200' : 'border-green-200',
      amountColor: (tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600',
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header — zelfde als "Wat wilt u betalen?" */}
      <div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-slate-900 transition text-sm sm:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-base sm:text-2xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="text-right">
          <p className="text-slate-900 font-medium text-sm sm:text-base">{tenant.name}</p>
          <p className="text-slate-500 text-xs sm:text-sm">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content — fullwidth, zelfde padding als andere pagina's */}
      <div className="flex-1 p-3 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-auto">
        {/* Links: Profiel + Totaal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Profiel kaart */}
          <div className="bg-white rounded-xl p-4 border-2 border-slate-100 flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{tenant.name}</p>
              <p className="text-slate-500">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {/* Financieel items — zelfde stijl als betaaltype knoppen */}
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between w-full p-3 sm:p-4 rounded-xl border-2 bg-white ${item.borderColor}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold text-slate-900">{item.label}</p>
                      {item.sub && <p className="text-xs sm:text-sm text-slate-500">{item.sub}</p>}
                    </div>
                  </div>
                  <p className={`text-base sm:text-xl font-bold flex-shrink-0 ml-2 ${item.amountColor}`}>
                    {formatSRD(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Achterstand waarschuwing */}
          {tenant.overdue_months?.length > 0 && (
            <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700">Achterstand</p>
                <p className="text-xs text-amber-600">Onbetaalde maanden: {tenant.overdue_months.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Totaal samenvatting — zelfde stijl als de donkere bar in "Wat wilt u betalen?" */}
          <div className="mt-3 sm:mt-4 bg-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm">Totaal openstaand</p>
              <p className="text-white text-xs sm:text-sm">Huur + Servicekosten + Boetes</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white" data-testid="total-amount">{formatSRD(total)}</p>
          </div>
        </div>

        {/* Rechts: Totaal prominent + actie */}
        <div className="w-full lg:w-80 flex flex-col shrink-0">
          <div className={`rounded-2xl p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center ${
            hasDebt
              ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30'
              : 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30'
          }`}>
            {hasDebt ? (
              <>
                <p className="text-white/80 text-sm sm:text-lg mb-2">Te betalen</p>
                <p className="text-4xl sm:text-5xl font-bold text-white mb-4">{formatSRD(total)}</p>
                <CreditCard className="w-10 h-10 text-white/60 mb-4" />
              </>
            ) : (
              <>
                <CheckCircle className="w-14 h-14 text-white/90 mb-3" />
                <p className="text-2xl sm:text-3xl font-bold text-white">Alles betaald!</p>
                <p className="text-white/80 text-sm sm:text-base mt-1">Geen openstaand saldo</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action — zelfde als "Wat wilt u betalen?" */}
      {hasDebt && (
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0">
          <button
            onClick={onPay}
            data-testid="pay-btn"
            className="w-full py-3 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 transition bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 active:scale-[0.98]"
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Betalen — {formatSRD(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
