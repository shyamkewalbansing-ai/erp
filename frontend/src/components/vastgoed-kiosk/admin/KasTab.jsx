import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Landmark, TrendingUp, TrendingDown, PieChart, Plus, Pencil, Check, X, PlayCircle, Users, ArrowLeftRight, RefreshCw, Repeat } from 'lucide-react';
import { API, axios, formatSRD } from './utils';

const CURRENCY_SYMBOLS = { SRD: 'SRD', EUR: '€', USD: '$' };
function formatMoney(amount, currency = 'SRD') {
  const num = Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${CURRENCY_SYMBOLS[currency] || currency} ${num}`;
}

function KasTab({ token, tenants }) {
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [relatedTenant, setRelatedTenant] = useState('');
  const [saving, setSaving] = useState(false);

  // Multi-account state
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activeCurrencyFilter, setActiveCurrencyFilter] = useState(null); // null = all
  const [totalsByCurrency, setTotalsByCurrency] = useState({});
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccCurrencies, setNewAccCurrencies] = useState(['SRD']);
  const [newAccDesc, setNewAccDesc] = useState('');
  const [entryCurrency, setEntryCurrency] = useState('SRD');

  // Exchange state
  const [showExchange, setShowExchange] = useState(false);
  const [exFromAccId, setExFromAccId] = useState(null);
  const [exFromCur, setExFromCur] = useState('SRD');
  const [exAmount, setExAmount] = useState('');
  const [exToAccId, setExToAccId] = useState(null);
  const [exToCur, setExToCur] = useState('SRD');
  const [exPreview, setExPreview] = useState(null);
  const [exLoading, setExLoading] = useState(false);
  const [exSaving, setExSaving] = useState(false);
  const [exResult, setExResult] = useState(null);
  const [exUseCustomRate, setExUseCustomRate] = useState(false);
  const [exCustomRate, setExCustomRate] = useState('');

  // Exchange rates
  const [rates, setRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('SRD');
  const [convResult, setConvResult] = useState(null);
  const [converting, setConverting] = useState(false);

  // Verdeling state
  const [activeView, setActiveView] = useState('kas'); // 'kas' | 'verdeling' | 'koers'
  const [holders, setHolders] = useState([]);
  const [overzicht, setOverzicht] = useState(null);
  const [loadingVerdeling, setLoadingVerdeling] = useState(false);
  const [showAddHolder, setShowAddHolder] = useState(false);
  const [newHolderName, setNewHolderName] = useState('');
  const [newHolderPct, setNewHolderPct] = useState('');
  const [editingHolder, setEditingHolder] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPct, setEditPct] = useState('');
  const [showConfirmVerdeling, setShowConfirmVerdeling] = useState(false);
  const [verdelingNotitie, setVerdelingNotitie] = useState('');
  const [executing, setExecuting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const activeAccount = accounts.find(a => a.account_id === activeAccountId) || accounts[0] || null;
  const accountCurrencies = activeAccount?.currencies || [activeAccount?.currency || 'SRD'];
  const activeCurrency = activeCurrencyFilter || accountCurrencies[0] || 'SRD';

  const loadAccounts = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/admin/kas-accounts`, { headers });
      setAccounts(resp.data || []);
      if (!activeAccountId && resp.data?.length) {
        setActiveAccountId(resp.data[0].account_id);
      }
    } catch { /* skip */ }
  }, [token, activeAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadKas = useCallback(async (accountId, curFilter) => {
    const accId = accountId || activeAccountId;
    if (!accId) return;
    try {
      const params = { account_id: accId };
      if (curFilter) params.currency = curFilter;
      const resp = await axios.get(`${API}/admin/kas`, { headers, params });
      setEntries(resp.data.entries || []);
      setTotals({ total_income: resp.data.total_income, total_expense: resp.data.total_expense, balance: resp.data.balance });
      setTotalsByCurrency(resp.data.totals_by_currency || {});
    } catch { /* skip */ }
    setLoading(false);
  }, [token, activeAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const resp = await axios.get(`${API}/admin/exchange-rates`, { headers });
      setRates(resp.data);
    } catch { /* skip */ }
    setLoadingRates(false);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccName.trim() || newAccCurrencies.length === 0) return;
    setSaving(true);
    try {
      const resp = await axios.post(`${API}/admin/kas-accounts`, {
        name: newAccName.trim(),
        currencies: newAccCurrencies,
        description: newAccDesc.trim() || null,
      }, { headers });
      setShowNewAccount(false);
      setNewAccName(''); setNewAccDesc(''); setNewAccCurrencies(['SRD']);
      await loadAccounts();
      setActiveAccountId(resp.data.account_id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Aanmaken mislukt');
    }
    setSaving(false);
  };

  const toggleNewCurrency = (c) => {
    setNewAccCurrencies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleDeleteAccount = async (id) => {
    const acc = accounts.find(a => a.account_id === id);
    if (!acc) return;
    if (acc.is_default) return alert('De hoofdkas kan niet verwijderd worden');
    if (!window.confirm(`Bank/Kas "${acc.name}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/kas-accounts/${id}`, { headers });
      await loadAccounts();
      setActiveAccountId(accounts.find(a => a.is_default)?.account_id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  const handleConvert = async () => {
    const amt = parseFloat(convAmount);
    if (!amt || amt <= 0) return;
    setConverting(true);
    try {
      const resp = await axios.post(`${API}/admin/exchange-rates/convert`, {
        amount: amt, from: convFrom, to: convTo,
      }, { headers });
      setConvResult(resp.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Conversie mislukt');
    }
    setConverting(false);
  };

  // Exchange helpers
  const openExchange = () => {
    const first = activeAccount || accounts[0];
    const defaultCur = first?.currencies?.[0] || first?.currency || 'SRD';
    setExFromAccId(first?.account_id || null);
    setExFromCur(defaultCur);
    // Find any other account or the same account's other currency
    const other = accounts.find(a => a.account_id !== first?.account_id) || first;
    const otherCurs = other?.currencies || [other?.currency || 'SRD'];
    const otherCur = otherCurs.find(c => c !== defaultCur) || otherCurs[0];
    setExToAccId(other?.account_id || null);
    setExToCur(otherCur);
    setExAmount('');
    setExPreview(null);
    setExResult(null);
    setExUseCustomRate(false);
    setExCustomRate('');
    setShowExchange(true);
  };

  // Live preview: use custom rate if set, else CME
  useEffect(() => {
    if (!showExchange) return;
    const amt = parseFloat(exAmount);
    if (!amt || amt <= 0 || exFromCur === exToCur) { setExPreview(null); return; }
    if (exUseCustomRate) {
      const r = parseFloat(exCustomRate);
      if (!r || r <= 0) { setExPreview(null); return; }
      setExPreview({ amount: amt, from: exFromCur, to: exToCur, rate: r, result: amt * r, as_of: 'Handmatig', source: 'custom' });
      return;
    }
    let canceled = false;
    setExLoading(true);
    (async () => {
      try {
        const resp = await axios.post(`${API}/admin/exchange-rates/convert`, { amount: amt, from: exFromCur, to: exToCur }, { headers });
        if (!canceled) setExPreview(resp.data);
      } catch { if (!canceled) setExPreview(null); }
      if (!canceled) setExLoading(false);
    })();
    return () => { canceled = true; };
  }, [exAmount, exFromCur, exToCur, showExchange, exUseCustomRate, exCustomRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(exAmount);
    if (!amt || amt <= 0 || !exFromAccId || !exToAccId) return;
    if (exFromAccId === exToAccId && exFromCur === exToCur) {
      alert('Bron en doel zijn identiek'); return;
    }
    const customRate = exUseCustomRate ? parseFloat(exCustomRate) : null;
    if (exUseCustomRate && (!customRate || customRate <= 0)) {
      alert('Vul een geldige koers in'); return;
    }
    setExSaving(true);
    try {
      const payload = {
        from_account_id: exFromAccId, from_currency: exFromCur, from_amount: amt,
        to_account_id: exToAccId, to_currency: exToCur,
      };
      if (customRate) payload.custom_rate = customRate;
      const resp = await axios.post(`${API}/admin/kas/exchange`, payload, { headers });
      setExResult(resp.data);
      await loadAccounts();
      loadKas(activeAccountId, activeCurrencyFilter);
    } catch (err) {
      alert(err.response?.data?.detail || 'Wisselen mislukt');
    }
    setExSaving(false);
  };

  const exFromAcc = accounts.find(a => a.account_id === exFromAccId);
  const exToAcc = accounts.find(a => a.account_id === exToAccId);
  const exFromCurs = exFromAcc?.currencies || (exFromAcc?.currency ? [exFromAcc.currency] : ['SRD']);
  const exToCurs = exToAcc?.currencies || (exToAcc?.currency ? [exToAcc.currency] : ['SRD']);

  const loadVerdeling = useCallback(async () => {
    setLoadingVerdeling(true);
    try {
      const [holdersResp, overzichtResp] = await Promise.all([
        axios.get(`${API}/admin/verdeling/rekeninghouders`, { headers }),
        axios.get(`${API}/admin/verdeling/overzicht`, { headers })
      ]);
      setHolders(holdersResp.data || []);
      setOverzicht(overzichtResp.data);
    } catch { /* skip */ }
    setLoadingVerdeling(false);
  }, [token]);

  useEffect(() => { loadAccounts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeAccountId) loadKas(activeAccountId, activeCurrencyFilter); }, [activeAccountId, activeCurrencyFilter, loadKas]);
  // Reset currency filter to primary when switching account
  useEffect(() => {
    const acc = accounts.find(a => a.account_id === activeAccountId);
    const curs = acc?.currencies || (acc?.currency ? [acc.currency] : ['SRD']);
    setActiveCurrencyFilter(curs[0] || null);
  }, [activeAccountId, accounts]);
  useEffect(() => { if (activeView === 'verdeling') loadVerdeling(); }, [activeView, loadVerdeling]);
  useEffect(() => { if (activeView === 'koers' && !rates) loadRates(); }, [activeView, rates, loadRates]);

  // Sync entry currency with active account/filter
  useEffect(() => {
    if (accountCurrencies.length === 0) return;
    const preferred = activeCurrencyFilter && accountCurrencies.includes(activeCurrencyFilter) ? activeCurrencyFilter : accountCurrencies[0];
    setEntryCurrency(preferred);
  }, [activeAccountId, activeCurrencyFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      await axios.post(`${API}/admin/kas`, {
        entry_type: formType,
        amount: parseFloat(amount),
        description,
        category,
        related_tenant_id: relatedTenant || null,
        account_id: activeAccountId,
        currency: entryCurrency,
      }, { headers });
      setShowForm(false);
      setAmount(''); setDescription(''); setCategory(''); setRelatedTenant('');
      loadKas(activeAccountId, activeCurrencyFilter);
      loadAccounts();
    } catch (err) { alert(err.response?.data?.detail || 'Boeking mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Boeking verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/kas/${entryId}`, { headers });
      loadKas(activeAccountId, activeCurrencyFilter);
      loadAccounts();
    } catch { alert('Verwijderen mislukt'); }
  };

  // Verdeling handlers
  const handleAddHolder = async () => {
    if (!newHolderName.trim() || !newHolderPct || parseFloat(newHolderPct) <= 0) return;
    setSaving(true);
    try {
      await axios.post(`${API}/admin/verdeling/rekeninghouders`, {
        name: newHolderName.trim(),
        percentage: parseFloat(newHolderPct)
      }, { headers });
      setNewHolderName(''); setNewHolderPct(''); setShowAddHolder(false);
      loadVerdeling();
    } catch (err) {
      alert(err.response?.data?.detail || 'Toevoegen mislukt');
    }
    setSaving(false);
  };

  const handleUpdateHolder = async (holderId) => {
    if (!editName.trim() || !editPct || parseFloat(editPct) <= 0) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/verdeling/rekeninghouders/${holderId}`, {
        name: editName.trim(),
        percentage: parseFloat(editPct)
      }, { headers });
      setEditingHolder(null);
      loadVerdeling();
    } catch (err) {
      alert(err.response?.data?.detail || 'Bijwerken mislukt');
    }
    setSaving(false);
  };

  const handleDeleteHolder = async (holderId) => {
    if (!window.confirm('Rekeninghouder verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/verdeling/rekeninghouders/${holderId}`, { headers });
      loadVerdeling();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handleUitvoeren = async () => {
    setExecuting(true);
    try {
      const resp = await axios.post(`${API}/admin/verdeling/uitvoeren`, {
        notitie: verdelingNotitie
      }, { headers });
      setShowConfirmVerdeling(false);
      setVerdelingNotitie('');
      // Refresh both kas and verdeling data
      loadKas(activeAccountId);
      loadVerdeling();
      alert(resp.data.message);
    } catch (err) {
      alert(err.response?.data?.detail || 'Verdeling uitvoeren mislukt');
    }
    setExecuting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  const totalPct = holders.reduce((s, h) => s + h.percentage, 0);
  const restPct = 100 - totalPct;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveView('kas')}
          data-testid="kas-view-btn"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === 'kas' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'}`}
        >
          <Landmark className="w-4 h-4" /> Bank/Kas
        </button>
        <button
          onClick={() => setActiveView('verdeling')}
          data-testid="verdeling-view-btn"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === 'verdeling' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'}`}
        >
          <PieChart className="w-4 h-4" /> Verdeling
        </button>
        <button
          onClick={() => setActiveView('koers')}
          data-testid="koers-view-btn"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === 'koers' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'}`}
        >
          <ArrowLeftRight className="w-4 h-4" /> Koers Berekenen
        </button>
      </div>

      {/* Account selector (only in Kas view) */}
      {activeView === 'kas' && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-2 flex-wrap items-center">
          {accounts.map(a => {
            const curs = a.currencies || [a.currency || 'SRD'];
            const isActive = a.account_id === activeAccountId;
            return (
              <button
                key={a.account_id}
                onClick={() => setActiveAccountId(a.account_id)}
                data-testid={`kas-account-${a.account_id}`}
                className={`group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <div className="flex -space-x-1">
                  {curs.map(c => (
                    <span key={c} className={`inline-block w-1.5 h-1.5 rounded-full ${c === 'SRD' ? 'bg-orange-400' : c === 'USD' ? 'bg-green-400' : 'bg-blue-400'}`} />
                  ))}
                </div>
                {a.name}
                <span className={`text-[10px] font-mono ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{curs.join(' · ')}</span>
                {!a.is_default && isActive && (
                  <X className="w-3 h-3 ml-1 opacity-70 hover:opacity-100" onClick={(ev) => { ev.stopPropagation(); handleDeleteAccount(a.account_id); }} />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowNewAccount(true)}
            data-testid="add-kas-account-btn"
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 border border-dashed border-orange-300 transition"
          >
            <Plus className="w-4 h-4" /> Nieuw Bank/Kas
          </button>
        </div>
      )}

      {/* New account modal */}
      {showNewAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNewAccount(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Nieuw Bank/Kas toevoegen</h3>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naam</label>
                <input value={newAccName} onChange={e => setNewAccName(e.target.value)} data-testid="new-kas-name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Bijv. Reserve kas" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valuta (meerdere mogelijk)</label>
                <div className="flex gap-2">
                  {['SRD', 'EUR', 'USD'].map(c => {
                    const selected = newAccCurrencies.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => toggleNewCurrency(c)} data-testid={`new-kas-currency-${c}`}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition flex items-center justify-center gap-1.5 ${selected ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}>
                        {selected && <Check className="w-3.5 h-3.5" />}
                        {CURRENCY_SYMBOLS[c]} {c}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Selecteer één of meerdere valuta. Voor elke valuta wordt een apart saldo bijgehouden.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Omschrijving (optioneel)</label>
                <input value={newAccDesc} onChange={e => setNewAccDesc(e.target.value)} data-testid="new-kas-desc"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Bijv. Voor overige uitgaven buiten huur" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving || newAccCurrencies.length === 0} data-testid="new-kas-submit"
                  className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Aanmaken'}
                </button>
                <button type="button" onClick={() => setShowNewAccount(false)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-600 rounded-lg text-sm">Annuleer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exchange / Wisselen modal */}
      {showExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !exSaving && setShowExchange(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Valuta wisselen</h3>
                <p className="text-xs text-slate-400">Gebruikt CME dagkoers (live van cme.sr)</p>
              </div>
            </div>

            {!exResult ? (
              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                {/* Van */}
                <div className="p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Van (bron)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Bank/Kas</label>
                      <select value={exFromAccId || ''} onChange={e => {
                        const acc = accounts.find(a => a.account_id === e.target.value);
                        setExFromAccId(e.target.value);
                        const curs = acc?.currencies || [acc?.currency || 'SRD'];
                        if (!curs.includes(exFromCur)) setExFromCur(curs[0]);
                      }} data-testid="ex-from-account"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                        {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Valuta</label>
                      <select value={exFromCur} onChange={e => setExFromCur(e.target.value)} data-testid="ex-from-currency"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white">
                        {exFromCurs.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Bedrag te wisselen</label>
                    <input type="number" step="0.01" value={exAmount} onChange={e => setExAmount(e.target.value)} data-testid="ex-amount"
                      placeholder="0.00" required autoFocus
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-lg font-mono font-bold" />
                  </div>
                </div>

                {/* Swap arrow */}
                <div className="flex items-center justify-center -my-2 relative z-10">
                  <button type="button" onClick={() => {
                    // swap accounts + currencies
                    const aId = exFromAccId, aCur = exFromCur;
                    setExFromAccId(exToAccId); setExFromCur(exToCur);
                    setExToAccId(aId); setExToCur(aCur);
                  }} data-testid="ex-swap"
                    className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 hover:border-indigo-400 flex items-center justify-center shadow transition">
                    <ArrowLeftRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </button>
                </div>

                {/* Naar */}
                <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30">
                  <p className="text-xs uppercase tracking-wider text-indigo-600 font-bold mb-3">Naar (doel)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Bank/Kas</label>
                      <select value={exToAccId || ''} onChange={e => {
                        const acc = accounts.find(a => a.account_id === e.target.value);
                        setExToAccId(e.target.value);
                        const curs = acc?.currencies || [acc?.currency || 'SRD'];
                        if (!curs.includes(exToCur)) setExToCur(curs[0]);
                      }} data-testid="ex-to-account"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                        {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Valuta</label>
                      <select value={exToCur} onChange={e => setExToCur(e.target.value)} data-testid="ex-to-currency"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white">
                        {exToCurs.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-500 mb-1">U ontvangt ongeveer</p>
                    <div className="px-3 py-2.5 bg-white border-2 border-indigo-200 rounded-lg text-lg font-mono font-black text-indigo-600 min-h-[48px] flex items-center" data-testid="ex-preview">
                      {exLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : exPreview ? (
                        <span>{CURRENCY_SYMBOLS[exToCur]} {Number(exPreview.result).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      ) : exFromCur === exToCur && exAmount ? (
                        <span>{CURRENCY_SYMBOLS[exToCur]} {Number(parseFloat(exAmount) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      ) : <span className="text-slate-300 text-sm font-sans">Vul bedrag in...</span>}
                    </div>
                    {exPreview && (
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Koers: 1 {exFromCur} = {Number(exPreview.rate).toLocaleString('nl-NL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {exToCur}
                        {exPreview.source === 'custom' && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold">HANDMATIG</span>}
                        {exPreview.as_of && exPreview.source !== 'custom' && <span className="ml-1.5">• {exPreview.as_of}</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Eigen koers toggle */}
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none" data-testid="ex-custom-rate-toggle">
                  <input type="checkbox" checked={exUseCustomRate} onChange={e => { setExUseCustomRate(e.target.checked); if (!e.target.checked) setExCustomRate(''); }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                  <span>Eigen koers gebruiken <span className="text-slate-400 text-xs">(bv. afwijkende bankkoers)</span></span>
                </label>
                {exUseCustomRate && (
                  <div className="flex items-center gap-2 pl-6 -mt-2" data-testid="ex-custom-rate-row">
                    <span className="text-xs text-slate-500 whitespace-nowrap">1 {exFromCur} =</span>
                    <input type="number" step="0.0001" value={exCustomRate} onChange={e => setExCustomRate(e.target.value)} data-testid="ex-custom-rate-input"
                      placeholder="0.0000" autoFocus
                      className="flex-1 px-3 py-2 border border-indigo-300 bg-indigo-50/50 rounded-lg text-sm font-mono font-bold focus:border-indigo-500 outline-none" />
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{exToCur}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={exSaving || !exAmount || (!exPreview && exFromCur !== exToCur)} data-testid="ex-submit"
                    className="flex-1 px-4 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
                    {exSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Repeat className="w-4 h-4" /> Wisseltransactie uitvoeren</>}
                  </button>
                  <button type="button" onClick={() => setShowExchange(false)} disabled={exSaving}
                    className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">Annuleer</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4" data-testid="ex-result">
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/40 border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-bold text-emerald-700">Wisseltransactie geslaagd</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-400 font-semibold">AFGESCHREVEN</p>
                      <p className="font-bold text-slate-900 text-base">{CURRENCY_SYMBOLS[exResult.from.currency]} {Number(exResult.from.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{exResult.from.account_name}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border-2 border-emerald-300">
                      <p className="text-[11px] text-emerald-500 font-semibold">BIJGESCHREVEN</p>
                      <p className="font-black text-emerald-600 text-base">{CURRENCY_SYMBOLS[exResult.to.currency]} {Number(exResult.to.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{exResult.to.account_name}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">Koers: 1 {exResult.from.currency} = {Number(exResult.rate).toLocaleString('nl-NL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {exResult.to.currency}
                    {exResult.source === 'custom'
                      ? <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold">HANDMATIG</span>
                      : <span> • {exResult.as_of}</span>
                    }
                  </p>
                </div>
                <button onClick={() => setShowExchange(false)} data-testid="ex-close"
                  className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Sluiten</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'kas' ? (
        <>
          {/* Currency filter (only for multi-currency accounts) */}
          {accountCurrencies.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="currency-filter">
              {accountCurrencies.map(c => {
                const sym = CURRENCY_SYMBOLS[c];
                const label = sym === c ? c : `${sym} ${c}`;
                return (
                  <button key={c} onClick={() => setActiveCurrencyFilter(c)} data-testid={`currency-filter-${c}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${activeCurrencyFilter === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Kas Samenvatting - per currency (always single currency now) */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {(() => {
              const cur = activeCurrencyFilter || accountCurrencies[0];
              const t = totalsByCurrency[cur] || { total_income: 0, total_expense: 0, balance: 0 };
              return (
                <>
                  <div className="bg-white rounded-xl border border-green-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-sm text-slate-500">{activeAccount?.is_default ? 'Huurinkomsten' : 'Inkomsten'}</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900" data-testid={`kas-income-${cur}`}>{formatMoney(t.total_income, cur)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-red-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-sm text-slate-500">Totale Uitgaven</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600" data-testid={`kas-expense-${cur}`}>{formatMoney(t.total_expense, cur)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-orange-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-sm text-slate-500">Saldo — {activeAccount?.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900" data-testid={`kas-balance-${cur}`}>{formatMoney(t.balance, cur)}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Boekingen Tabel */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
              <h2 className="font-semibold text-slate-900">Boekingen Overzicht</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setFormType('income'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600" data-testid="add-income-btn">
                  <TrendingUp className="w-4 h-4" /> Inkomsten Registreren
                </button>
                <button onClick={() => { setFormType('expense'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600" data-testid="add-expense-btn">
                  <TrendingDown className="w-4 h-4" /> Uitgave Registreren
                </button>
                <button onClick={openExchange} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600" data-testid="open-exchange-btn">
                  <Repeat className="w-4 h-4" /> Wisselen
                </button>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
                <div className={`grid grid-cols-1 ${accountCurrencies.length > 1 ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 items-end`}>
                  {accountCurrencies.length > 1 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Valuta</label>
                      <select value={entryCurrency} onChange={e => setEntryCurrency(e.target.value)} data-testid="kas-entry-currency"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white">
                        {accountCurrencies.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag ({entryCurrency})</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.00" required data-testid="kas-amount-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Omschrijving</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder={formType === 'income' ? 'Bijv. Huur pand 3, Borg ontvangen' : 'Bijv. Onderhoud dak, EBS rekening'} required data-testid="kas-description-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Categorie</label>
                    <input value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder={formType === 'income' ? 'Bijv. Huur, Borg, Overig' : 'Bijv. Onderhoud, Nutsvoorzieningen, Materialen'} data-testid="kas-category-input" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50" data-testid="kas-submit-btn">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Opslaan'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                      Annuleer
                    </button>
                  </div>
                </div>
              </form>
            )}

            {entries.length === 0 ? (
              <div className="p-12 text-center">
                <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Nog geen boekingen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Omschrijving</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Categorie</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.entry_id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4 text-sm text-slate-600">
                          {e.created_at ? new Date(e.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="p-4">
                          {e.exchange_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold" title="Wisseltransactie">
                              <Repeat className="w-3 h-3" /> Wissel
                            </span>
                          ) : (
                            <>
                              {e.entry_type === 'income' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Inkomst</span>}
                              {e.entry_type === 'expense' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Uitgave</span>}
                              {e.entry_type === 'salary' && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Loon</span>}
                            </>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-900">
                          {e.description}
                          {e.related_tenant_name && <span className="text-xs text-slate-400 ml-2">({e.related_tenant_name})</span>}
                          {e.related_employee_name && <span className="text-xs text-slate-400 ml-2">({e.related_employee_name})</span>}
                          {e.exchange_id && e.exchange_counterparty_account_id && (
                            <button
                              onClick={() => {
                                setActiveAccountId(e.exchange_counterparty_account_id);
                                setActiveCurrencyFilter(e.exchange_counterparty_currency || null);
                              }}
                              data-testid={`exchange-jump-${e.entry_id}`}
                              title="Ga naar tegenboeking"
                              className="ml-2 inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold underline decoration-dotted">
                              <ArrowLeftRight className="w-3 h-3" /> bekijk tegenboeking
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">{e.category}</span>
                        </td>
                        <td className={`p-4 text-right font-bold ${e.exchange_id ? (e.exchange_direction === 'in' ? 'text-indigo-600' : 'text-indigo-400') : e.entry_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="flex items-center justify-end gap-1.5">
                            {e.exchange_id && <Repeat className="w-3.5 h-3.5 text-indigo-500" />}
                            <span>{e.entry_type === 'income' ? '+' : '-'} {formatMoney(e.amount, e.currency || activeCurrency)}</span>
                          </div>
                          {e.exchange_id && e.exchange_counterparty_currency && e.exchange_counterparty_amount != null && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                              {e.exchange_direction === 'in' ? 'van' : 'naar'} {CURRENCY_SYMBOLS[e.exchange_counterparty_currency] || e.exchange_counterparty_currency} {Number(e.exchange_counterparty_amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDelete(e.entry_id)} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeView === 'verdeling' ? (
        /* ========== VERDELING VIEW ========== */
        loadingVerdeling ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : (
          <div className="space-y-6">
            {/* Verdeling Samenvatting */}
            {overzicht && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-green-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-slate-500">Huurinkomsten</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" data-testid="verdeling-income">{formatSRD(overzicht.huurinkomsten)}</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-500">Te verdelen ({totalPct}%)</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600" data-testid="verdeling-distributed">{formatSRD(overzicht.total_distributed)}</p>
                </div>
                <div className="bg-white rounded-xl border border-orange-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm text-slate-500">Restant kassaldo ({restPct}%)</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" data-testid="verdeling-restant">{formatSRD(overzicht.restant_bedrag)}</p>
                </div>
              </div>
            )}

            {/* Rekeninghouders Beheer */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Rekeninghouders</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Verdeel huurinkomsten over rekeninghouders op basis van percentage</p>
                </div>
                <button
                  onClick={() => setShowAddHolder(true)}
                  disabled={totalPct >= 100}
                  data-testid="add-holder-btn"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Toevoegen
                </button>
              </div>

              {/* Add holder form */}
              {showAddHolder && (
                <div className="p-4 border-b border-slate-200 bg-blue-50/50">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Naam</label>
                      <input
                        value={newHolderName}
                        onChange={e => setNewHolderName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Bijv. Sardha"
                        data-testid="holder-name-input"
                        autoFocus
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Percentage</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={100 - totalPct}
                          value={newHolderPct}
                          onChange={e => setNewHolderPct(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm pr-8"
                          placeholder="0"
                          data-testid="holder-pct-input"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                    </div>
                    <button onClick={handleAddHolder} disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50" data-testid="holder-save-btn">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setShowAddHolder(false); setNewHolderName(''); setNewHolderPct(''); }} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Beschikbaar: {(100 - totalPct).toFixed(1)}%</p>
                </div>
              )}

              {holders.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">Nog geen rekeninghouders</p>
                  <p className="text-xs text-slate-300 mt-1">Voeg rekeninghouders toe om huurinkomsten te verdelen</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-slate-500">Naam</th>
                        <th className="text-right p-4 text-sm font-medium text-slate-500">Percentage</th>
                        <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                        <th className="text-right p-4 text-sm font-medium text-slate-500 w-28">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holders.map(h => {
                        const matchOvz = overzicht?.verdeling?.find(v => v.holder_id === h.holder_id);
                        const isEditing = editingHolder === h.holder_id;
                        return (
                          <tr key={h.holder_id} className="border-t border-slate-100 hover:bg-slate-50">
                            {isEditing ? (
                              <>
                                <td className="p-4">
                                  <input value={editName} onChange={e => setEditName(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full" data-testid={`edit-name-${h.holder_id}`} />
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <input type="number" step="0.1" min="0.1" value={editPct} onChange={e => setEditPct(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-20 text-right" data-testid={`edit-pct-${h.holder_id}`} />
                                    <span className="text-slate-400 text-sm">%</span>
                                  </div>
                                </td>
                                <td className="p-4 text-right text-sm text-slate-400">—</td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => handleUpdateHolder(h.holder_id)} disabled={saving} className="p-1.5 text-green-500 hover:bg-green-50 rounded" data-testid={`save-edit-${h.holder_id}`}>
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingHolder(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-4 text-sm font-medium text-slate-900">{h.name}</td>
                                <td className="p-4 text-right">
                                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{h.percentage}%</span>
                                </td>
                                <td className="p-4 text-right text-sm font-semibold text-slate-900">
                                  {matchOvz ? formatSRD(matchOvz.bedrag) : '—'}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => { setEditingHolder(h.holder_id); setEditName(h.name); setEditPct(String(h.percentage)); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="Bewerken" data-testid={`edit-holder-${h.holder_id}`}>
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteHolder(h.holder_id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Verwijderen" data-testid={`delete-holder-${h.holder_id}`}>
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Restant row */}
                      <tr className="border-t-2 border-orange-200 bg-orange-50/50">
                        <td className="p-4 text-sm font-semibold text-orange-700">Kassaldo (restant)</td>
                        <td className="p-4 text-right">
                          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">{restPct.toFixed(1)}%</span>
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-orange-700">
                          {overzicht ? formatSRD(overzicht.restant_bedrag) : '—'}
                        </td>
                        <td className="p-4"></td>
                      </tr>
                      {/* Total row */}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="p-4 text-sm font-bold text-slate-900">Totaal</td>
                        <td className="p-4 text-right">
                          <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">100%</span>
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-slate-900">
                          {overzicht ? formatSRD(overzicht.huurinkomsten) : '—'}
                        </td>
                        <td className="p-4"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Verdeling Uitvoeren knop */}
            {holders.length > 0 && overzicht && overzicht.huurinkomsten > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Verdeling uitvoeren</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Dit maakt {holders.length} uitgave-boekingen aan in de kas op basis van bovenstaande percentages
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConfirmVerdeling(true)}
                    data-testid="execute-verdeling-btn"
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" /> Verdeling uitvoeren
                  </button>
                </div>
              </div>
            )}

            {/* Bevestiging Modal */}
            {showConfirmVerdeling && overzicht && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmVerdeling(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Verdeling bevestigen</h3>
                    <p className="text-sm text-slate-500 mt-1">De volgende uitgaven worden geboekt in de kas:</p>
                  </div>
                  <div className="p-6 space-y-3">
                    {overzicht.verdeling.map(v => (
                      <div key={v.holder_id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-slate-900">{v.name}</span>
                          <span className="text-xs text-slate-400 ml-2">{v.percentage}%</span>
                        </div>
                        <span className="text-sm font-bold text-red-600">- {formatSRD(v.bedrag)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-sm font-bold text-slate-900">Totaal uitbetaling</span>
                      <span className="text-sm font-bold text-red-600">- {formatSRD(overzicht.total_distributed)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">Restant in kas</span>
                      <span className="text-sm font-bold text-orange-600">{formatSRD(overzicht.restant_bedrag)}</span>
                    </div>
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Notitie (optioneel)</label>
                      <input
                        value={verdelingNotitie}
                        onChange={e => setVerdelingNotitie(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Bijv. Verdeling maart 2026"
                        data-testid="verdeling-notitie-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 border-t border-slate-100">
                    <button
                      onClick={handleUitvoeren}
                      disabled={executing}
                      data-testid="confirm-verdeling-btn"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50"
                    >
                      {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Bevestigen
                    </button>
                    <button
                      onClick={() => setShowConfirmVerdeling(false)}
                      className="px-6 py-3 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl font-medium"
                    >
                      Annuleer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ========== KOERS BEREKENEN VIEW ========== */
        <div className="space-y-6">
          {/* Rates header */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-orange-500" /> Wisselkoersen
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live van <a href="https://www.cme.sr/" target="_blank" rel="noreferrer" className="underline hover:text-orange-500">cme.sr</a>
                  {rates?.as_of && <span className="ml-2">• bijgewerkt {rates.as_of}</span>}
                  {rates?.cached && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">gecached</span>}
                </p>
              </div>
              <button onClick={loadRates} disabled={loadingRates} data-testid="reload-rates-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRates ? 'animate-spin' : ''}`} /> Vernieuwen
              </button>
            </div>
            {!rates ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Koersen laden...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">CME Koopt (u verkoopt aan CME)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">$</span>1 USD</span>
                      <span className="font-mono font-bold text-slate-900" data-testid="rate-usd-buy">SRD {rates.USD_buy?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">€</span>1 EUR</span>
                      <span className="font-mono font-bold text-slate-900" data-testid="rate-eur-buy">SRD {rates.EUR_buy?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">CME Verkoopt (u koopt bij CME)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">$</span>1 USD</span>
                      <span className="font-mono font-bold text-slate-900" data-testid="rate-usd-sell">SRD {rates.USD_sell?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">€</span>1 EUR</span>
                      <span className="font-mono font-bold text-slate-900" data-testid="rate-eur-sell">SRD {rates.EUR_sell?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Converter */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-orange-500" /> Koers Berekenen</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag</label>
                <input type="number" step="0.01" value={convAmount} onChange={e => setConvAmount(e.target.value)} data-testid="conv-amount"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-lg font-mono" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Van</label>
                <select value={convFrom} onChange={e => setConvFrom(e.target.value)} data-testid="conv-from"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold bg-white">
                  <option value="SRD">SRD — Surinaamse Dollar</option>
                  <option value="USD">USD — Amerikaanse Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naar</label>
                <div className="flex gap-1">
                  <select value={convTo} onChange={e => setConvTo(e.target.value)} data-testid="conv-to"
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold bg-white">
                    <option value="SRD">SRD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <button type="button" onClick={() => { const t = convFrom; setConvFrom(convTo); setConvTo(t); setConvResult(null); }} data-testid="conv-swap"
                    title="Wissel van/naar" className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200">
                    <ArrowLeftRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={handleConvert} disabled={converting || !convAmount} data-testid="conv-calculate"
              className="mt-4 w-full md:w-auto px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 justify-center">
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />} Bereken
            </button>

            {convResult && (
              <div className="mt-5 p-5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40" data-testid="conv-result">
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-2">Resultaat</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-slate-500 text-lg">{Number(convResult.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {convResult.from}</span>
                  <ArrowLeftRight className="w-5 h-5 text-emerald-500" />
                  <span className="font-mono font-black text-emerald-600 text-2xl">{Number(convResult.result).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {convResult.to}</span>
                </div>
                <p className="text-xs text-slate-400 mt-3">Koers: 1 {convResult.from} = {Number(convResult.rate).toLocaleString('nl-NL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {convResult.to}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KasTab;
