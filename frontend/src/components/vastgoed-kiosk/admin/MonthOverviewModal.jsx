import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronUp, Pencil, Calendar, ListChecks, Receipt as ReceiptIcon } from 'lucide-react';
import { toast } from 'sonner';
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
  const [tab, setTab] = useState('overview'); // 'overview' | 'audit'
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedYm, setExpandedYm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingBilledThrough, setEditingBilledThrough] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${API}/admin/tenants/${tenant.tenant_id}/payment-overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Kon overzicht niet laden');
    } finally {
      setLoading(false);
    }
  }, [tenant?.tenant_id, token]);

  const loadAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const r = await axios.get(`${API}/admin/tenants/${tenant.tenant_id}/payments-audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAudit(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Kon audit niet laden');
    } finally {
      setAuditLoading(false);
    }
  }, [tenant?.tenant_id, token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (tab === 'audit' && !audit) {
      loadAudit();
    }
  }, [tab, audit, loadAudit]);

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

  const handleEditPeriode = async (payment) => {
    const current = (payment.covered_months || []).join(', ');
    const input = window.prompt(
      `Periode bewerken voor KW${String(payment.kwitantie_nummer || payment.payment_id || '').slice(-5)}\n\n` +
      `Geef de juiste periode(s) gescheiden door komma, exact zoals op je papieren kwitantie:\n` +
      `  februari 2026\n` +
      `  februari 2026 (gedeeltelijk)\n` +
      `  januari 2026, februari 2026\n\n` +
      `Bedrag: ${formatNL(payment.amount, payment.currency)}\n` +
      `Datum: ${payment.created_at ? new Date(payment.created_at).toLocaleDateString('nl-NL') : '—'}\n\n` +
      `Huidige waarde:`,
      current
    );
    if (input === null) return;
    const months = input.split(',').map((s) => s.trim()).filter(Boolean);
    setEditingId(payment.payment_id);
    try {
      await axios.put(
        `${API}/admin/payments/${payment.payment_id}/covered-months`,
        { covered_months: months },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Periode bijgewerkt');
      // Reload both views to keep them in sync
      await Promise.all([loadOverview(), loadAudit()]);
    } catch (e) {
      toast.error('Bijwerken mislukt: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setEditingId(null);
    }
  };

  const handleEditBilledThrough = async () => {
    const current = data?.rent_billed_through || '';
    const input = window.prompt(
      `Gefactureerd t/m bewerken voor ${data?.tenant_name || 'huurder'}\n\n` +
      `Gebruik formaat YYYY-MM, bijvoorbeeld:\n` +
      `  2026-02  (februari 2026)\n` +
      `  2026-04  (april 2026)\n\n` +
      `Huidige waarde:`,
      current
    );
    if (input === null) return;
    const val = input.trim();
    if (!/^\d{4}-\d{2}$/.test(val)) {
      toast.error('Ongeldig formaat. Gebruik YYYY-MM (bv. 2026-02).');
      return;
    }
    setEditingBilledThrough(true);
    try {
      await axios.put(
        `${API}/admin/tenants/${tenant.tenant_id}/billed-through`,
        { rent_billed_through: val },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Gefactureerd t/m bijgewerkt');
      await Promise.all([loadOverview(), loadAudit()]);
    } catch (e) {
      toast.error('Bijwerken mislukt: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setEditingBilledThrough(false);
    }
  };

  return (
    <MobileModalShell
      title="Maand-overzicht"
      subtitle={tenant?.name || ''}
      onClose={onClose}
      hideFooter={true}
      maxWidth="sm:max-w-lg"
      testIdPrefix="month-overview"
    >
      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white -mx-4 -mt-4 px-4 pt-2 pb-2 border-b border-slate-200 mb-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            data-testid="tab-overview"
            onClick={() => setTab('overview')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
              tab === 'overview' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Maand-overzicht
          </button>
          <button
            data-testid="tab-audit"
            onClick={() => setTab('audit')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
              tab === 'audit' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" /> Audit kwitanties
          </button>
        </div>
      </div>

      {loading && tab === 'overview' && (
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

      {tab === 'overview' && data && !loading && (
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

          {/* Billed through with manual edit */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2" data-testid="billed-through-row">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Gefactureerd t/m</p>
              <p className="text-sm font-bold text-amber-900 mt-0.5">
                {data.rent_billed_through || '—'}
              </p>
            </div>
            <button
              onClick={handleEditBilledThrough}
              disabled={editingBilledThrough}
              data-testid="edit-billed-through-btn"
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Bewerk
            </button>
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
                  {grouped[y].filter((m) => m.status === 'paid').length}/{grouped[y].length} betaald
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

      {tab === 'audit' && (
        <div className="space-y-3 pb-4" data-testid="audit-content">
          {/* Info banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-900">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <ReceiptIcon className="w-3.5 h-3.5" /> Audit-modus
            </p>
            <p className="leading-relaxed">
              Vergelijk hieronder elke kwitantie met je <strong>papieren kwitantie</strong>. Klik op
              <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-white border border-orange-300">
                <Pencil className="w-2.5 h-2.5" />
              </span>
              om de Periode te corrigeren naar wat op het papier staat.
            </p>
          </div>

          {auditLoading && (
            <div className="p-6 text-center text-slate-500" data-testid="audit-loading">
              <div className="inline-block w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-2" />
              <p className="text-xs">Kwitanties laden…</p>
            </div>
          )}

          {audit && !auditLoading && (
            <>
              <div className="text-xs text-slate-500 px-1">
                Totaal: <strong>{audit.total_payments}</strong> kwitanties &middot; oudste eerst
              </div>

              {audit.payments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">Geen huur-kwitanties gevonden</p>
              )}

              <div className="space-y-2">
                {audit.payments.map((p) => {
                  const cur = p.currency || audit.currency;
                  const isEditing = editingId === p.payment_id;
                  const partialAny = (p.covered_months || []).some((s) => /\(gedeeltelijk\)/i.test(s));
                  return (
                    <div
                      key={p.payment_id}
                      className="bg-white border border-slate-200 rounded-xl p-3"
                      data-testid={`audit-row-${p.payment_id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-black text-slate-800">
                            {p.kwitantie_nummer || `KW—${String(p.payment_id).slice(-5)}`}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-emerald-700">+ {formatNL(p.amount, cur)}</p>
                          {p.payment_method && (
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase">{p.payment_method}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Periode</p>
                          {p.covered_months && p.covered_months.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.covered_months.map((m, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    /\(gedeeltelijk\)/i.test(m)
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-rose-600 font-semibold mt-1">⚠ Geen periode ingesteld</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditPeriode(p)}
                          disabled={isEditing}
                          data-testid={`audit-edit-${p.payment_id}`}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 disabled:opacity-50 inline-flex items-center gap-1 flex-shrink-0"
                        >
                          {isEditing ? '…' : <><Pencil className="w-3 h-3" /> Bewerk</>}
                        </button>
                      </div>

                      {partialAny && (
                        <p className="text-[10px] text-amber-700 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Bevat een gedeeltelijke betaling
                        </p>
                      )}

                      {p.notes && (
                        <p className="text-[11px] text-slate-500 mt-2 italic line-clamp-2">{p.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </MobileModalShell>
  );
}

export { MonthOverviewModal };
