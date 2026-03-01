import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { Users, Plus, Edit2, Trash2, Phone, Mail, Building2, Search, X, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const relatieTypes = [
  { value: 'huur', label: 'Huur' },
  { value: 'verzekering', label: 'Verzekering' },
  { value: 'lening', label: 'Lening' },
  { value: 'deurwaarder', label: 'Deurwaarder' },
  { value: 'belasting', label: 'Belasting' },
  { value: 'zorg', label: 'Zorg' },
  { value: 'energie', label: 'Energie' },
  { value: 'overig', label: 'Overig' }
];

export default function RelatiesPage() {
  const { token } = useAuth();
  const [relaties, setRelaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRelatie, setEditingRelatie] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    naam: '', iban: '', telefoon: '', email: '', adres: '', type: 'overig', notities: '', actief: true
  });

  const fetchRelaties = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      const response = await fetch(`${API_URL}/api/schuldbeheer/relaties?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij ophalen relaties');
      setRelaties(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => { fetchRelaties(); }, [fetchRelaties]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRelatie 
        ? `${API_URL}/api/schuldbeheer/relaties/${editingRelatie.id}`
        : `${API_URL}/api/schuldbeheer/relaties`;
      const response = await fetch(url, {
        method: editingRelatie ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      setEditingRelatie(null);
      setFormData({ naam: '', iban: '', telefoon: '', email: '', adres: '', type: 'overig', notities: '', actief: true });
      fetchRelaties();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze relatie wilt verwijderen?')) return;
    try {
      const response = await fetch(`${API_URL}/api/schuldbeheer/relaties/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Fout bij verwijderen');
      }
      fetchRelaties();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (relatie) => {
    setEditingRelatie(relatie);
    setFormData({ ...relatie });
    setShowModal(true);
  };

  const filteredRelaties = relaties.filter(r => 
    r.naam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schuldeisers</h1>
            <p className="text-gray-500">Beheer uw schuldeisers en crediteuren</p>
          </div>
          <button onClick={() => { setEditingRelatie(null); setFormData({ naam: '', iban: '', telefoon: '', email: '', adres: '', type: 'overig', notities: '', actief: true }); setShowModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nieuwe Schuldeiser
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Alle types</option>
            {relatieTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : filteredRelaties.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><Users className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Geen schuldeisers gevonden</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRelaties.map((relatie) => (
              <div key={relatie.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{relatie.naam}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{relatieTypes.find(t => t.value === relatie.type)?.label || relatie.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(relatie)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(relatie.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {relatie.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{relatie.email}</div>}
                  {relatie.telefoon && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" />{relatie.telefoon}</div>}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Totale Schuld</span>
                    <span className="font-bold text-red-600">{formatCurrency(relatie.totale_schuld)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingRelatie ? 'Schuldeiser Bewerken' : 'Nieuwe Schuldeiser'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                  <input type="text" required value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {relatieTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <input type="text" value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                    <input type="tel" value={formData.telefoon} onChange={(e) => setFormData({...formData, telefoon: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <input type="text" value={formData.adres} onChange={(e) => setFormData({...formData, adres: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                  <textarea value={formData.notities} onChange={(e) => setFormData({...formData, notities: e.target.value})}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="actief" checked={formData.actief} onChange={(e) => setFormData({...formData, actief: e.target.checked})} className="rounded" />
                  <label htmlFor="actief" className="text-sm text-gray-700">Actief</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuleren</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Opslaan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
