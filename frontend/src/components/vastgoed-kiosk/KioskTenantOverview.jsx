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
      <div className="bg-white border-b border-slate-200 p-3 sm:p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm sm:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-lg sm:text-3xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="w-16 sm:w-32" />
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Left Panel - Profile & Total */}
        <div className="w-full lg:w-96 flex flex-col gap-4 sm:gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center border-2 border-slate-100 shadow-sm">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-3 sm:mb-6">
              <User className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">{tenant.name}</h3>
            <p className="text-sm sm:text-xl text-slate-500">
              Appt. {tenant.apartment_number} | {tenant.tenant_code}
            </p>
          </div>

          {/* Total Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center shadow-lg shadow-orange-500/30">
            <p className="text-orange-100 text-sm sm:text-lg mb-1 sm:mb-2">Totaal te betalen</p>
            <p className="text-3xl sm:text-5xl font-bold text-white" data-testid="total-amount">
              {formatSRD(total)}
            </p>
          </div>

          {/* Arrears Warning */}
          {hasArrears && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-6 flex items-center gap-3 sm:gap-4">
              <AlertTriangle className="w-6 h-6 sm:w-10 sm:h-10 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm sm:text-xl font-bold text-amber-700">Achterstand</p>
                <p className="text-xs sm:text-base text-amber-600">
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
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
              <span>Betalen</span>
            </button>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center mt-auto">
              <CheckCircle className="w-10 h-10 sm:w-16 sm:h-16 text-green-500 mx-auto mb-2 sm:mb-4" />
              <p className="text-xl sm:text-3xl font-bold text-green-700">Alles is betaald!</p>
              <p className="text-sm sm:text-xl text-green-600">Geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right Panel - Financial Breakdown */}
        <div className="flex-1">
          <h4 className="text-lg sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-6">Financieel overzicht</h4>
          
          <div className="space-y-3 sm:space-y-5">
            {/* Monthly Rent */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 flex items-center justify-between border-2 border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm sm:text-xl font-bold text-slate-900">Maandhuur</p>
                  <p className="text-xs sm:text-base text-slate-500">
                    Gefactureerd t/m {tenant.rent_billed_through ? (() => {
                      const [y, m] = tenant.rent_billed_through.split('-');
                      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
                    })() : new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="text-lg sm:text-3xl font-bold text-slate-900 flex-shrink-0 ml-2">{formatSRD(tenant.monthly_rent)}</p>
            </div>

            {/* Outstanding Rent */}
            <div className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.outstanding_rent || 0) > 0 ? 'border-red-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-3 sm:gap-6">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                  (tenant.outstanding_rent || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <Wallet className={`w-5 h-5 sm:w-8 sm:h-8 ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm sm:text-xl font-bold text-slate-900">Openstaande huur</p>
                  {tenant.overdue_months && tenant.overdue_months.length > 0 && (
                    <p className="text-xs sm:text-sm text-red-500 font-medium mt-0.5">
                      Achterstand: {tenant.overdue_months.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <p className={`text-lg sm:text-3xl font-bold flex-shrink-0 ml-2 ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </p>
            </div>

            {/* Service Costs */}
            <div className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.service_costs || 0) > 0 ? 'border-orange-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-3 sm:gap-6">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                  (tenant.service_costs || 0) > 0 ? 'bg-orange-100' : 'bg-green-100'
                }`}>
                  <FileText className={`w-5 h-5 sm:w-8 sm:h-8 ${(tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm sm:text-xl font-bold text-slate-900">Servicekosten</p>
                  <p className="text-xs sm:text-base text-slate-500">water, stroom, overig</p>
                </div>
              </div>
              <p className={`text-lg sm:text-3xl font-bold flex-shrink-0 ml-2 ${(tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </p>
            </div>

            {/* Fines */}
            <div className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 flex items-center justify-between border-2 shadow-sm ${
              (tenant.fines || 0) > 0 ? 'border-red-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-3 sm:gap-6">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                  (tenant.fines || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 sm:w-8 sm:h-8 ${(tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm sm:text-xl font-bold text-slate-900">Boetes</p>
                </div>
              </div>
              <p className={`text-lg sm:text-3xl font-bold flex-shrink-0 ml-2 ${(tenant.fines || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
