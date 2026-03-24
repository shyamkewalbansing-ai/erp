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
      label: 'Openstaande huur',
      desc: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : 'Huur',
      amount: tenant.outstanding_rent || 0,
      icon: Wallet,
    },
    {
      label: 'Servicekosten',
      desc: 'Water, stroom, overig',
      amount: tenant.service_costs || 0,
      icon: FileText,
    },
    {
      label: 'Boetes',
      desc: 'Openstaande boetes',
      amount: tenant.fines || 0,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header — exact als KioskPaymentSelect */}
      <div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-slate-900 transition text-sm sm:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-base sm:text-2xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="text-right hidden sm:block">
          <p className="text-slate-900 font-medium">{tenant.name}</p>
          <p className="text-slate-500">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content — exact zelfde padding en layout als KioskPaymentSelect */}
      <div className="flex-1 p-3 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-auto">
        {/* Links: Overzicht items */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Profiel kaart — zelfde stijl als "Alles betalen" knop */}
          <div className="mb-3 p-3 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500" />
              </div>
              <div>
                <p className="text-sm sm:text-lg font-bold text-slate-900">{tenant.name}</p>
                <p className="text-xs sm:text-sm text-slate-500">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-slate-400">Maandhuur</p>
              <p className="text-base sm:text-xl font-bold text-slate-900">{formatSRD(tenant.monthly_rent)}</p>
            </div>
          </div>

          {/* Achterstand waarschuwing */}
          {tenant.overdue_months?.length > 0 && (
            <div className="mb-3 p-3 rounded-xl border-2 border-red-300 bg-red-50 flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm sm:text-lg font-bold text-red-700">Achterstand</p>
                <p className="text-xs sm:text-sm text-red-600">{tenant.overdue_months.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Financieel items — exact zelfde stijl als betaaltype knoppen */}
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              const hasAmount = item.amount > 0;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between w-full p-3 sm:p-4 rounded-xl border-2 transition ${
                    hasAmount ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                      hasAmount ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${hasAmount ? 'text-orange-500' : 'text-green-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm sm:text-lg font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">{item.desc}</p>
                    </div>
                  </div>
                  <p className={`text-base sm:text-xl font-bold flex-shrink-0 ml-2 ${
                    hasAmount ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatSRD(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Totaal bar — exact zelfde als in KioskPaymentSelect */}
          <div className="mt-3 sm:mt-4 bg-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm">Totaal openstaand</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white" data-testid="total-amount">{formatSRD(total)}</p>
          </div>
        </div>

        {/* Rechts: Status paneel — zelfde positie als het keypad in KioskPaymentSelect */}
        <div className="w-full lg:w-80 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-slate-100 shadow-sm shrink-0 flex flex-col items-center justify-center text-center">
          {hasDebt ? (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
              </div>
              <p className="text-slate-500 text-sm sm:text-base mb-1">Te betalen</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{formatSRD(total)}</p>
              <div className="w-full space-y-2 text-left text-xs sm:text-sm text-slate-500">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Maandhuur</span>
                  <span className="text-slate-900 font-medium">{formatSRD(tenant.monthly_rent)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Gefactureerd t/m</span>
                  <span className="text-slate-900 font-medium">
                    {tenant.rent_billed_through ? (() => {
                      const [y, m] = tenant.rent_billed_through.split('-');
                      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
                    })() : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Huurderscode</span>
                  <span className="text-slate-900 font-medium font-mono">{tenant.tenant_code}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">Alles betaald!</p>
              <p className="text-sm sm:text-base text-green-600">Geen openstaand saldo</p>
            </>
          )}
        </div>
      </div>

      {/* Bottom Action — exact zelfde als KioskPaymentSelect */}
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
