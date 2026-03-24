import { ArrowLeft, User, AlertTriangle, CreditCard, Wallet, FileText, CheckCircle } from 'lucide-react';

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
      desc: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : 'Geen achterstand',
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
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="w-16" />
      </div>

      {/* Content - centered */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6 overflow-auto">
        <div className="w-full max-w-lg">
          {/* Tenant card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{tenant.name}</p>
              <p className="text-sm text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Maandhuur</p>
              <p className="text-base font-bold text-slate-900">{formatSRD(tenant.monthly_rent)}</p>
            </div>
          </div>

          {/* Overdue warning */}
          {tenant.overdue_months?.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Achterstand</p>
                <p className="text-xs text-red-500">{tenant.overdue_months.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Financial items */}
          <div className="space-y-2.5 mb-4">
            {items.map((item) => {
              const Icon = item.icon;
              const hasAmount = item.amount > 0;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                    hasAmount ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      hasAmount ? 'bg-orange-50' : 'bg-green-50'
                    }`}>
                      <Icon className={`w-5 h-5 ${hasAmount ? 'text-orange-500' : 'text-green-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <p className={`text-base font-bold flex-shrink-0 ml-2 ${
                    hasAmount ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {formatSRD(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-slate-900 p-4 flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">Totaal openstaand</p>
            <p className="text-xl font-bold text-white" data-testid="total-amount">{formatSRD(total)}</p>
          </div>

          {/* Status */}
          {!hasDebt && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xl font-bold text-green-700 mb-1">Alles betaald!</p>
              <p className="text-sm text-green-500">Geen openstaand saldo</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action */}
      {hasDebt && (
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100">
          <div className="max-w-lg mx-auto">
            <button
              onClick={onPay}
              data-testid="pay-btn"
              className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              <CreditCard className="w-5 h-5" />
              <span>Betalen — {formatSRD(total)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
