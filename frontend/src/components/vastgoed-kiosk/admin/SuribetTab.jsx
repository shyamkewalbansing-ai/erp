import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Save, X, Calculator, Cpu } from 'lucide-react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';
import SuribetWerkblad from './SuribetWerkblad';

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
  const [balanceFromBon, setBalanceFromBon] = useState(initial?.balance_from_bon ?? 0);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [saving, setSaving] = useState(false);

  const total = calcSrdTotal(counts);
  const bonAmount = parseFloat(balanceFromBon) || 0;
  const verschil = bonAmount - total; // negatief = winst, positief = bijzetten

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
        balance_from_bon: parseFloat(balanceFromBon) || 0,
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

      {/* Balance van bon + verschil-preview */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <div>
          <label className="block text-xs font-medium mb-1">Balance van bon (SRD)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={balanceFromBon}
            onChange={e => setBalanceFromBon(e.target.value)}
            onFocus={e => e.target.select()}
            placeholder="bv. 68049.56"
            data-testid="suribet-balance-from-bon"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
          />
          <p className="text-[10px] text-slate-500 mt-1">Bedrag onderaan de Suribet bon onder &quot;Balance&quot;</p>
        </div>
        {bonAmount > 0 && (
          <div className={`rounded-lg p-2.5 border-2 ${verschil < 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`} data-testid="suribet-verschil-preview">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[10px] uppercase tracking-wider font-bold ${verschil < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {verschil < 0 ? 'Winst gedraaid' : 'Bijzetten nodig'}
                </p>
                <p className="text-[10px] text-slate-500">Balance − getelde biljetten</p>
              </div>
              <p className={`text-base font-black ${verschil < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {verschil < 0 ? '−' : ''}SRD {fmtSRD(Math.abs(verschil))}
              </p>
            </div>
          </div>
        )}
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

      {/* Werkblad — spreadsheet view */}
      <SuribetWerkblad
        token={token}
        machines={machines}
        balances={balances}
        onRefresh={load}
      />

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
