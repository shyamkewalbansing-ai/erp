import { ArrowLeft, ArrowRight, User, AlertTriangle, CreditCard, Wallet, FileText, CheckCircle, Home } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BG_DECOR = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
    <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
    <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
    <div className="absolute bottom-[10%] left-[8%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
    <div className="absolute bottom-[14%] left-[10%] w-20 h-20 bg-white/5 rounded-full" />
    <div className="absolute top-[45%] right-[6%] w-28 h-28 border-[3px] border-white/8 rounded-full" />
    <div className="absolute top-0 left-[40%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
    <div className="absolute top-[35%] left-[4%] w-3 h-3 bg-white/15 rounded-full" />
    <div className="absolute top-[60%] right-[15%] w-4 h-4 bg-white/10 rounded-full" />
  </div>
);

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
      <BG_DECOR />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5">
        <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Uw overzicht</h1>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 lg:gap-8 px-6 sm:px-10 lg:px-12 pb-8 overflow-auto">
        {/* Left - Financial card */}
        <div className="bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-7 sm:p-8 lg:p-10 w-full max-w-xl border border-white/50">
          {/* Tenant info */}
          <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-100 mb-5">
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <User className="w-7 h-7 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">{tenant.name}</p>
              <p className="text-sm text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Maandhuur</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 whitespace-nowrap">{formatSRD(tenant.monthly_rent)}</p>
            </div>
          </div>

          {/* Overdue warning */}
          {tenant.overdue_months?.length > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-200 mb-5">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-base font-bold text-red-700">Achterstand</p>
                <p className="text-sm text-red-500">{tenant.overdue_months.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-3 mb-5">
            {items.map((item) => {
              const Icon = item.icon;
              const hasAmount = item.amount > 0;
              return (
                <div key={item.label}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition ${
                    hasAmount ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-50'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${hasAmount ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
                      <Icon className={`w-6 h-6 ${hasAmount ? 'text-orange-500' : 'text-green-500'}`} />
                    </div>
                    <div>
                      <p className="text-base sm:text-lg font-bold text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <p className={`text-base sm:text-lg font-extrabold flex-shrink-0 ml-3 whitespace-nowrap ${hasAmount ? 'text-red-500' : 'text-green-500'}`}>
                    {formatSRD(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-slate-900 p-5 sm:p-6 flex items-center justify-between">
            <p className="text-slate-400 text-base">Totaal openstaand</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white whitespace-nowrap" data-testid="total-amount">{formatSRD(total)}</p>
          </div>
        </div>

        {/* Right - Status card */}
        <div className="bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-8 sm:p-10 lg:p-12 w-full max-w-sm flex flex-col items-center text-center border border-white/50">
          {hasDebt ? (
            <>
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5 shadow-sm border border-orange-100">
                <CreditCard className="w-10 h-10 text-orange-500" />
              </div>
              <p className="text-base text-slate-400 mb-2">Te betalen</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8 tracking-tight whitespace-nowrap">{formatSRD(total)}</p>
              <button onClick={onPay} data-testid="pay-btn"
                className="w-full py-5 sm:py-6 px-8 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 transition active:scale-[0.98]">
                Volgende
                <ArrowRight className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 shadow-sm border border-green-100">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-green-700 mb-2 tracking-tight">Alles betaald!</p>
              <p className="text-base text-green-500 mb-8">Geen openstaand saldo</p>
              <button onClick={onBack} data-testid="back-home-btn"
                className="w-full py-5 sm:py-6 px-8 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 transition active:scale-[0.98]">
                <Home className="w-6 h-6" />
                Terug naar start
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
