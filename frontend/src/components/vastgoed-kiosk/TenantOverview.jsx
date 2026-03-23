import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, ShieldCheck } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;
  const hasArrears = tenant.outstanding_rent > tenant.monthly_rent;
  const currentMonth = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1e293b] text-white p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
          Terug
        </button>
        <h2 className="text-2xl font-bold">Uw overzicht</h2>
        <div className="w-24"></div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex gap-6">
        {/* Left - Tenant profile + action */}
        <div className="w-1/3 flex flex-col gap-4">
          {/* Profile card */}
          <div className="bg-[#f8fafc] rounded-2xl p-6 text-center border border-[#e2e8f0]">
            <div className="w-20 h-20 rounded-full bg-[#1e293b] text-white flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-1">{tenant.name}</h3>
            <p className="text-[#64748b]">Appt. {tenant.apartment_number}|{tenant.tenant_code}</p>
          </div>

          {/* Total prominent */}
          <div className="bg-[#1e293b] text-white rounded-2xl p-6 text-center">
            <p className="text-[#94a3b8] mb-2">Totaal te betalen</p>
            <p className="text-4xl font-bold" data-testid="total-amount">{formatSRD(total)}</p>
          </div>

          {/* Arrears warning */}
          {hasArrears && (
            <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-[#f59e0b]" />
              <div>
                <p className="font-semibold text-[#92400e]">Achterstand</p>
                <p className="text-sm text-[#a16207]">{formatSRD(tenant.outstanding_rent - tenant.monthly_rent)} boven huidige maandhuur</p>
              </div>
            </div>
          )}

          {/* Deposit status */}
          {tenant.deposit_required > 0 && (
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#64748b]" />
              <div>
                <p className="font-semibold text-[#0f172a]">Borgsom</p>
                <p className="text-sm text-[#64748b]">{formatSRD(tenant.deposit_paid)} / {formatSRD(tenant.deposit_required)}</p>
              </div>
            </div>
          )}

          {/* Pay button */}
          {hasDebt ? (
            <button onClick={onPay} data-testid="pay-btn" className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-5 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 transition shadow-lg mt-auto">
              <CreditCard className="w-6 h-6" />
              Betalen
            </button>
          ) : (
            <div className="bg-[#dcfce7] text-[#16a34a] rounded-xl p-6 text-center mt-auto">
              <p className="text-2xl font-bold">Alles is betaald!</p>
              <p className="text-[#22c55e]">Geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right - Financial breakdown */}
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-[#0f172a] mb-4">Financieel overzicht</h4>
          
          {/* Breakdown cards */}
          <div className="space-y-4">
            {/* Monthly rent info */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#e0e7ff] flex items-center justify-center">
                  <Home className="w-6 h-6 text-[#4f46e5]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0f172a]">Maandhuur</p>
                  <p className="text-sm text-[#64748b]">{currentMonth}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-[#0f172a]">{formatSRD(tenant.monthly_rent)}</p>
            </div>

            {/* Outstanding rent */}
            <div className={`bg-white border-2 rounded-xl p-4 flex items-center justify-between ${tenant.outstanding_rent > 0 ? 'border-[#fca5a5]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tenant.outstanding_rent > 0 ? 'bg-[#fee2e2]' : 'bg-[#dcfce7]'}`}>
                  <Wallet className={`w-6 h-6 ${tenant.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} />
                </div>
                <div>
                  <p className="font-semibold text-[#0f172a]">Openstaande huur</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${tenant.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </p>
            </div>

            {/* Service costs */}
            <div className={`bg-white border-2 rounded-xl p-4 flex items-center justify-between ${tenant.service_costs > 0 ? 'border-[#fdba74]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tenant.service_costs > 0 ? 'bg-[#fff7ed]' : 'bg-[#dcfce7]'}`}>
                  <FileText className={`w-6 h-6 ${tenant.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`} />
                </div>
                <div>
                  <p className="font-semibold text-[#0f172a]">Servicekosten</p>
                  <p className="text-sm text-[#64748b]">water, stroom, overig</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${tenant.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </p>
            </div>

            {/* Fines */}
            <div className={`bg-white border-2 rounded-xl p-4 flex items-center justify-between ${tenant.fines > 0 ? 'border-[#fca5a5]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tenant.fines > 0 ? 'bg-[#fee2e2]' : 'bg-[#dcfce7]'}`}>
                  <AlertTriangle className={`w-6 h-6 ${tenant.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} />
                </div>
                <div>
                  <p className="font-semibold text-[#0f172a]">Boetes</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${tenant.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
