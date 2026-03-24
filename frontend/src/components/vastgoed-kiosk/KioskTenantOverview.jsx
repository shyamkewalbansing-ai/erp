import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, CheckCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KioskTenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header — zelfde als alle kiosk pagina's */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm sm:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Terug</span>
        </button>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Uw overzicht</h1>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 lg:px-16 xl:px-32 py-6 sm:py-8 overflow-auto">
        {/* Profiel */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{tenant.name}</p>
            <p className="text-sm sm:text-base text-slate-400">Appt. {tenant.apartment_number} · {tenant.tenant_code}</p>
          </div>
        </div>

        {/* Achterstand waarschuwing */}
        {tenant.overdue_months?.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">Achterstand: <span className="font-semibold">{tenant.overdue_months.join(', ')}</span></p>
          </div>
        )}

        {/* Financieel overzicht — tabel */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Omschrijving</th>
                <th className="text-right px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm sm:text-base font-medium text-slate-900">Maandhuur</p>
                      <p className="text-xs text-slate-400">
                        Gefactureerd t/m {tenant.rent_billed_through ? (() => {
                          const [y, m] = tenant.rent_billed_through.split('-');
                          return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
                        })() : '-'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right text-sm sm:text-base font-semibold text-slate-900">{formatSRD(tenant.monthly_rent)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm sm:text-base font-medium text-slate-900">Openstaande huur</p>
                  </div>
                </td>
                <td className={`px-4 sm:px-6 py-4 text-right text-sm sm:text-base font-semibold ${(tenant.outstanding_rent || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatSRD(tenant.outstanding_rent)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm sm:text-base font-medium text-slate-900">Servicekosten</p>
                  </div>
                </td>
                <td className={`px-4 sm:px-6 py-4 text-right text-sm sm:text-base font-semibold ${(tenant.service_costs || 0) > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                  {formatSRD(tenant.service_costs)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm sm:text-base font-medium text-slate-900">Boetes</p>
                  </div>
                </td>
                <td className={`px-4 sm:px-6 py-4 text-right text-sm sm:text-base font-semibold ${(tenant.fines || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatSRD(tenant.fines)}
                </td>
              </tr>
              {/* Totaal */}
              <tr className="bg-slate-50">
                <td className="px-4 sm:px-6 py-4">
                  <p className="text-sm sm:text-base font-bold text-slate-900">Totaal openstaand</p>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right">
                  <p className={`text-lg sm:text-xl font-bold ${total > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="total-amount">
                    {formatSRD(total)}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Status */}
        {!hasDebt && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-lg sm:text-xl font-bold text-green-700">Alles is betaald!</p>
            <p className="text-sm text-green-600">Geen openstaand saldo</p>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      {hasDebt && (
        <div className="bg-white border-t border-slate-200 px-4 sm:px-8 lg:px-16 xl:px-32 py-4 shrink-0">
          <button
            onClick={onPay}
            data-testid="pay-btn"
            className="w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition active:scale-[0.98] bg-orange-500 hover:bg-orange-600 text-white"
          >
            <CreditCard className="w-6 h-6" />
            <span>Betalen — {formatSRD(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
