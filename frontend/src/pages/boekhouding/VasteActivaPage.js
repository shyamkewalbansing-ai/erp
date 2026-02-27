import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, Plus, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount) => `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;

export default function VasteActivaPage() {
  const { token } = useAuth();
  const [activa, setActiva] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActiva = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/vaste-activa`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setActiva(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchActiva(); }, [fetchActiva]);

  const totaalAanschaf = activa.reduce((s, a) => s + (a.aanschafwaarde || 0), 0);
  const totaalBoekwaarde = activa.reduce((s, a) => s + (a.boekwaarde || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vaste Activa</h1>
          <p className="text-gray-500">Beheer vaste activa en afschrijvingen</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuw Activum</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{activa.length}</p>
          <p className="text-sm text-gray-500">Activa</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalAanschaf)}</p>
          <p className="text-sm text-gray-500">Aanschafwaarde</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalBoekwaarde)}</p>
          <p className="text-sm text-gray-500">Boekwaarde</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Nummer</th>
              <th className="px-6 py-4 font-medium">Naam</th>
              <th className="px-6 py-4 font-medium">Categorie</th>
              <th className="px-6 py-4 font-medium text-right">Aanschafwaarde</th>
              <th className="px-6 py-4 font-medium text-right">Boekwaarde</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
            activa.length === 0 ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500"><Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />Geen vaste activa</td></tr> :
            activa.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.activum_nummer}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{a.naam}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">{a.categorie}</span></td>
                <td className="px-6 py-4 text-sm text-right">{formatCurrency(a.aanschafwaarde)}</td>
                <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(a.boekwaarde)}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${
                  a.status === 'actief' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
