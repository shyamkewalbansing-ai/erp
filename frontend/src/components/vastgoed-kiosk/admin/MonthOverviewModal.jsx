import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

function formatNL(amount, currency = 'SRD') {
  const n = Number(amount || 0);
  return `${currency} ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700" data-testid="status-paid">
        <CheckCircle2 className="w-3 h-3" /> BETAALD
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700" data-testid="status-partial">
        <AlertCircle className="w-3 h-3" /> DEEL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700" data-testid="status-open">
      <Circle className="w-3 h-3" /> OPEN
    </span>
  );
}

export default function MonthOverviewModal({ tenant, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedYm, setExpandedYm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await axios.get(`${API}/admin/tenants/${tenant.tenant_id}/payment-overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Kon overzicht niet laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.tenant_id, token]);

  // Group months by year
  const grouped = {};
  if (data?.months) {
    for (const m of data.months) {
      if (!grouped[m.year]) grouped[m.year] = [];
      grouped[m.year].push(m);
    }
  }
  const years = Object.keys(grouped).sort();
  const currency = data?.currency || 'SRD';

  return (
    <MobileModalShell
      title="Maand-overzicht"
      subtitle={tenant?.name || ''}
      onClose={onClose}
      hideFooter={true}
      maxWidth="sm:max-w-lg"
      testIdPrefix="month-overview"
    >
      {loading && (
        <div className="p-8 text-center text-slate-500" data-testid="month-overview-loading">
          <div className="inline-block w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3" />
          <p className="text-sm">Bezig met laden…</p>
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-rose-600" data-testid="month-overview-error">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4 pb-4" data-testid="month-overview-content">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider opacity-80">Huurder</p>
                <p className="text-base font-black truncate">{data.tenant_name}</p>
                <p className="text-xs opacity-90 mt-0.5">
                  {data.apartment_number} &middot; {data.tenant_code}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] uppercase tracking-wider opacity-80">Maandhuur</p>
                <p className="text-base font-black">{formatNL(data.monthly_rent, currency)}</p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center" data-testid="summary-paid">
              <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">Betaald</p>
              <p className="text-lg font-black text-emerald-700 mt-1">{data.summary.counts.paid}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">maanden</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" data-testid="summary-partial">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Deel</p>
              <p className="text-lg font-black text-amber-700 mt-1">{data.summary.counts.partial}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">maanden</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center" data-testid="summary-open">
              <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold">Open</p>
              <p className="text-lg font-black text-rose-700 mt-1">{data.summary.counts.open}</p>
              <p className="text-[10px] text-rose-600 mt-0.5">maanden</p>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center" data-testid="summary-totals">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Totaal betaald</p>
              <p className="text-sm font-black text-slate-900 mt-1">{formatNL(data.summary.total_paid, currency)}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Totaal verschuldigd</p>
              <p className="text-sm font-black text-slate-900 mt-1">{formatNL(data.summary.total_due, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Achterstand</p>
              <p className={`text-sm font-black mt-1 ${data.summary.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatNL(data.summary.outstanding, currency)}
              </p>
            </div>
          </div>

          {/* Year-grouped month list */}
          {years.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">Geen factureringsgeschiedenis gevonden</p>
          )}

          {years.map((y) => (
            <div key={y} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700">{y}</h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {grouped[y].filter(m => m.status === 'paid').length}/{grouped[y].length} betaald
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {grouped[y].map((m) => {
                  const isOpen = expandedYm === m.ym;
                  const hasPayments = m.payments && m.payments.length > 0;
                  return (
                    <div key={m.ym} data-testid={`month-row-${m.ym}`}>
                      <button
                        onClick={() => hasPayments && setExpandedYm(isOpen ? null : m.ym)}
                        disabled={!hasPayments}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${
                          hasPayments ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={m.status} />
                          <span className="text-sm font-semibold text-slate-700 capitalize truncate">
                            {m.label.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700">{formatNL(m.paid, currency)}</p>
                            {m.remaining > 0 && (
                              <p className="text-[10px] text-rose-500 font-medium">
                                Open: {formatNL(m.remaining, currency)}
                              </p>
                            )}
                          </div>
                          {hasPayments && (
                            isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isOpen && hasPayments && (
                        <div className="px-4 pb-3 bg-slate-50/50" data-testid={`month-payments-${m.ym}`}>
                          <div className="space-y-1.5">
                            {m.payments.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                                <div className="min-w-0">
                                  <p className="font-mono font-bold text-slate-700 truncate">{p.kwitantie_nummer || '—'}</p>
                                  {p.created_at && (
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                                <p className="font-bold text-emerald-700 whitespace-nowrap">
                                  + {formatNL(p.amount, currency)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileModalShell>
  );
}

export { MonthOverviewModal };
// Sat Apr 25 15:07:48 UTC 2026
