import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { API, axios } from './utils';

const SRD_DENOMS = [500, 200, 100, 50, 20, 10, 5];

const fmtSRD = (n) => Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n || 0).toLocaleString('nl-NL');
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, days) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  const days = ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA'];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function calcSrdTotal(counts) {
  return SRD_DENOMS.reduce((s, d) => s + (Number(counts?.[String(d)] || 0) * d), 0);
}

/**
 * Inline-editable cell. Saves on blur (debounced via callback).
 */
function NumCell({ value, onChange, onCommit, decimal = false, dim = false, testId, width = 'w-14' }) {
  const [local, setLocal] = useState(value ?? '');
  const dirty = useRef(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setLocal(value ?? '');
      dirty.current = false;
    }
  }, [value]);

  return (
    <input
      type="number"
      inputMode={decimal ? 'decimal' : 'numeric'}
      step={decimal ? '0.01' : '1'}
      min="0"
      value={local === 0 || local === '0' ? '' : local}
      placeholder="0"
      data-testid={testId}
      onChange={(e) => { setLocal(e.target.value); dirty.current = true; onChange?.(e.target.value); }}
      onFocus={(e) => { focused.current = true; e.target.select(); }}
      onBlur={() => {
        focused.current = false;
        if (dirty.current) { dirty.current = false; onCommit?.(local); }
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
      className={`${width} px-1 py-1 text-xs text-right tabular-nums rounded border ${dim ? 'border-transparent bg-transparent' : 'border-slate-200'} focus:border-orange-400 focus:outline-none focus:bg-orange-50/40 hover:bg-slate-50`}
    />
  );
}

/**
 * Single Periode-grid: kaarten per (datum × machine) + SUR kaarten onderaan
 */
function PeriodeTable({ title, dates, machines, balancesMap, onSave, savingKey }) {
  const rows = useMemo(() => {
    const list = [];
    dates.forEach((iso) => {
      machines.forEach((m) => {
        const key = `${iso}__${m.machine_id}`;
        list.push({
          key,
          balance_date: iso,
          machine: m,
          existing: balancesMap[key] || null,
        });
      });
    });
    return list;
  }, [dates, machines, balancesMap]);

  const [localState, setLocalState] = useState({});
  const stateRef = useRef({});
  useEffect(() => { stateRef.current = localState; }, [localState]);

  useEffect(() => {
    const next = {};
    rows.forEach((r) => {
      const e = r.existing || {};
      next[r.key] = {
        counts: { ...(e.counts || {}) },
        eur_amount: e.eur_amount ?? 0,
        usd_amount: e.usd_amount ?? 0,
        balance_from_bon: e.balance_from_bon ?? 0,
        commissie_amount: e.commissie_amount ?? 0,
      };
    });
    setLocalState(next);
    stateRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => r.key + (r.existing?.balance_id || 'new')).join('|')]);

  const updateField = (key, field, val) => {
    setLocalState(prev => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), [field]: val } };
      stateRef.current = next;
      return next;
    });
  };
  const updateCount = (key, denom, val) => {
    setLocalState(prev => {
      const cur = prev[key] || {};
      const next = { ...prev, [key]: { ...cur, counts: { ...(cur.counts || {}), [String(denom)]: val } } };
      stateRef.current = next;
      return next;
    });
  };

  const commitRow = async (row) => {
    const s = stateRef.current[row.key] || {};
    const counts = Object.fromEntries(SRD_DENOMS.map(d => [String(d), parseInt(s.counts?.[String(d)] || 0) || 0]));
    const eur = parseFloat(s.eur_amount) || 0;
    const usd = parseFloat(s.usd_amount) || 0;
    const bon = parseFloat(s.balance_from_bon) || 0;
    const com = parseFloat(s.commissie_amount) || 0;
    const totalCounts = SRD_DENOMS.reduce((sum, d) => sum + (counts[String(d)] || 0), 0);
    const hasData = totalCounts > 0 || eur > 0 || usd > 0 || bon > 0 || com > 0;
    if (!row.existing && !hasData) return;
    await onSave(row, { counts, eur_amount: eur, usd_amount: usd, balance_from_bon: bon, commissie_amount: com });
  };

  // Compute SUR (per machine total) using localState values for live preview
  const sur = useMemo(() => {
    const byMachine = {};
    machines.forEach((m) => {
      byMachine[m.machine_id] = {
        machine: m,
        counts: Object.fromEntries(SRD_DENOMS.map(d => [String(d), 0])),
        eur: 0, usd: 0, bon: 0, commissie: 0, srd: 0,
      };
    });
    rows.forEach((r) => {
      const s = localState[r.key] || {};
      const acc = byMachine[r.machine.machine_id];
      if (!acc) return;
      SRD_DENOMS.forEach(d => { acc.counts[String(d)] += parseInt(s.counts?.[String(d)] || 0) || 0; });
      acc.eur += parseFloat(s.eur_amount) || 0;
      acc.usd += parseFloat(s.usd_amount) || 0;
      acc.bon += parseFloat(s.balance_from_bon) || 0;
      acc.commissie += parseFloat(s.commissie_amount) || 0;
    });
    Object.values(byMachine).forEach(b => { b.srd = calcSrdTotal(b.counts); });
    return byMachine;
  }, [localState, rows, machines]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <span className="text-[10px] text-slate-500">{dates.length} dagen × {machines.length} machines</span>
      </div>
      <div className="p-2 flex gap-2 overflow-x-auto" data-testid={`werkblad-grid-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {rows.map((r) => {
          const s = localState[r.key] || {};
          const counts = s.counts || {};
          const srd = SRD_DENOMS.reduce((sum, d) => sum + ((parseInt(counts[String(d)] || 0) || 0) * d), 0);
          const bon = parseFloat(s.balance_from_bon) || 0;
          const v = bon > 0 ? bon - srd : 0;
          const winst = bon > 0 && v < 0;
          const isSaving = savingKey === r.key;
          return (
            <div
              key={r.key}
              data-testid={`werkblad-card-${r.key}`}
              className="rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-orange-300 transition flex flex-col shrink-0 w-40"
            >
              {/* Header */}
              <div className="px-2 py-1 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="inline-block px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded uppercase">{r.machine.name}</span>
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{dayLabel(r.balance_date)}</span>
                </div>
                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-orange-500 shrink-0" />}
              </div>

              {/* Denominations */}
              <div className="px-1.5 py-1">
                <div className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-0 items-center">
                  {SRD_DENOMS.map(d => {
                    const c = parseInt(counts[String(d)] || 0) || 0;
                    return (
                      <React.Fragment key={d}>
                        <div className={`text-[10px] tabular-nums font-bold ${c > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{d}</div>
                        <NumCell
                          value={counts[String(d)] || 0}
                          onChange={(val) => updateCount(r.key, d, val)}
                          onCommit={() => commitRow(r)}
                          width="w-full"
                          testId={`werkblad-cell-${r.key}-${d}`}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* EUR / USD / Bon / Commissie */}
              <div className="px-1.5 pb-1 grid grid-cols-[auto_1fr] gap-x-1 gap-y-0 items-center border-t border-slate-100 pt-1">
                <div className="text-[9px] font-bold text-slate-500 uppercase">EUR</div>
                <NumCell decimal value={s.eur_amount || 0} onChange={(v) => updateField(r.key, 'eur_amount', v)} onCommit={() => commitRow(r)} width="w-full" />
                <div className="text-[9px] font-bold text-slate-500 uppercase">USD</div>
                <NumCell decimal value={s.usd_amount || 0} onChange={(v) => updateField(r.key, 'usd_amount', v)} onCommit={() => commitRow(r)} width="w-full" />
                <div className="text-[9px] font-bold text-blue-700 uppercase">Bon</div>
                <NumCell decimal value={s.balance_from_bon || 0} onChange={(v) => updateField(r.key, 'balance_from_bon', v)} onCommit={() => commitRow(r)} width="w-full" testId={`werkblad-bon-${r.key}`} />
                <div className="text-[9px] font-bold text-violet-700 uppercase">Com</div>
                <NumCell decimal value={s.commissie_amount || 0} onChange={(v) => updateField(r.key, 'commissie_amount', v)} onCommit={() => commitRow(r)} width="w-full" testId={`werkblad-com-${r.key}`} />
              </div>

              {/* Footer */}
              <div className="mt-auto border-t border-slate-100">
                <div className="px-2 py-1 flex items-center justify-between text-[10px] bg-orange-50">
                  <span className="font-bold text-orange-700">Totaal</span>
                  <span className="font-black text-orange-700 tabular-nums">{srd > 0 ? fmtSRD(srd) : '—'}</span>
                </div>
                {bon > 0 && (
                  <div className={`px-2 py-1 flex items-center justify-between text-[10px] border-t-2 ${winst ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-100 border-rose-300'}`} data-testid={`werkblad-card-verschil-${r.key}`}>
                    <span className={`font-black uppercase tracking-wider text-[9px] ${winst ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {winst ? '✓ Winst' : '⚠ Bijzet'}
                    </span>
                    <span className={`font-black tabular-nums ${winst ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {winst ? '−' : ''}{fmtSRD(Math.abs(v))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* SUR cards */}
        {machines.map((m) => {
          const s = sur[m.machine_id];
          if (!s) return null;
          const v = s.bon > 0 ? s.bon - s.srd : 0;
          const winst = s.bon > 0 && v < 0;
          return (
            <div
              key={`sur-${m.machine_id}`}
              data-testid={`werkblad-sur-card-${m.machine_id}`}
              className="rounded-lg border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-100 overflow-hidden shadow-md flex flex-col shrink-0 w-40"
            >
              <div className="px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-600 border-b border-orange-600 flex items-center justify-between">
                <span className="text-white font-black uppercase text-[10px]">SUR {m.name}</span>
                <span className="text-[9px] font-bold text-orange-100">{dates.length}d</span>
              </div>

              <div className="px-1.5 py-1">
                <div className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-0 items-center">
                  {SRD_DENOMS.map(d => {
                    const c = s.counts[String(d)] || 0;
                    return (
                      <React.Fragment key={d}>
                        <div className={`text-[10px] tabular-nums font-bold ${c > 0 ? 'text-orange-700' : 'text-orange-400'}`}>{d}</div>
                        <div className={`tabular-nums text-right text-[10px] font-black px-1 py-0.5 ${c > 0 ? 'text-orange-900' : 'text-orange-300'}`}>{c}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto border-t-2 border-orange-300">
                <div className="px-2 py-1 flex items-center justify-between text-[10px] bg-orange-200">
                  <span className="font-black text-orange-900">Totaal</span>
                  <span className="font-black text-orange-900 tabular-nums">{fmtSRD(s.srd)}</span>
                </div>
                {s.bon > 0 && (
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] bg-blue-200 border-t border-blue-300">
                    <span className="font-black text-blue-900">Bon</span>
                    <span className="font-black text-blue-900 tabular-nums">{fmtSRD(s.bon)}</span>
                  </div>
                )}
                {s.commissie > 0 && (
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] bg-violet-200 border-t border-violet-300">
                    <span className="font-black text-violet-900">Com</span>
                    <span className="font-black text-violet-900 tabular-nums">{fmtSRD(s.commissie)}</span>
                  </div>
                )}
                {s.bon > 0 && (
                  <div className={`px-2 py-1 flex items-center justify-between text-[10px] border-t-2 ${winst ? 'bg-emerald-200 border-emerald-400' : 'bg-rose-200 border-rose-400'}`} data-testid={`werkblad-sur-card-verschil-${m.machine_id}`}>
                    <span className={`font-black uppercase text-[9px] ${winst ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {winst ? '✓ Winst' : '⚠ Bijzet'}
                    </span>
                    <span className={`font-black tabular-nums ${winst ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {winst ? '−' : ''}{fmtSRD(Math.abs(v))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Top-level Werkblad: 2 periodes (4 dagen + 3 dagen)
 * met week-navigatie (◀ ▶) en commissie-kolom.
 */
export default function SuribetWerkblad({ token, machines, balances, onRefresh }) {
  // Anchor = donderdag van de huidige week (eerste dag van periode 1)
  const [anchorDate, setAnchorDate] = useState(() => {
    // start op vandaag - 6 dagen zodat we recente data zien op de eerste pagina
    return addDaysISO(todayISO(), -6);
  });
  const [savingKey, setSavingKey] = useState(null);

  const periode1Dates = useMemo(() => Array.from({ length: 4 }, (_, i) => addDaysISO(anchorDate, i)), [anchorDate]);
  const periode2Dates = useMemo(() => Array.from({ length: 3 }, (_, i) => addDaysISO(anchorDate, 4 + i)), [anchorDate]);

  // Map balances by date+machine
  const balancesMap = useMemo(() => {
    const m = {};
    (balances || []).forEach((b) => { m[`${b.balance_date}__${b.machine_id}`] = b; });
    return m;
  }, [balances]);

  const handleSave = async (row, payload) => {
    setSavingKey(row.key);
    try {
      if (row.existing?.balance_id) {
        await axios.put(`${API}/admin/suribet/balances/${row.existing.balance_id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/suribet/balances`, {
          machine_id: row.machine.machine_id,
          balance_date: row.balance_date,
          ...payload,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      await onRefresh?.();
    } catch (e) {
      alert('Opslaan mislukt: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setSavingKey(null);
    }
  };

  if (machines.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center text-sm text-amber-800">
        Maak eerst minstens één machine aan (bv. MAC 1 / MAC 2) via de knop &quot;+ Machine&quot; bovenaan.
      </div>
    );
  }

  const periode1Title = `Periode 1 — ${dayLabel(periode1Dates[0])} t/m ${dayLabel(periode1Dates[periode1Dates.length - 1])}`;
  const periode2Title = `Periode 2 — ${dayLabel(periode2Dates[0])} t/m ${dayLabel(periode2Dates[periode2Dates.length - 1])}`;

  return (
    <div className="space-y-3">
      {/* Week-navigatie */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2">
        <button
          onClick={() => setAnchorDate(addDaysISO(anchorDate, -7))}
          data-testid="werkblad-prev-week"
          className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700"
          title="Vorige week"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Start datum</label>
          <input
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            data-testid="werkblad-anchor-date"
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={() => setAnchorDate(addDaysISO(todayISO(), -6))}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 ml-1"
          >
            Deze week
          </button>
        </div>
        <button
          onClick={() => setAnchorDate(addDaysISO(anchorDate, 7))}
          data-testid="werkblad-next-week"
          className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700"
          title="Volgende week"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <PeriodeTable
        title={periode1Title}
        dates={periode1Dates}
        machines={machines}
        balancesMap={balancesMap}
        onSave={handleSave}
        savingKey={savingKey}
      />

      <PeriodeTable
        title={periode2Title}
        dates={periode2Dates}
        machines={machines}
        balancesMap={balancesMap}
        onSave={handleSave}
        savingKey={savingKey}
      />

      <p className="text-[10px] text-slate-400 text-center">
        Tip: typ direct in een cel en druk <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">Tab</kbd> of <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">Enter</kbd> — wijzigingen worden automatisch opgeslagen.
      </p>
    </div>
  );
}
