import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { TrendingDown, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const categorieOptions = [
  { value: 'huur', label: 'Huur', color: 'blue' },
  { value: 'energie', label: 'Energie', color: 'yellow' },
  { value: 'zorg', label: 'Zorg', color: 'red' },
  { value: 'boodschappen', label: 'Boodschappen', color: 'green' },
  { value: 'transport', label: 'Transport', color: 'purple' },
  { value: 'verzekering', label: 'Verzekering', color: 'indigo' },
  { value: 'overig', label: 'Overig', color: 'gray' }
];

export default function UitgavenPage() {
  const { token } = useAuth();
  const [uitgaven, setUitgaven] = useState([]);
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUitgave, setEditingUitgave] = useState(null);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split('T')[0], categorie: 'overig', bedrag: '', rekening_id: '', omschrijving: '', vast: false, frequentie: 'eenmalig'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategorie) params.append('categorie', filterCategorie);
      const [uitgavenRes, rekeningenRes] = await Promise.all([
        fetch(`${API_URL}/api/schuldbeheer/uitgaven?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/rekeningen`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!uitgavenRes.ok) throw new Error('Fout bij ophalen');
      setUitgaven(await uitgavenRes.json());
      setRekeningen(await rekeningenRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterCategorie]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUitgave ? `${API_URL}/api/schuldbeheer/uitgaven/${editingUitgave.id}` : `${API_URL}/api/schuldbeheer/uitgaven`;
      const response = await fetch(url, {
        method: editingUitgave ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, bedrag: parseFloat(formData.bedrag) || 0 })
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      setEditingUitgave(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze uitgave wilt verwijderen?')) return;
    try {
      await fetch(`${API_URL}/api/schuldbeheer/uitgaven/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (uitgave) => {
    setEditingUitgave(uitgave);
    setFormData({ datum: uitgave.datum, categorie: uitgave.categorie, bedrag: uitgave.bedrag.toString(), rekening_id: uitgave.rekening_id || '', omschrijving: uitgave.omschrijving || '', vast: uitgave.vast, frequentie: uitgave.frequentie });
    setShowModal(true);
  };

  const totaalUitgaven = uitgaven.reduce((sum, u) => sum + u.bedrag, 0);

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Uitgaven</h1>
            <p className="text-gray-500">Registreer uw uitgaven per categorie</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Totaal</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totaalUitgaven)}</p>
            </div>
            <button onClick={() => { setEditingUitgave(null); setFormData({ datum: new Date().toISOString().split('T')[0], categorie: 'overig', bedrag: '', rekening_id: '', omschrijving: '', vast: false, frequentie: 'eenmalig' }); setShowModal(true); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nieuwe Uitgave
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Alle categorieën</option>
            {categorieOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : uitgaven.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><TrendingDown className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Nog geen uitgaven geregistreerd</p></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uitgaven.map((uitgave) => (
                  <tr key={uitgave.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{uitgave.datum}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {categorieOptions.find(c => c.value === uitgave.categorie)?.label || uitgave.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{uitgave.omschrijving || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(uitgave.bedrag)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${uitgave.vast ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {uitgave.vast ? 'Vast' : 'Variabel'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditModal(uitgave)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(uitgave.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingUitgave ? 'Uitgave Bewerken' : 'Nieuwe Uitgave'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                    <input type="date" required value={formData.datum} onChange={(e) => setFormData({...formData, datum: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categorie *</label>
                    <select required value={formData.categorie} onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {categorieOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag (€) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.bedrag} onChange={(e) => setFormData({...formData, bedrag: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bankrekening</label>
                  <select value={formData.rekening_id} onChange={(e) => setFormData({...formData, rekening_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Geen rekening</option>
                    {rekeningen.map(r => <option key={r.id} value={r.id}>{r.bank} - {r.rekeningnummer}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequentie</label>
                    <select value={formData.frequentie} onChange={(e) => setFormData({...formData, frequentie: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="eenmalig">Eenmalig</option>
                      <option value="wekelijks">Wekelijks</option>
                      <option value="maandelijks">Maandelijks</option>
                      <option value="jaarlijks">Jaarlijks</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.vast} onChange={(e) => setFormData({...formData, vast: e.target.checked})} className="rounded" />
                      <span className="text-sm text-gray-700">Vaste last</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                  <input type="text" value={formData.omschrijving} onChange={(e) => setFormData({...formData, omschrijving: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuleren</button>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Opslaan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
