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
 * Single Periode-tabel: een lijst datums × beide machines + 2 SUR rijen onderaan
 */
function PeriodeTable({ title, dates, machines, balancesMap, onSave, savingKey, machineCommissieMap }) {
  // Build rows: per date, per machine in order
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

  // Local state for unsaved counts/values
  const [localState, setLocalState] = useState({});
  const stateRef = useRef({});
  useEffect(() => { stateRef.current = localState; }, [localState]);

  // When existing balances refresh, sync local
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
    if (!row.existing && !hasData) return; // no need to create empty
    await onSave(row, { counts, eur_amount: eur, usd_amount: usd, balance_from_bon: bon, commissie_amount: com });
  };

  // Compute SUR (per machine total) over the period using localState values for live preview
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid={`werkblad-table-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600">
            <tr>
              <th className="text-left px-2 py-1.5 font-bold sticky left-0 bg-slate-100 w-20">Datum</th>
              <th className="text-left px-2 py-1.5 font-bold w-16">Machine</th>
              {SRD_DENOMS.map(d => (
                <th key={d} className="text-right px-1 py-1.5 font-bold w-16">{d}</th>
              ))}
              <th className="text-right px-1 py-1.5 font-bold w-20">EUR</th>
              <th className="text-right px-1 py-1.5 font-bold w-20">USD</th>
              <th className="text-right px-1 py-1.5 font-bold bg-blue-100 text-blue-700 w-24">Bon</th>
              <th className="text-right px-1 py-1.5 font-bold bg-orange-100 text-orange-700 w-24">Totaal SRD</th>
              <th className="text-right px-1 py-1.5 font-bold bg-violet-100 text-violet-700 w-24">Commissie</th>
              <th className="text-right px-1 py-1.5 font-bold bg-emerald-100 text-emerald-700 w-24">Verschil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const s = localState[r.key] || {};
              const counts = s.counts || {};
              const srd = SRD_DENOMS.reduce((sum, d) => sum + ((parseInt(counts[String(d)] || 0) || 0) * d), 0);
              const bon = parseFloat(s.balance_from_bon) || 0;
              const com = parseFloat(s.commissie_amount) || 0;
              const v = bon > 0 ? bon - srd : 0;
              const winst = bon > 0 && v < 0;
              const isSaving = savingKey === r.key;
              return (
                <tr key={r.key} className="hover:bg-orange-50/20" data-testid={`werkblad-row-${r.key}`}>
                  <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap sticky left-0 bg-white">
                    {dayLabel(r.balance_date)}
                    {isSaving && <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin text-orange-500" />}
                  </td>
                  <td className="px-2 py-1">
                    <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded">{r.machine.name}</span>
                  </td>
                  {SRD_DENOMS.map(d => (
                    <td key={d} className="px-0.5 py-0.5">
                      <NumCell
                        value={counts[String(d)] || 0}
                        onChange={(v) => updateCount(r.key, d, v)}
                        onCommit={() => commitRow(r)}
                        testId={`werkblad-cell-${r.key}-${d}`}
                      />
                    </td>
                  ))}
                  <td className="px-0.5 py-0.5">
                    <NumCell decimal value={s.eur_amount || 0} onChange={(v) => updateField(r.key, 'eur_amount', v)} onCommit={() => commitRow(r)} width="w-16" />
                  </td>
                  <td className="px-0.5 py-0.5">
                    <NumCell decimal value={s.usd_amount || 0} onChange={(v) => updateField(r.key, 'usd_amount', v)} onCommit={() => commitRow(r)} width="w-16" />
                  </td>
                  <td className="px-0.5 py-0.5 bg-blue-50/40">
                    <NumCell decimal value={s.balance_from_bon || 0} onChange={(v) => updateField(r.key, 'balance_from_bon', v)} onCommit={() => commitRow(r)} width="w-20" testId={`werkblad-bon-${r.key}`} />
                  </td>
                  <td className="px-1 py-1 text-right font-black bg-orange-50/40 text-orange-700 tabular-nums">
                    {srd > 0 ? fmtSRD(srd) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-0.5 py-0.5 bg-violet-50/40">
                    <NumCell decimal value={s.commissie_amount || 0} onChange={(v) => updateField(r.key, 'commissie_amount', v)} onCommit={() => commitRow(r)} width="w-20" testId={`werkblad-com-${r.key}`} />
                  </td>
                  <td className={`px-1 py-1 text-right font-black tabular-nums ${bon > 0 ? (winst ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700') : 'text-slate-300'}`}>
                    {bon > 0 ? `${winst ? '−' : ''}${fmtSRD(Math.abs(v))}` : '—'}
                  </td>
                </tr>
              );
            })}
            {/* SUR rijen onderaan */}
            {machines.map((m) => {
              const s = sur[m.machine_id];
              if (!s) return null;
              const v = s.bon > 0 ? s.bon - s.srd : 0;
              const winst = s.bon > 0 && v < 0;
              return (
                <tr key={`sur-${m.machine_id}`} className="bg-gradient-to-r from-orange-100 to-amber-100 border-t-2 border-orange-300" data-testid={`werkblad-sur-${m.machine_id}`}>
                  <td className="px-2 py-1.5 font-black text-orange-800 sticky left-0 bg-orange-100 text-xs" colSpan={2}>SUR {m.name}</td>
                  {SRD_DENOMS.map(d => (
                    <td key={d} className="px-1 py-1.5 text-right font-black text-orange-800 tabular-nums">{fmtInt(s.counts[String(d)])}</td>
                  ))}
                  <td className="px-1 py-1.5 text-right font-black text-orange-800 tabular-nums">{s.eur > 0 ? fmtSRD(s.eur) : '—'}</td>
                  <td className="px-1 py-1.5 text-right font-black text-orange-800 tabular-nums">{s.usd > 0 ? fmtSRD(s.usd) : '—'}</td>
                  <td className="px-1 py-1.5 text-right font-black bg-blue-200 text-blue-900 tabular-nums">{s.bon > 0 ? fmtSRD(s.bon) : '—'}</td>
                  <td className="px-1 py-1.5 text-right font-black bg-orange-200 text-orange-900 tabular-nums">{fmtSRD(s.srd)}</td>
                  <td className="px-1 py-1.5 text-right font-black bg-violet-200 text-violet-900 tabular-nums">{s.commissie > 0 ? fmtSRD(s.commissie) : '—'}</td>
                  <td className={`px-1 py-1.5 text-right font-black tabular-nums ${s.bon > 0 ? (winst ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900') : 'text-orange-800'}`} data-testid={`werkblad-sur-verschil-${m.machine_id}`}>
                    {s.bon > 0 ? `${winst ? '−' : ''}${fmtSRD(Math.abs(v))}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
