import { useState, useEffect } from 'react';
import { Trash2, Loader2, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { API, axios, formatSRD } from './utils';

function KasTab({ token, tenants, formatSRD }) {
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

  const loadKas = async () => {
    try {
      const resp = await axios.get(`${API}/admin/kas`, { headers: { Authorization: `Bearer ${token}` } });
      setEntries(resp.data.entries || []);
      setTotals({ total_income: resp.data.total_income, total_expense: resp.data.total_expense, balance: resp.data.balance });
    } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { loadKas(); }, []);

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
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setAmount(''); setDescription(''); setCategory(''); setRelatedTenant('');
      loadKas();
    } catch { alert('Boeking mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Boeking verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/kas/${entryId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadKas();
    } catch { alert('Verwijderen mislukt'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
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
          <p className="text-2xl font-bold text-slate-900" data-testid="kas-balance">
            {formatSRD(totals.balance)}
          </p>
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

        {/* Inline Form */}
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
    </div>
  );
}



export default KasTab;
