import { useState } from 'react';
import { Archive, ChevronDown, ChevronRight, Trash2, History } from 'lucide-react';
import { API, axios } from './utils';

const fmtSRD = (n) => Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtDateTime = (s) => {
  if (!s) return '';
  return new Date(s).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
};

function CycleCard({ cycle, token, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = Number(cycle.total_verschil || 0);
  const winst = cycle.total_bon > 0 && v < 0;
  const totalCom = Number(cycle.total_commissie || 0);

  const reopen = async () => {
    if (!window.confirm(`Cyclus "${cycle.period_label}" (${fmtDate(cycle.date_from)} t/m ${fmtDate(cycle.date_to)}) heropenen?\n\nDe dagstaten worden weer bewerkbaar in het werkblad.`)) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/admin/suribet/cycles/${cycle.cycle_id}`, { headers: { Authorization: `Bearer ${token}` } });
      await onChanged?.();
    } catch (e) {
      alert('Heropenen mislukt: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-white overflow-hidden" data-testid={`cycle-card-${cycle.cycle_id}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-emerald-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-emerald-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span className="inline-block px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded uppercase">{cycle.period_label}</span>
          <div className="text-left min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">{fmtDate(cycle.date_from)} t/m {fmtDate(cycle.date_to)}</p>
            <p className="text-[10px] text-slate-500">Opgehaald: {fmtDate(cycle.ophaal_date)} · gesloten {fmtDateTime(cycle.closed_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-500">Totaal SRD</p>
            <p className="text-sm font-black text-orange-700 tabular-nums">{fmtSRD(cycle.total_srd)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-500">Bon</p>
            <p className="text-sm font-black text-blue-700 tabular-nums">{fmtSRD(cycle.total_bon)}</p>
          </div>
          {cycle.total_bon > 0 && (
            <div className={`text-right px-2.5 py-1 rounded-lg ${winst ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              <p className="text-[10px] uppercase font-bold">{winst ? '✓ Winst' : '⚠ Bijzet'}</p>
              <p className="text-sm font-black tabular-nums">{winst ? '−' : ''}{fmtSRD(Math.abs(v))}</p>
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-emerald-100 bg-emerald-50/30 p-3 space-y-2">
          {(cycle.per_machine || []).map(pm => {
            const pv = Number(pm.verschil || 0);
            const pwinst = pm.balance_from_bon > 0 && pv < 0;
            return (
              <div key={pm.machine_id} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-block px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded uppercase">{pm.machine_name}</span>
                  <span className="text-[10px] text-slate-500">{pm.rows_count} dag{pm.rows_count === 1 ? '' : 'en'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Totaal SRD</p>
                    <p className="font-black text-orange-700 tabular-nums">{fmtSRD(pm.srd_total)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Bon</p>
                    <p className="font-black text-blue-700 tabular-nums">{fmtSRD(pm.balance_from_bon)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Commissie</p>
                    <p className="font-black text-violet-700 tabular-nums">{fmtSRD(pm.commissie_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Verschil</p>
                    <p className={`font-black tabular-nums ${pm.balance_from_bon > 0 ? (pwinst ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}`}>
                      {pm.balance_from_bon > 0 ? `${pwinst ? '−' : ''}${fmtSRD(Math.abs(pv))}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {totalCom > 0 && (
            <div className="bg-violet-100 rounded-lg px-3 py-2 flex items-center justify-between text-[11px]">
              <span className="font-black text-violet-900 uppercase">Totaal Commissie deze periode</span>
              <span className="font-black text-violet-900 tabular-nums">{fmtSRD(totalCom)}</span>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              onClick={reopen}
              disabled={busy}
              data-testid={`cycle-reopen-${cycle.cycle_id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" /> Heropenen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuribetCycles({ token, cycles, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  if (!cycles || cycles.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
        data-testid="cycles-toggle"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <History className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900">Geschiedenis — afgesloten Suribet-periodes</h3>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{cycles.length}</span>
      </button>
      {expanded && (
        <div className="p-3 space-y-2 border-t border-slate-200" data-testid="cycles-list">
          {cycles.map(c => (
            <CycleCard key={c.cycle_id} cycle={c} token={token} onChanged={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
