import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { TrendingUp, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const bronOptions = [
  { value: 'salaris', label: 'Salaris' },
  { value: 'uitkering', label: 'Uitkering' },
  { value: 'toeslagen', label: 'Toeslagen' },
  { value: 'pensioen', label: 'Pensioen' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'overig', label: 'Overig' }
];

export default function InkomstenPage() {
  const { token } = useAuth();
  const [inkomsten, setInkomsten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInkomst, setEditingInkomst] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split('T')[0], bron: 'salaris', bedrag: '', vast: true, omschrijving: '', frequentie: 'maandelijks'
  });

  const fetchInkomsten = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/schuldbeheer/inkomsten`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Fout bij ophalen');
      setInkomsten(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchInkomsten(); }, [fetchInkomsten]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingInkomst ? `${API_URL}/api/schuldbeheer/inkomsten/${editingInkomst.id}` : `${API_URL}/api/schuldbeheer/inkomsten`;
      const response = await fetch(url, {
        method: editingInkomst ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, bedrag: parseFloat(formData.bedrag) || 0 })
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      setEditingInkomst(null);
      fetchInkomsten();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze inkomst wilt verwijderen?')) return;
    try {
      await fetch(`${API_URL}/api/schuldbeheer/inkomsten/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchInkomsten();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (inkomst) => {
    setEditingInkomst(inkomst);
    setFormData({ datum: inkomst.datum, bron: inkomst.bron, bedrag: inkomst.bedrag.toString(), vast: inkomst.vast, omschrijving: inkomst.omschrijving || '', frequentie: inkomst.frequentie });
    setShowModal(true);
  };

  const totaalInkomsten = inkomsten.reduce((sum, i) => sum + i.bedrag, 0);

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inkomsten</h1>
            <p className="text-gray-500">Registreer uw inkomstenbronnen</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Totaal</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totaalInkomsten)}</p>
            </div>
            <button onClick={() => { setEditingInkomst(null); setFormData({ datum: new Date().toISOString().split('T')[0], bron: 'salaris', bedrag: '', vast: true, omschrijving: '', frequentie: 'maandelijks' }); setShowModal(true); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nieuwe Inkomst
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : inkomsten.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Nog geen inkomsten geregistreerd</p></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bron</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inkomsten.map((inkomst) => (
                  <tr key={inkomst.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{inkomst.datum}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{bronOptions.find(b => b.value === inkomst.bron)?.label || inkomst.bron}</td>
                    <td className="px-4 py-3 text-gray-600">{inkomst.omschrijving || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(inkomst.bedrag)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${inkomst.vast ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {inkomst.vast ? 'Vast' : 'Variabel'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditModal(inkomst)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(inkomst.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
                <h2 className="text-lg font-semibold">{editingInkomst ? 'Inkomst Bewerken' : 'Nieuwe Inkomst'}</h2>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bron *</label>
                    <select required value={formData.bron} onChange={(e) => setFormData({...formData, bron: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {bronOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag (€) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.bedrag} onChange={(e) => setFormData({...formData, bedrag: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
                      <span className="text-sm text-gray-700">Vast inkomen</span>
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
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Opslaan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
