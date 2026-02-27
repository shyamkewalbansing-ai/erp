import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => {
  if (amount === null || amount === undefined) return `${currency} 0,00`;
  return `${currency} ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount)}`;
};

export default function BankKasPage() {
  const { token } = useAuth();
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ naam: '', rekeningnummer: '', bank: 'DSB', valuta: 'SRD', beginsaldo: 0 });

  const fetchRekeningen = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/bankrekeningen`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRekeningen(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchRekeningen(); }, [fetchRekeningen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/bankrekeningen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setShowModal(false); fetchRekeningen(); }
    } catch (e) { console.error(e); }
  };

  const totaalSRD = rekeningen.filter(r => r.valuta === 'SRD').reduce((s, r) => s + (r.huidig_saldo || 0), 0);
  const totaalUSD = rekeningen.filter(r => r.valuta === 'USD').reduce((s, r) => s + (r.huidig_saldo || 0), 0);
  const totaalEUR = rekeningen.filter(r => r.valuta === 'EUR').reduce((s, r) => s + (r.huidig_saldo || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank & Kas</h1>
          <p className="text-gray-500">Beheer bankrekeningen en kasboek</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuwe Rekening</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Landmark className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalSRD, 'SRD')}</p>
              <p className="text-sm text-gray-500">Totaal SRD</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalUSD, '$')}</p>
          <p className="text-sm text-gray-500">Totaal USD</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalEUR, '€')}</p>
          <p className="text-sm text-gray-500">Totaal EUR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="col-span-3 text-center py-12 text-gray-500">Laden...</p> :
        rekeningen.length === 0 ? <p className="col-span-3 text-center py-12 text-gray-500">Geen bankrekeningen</p> :
        rekeningen.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{r.naam}</p>
                <p className="text-sm text-gray-500">{r.bank} - {r.rekeningnummer}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                r.valuta === 'SRD' ? 'bg-blue-100 text-blue-600' :
                r.valuta === 'USD' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
              }`}>{r.valuta}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(r.huidig_saldo || 0, r.valuta)}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-6">Nieuwe Bankrekening</h2>
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
                <div><label className="block text-sm font-medium mb-1">Valuta</label>
                  <select value={formData.valuta} onChange={(e) => setFormData({...formData, valuta: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                    <option>SRD</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Rekeningnummer</label>
                <input value={formData.rekeningnummer} onChange={(e) => setFormData({...formData, rekeningnummer: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div><label className="block text-sm font-medium mb-1">Beginsaldo</label>
                <input type="number" value={formData.beginsaldo} onChange={(e) => setFormData({...formData, beginsaldo: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg" />
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
