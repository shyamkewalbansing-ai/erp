import { useState } from 'react';
import { ArrowLeft, ArrowRight, User, CreditCard, Wallet, FileText, CheckCircle, Home, Clock, X, Wifi } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijk', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borg' };
const METHOD_LABELS = { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' };

export default function KioskTenantOverview({ tenant, onBack, onPay, companyId, variant = 'default' }) {
  const [showHistory, setShowHistory] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) + (tenant.internet_outstanding || 0);
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
    { label: 'Maandhuur', value: tenant.monthly_rent || 0, icon: Home },
    { label: 'Openstaande huur', value: tenant.outstanding_rent || 0, icon: Wallet, highlight: true, overdue: tenant.overdue_months },
    { label: 'Servicekosten', value: tenant.service_costs || 0, icon: FileText },
    { label: 'Boetes', value: tenant.fines || 0, icon: FileText },
    { label: 'Internet', value: tenant.internet_outstanding || 0, icon: Wifi },
  ];

  if (variant === 'huurder') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 3vw 0' }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ minHeight: '7vh', padding: '1vh 0.5vw' }}>
          <button onClick={onBack} className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="back-btn">
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
          <div className="flex items-center gap-2 text-white">
            <User style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-subtitle truncate max-w-[40vw]">{tenant.name}</span>
            <span className="kiosk-body opacity-70 whitespace-nowrap">Appt. {tenant.apartment_number}</span>
          </div>
          <div className="hidden sm:block" style={{ width: '6vw' }} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
          <div className="bg-white flex flex-col" style={{ width: 'clamp(300px, 90vw, 860px)', borderRadius: 'clamp(16px, 2vh, 28px)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Tenant banner */}
            <div className="bg-slate-900 text-white flex items-center justify-between" style={{ padding: 'clamp(14px, 2.5vh, 32px) clamp(16px, 2vw, 36px)' }}>
              <div className="flex items-center" style={{ gap: 'clamp(8px, 1vw, 18px)' }}>
                <div className="rounded-full bg-white/10 flex items-center justify-center" style={{ width: '5vh', height: '5vh' }}>
                  <User style={{ width: '2.5vh', height: '2.5vh' }} className="text-white" />
                </div>
                <div>
                  <p className="kiosk-subtitle font-bold">{tenant.name}</p>
                  <p className="kiosk-small opacity-60">Appartement {tenant.apartment_number} · {tenant.tenant_code}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="kiosk-small opacity-60">Totaal openstaand</p>
                <p className="kiosk-amount-md whitespace-nowrap">{formatSRD(total)}</p>
              </div>
            </div>

            {/* Financial tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'clamp(6px, 0.8vw, 14px)', padding: 'clamp(12px, 2vh, 28px) clamp(14px, 2vw, 32px)' }}>
              {items.map((item, i) => {
                const Icon = item.icon;
                const isHighlight = item.highlight && item.value > 0;
                return (
                  <div key={i} className={`flex items-center justify-between rounded-xl transition ${isHighlight ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50 border-2 border-transparent'}`}
                    style={{ padding: 'clamp(10px, 1.8vh, 24px) clamp(10px, 1.2vw, 20px)' }}>
                    <div className="flex items-center" style={{ gap: 'clamp(6px, 0.8vw, 14px)' }}>
                      <div className={`rounded-lg flex items-center justify-center ${isHighlight ? 'bg-orange-100' : 'bg-white'}`} style={{ width: '4vh', height: '4vh' }}>
                        <Icon style={{ width: '2vh', height: '2vh' }} className={isHighlight ? 'text-orange-500' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className={`kiosk-body font-semibold ${isHighlight ? 'text-orange-700' : 'text-slate-500'}`}>{item.label}</span>
                        {item.overdue?.length > 0 && (
                          <p style={{ fontSize: '10px' }} className="text-red-500 font-medium">{item.overdue.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className={`kiosk-subtitle whitespace-nowrap ${isHighlight ? 'text-orange-600' : 'text-slate-800'}`}>{formatSRD(item.value)}</span>
                  </div>
                );
              })}
            </div>

            {/* Action bar */}
            <div style={{ padding: '0 clamp(14px, 2vw, 32px) clamp(14px, 2.5vh, 32px)' }}>
              {hasDebt ? (
                <>
                  <button onClick={onPay} data-testid="pay-btn"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98]"
                    style={{ padding: 'clamp(12px, 2.2vh, 28px)', marginBottom: '1vh' }}>
                    <span className="kiosk-btn-text">Betalen — {formatSRD(total)}</span>
                    <ArrowRight style={{ width: '2.5vh', height: '2.5vh' }} />
                  </button>
                  <button onClick={loadHistory} data-testid="history-btn"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center gap-2 rounded-xl transition"
                    style={{ padding: 'clamp(8px, 1.4vh, 18px)' }}>
                    <Clock style={{ width: '1.8vh', height: '1.8vh' }} />
                    <span className="kiosk-small font-semibold">Betalingsgeschiedenis</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-green-600" style={{ marginBottom: '2vh' }}>
                    <CheckCircle style={{ width: '3vh', height: '3vh' }} />
                    <span className="kiosk-subtitle font-bold">Alles betaald!</span>
                  </div>
                  <button onClick={onBack} data-testid="back-home-btn"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98]"
                    style={{ padding: 'clamp(12px, 2.2vh, 28px)', marginBottom: '1vh' }}>
                    <Home style={{ width: '2.5vh', height: '2.5vh' }} />
                    <span className="kiosk-btn-text">Terug naar start</span>
                  </button>
                  <button onClick={loadHistory} data-testid="history-btn-no-debt"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center gap-2 rounded-xl transition"
                    style={{ padding: 'clamp(8px, 1.4vh, 18px)' }}>
                    <Clock style={{ width: '1.8vh', height: '1.8vh' }} />
                    <span className="kiosk-small font-semibold">Betalingsgeschiedenis</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ padding: '4vh 4vw' }} onClick={() => setShowHistory(false)}>
            <div className="kiosk-card w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()} data-testid="history-popup">
              <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2vw, 32px)', borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-3">
                  <Clock style={{ width: '2.5vh', height: '2.5vh' }} className="text-orange-500" />
                  <div>
                    <h2 className="kiosk-subtitle text-slate-900">Betalingsgeschiedenis</h2>
                    <p className="kiosk-small text-slate-400">{tenant.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="bg-slate-100 hover:bg-slate-200 flex items-center justify-center rounded-lg transition" style={{ width: '4vh', height: '4vh' }}>
                  <X style={{ width: '2vh', height: '2vh' }} className="text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto" style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(12px, 1.5vw, 24px)' }}>
                {loadingHistory ? (
                  <div className="text-center" style={{ padding: '4vh 0' }}><div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="kiosk-body text-slate-400">Laden...</p></div>
                ) : payments.length === 0 ? (
                  <div className="text-center" style={{ padding: '4vh 0' }}><p className="kiosk-subtitle text-slate-400">Geen betalingen gevonden</p></div>
                ) : (
                  <div>{payments.map((p, i) => { const date = p.created_at ? new Date(p.created_at) : null; const dateStr = date ? date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; const periode = p.covered_months?.length > 0 ? p.covered_months.join(', ') : ''; return (<div key={p.payment_id || i} className="kiosk-card-row flex items-center justify-between"><div className="flex items-center gap-3 min-w-0"><CheckCircle style={{ width: '2vh', height: '2vh' }} className="text-green-500 flex-shrink-0" /><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="kiosk-body font-bold text-slate-900">{formatSRD(p.amount)}</span><span className="kiosk-small px-2 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">{TYPE_LABELS[p.payment_type] || p.payment_type}</span></div><p className="kiosk-small text-slate-400">{dateStr} · {p.kwitantie_nummer || ''}</p>{periode && <p className="kiosk-small text-slate-500 font-medium">Periode: {periode}</p>}</div></div></div>); })}</div>
                )}
              </div>
              <div style={{ padding: 'clamp(8px, 1.5vh, 16px) clamp(12px, 1.5vw, 24px)', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setShowHistory(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition kiosk-body font-bold" style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}>Sluiten</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full bg-orange-500 flex flex-col p-3 sm:p-6 pt-2 sm:pt-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-2 sm:py-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">Terug</span>
        </button>
        <div className="flex items-center gap-2 text-white">
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base font-semibold truncate max-w-[35vw] sm:max-w-[30vw]">{tenant.name}</span>
          <span className="text-xs sm:text-sm opacity-70 whitespace-nowrap">Appt. {tenant.apartment_number}</span>
        </div>
        <div className="hidden sm:block w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 min-h-0 overflow-auto pb-2">
        {/* Left panel - Financial overview */}
        <div className="kiosk-card flex-none md:flex-[3] flex flex-col min-w-0">
          <div className="p-3 sm:p-4 border-b border-slate-100">
            <span className="text-sm sm:text-base font-semibold text-slate-800">Financieel overzicht</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center rounded bg-slate-50 w-8 h-8 sm:w-9 sm:h-9">
                    <item.icon className={`w-4 h-4 ${item.highlight && item.value > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <span className={`text-sm sm:text-base ${item.highlight ? 'text-orange-600 font-bold' : 'text-slate-600'}`}>{item.label}</span>
                    {item.overdue?.length > 0 && (
                      <p className="text-[11px] text-red-500 font-medium">{item.overdue.join(', ')}</p>
                    )}
                  </div>
                </div>
                <span className={`text-sm sm:text-base font-semibold whitespace-nowrap ${item.highlight ? 'text-orange-600' : 'text-slate-800'}`}>
                  {formatSRD(item.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 flex items-center justify-between p-3 sm:p-4 border-t-2 border-slate-200">
            <span className="text-sm sm:text-base font-semibold text-slate-600">Totaal openstaand</span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 whitespace-nowrap">{formatSRD(total)}</span>
          </div>
        </div>

        {/* Right panel - Action card */}
        <div className="kiosk-card flex-none md:flex-[2] flex flex-col items-center justify-center min-w-0 text-center p-4 sm:p-6">
          {hasDebt ? (
            <>
              <div className="rounded-full bg-orange-50 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-5">
                <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
              </div>
              <p className="text-sm text-slate-400 mb-1">Te betalen</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 whitespace-nowrap mb-4 sm:mb-6">{formatSRD(total)}</p>
              <button onClick={onPay} data-testid="pay-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98] py-3 sm:py-4">
                <span className="text-base sm:text-lg font-bold">Volgende</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={loadHistory} data-testid="history-btn"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2 rounded-xl transition mt-2 py-2.5 sm:py-3">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">Betalingsgeschiedenis</span>
              </button>
            </>
          ) : (
            <>
              <div className="rounded-full bg-green-50 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-5">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mb-1">Alles betaald!</p>
              <p className="text-sm text-green-500 mb-4 sm:mb-6">Geen openstaand saldo</p>
              <button onClick={onBack} data-testid="back-home-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98] py-3 sm:py-4">
                <Home className="w-5 h-5" />
                <span className="text-base sm:text-lg font-bold">Terug naar start</span>
              </button>
              <button onClick={loadHistory} data-testid="history-btn-no-debt"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2 rounded-xl transition mt-2 py-2.5 sm:py-3">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">Betalingsgeschiedenis</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment History Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ padding: '4vh 4vw' }} onClick={() => setShowHistory(false)}>
          <div className="kiosk-card w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()} data-testid="history-popup">
            <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2vw, 32px)', borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <Clock style={{ width: '2.5vh', height: '2.5vh' }} className="text-orange-500" />
                <div>
                  <h2 className="kiosk-subtitle text-slate-900">Betalingsgeschiedenis</h2>
                  <p className="kiosk-small text-slate-400">{tenant.name}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="bg-slate-100 hover:bg-slate-200 flex items-center justify-center rounded-lg transition" style={{ width: '4vh', height: '4vh' }} data-testid="history-close-btn">
                <X style={{ width: '2vh', height: '2vh' }} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(12px, 1.5vw, 24px)' }}>
              {loadingHistory ? (
                <div className="text-center" style={{ padding: '4vh 0' }}>
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="kiosk-body text-slate-400">Laden...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center" style={{ padding: '4vh 0' }}>
                  <p className="kiosk-subtitle text-slate-400">Geen betalingen gevonden</p>
                </div>
              ) : (
                <div>
                  {payments.map((p, i) => {
                    const date = p.created_at ? new Date(p.created_at) : null;
                    const dateStr = date ? date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    const periode = p.covered_months?.length > 0 ? p.covered_months.join(', ') : '';
                    return (
                      <div key={p.payment_id || i} className="kiosk-card-row flex items-center justify-between" data-testid={`history-item-${i}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle style={{ width: '2vh', height: '2vh' }} className="text-green-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="kiosk-body font-bold text-slate-900">{formatSRD(p.amount)}</span>
                              <span className="kiosk-small px-2 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">{TYPE_LABELS[p.payment_type] || p.payment_type}</span>
                              <span className="kiosk-small px-2 py-0.5 rounded bg-slate-100 text-slate-600">{METHOD_LABELS[p.payment_method] || p.payment_method || 'Contant'}</span>
                            </div>
                            <p className="kiosk-small text-slate-400">{dateStr} · {p.kwitantie_nummer || ''}</p>
                            {periode && <p className="kiosk-small text-slate-500 font-medium">Periode: {periode}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: 'clamp(8px, 1.5vh, 16px) clamp(12px, 1.5vw, 24px)', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowHistory(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition kiosk-body font-bold" style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
