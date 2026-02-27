import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, RefreshCw, DollarSign, Euro } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function WisselkoersenPage() {
  const { token } = useAuth();
  const [koersen, setKoersen] = useState([]);
  const [actueel, setActueel] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ valuta_van: 'USD', valuta_naar: 'SRD', koers: '', datum: new Date().toISOString().split('T')[0] });

  const fetchData = useCallback(async () => {
    try {
      const [koersenRes, actueelRes] = await Promise.all([
        fetch(`${API_URL}/api/boekhouding/wisselkoersen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/boekhouding/wisselkoersen/actueel`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (koersenRes.ok) setKoersen(await koersenRes.json());
      if (actueelRes.ok) setActueel(await actueelRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/wisselkoersen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, koers: parseFloat(formData.koers), bron: 'handmatig' })
      });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wisselkoersen</h1>
          <p className="text-gray-500">Beheer valutakoersen (handmatige invoer)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuwe Koers</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{actueel.USD_SRD?.koers || '-'}</p>
              <p className="text-sm text-gray-500">USD / SRD</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Euro className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{actueel.EUR_SRD?.koers || '-'}</p>
              <p className="text-sm text-gray-500">EUR / SRD</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{actueel.EUR_USD?.koers || '-'}</p>
              <p className="text-sm text-gray-500">EUR / USD</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Koershistorie</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Datum</th>
              <th className="px-6 py-4 font-medium">Van</th>
              <th className="px-6 py-4 font-medium">Naar</th>
              <th className="px-6 py-4 font-medium text-right">Koers</th>
              <th className="px-6 py-4 font-medium">Bron</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
            koersen.length === 0 ? <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Geen koersen ingevoerd</td></tr> :
            koersen.slice(0, 20).map((k) => (
              <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{k.datum}</td>
                <td className="px-6 py-4 text-sm font-medium">{k.valuta_van}</td>
                <td className="px-6 py-4 text-sm font-medium">{k.valuta_naar}</td>
                <td className="px-6 py-4 text-sm text-right font-bold">{k.koers}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{k.bron}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6">Nieuwe Wisselkoers</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Van</label>
                  <select value={formData.valuta_van} onChange={(e) => setFormData({...formData, valuta_van: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                    <option>USD</option><option>EUR</option><option>SRD</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Naar</label>
                  <select value={formData.valuta_naar} onChange={(e) => setFormData({...formData, valuta_naar: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                    <option>SRD</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Koers *</label>
                <input required type="number" step="0.01" value={formData.koers} onChange={(e) => setFormData({...formData, koers: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="35.50" />
              </div>
              <div><label className="block text-sm font-medium mb-1">Datum</label>
                <input type="date" value={formData.datum} onChange={(e) => setFormData({...formData, datum: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
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
