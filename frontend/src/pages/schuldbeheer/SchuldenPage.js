import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { FileText, Plus, Edit2, Trash2, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusOptions = [
  { value: 'open', label: 'Open', color: 'red' },
  { value: 'regeling', label: 'Regeling', color: 'amber' },
  { value: 'betaald', label: 'Betaald', color: 'green' },
  { value: 'betwist', label: 'Betwist', color: 'purple' }
];

const prioriteitOptions = [
  { value: 'hoog', label: 'Hoog', color: 'red' },
  { value: 'normaal', label: 'Normaal', color: 'gray' },
  { value: 'laag', label: 'Laag', color: 'green' }
];

export default function SchuldenPage() {
  const { token } = useAuth();
  const [schulden, setSchulden] = useState([]);
  const [relaties, setRelaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchuld, setEditingSchuld] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    relatie_id: '', omschrijving: '', startdatum: new Date().toISOString().split('T')[0],
    oorspronkelijk_bedrag: '', rente_percentage: '0', maandbedrag: '0', status: 'open', prioriteit: 'normaal', notities: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const [schuldenRes, relatiesRes] = await Promise.all([
        fetch(`${API_URL}/api/schuldbeheer/schulden?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/relaties`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (!schuldenRes.ok) throw new Error('Fout bij ophalen schulden');
      setSchulden(await schuldenRes.json());
      setRelaties(await relatiesRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSchuld 
        ? `${API_URL}/api/schuldbeheer/schulden/${editingSchuld.id}`
        : `${API_URL}/api/schuldbeheer/schulden`;
      const response = await fetch(url, {
        method: editingSchuld ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          oorspronkelijk_bedrag: parseFloat(formData.oorspronkelijk_bedrag) || 0,
          rente_percentage: parseFloat(formData.rente_percentage) || 0,
          maandbedrag: parseFloat(formData.maandbedrag) || 0
        })
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      setEditingSchuld(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze schuld wilt verwijderen? Alle gekoppelde betalingen worden ook verwijderd.')) return;
    try {
      const response = await fetch(`${API_URL}/api/schuldbeheer/schulden/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij verwijderen');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (schuld) => {
    setEditingSchuld(schuld);
    setFormData({
      relatie_id: schuld.relatie_id,
      omschrijving: schuld.omschrijving,
      startdatum: schuld.startdatum,
      oorspronkelijk_bedrag: schuld.oorspronkelijk_bedrag.toString(),
      rente_percentage: schuld.rente_percentage.toString(),
      maandbedrag: schuld.maandbedrag.toString(),
      status: schuld.status,
      prioriteit: schuld.prioriteit,
      notities: schuld.notities || ''
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingSchuld(null);
    setFormData({
      relatie_id: relaties[0]?.id || '', omschrijving: '', startdatum: new Date().toISOString().split('T')[0],
      oorspronkelijk_bedrag: '', rente_percentage: '0', maandbedrag: '0', status: 'open', prioriteit: 'normaal', notities: ''
    });
    setShowModal(true);
  };

  const filteredSchulden = schulden.filter(s =>
    s.omschrijving.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.dossiernummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.relatie_naam && s.relatie_naam.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    const opt = statusOptions.find(o => o.value === status);
    const colors = { red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', green: 'bg-green-100 text-green-700', purple: 'bg-purple-100 text-purple-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[opt?.color] || 'bg-gray-100 text-gray-700'}`}>{opt?.label || status}</span>;
  };

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schulden</h1>
            <p className="text-gray-500">Beheer uw schulden en dossiers</p>
          </div>
          <button onClick={openNewModal} disabled={relaties.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nieuwe Schuld
          </button>
        </div>

        {relaties.length === 0 && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Voeg eerst een schuldeiser toe voordat u schulden kunt registreren.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Zoeken op omschrijving, dossiernummer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Alle statussen</option>
            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : filteredSchulden.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Geen schulden gevonden</p></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dossier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schuldeiser</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Oorspronkelijk</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Openstaand</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Maandbedrag</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSchulden.map((schuld) => (
                    <tr key={schuld.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">{schuld.dossiernummer}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{schuld.relatie_naam}</td>
                      <td className="px-4 py-3 text-gray-600">{schuld.omschrijving}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(schuld.oorspronkelijk_bedrag)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(schuld.openstaand_saldo)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(schuld.maandbedrag)}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(schuld.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditModal(schuld)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(schuld.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingSchuld ? 'Schuld Bewerken' : 'Nieuwe Schuld'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schuldeiser *</label>
                  <select required value={formData.relatie_id} onChange={(e) => setFormData({...formData, relatie_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecteer schuldeiser...</option>
                    {relaties.map(r => <option key={r.id} value={r.id}>{r.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving *</label>
                  <input type="text" required value={formData.omschrijving} onChange={(e) => setFormData({...formData, omschrijving: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bijv. Huurachterstand januari 2024" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum *</label>
                    <input type="date" required value={formData.startdatum} onChange={(e) => setFormData({...formData, startdatum: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Oorspronkelijk Bedrag (€) *</label>
                    <input type="number" required step="0.01" min="0" value={formData.oorspronkelijk_bedrag} onChange={(e) => setFormData({...formData, oorspronkelijk_bedrag: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rente %</label>
                    <input type="number" step="0.1" min="0" value={formData.rente_percentage} onChange={(e) => setFormData({...formData, rente_percentage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maandbedrag Regeling (€)</label>
                    <input type="number" step="0.01" min="0" value={formData.maandbedrag} onChange={(e) => setFormData({...formData, maandbedrag: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioriteit</label>
                    <select value={formData.prioriteit} onChange={(e) => setFormData({...formData, prioriteit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {prioriteitOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                  <textarea value={formData.notities} onChange={(e) => setFormData({...formData, notities: e.target.value})}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
