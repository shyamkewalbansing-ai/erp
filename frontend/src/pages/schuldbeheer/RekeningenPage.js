import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { Wallet, Plus, Edit2, Trash2, X, AlertCircle, Building2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RekeningenPage() {
  const { token } = useAuth();
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRekening, setEditingRekening] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    rekeningnummer: '', bank: '', type: 'betaalrekening', saldo: '', naam: '', actief: true
  });

  const fetchRekeningen = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/schuldbeheer/rekeningen`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Fout bij ophalen');
      setRekeningen(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRekeningen(); }, [fetchRekeningen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRekening ? `${API_URL}/api/schuldbeheer/rekeningen/${editingRekening.id}` : `${API_URL}/api/schuldbeheer/rekeningen`;
      const response = await fetch(url, {
        method: editingRekening ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, saldo: parseFloat(formData.saldo) || 0 })
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      setEditingRekening(null);
      fetchRekeningen();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze rekening wilt verwijderen?')) return;
    try {
      await fetch(`${API_URL}/api/schuldbeheer/rekeningen/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchRekeningen();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (rekening) => {
    setEditingRekening(rekening);
    setFormData({ rekeningnummer: rekening.rekeningnummer, bank: rekening.bank, type: rekening.type, saldo: rekening.saldo.toString(), naam: rekening.naam || '', actief: rekening.actief });
    setShowModal(true);
  };

  const totaalSaldo = rekeningen.reduce((sum, r) => sum + r.saldo, 0);

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bankrekeningen</h1>
            <p className="text-gray-500">Beheer uw bankrekeningen</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Totaal Saldo</p>
              <p className={`text-xl font-bold ${totaalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totaalSaldo)}</p>
            </div>
            <button onClick={() => { setEditingRekening(null); setFormData({ rekeningnummer: '', bank: '', type: 'betaalrekening', saldo: '', naam: '', actief: true }); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nieuwe Rekening
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : rekeningen.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Nog geen bankrekeningen toegevoegd</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rekeningen.map((rekening) => (
              <div key={rekening.id} className={`bg-white rounded-xl shadow-sm border p-5 ${rekening.actief ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${rekening.type === 'spaarrekening' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      <Building2 className={`w-6 h-6 ${rekening.type === 'spaarrekening' ? 'text-amber-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{rekening.naam || rekening.bank}</h3>
                      <p className="text-sm text-gray-500">{rekening.bank}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(rekening)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rekening.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="font-mono text-sm text-gray-600">{rekening.rekeningnummer}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{rekening.type}</span>
                    {!rekening.actief && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">Inactief</span>}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Saldo</span>
                    <span className={`text-lg font-bold ${rekening.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(rekening.saldo)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingRekening ? 'Rekening Bewerken' : 'Nieuwe Rekening'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank *</label>
                  <input type="text" required value={formData.bank} onChange={(e) => setFormData({...formData, bank: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bijv. ING, ABN AMRO, Rabobank" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rekeningnummer (IBAN) *</label>
                  <input type="text" required value={formData.rekeningnummer} onChange={(e) => setFormData({...formData, rekeningnummer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="NL00BANK0000000000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="betaalrekening">Betaalrekening</option>
                      <option value="spaarrekening">Spaarrekening</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Huidig Saldo (€)</label>
                    <input type="number" step="0.01" value={formData.saldo} onChange={(e) => setFormData({...formData, saldo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam (optioneel)</label>
                  <input type="text" value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bijv. Hoofdrekening, Spaarrekening vakantie" />
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
