import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KioskTenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;
  const hasArrears = (tenant.outstanding_rent || 0) > (tenant.monthly_rent || 0);

  const items = [
    {
      label: 'Maandhuur',
      sub: `Gefactureerd t/m ${tenant.rent_billed_through ? (() => {
        const [y, m] = tenant.rent_billed_through.split('-');
        return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      })() : new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
      amount: tenant.monthly_rent || 0,
      icon: Home,
      color: 'bg-indigo-100 text-indigo-600',
      always: true,
    },
    {
      label: 'Openstaande huur',
      sub: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : null,
      amount: tenant.outstanding_rent || 0,
      icon: Wallet,
      color: (tenant.outstanding_rent || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600',
      amountColor: (tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600',
      borderColor: (tenant.outstanding_rent || 0) > 0 ? 'border-red-200' : 'border-green-200',
    },
    {
      label: 'Servicekosten',
      sub: 'Water, stroom, overig',
      amount: tenant.service_costs || 0,
      icon: FileText,
      color: (tenant.service_costs || 0) > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600',
      amountColor: (tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600',
      borderColor: (tenant.service_costs || 0) > 0 ? 'border-orange-200' : 'border-green-200',
    },
    {
      label: 'Boetes',
      amount: tenant.fines || 0,
      icon: AlertTriangle,
      color: (tenant.fines || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600',
      amountColor: (tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600',
      borderColor: (tenant.fines || 0) > 0 ? 'border-red-200' : 'border-green-200',
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-3 sm:p-4 lg:p-6 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 sm:gap-2 text-slate-500 hover:text-slate-900 transition text-sm sm:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="w-16 sm:w-32" />
      </div>

      {/* Hero: Profile + Total */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          {/* Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900">{tenant.name}</h2>
              <p className="text-sm sm:text-lg text-slate-500">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 hidden sm:block" />

          {/* Total Badge */}
          <div className={`w-full sm:w-auto rounded-2xl px-6 sm:px-10 py-4 sm:py-5 text-center ${
            hasDebt
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20'
              : 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/20'
          }`}>
            <p className="text-white/80 text-xs sm:text-sm mb-0.5">Totaal te betalen</p>
            <p className="text-2xl sm:text-4xl font-bold text-white" data-testid="total-amount">{formatSRD(total)}</p>
          </div>
        </div>
      </div>

      {/* Arrears Warning */}
      {hasArrears && (
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm sm:text-lg font-bold text-amber-700">Achterstand gedetecteerd</p>
              <p className="text-xs sm:text-base text-amber-600">
                {tenant.overdue_months?.length > 0
                  ? `Onbetaalde maanden: ${tenant.overdue_months.join(', ')}`
                  : `${formatSRD((tenant.outstanding_rent || 0) - (tenant.monthly_rent || 0))} boven huidige maandhuur`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Breakdown */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Financieel overzicht</h3>
        <div className="space-y-2 sm:space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center justify-between border-2 ${item.borderColor || 'border-slate-100'} shadow-sm`}>
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-xl font-bold text-slate-900">{item.label}</p>
                    {item.sub && <p className="text-xs sm:text-sm text-slate-500">{item.sub}</p>}
                  </div>
                </div>
                <p className={`text-lg sm:text-3xl font-bold flex-shrink-0 ml-2 ${item.amountColor || 'text-slate-900'}`}>
                  {formatSRD(item.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="bg-white border-t border-slate-200 p-3 sm:p-4 lg:p-6 shrink-0">
        <div className="max-w-5xl mx-auto">
          {hasDebt ? (
            <button
              onClick={onPay}
              data-testid="pay-btn"
              className="w-full py-4 sm:py-5 px-8 rounded-xl sm:rounded-2xl text-lg sm:text-2xl font-bold flex items-center justify-center gap-3 transition active:scale-[0.98] bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
            >
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
              <span>Betalen — {formatSRD(total)}</span>
            </button>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center">
              <CheckCircle className="w-10 h-10 sm:w-14 sm:h-14 text-green-500 mx-auto mb-2 sm:mb-3" />
              <p className="text-xl sm:text-3xl font-bold text-green-700">Alles is betaald!</p>
              <p className="text-sm sm:text-lg text-green-600 mt-1">Geen openstaand saldo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
