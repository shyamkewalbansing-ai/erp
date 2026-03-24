import { ArrowLeft, User, AlertTriangle, CreditCard, Wallet, FileText, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KioskTenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  const items = [
    { label: 'Openstaande huur', desc: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : 'Geen achterstand', amount: tenant.outstanding_rent || 0, icon: Wallet },
    { label: 'Servicekosten', desc: 'Water, stroom, overig', amount: tenant.service_costs || 0, icon: FileText },
    { label: 'Boetes', desc: 'Openstaande boetes', amount: tenant.fines || 0, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-orange-600/30 rounded-l-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Uw overzicht</h1>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 px-4 sm:px-8 pb-6 overflow-auto">
        {/* Left - Financial cards */}
        <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-lg">
          {/* Tenant info */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 mb-4">
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{tenant.name}</p>
              <p className="text-xs text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-slate-400">Maandhuur</p>
              <p className="text-sm font-bold text-slate-900">{formatSRD(tenant.monthly_rent)}</p>
            </div>
          </div>

          {/* Overdue warning */}
          {tenant.overdue_months?.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Achterstand</p>
                <p className="text-xs text-red-500">{tenant.overdue_months.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2.5 mb-4">
            {items.map((item) => {
              const Icon = item.icon;
              const hasAmount = item.amount > 0;
              return (
                <div key={item.label}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                    hasAmount ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${hasAmount ? 'bg-orange-50' : 'bg-green-50'}`}>
                      <Icon className={`w-5 h-5 ${hasAmount ? 'text-orange-500' : 'text-green-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <p className={`text-base font-bold flex-shrink-0 ml-2 ${hasAmount ? 'text-red-500' : 'text-green-500'}`}>
                    {formatSRD(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-slate-900 p-4 flex items-center justify-between">
            <p className="text-slate-400 text-sm">Totaal openstaand</p>
            <p className="text-xl font-bold text-white" data-testid="total-amount">{formatSRD(total)}</p>
          </div>
        </div>

        {/* Right - Status / Action */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-xs flex flex-col items-center text-center">
          {hasDebt ? (
            <>
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-sm text-slate-400 mb-1">Te betalen</p>
              <p className="text-3xl font-bold text-slate-900 mb-6">{formatSRD(total)}</p>
              <button
                onClick={onPay}
                data-testid="pay-btn"
                className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98]"
              >
                <CreditCard className="w-5 h-5" />
                Betalen
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-700 mb-1">Alles betaald!</p>
              <p className="text-sm text-green-500">Geen openstaand saldo</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
