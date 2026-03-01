import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { CreditCard, Plus, Trash2, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BetalingenPage() {
  const { token } = useAuth();
  const [betalingen, setBetalingen] = useState([]);
  const [schulden, setSchulden] = useState([]);
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    schuld_id: '', datum: new Date().toISOString().split('T')[0], bedrag: '', rekening_id: '', omschrijving: '', referentie: '', betaalmethode: 'bank'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [betalingenRes, schuldenRes, rekeningenRes] = await Promise.all([
        fetch(`${API_URL}/api/schuldbeheer/betalingen`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/schulden?status=open`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/rekeningen`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!betalingenRes.ok) throw new Error('Fout bij ophalen betalingen');
      setBetalingen(await betalingenRes.json());
      const schuldenData = await schuldenRes.json();
      setSchulden(schuldenData);
      setRekeningen(await rekeningenRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/schuldbeheer/betalingen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, bedrag: parseFloat(formData.bedrag) || 0 })
      });
      if (!response.ok) throw new Error('Fout bij opslaan');
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze betaling wilt verwijderen?')) return;
    try {
      const response = await fetch(`${API_URL}/api/schuldbeheer/betalingen/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij verwijderen');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewModal = () => {
    setFormData({
      schuld_id: schulden[0]?.id || '', datum: new Date().toISOString().split('T')[0], bedrag: '', rekening_id: rekeningen[0]?.id || '', omschrijving: '', referentie: '', betaalmethode: 'bank'
    });
    setShowModal(true);
  };

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Betalingen</h1>
            <p className="text-gray-500">Registreer betalingen aan schuldeisers</p>
          </div>
          <button onClick={openNewModal} disabled={schulden.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nieuwe Betaling
          </button>
        </div>

        {schulden.length === 0 && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Voeg eerst een schuld toe voordat u betalingen kunt registreren.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : betalingen.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Nog geen betalingen geregistreerd</p></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schuldeiser</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schuld</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Methode</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {betalingen.map((betaling) => (
                    <tr key={betaling.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{betaling.datum}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{betaling.relatie_naam}</td>
                      <td className="px-4 py-3 text-gray-600">{betaling.schuld_omschrijving}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(betaling.bedrag)}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{betaling.betaalmethode}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(betaling.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Nieuwe Betaling</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schuld *</label>
                  <select required value={formData.schuld_id} onChange={(e) => setFormData({...formData, schuld_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecteer schuld...</option>
                    {schulden.map(s => <option key={s.id} value={s.id}>{s.relatie_naam} - {s.omschrijving} ({formatCurrency(s.openstaand_saldo)})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                    <input type="date" required value={formData.datum} onChange={(e) => setFormData({...formData, datum: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag (€) *</label>
                    <input type="number" required step="0.01" min="0" value={formData.bedrag} onChange={(e) => setFormData({...formData, bedrag: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bankrekening</label>
                  <select value={formData.rekening_id} onChange={(e) => setFormData({...formData, rekening_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Geen rekening</option>
                    {rekeningen.map(r => <option key={r.id} value={r.id}>{r.bank} - {r.rekeningnummer}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betaalmethode</label>
                  <select value={formData.betaalmethode} onChange={(e) => setFormData({...formData, betaalmethode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="bank">Bank</option>
                    <option value="contant">Contant</option>
                    <option value="automatisch">Automatische Incasso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referentie</label>
                  <input type="text" value={formData.referentie} onChange={(e) => setFormData({...formData, referentie: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bijv. betalingskenmerk" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                  <input type="text" value={formData.omschrijving} onChange={(e) => setFormData({...formData, omschrijving: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuleren</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Betaling Registreren</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
