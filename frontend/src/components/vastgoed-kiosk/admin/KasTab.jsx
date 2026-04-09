import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Landmark, TrendingUp, TrendingDown, PieChart, Plus, Pencil, Check, X, PlayCircle, Users } from 'lucide-react';
import { API, axios, formatSRD } from './utils';

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

  // Verdeling state
  const [activeView, setActiveView] = useState('kas'); // 'kas' or 'verdeling'
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

  const loadKas = async () => {
    try {
      const resp = await axios.get(`${API}/admin/kas`, { headers });
      setEntries(resp.data.entries || []);
      setTotals({ total_income: resp.data.total_income, total_expense: resp.data.total_expense, balance: resp.data.balance });
    } catch { /* skip */ }
    setLoading(false);
  };

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

  useEffect(() => { loadKas(); }, []);
  useEffect(() => { if (activeView === 'verdeling') loadVerdeling(); }, [activeView, loadVerdeling]);

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
        related_tenant_id: relatedTenant || null
      }, { headers });
      setShowForm(false);
      setAmount(''); setDescription(''); setCategory(''); setRelatedTenant('');
      loadKas();
    } catch { alert('Boeking mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Boeking verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/kas/${entryId}`, { headers });
      loadKas();
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
      loadKas();
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
      <div className="flex gap-2">
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
      </div>

      {activeView === 'kas' ? (
        <>
          {/* Kas Samenvatting */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-green-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-500">Huurinkomsten</p>
              </div>
              <p className="text-2xl font-bold text-slate-900" data-testid="kas-income">{formatSRD(totals.total_income)}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-sm text-slate-500">Totale Uitgaven</p>
              </div>
              <p className="text-2xl font-bold text-red-600" data-testid="kas-expense">{formatSRD(totals.total_expense)}</p>
            </div>
            <div className="bg-white rounded-xl border border-orange-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-sm text-slate-500">Kassaldo</p>
              </div>
              <p className="text-2xl font-bold text-slate-900" data-testid="kas-balance">{formatSRD(totals.balance)}</p>
            </div>
          </div>

          {/* Boekingen Tabel */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
              <h2 className="font-semibold text-slate-900">Boekingen Overzicht</h2>
              <div className="flex gap-2">
                <button onClick={() => { setFormType('income'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600" data-testid="add-income-btn">
                  <TrendingUp className="w-4 h-4" /> Inkomsten Registreren
                </button>
                <button onClick={() => { setFormType('expense'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600" data-testid="add-expense-btn">
                  <TrendingDown className="w-4 h-4" /> Uitgave Registreren
                </button>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag (SRD)</label>
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
                          {e.entry_type === 'income' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Inkomst</span>}
                          {e.entry_type === 'expense' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Uitgave</span>}
                          {e.entry_type === 'salary' && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Loon</span>}
                        </td>
                        <td className="p-4 text-sm text-slate-900">
                          {e.description}
                          {e.related_tenant_name && <span className="text-xs text-slate-400 ml-2">({e.related_tenant_name})</span>}
                          {e.related_employee_name && <span className="text-xs text-slate-400 ml-2">({e.related_employee_name})</span>}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">{e.category}</span>
                        </td>
                        <td className={`p-4 text-right font-bold ${e.entry_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {e.entry_type === 'income' ? '+' : '-'} {formatSRD(e.amount)}
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
      ) : (
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
      )}
    </div>
  );
}

export default KasTab;
