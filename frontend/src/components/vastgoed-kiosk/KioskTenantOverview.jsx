import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, Shield, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KioskTenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;
  const hasArrears = (tenant.outstanding_rent || 0) > (tenant.monthly_rent || 0);

  return (
    <div className="kiosk-fullscreen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="kiosk-header">
        <button onClick={onBack} className="kiosk-back-btn">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-3xl font-bold text-white">Uw overzicht</h1>
        <div className="w-32" />
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex gap-8">
        {/* Left Panel - Profile & Total */}
        <div className="w-96 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="bg-slate-800 rounded-3xl p-8 text-center border border-slate-700">
            <div className="w-24 h-24 rounded-full bg-slate-700 text-white flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">{tenant.name}</h3>
            <p className="text-xl text-slate-400">
              Appt. {tenant.apartment_number} | {tenant.tenant_code}
            </p>
          </div>

          {/* Total Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-center border border-slate-700">
            <p className="text-slate-400 text-lg mb-2">Totaal te betalen</p>
            <p className="text-5xl font-bold text-white" data-testid="total-amount">
              {formatSRD(total)}
            </p>
          </div>

          {/* Arrears Warning */}
          {hasArrears && (
            <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-6 flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-amber-300">Achterstand</p>
                <p className="text-amber-400/80">
                  {formatSRD((tenant.outstanding_rent || 0) - (tenant.monthly_rent || 0))} boven huidige maandhuur
                </p>
              </div>
            </div>
          )}

          {/* Deposit Status */}
          {(tenant.deposit_required || 0) > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4">
              <Shield className="w-8 h-8 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-white">Borgsom</p>
                <p className="text-slate-400">
                  {formatSRD(tenant.deposit_paid || 0)} / {formatSRD(tenant.deposit_required)}
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {hasDebt ? (
            <button 
              onClick={onPay} 
              data-testid="pay-btn" 
              className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/30 mt-auto"
            >
              <CreditCard className="w-8 h-8" />
              <span>Betalen</span>
            </button>
          ) : (
            <div className="bg-emerald-500/20 border-2 border-emerald-500/50 rounded-3xl p-8 text-center mt-auto">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-3xl font-bold text-emerald-300">Alles is betaald!</p>
              <p className="text-xl text-emerald-400/80">Geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right Panel - Financial Breakdown */}
        <div className="flex-1">
          <h4 className="text-2xl font-bold text-white mb-6">Financieel overzicht</h4>
          
          <div className="space-y-5">
            {/* Monthly Rent */}
            <div className="kiosk-finance-card">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Home className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Maandhuur</p>
                  <p className="text-slate-400">
                    {new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{formatSRD(tenant.monthly_rent)}</p>
            </div>

            {/* Outstanding Rent */}
            <div className={`kiosk-finance-card ${(tenant.outstanding_rent || 0) > 0 ? 'kiosk-finance-danger' : 'kiosk-finance-success'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${(tenant.outstanding_rent || 0) > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  <Wallet className={`w-8 h-8 ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Openstaande huur</p>
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </p>
            </div>

            {/* Service Costs */}
            <div className={`kiosk-finance-card ${(tenant.service_costs || 0) > 0 ? 'kiosk-finance-warning' : 'kiosk-finance-success'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${(tenant.service_costs || 0) > 0 ? 'bg-orange-500/20' : 'bg-emerald-500/20'}`}>
                  <FileText className={`w-8 h-8 ${(tenant.service_costs || 0) > 0 ? 'text-orange-400' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Servicekosten</p>
                  <p className="text-slate-400">water, stroom, overig</p>
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.service_costs || 0) > 0 ? 'text-orange-400' : 'text-emerald-400'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </p>
            </div>

            {/* Fines */}
            <div className={`kiosk-finance-card ${(tenant.fines || 0) > 0 ? 'kiosk-finance-danger' : 'kiosk-finance-success'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${(tenant.fines || 0) > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                  <AlertTriangle className={`w-8 h-8 ${(tenant.fines || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Boetes</p>
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.fines || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
