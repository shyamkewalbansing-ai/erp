import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, User, AlertTriangle, CreditCard, Wallet, FileText, CheckCircle, Home, Clock, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijk', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borg' };
const METHOD_LABELS = { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' };

export default function KioskTenantOverview({ tenant, onBack, onPay, companyId }) {
  const [showHistory, setShowHistory] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  const loadHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/payments`);
      setPayments(res.data);
    } catch { setPayments([]); }
    finally { setLoadingHistory(false); }
  };

  const items = [
    { label: 'Openstaande huur', desc: tenant.overdue_months?.length > 0 ? `Achterstand: ${tenant.overdue_months.join(', ')}` : 'Geen achterstand', amount: tenant.outstanding_rent || 0, icon: Wallet },
    { label: 'Servicekosten', desc: 'Water, stroom, overig', amount: tenant.service_costs || 0, icon: FileText },
    { label: 'Boetes', desc: 'Openstaande boetes', amount: tenant.fines || 0, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-full bg-orange-500 flex flex-col relative overflow-hidden">

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5">
        <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Uw overzicht</h1>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-start justify-center gap-6 md:gap-8 px-6 sm:px-10 lg:px-12 pb-8 overflow-auto">
        {/* Left - Financial card */}
        <div className="bg-white rounded-lg shadow-sm p-7 sm:p-8 lg:p-10 w-full max-w-xl min-w-0">
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
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-10 lg:p-12 w-full max-w-sm min-w-0 flex flex-col items-center text-center">
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
              <button onClick={loadHistory} data-testid="history-btn"
                className="w-full mt-3 py-3 px-6 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-[0.98]">
                <Clock className="w-5 h-5" /> Betalingsgeschiedenis
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
              <button onClick={loadHistory} data-testid="history-btn-no-debt"
                className="w-full mt-3 py-3 px-6 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-[0.98]">
                <Clock className="w-5 h-5" /> Betalingsgeschiedenis
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment History Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()} data-testid="history-popup">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Betalingsgeschiedenis</h2>
                  <p className="text-sm text-slate-400">{tenant.name}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition" data-testid="history-close-btn">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-auto max-h-[60vh] p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400">Laden...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-lg font-bold text-slate-400">Geen betalingen gevonden</p>
                  <p className="text-sm text-slate-300 mt-1">Er zijn nog geen betalingen geregistreerd</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p, i) => {
                    const date = p.created_at ? new Date(p.created_at) : null;
                    const dateStr = date ? date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <div key={p.payment_id || i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition" data-testid={`history-item-${i}`}>
                        <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold text-slate-900">{formatSRD(p.amount)}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">{TYPE_LABELS[p.payment_type] || p.payment_type}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">{METHOD_LABELS[p.payment_method] || p.payment_method || 'Contant'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-slate-400">{dateStr}</p>
                            {p.kwitantie_nummer && <p className="text-xs text-slate-300">{p.kwitantie_nummer}</p>}
                            {p.covered_months?.length > 0 && <p className="text-xs text-slate-400">{p.covered_months.join(', ')}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setShowHistory(false)} className="w-full py-3 rounded-2xl text-base font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
