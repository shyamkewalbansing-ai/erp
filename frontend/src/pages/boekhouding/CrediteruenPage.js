import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Filter, Building2, Eye, Edit } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => {
  if (amount === null || amount === undefined) return `${currency} 0,00`;
  return `${currency} ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount)}`;
};

export default function CrediteruenPage() {
  const { token } = useAuth();
  const [crediteuren, setCrediteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ naam: '', email: '', telefoon: '', adres: '', bank: 'DSB', rekeningnummer: '' });

  const fetchCrediteuren = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/crediteuren`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCrediteuren(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCrediteuren(); }, [fetchCrediteuren]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/crediteuren`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setShowModal(false); fetchCrediteuren(); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crediteuren</h1>
          <p className="text-gray-500">Beheer uw leveranciers en te betalen facturen</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuwe Crediteur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{crediteuren.length}</p>
              <p className="text-sm text-gray-500">Totaal leveranciers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(crediteuren.reduce((s, c) => s + (c.openstaand_bedrag || 0), 0))}</p>
          <p className="text-sm text-gray-500">Te betalen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Vervallen facturen</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Nummer</th>
              <th className="px-6 py-4 font-medium">Naam</th>
              <th className="px-6 py-4 font-medium">Bank</th>
              <th className="px-6 py-4 font-medium">Telefoon</th>
              <th className="px-6 py-4 font-medium text-right">Te betalen</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
            crediteuren.length === 0 ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Geen crediteuren</td></tr> :
            crediteuren.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.nummer}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{c.naam}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.bank || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.telefoon || '-'}</td>
                <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(c.openstaand_bedrag || 0)}</td>
                <td className="px-6 py-4"><button className="text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-6">Nieuwe Crediteur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Naam *</label>
                <input required value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Bank</label>
                  <select value={formData.bank} onChange={(e) => setFormData({...formData, bank: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                    <option>DSB</option><option>Hakrinbank</option><option>Finabank</option><option>RBC</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Rekeningnummer</label>
                  <input value={formData.rekeningnummer} onChange={(e) => setFormData({...formData, rekeningnummer: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600">Annuleren</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
