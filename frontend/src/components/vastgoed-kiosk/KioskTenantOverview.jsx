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
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-lg font-medium">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="w-32" />
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex gap-8">
        {/* Left Panel - Profile & Total */}
        <div className="w-96 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-8 text-center border-2 border-slate-100 shadow-sm">
            <div className="w-24 h-24 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-2">{tenant.name}</h3>
            <p className="text-xl text-slate-500">
              Appt. {tenant.apartment_number} | {tenant.tenant_code}
            </p>
          </div>

          {/* Total Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-center shadow-lg shadow-orange-500/30">
            <p className="text-orange-100 text-lg mb-2">Totaal te betalen</p>
            <p className="text-5xl font-bold text-white" data-testid="total-amount">
              {formatSRD(total)}
            </p>
          </div>

          {/* Arrears Warning */}
          {hasArrears && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-amber-700">Achterstand</p>
                <p className="text-amber-600">
                  {tenant.overdue_months && tenant.overdue_months.length > 0
                    ? `Onbetaalde maanden: ${tenant.overdue_months.join(', ')}`
                    : `${formatSRD((tenant.outstanding_rent || 0) - (tenant.monthly_rent || 0))} boven huidige maandhuur`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {hasDebt ? (
            <button 
              onClick={onPay} 
              data-testid="pay-btn" 
              className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 mt-auto"
            >
              <CreditCard className="w-8 h-8" />
              <span>Betalen</span>
            </button>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center mt-auto">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-3xl font-bold text-green-700">Alles is betaald!</p>
              <p className="text-xl text-green-600">Geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right Panel - Financial Breakdown */}
        <div className="flex-1">
          <h4 className="text-2xl font-bold text-slate-900 mb-6">Financieel overzicht</h4>
          
          <div className="space-y-5">
            {/* Monthly Rent */}
            <div className="bg-white rounded-2xl p-6 flex items-center justify-between border-2 border-slate-100 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Home className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Maandhuur</p>
                  <p className="text-slate-500">
                    Gefactureerd t/m {tenant.rent_billed_through ? (() => {
                      const [y, m] = tenant.rent_billed_through.split('-');
                      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
                    })() : new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatSRD(tenant.monthly_rent)}</p>
            </div>

            {/* Outstanding Rent */}
            <div className={`bg-white rounded-2xl p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.outstanding_rent || 0) > 0 ? 'border-red-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  (tenant.outstanding_rent || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <Wallet className={`w-8 h-8 ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Openstaande huur</p>
                  {tenant.overdue_months && tenant.overdue_months.length > 0 && (
                    <p className="text-sm text-red-500 font-medium mt-0.5">
                      Achterstand: {tenant.overdue_months.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </p>
            </div>

            {/* Service Costs */}
            <div className={`bg-white rounded-2xl p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.service_costs || 0) > 0 ? 'border-orange-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  (tenant.service_costs || 0) > 0 ? 'bg-orange-100' : 'bg-green-100'
                }`}>
                  <FileText className={`w-8 h-8 ${(tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Servicekosten</p>
                  <p className="text-slate-500">water, stroom, overig</p>
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </p>
            </div>

            {/* Fines */}
            <div className={`bg-white rounded-2xl p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.fines || 0) > 0 ? 'border-red-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  (tenant.fines || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <AlertTriangle className={`w-8 h-8 ${(tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Boetes</p>
                </div>
              </div>
              <p className={`text-3xl font-bold ${(tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
