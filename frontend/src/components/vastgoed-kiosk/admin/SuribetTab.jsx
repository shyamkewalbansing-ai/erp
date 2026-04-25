import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Save, X, Calculator, Cpu } from 'lucide-react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

const SRD_DENOMS = [500, 200, 100, 50, 20, 10, 5];

function fmtSRD(amount) {
  return Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcSrdTotal(counts) {
  return SRD_DENOMS.reduce((s, d) => s + (Number(counts?.[String(d)] || 0) * d), 0);
}

function BalanceModal({ token, machines, initial, onClose, onSaved }) {
  const isEdit = !!initial?.balance_id;
  const today = new Date().toISOString().slice(0, 10);
  const [machineId, setMachineId] = useState(initial?.machine_id || (machines[0]?.machine_id || ''));
  const [balanceDate, setBalanceDate] = useState(initial?.balance_date || today);
  const [counts, setCounts] = useState(() => {
    const c = {};
    SRD_DENOMS.forEach(d => { c[String(d)] = initial?.counts?.[String(d)] ?? 0; });
    return c;
  });
  const [eur, setEur] = useState(initial?.eur_amount ?? 0);
  const [usd, setUsd] = useState(initial?.usd_amount ?? 0);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [saving, setSaving] = useState(false);

  const total = calcSrdTotal(counts);

  const submit = async () => {
    if (!machineId || !balanceDate) {
      alert('Machine en datum zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      const body = {
        machine_id: machineId,
        balance_date: balanceDate,
        counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, parseInt(v) || 0])),
        eur_amount: parseFloat(eur) || 0,
        usd_amount: parseFloat(usd) || 0,
        notes: notes.trim(),
      };
      if (isEdit) {
        await axios.put(`${API}/admin/suribet/balances/${initial.balance_id}`, body, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/suribet/balances`, body, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSaved();
      onClose();
    } catch (e) {
      alert('Opslaan mislukt: ' + (e?.response?.data?.detail || e.message));
      setSaving(false);
    }
  };

  return (
    <MobileModalShell
      title={isEdit ? 'Balance bewerken' : 'Nieuwe balance'}
      subtitle={`${machines.find(m => m.machine_id === machineId)?.name || ''} · ${fmtDate(balanceDate)}`}
      onClose={() => !saving && onClose()}
      onSubmit={submit}
      submitLabel={`${isEdit ? 'Opslaan' : 'Toevoegen'} (SRD ${fmtSRD(total)})`}
      loading={saving}
      maxWidth="sm:max-w-2xl"
      testIdPrefix="suribet-balance-modal"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Machine *</label>
          <select value={machineId} onChange={e => setMachineId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" data-testid="suribet-machine-select">
            {machines.map(m => <option key={m.machine_id} value={m.machine_id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Datum *</label>
          <input type="date" value={balanceDate} onChange={e => setBalanceDate(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">Biljetten SRD — aantal invoeren</p>
        <div className="grid grid-cols-4 gap-2">
          {SRD_DENOMS.map(d => (
            <div key={d}>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">SRD {d}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={counts[String(d)]}
                onChange={e => setCounts(prev => ({ ...prev, [String(d)]: e.target.value }))}
                onFocus={e => e.target.select()}
                data-testid={`suribet-count-${d}`}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:border-orange-400"
              />
              <p className="text-[10px] text-slate-400 text-center mt-0.5">= {fmtSRD((counts[String(d)] || 0) * d)}</p>
            </div>
          ))}
          <div className="col-span-1 bg-orange-100 border border-orange-300 rounded-lg p-2 text-center flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-wider font-bold text-orange-700">Totaal SRD</p>
            <p className="text-base font-black text-orange-700 mt-0.5">{fmtSRD(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">EUR bedrag</label>
          <input type="number" inputMode="decimal" step="0.01" min="0" value={eur} onChange={e => setEur(e.target.value)} onFocus={e => e.target.select()} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" data-testid="suribet-eur" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">USD bedrag</label>
          <input type="number" inputMode="decimal" step="0.01" min="0" value={usd} onChange={e => setUsd(e.target.value)} onFocus={e => e.target.select()} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" data-testid="suribet-usd" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Notitie (optioneel)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} maxLength={120} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" placeholder="bv. shift naam" />
      </div>
    </MobileModalShell>
  );
}

function MachineModal({ token, initial, onClose, onSaved }) {
  const isEdit = !!initial?.machine_id;
  const [name, setName] = useState(initial?.name || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/admin/suribet/machines/${initial.machine_id}`, { name: name.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/suribet/machines`, { name: name.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSaved();
      onClose();
    } catch (e) {
      alert('Opslaan mislukt: ' + (e?.response?.data?.detail || e.message));
      setSaving(false);
    }
  };

  return (
    <MobileModalShell
      title={isEdit ? 'Machine hernoemen' : 'Nieuwe machine'}
      onClose={() => !saving && onClose()}
      onSubmit={submit}
      submitLabel={isEdit ? 'Opslaan' : 'Toevoegen'}
      loading={saving}
      maxWidth="sm:max-w-md"
      testIdPrefix="suribet-machine-modal"
    >
      <div>
        <label className="block text-xs font-medium mb-1">Naam *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          maxLength={40}
          placeholder="bv. MAC 1"
          data-testid="suribet-machine-name"
          className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
        />
      </div>
    </MobileModalShell>
  );
}

export default function SuribetTab({ token }) {
  const [machines, setMachines] = useState([]);
  const [balances, setBalances] = useState([]);
  const [totals, setTotals] = useState({ per_machine: [], denominations: SRD_DENOMS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editBalance, setEditBalance] = useState(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editMachine, setEditMachine] = useState(null);
  const [showMachineModal, setShowMachineModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, b, t] = await Promise.all([
        axios.get(`${API}/admin/suribet/machines`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/suribet/balances`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/suribet/totals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMachines(m.data || []);
      setBalances(b.data || []);
      setTotals(t.data || { per_machine: [], denominations: SRD_DENOMS });
    } catch (e) {
      setError(e?.response?.data?.detail || 'Kon data niet laden');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const removeMachine = async (m) => {
    if (!window.confirm(`Machine "${m.name}" en alle balances verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/suribet/machines/${m.machine_id}`, { headers: { Authorization: `Bearer ${token}` } });
      await load();
    } catch (e) {
      alert('Verwijderen mislukt');
    }
  };

  const removeBalance = async (b) => {
    if (!window.confirm(`Balance van ${b.machine_name} op ${fmtDate(b.balance_date)} verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/suribet/balances/${b.balance_id}`, { headers: { Authorization: `Bearer ${token}` } });
      await load();
    } catch (e) {
      alert('Verwijderen mislukt');
    }
  };

  if (error && error.toLowerCase().includes('niet geactiveerd')) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center" data-testid="suribet-not-active">
        <Cpu className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-amber-800 mb-1">Suribet functie niet geactiveerd</p>
        <p className="text-xs text-amber-700">Vraag je superadmin om deze functie te activeren voor je bedrijf.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">Suribet — MAC Balance</h2>
            <p className="text-[11px] text-slate-500">Dagelijkse biljet-telling per machine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditMachine(null); setShowMachineModal(true); }} data-testid="suribet-add-machine" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 rounded-xl text-xs font-bold text-slate-700 active:scale-95">
            <Plus className="w-3.5 h-3.5" /> Machine
          </button>
          <button onClick={() => { setEditBalance(null); setShowBalanceModal(true); }} disabled={machines.length === 0} data-testid="suribet-add-balance" className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white active:scale-95 shadow-md">
            <Plus className="w-3.5 h-3.5" /> Balance
          </button>
        </div>
      </div>

      {/* Machines chips */}
      {machines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {machines.map(m => (
            <div key={m.machine_id} className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1" data-testid={`suribet-machine-chip-${m.machine_id}`}>
              <span className="text-xs font-bold text-slate-700">{m.name}</span>
              <button onClick={() => { setEditMachine(m); setShowMachineModal(true); }} className="p-1 text-slate-400 hover:text-orange-500" title="Hernoemen"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => removeMachine(m)} className="p-1 text-slate-400 hover:text-red-500" title="Verwijderen"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Balance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Balance overzicht</h3>
          <span className="text-xs text-slate-500">{balances.length} record{balances.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Bezig met laden…</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">{error}</div>
        ) : balances.length === 0 ? (
          <div className="p-12 text-center">
            <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-2">Nog geen balances ingevoerd</p>
            <button onClick={() => { setEditBalance(null); setShowBalanceModal(true); }} disabled={machines.length === 0} className="text-xs text-orange-600 hover:text-orange-700 font-bold disabled:opacity-50">
              {machines.length === 0 ? 'Maak eerst een machine aan' : '+ Eerste balance toevoegen'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="suribet-balance-table">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-bold sticky left-0 bg-slate-50">Datum</th>
                  <th className="text-left px-3 py-2 font-bold">Machine</th>
                  {SRD_DENOMS.map(d => (
                    <th key={d} className="text-right px-2 py-2 font-bold">{d}</th>
                  ))}
                  <th className="text-right px-2 py-2 font-bold">EUR</th>
                  <th className="text-right px-2 py-2 font-bold">USD</th>
                  <th className="text-right px-3 py-2 font-bold bg-orange-100 text-orange-700">Totaal SRD</th>
                  <th className="text-right px-2 py-2 font-bold w-16">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map(b => (
                  <tr key={b.balance_id} className="hover:bg-orange-50/30" data-testid={`suribet-row-${b.balance_id}`}>
                    <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap sticky left-0 bg-white">{fmtDate(b.balance_date)}</td>
                    <td className="px-3 py-2"><span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full">{b.machine_name}</span></td>
                    {SRD_DENOMS.map(d => {
                      const c = b.counts?.[String(d)] || 0;
                      return (
                        <td key={d} className={`px-2 py-2 text-right ${c > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}`}>{c}</td>
                      );
                    })}
                    <td className="px-2 py-2 text-right text-slate-700">{b.eur_amount > 0 ? fmtSRD(b.eur_amount) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{b.usd_amount > 0 ? fmtSRD(b.usd_amount) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-right font-black bg-orange-50/50 text-orange-700">{fmtSRD(b.srd_total)}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditBalance(b); setShowBalanceModal(true); }} className="p-1 text-slate-400 hover:text-orange-500" title="Bewerken"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeBalance(b)} className="p-1 text-slate-400 hover:text-red-500" title="Verwijderen"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
                {/* SUR rijen — totals per machine */}
                {totals.per_machine.map(pm => (
                  <tr key={`sur-${pm.machine_id}`} className="bg-gradient-to-r from-orange-100 to-amber-100 border-t-2 border-orange-300" data-testid={`suribet-sur-${pm.machine_id}`}>
                    <td className="px-3 py-2.5 font-black text-orange-800 sticky left-0 bg-orange-100" colSpan={2}>
                      SUR {pm.machine_name}
                    </td>
                    {SRD_DENOMS.map(d => (
                      <td key={d} className="px-2 py-2.5 text-right font-black text-orange-800">{pm.counts?.[String(d)] || 0}</td>
                    ))}
                    <td className="px-2 py-2.5 text-right font-black text-orange-800">{pm.eur_amount > 0 ? fmtSRD(pm.eur_amount) : '—'}</td>
                    <td className="px-2 py-2.5 text-right font-black text-orange-800">{pm.usd_amount > 0 ? fmtSRD(pm.usd_amount) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-black bg-orange-200 text-orange-900">{fmtSRD(pm.srd_total)}</td>
                    <td className="px-2 py-2.5"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBalanceModal && (
        <BalanceModal
          token={token}
          machines={machines}
          initial={editBalance}
          onClose={() => { setShowBalanceModal(false); setEditBalance(null); }}
          onSaved={load}
        />
      )}
      {showMachineModal && (
        <MachineModal
          token={token}
          initial={editMachine}
          onClose={() => { setShowMachineModal(false); setEditMachine(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}
