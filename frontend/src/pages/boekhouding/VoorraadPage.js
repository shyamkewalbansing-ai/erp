import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Package, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount) => `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;

export default function VoorraadPage() {
  const { token } = useAuth();
  const [artikelen, setArtikelen] = useState([]);
  const [magazijnen, setMagazijnen] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [artRes, magRes] = await Promise.all([
        fetch(`${API_URL}/api/boekhouding/artikelen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/boekhouding/magazijnen`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (artRes.ok) setArtikelen(await artRes.json());
      if (magRes.ok) setMagazijnen(await magRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totaalWaarde = artikelen.reduce((s, a) => s + (a.voorraad || 0) * (a.inkoopprijs || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voorraad</h1>
          <p className="text-gray-500">Beheer artikelen en magazijnen</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuw Artikel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{artikelen.length}</p>
          <p className="text-sm text-gray-500">Artikelen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{magazijnen.length}</p>
          <p className="text-sm text-gray-500">Magazijnen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalWaarde)}</p>
          <p className="text-sm text-gray-500">Voorraadwaarde</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Zoek artikel..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Naam</th>
              <th className="px-6 py-4 font-medium">Voorraad</th>
              <th className="px-6 py-4 font-medium text-right">Inkoopprijs</th>
              <th className="px-6 py-4 font-medium text-right">Verkoopprijs</th>
              <th className="px-6 py-4 font-medium text-right">Waarde</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
            artikelen.length === 0 ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500"><Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />Geen artikelen</td></tr> :
            artikelen.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900">{a.code}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{a.naam}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (a.voorraad || 0) <= (a.minimum_voorraad || 0) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>{a.voorraad || 0} {a.eenheid}</span>
                </td>
                <td className="px-6 py-4 text-sm text-right">{formatCurrency(a.inkoopprijs)}</td>
                <td className="px-6 py-4 text-sm text-right">{formatCurrency(a.verkoopprijs)}</td>
                <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency((a.voorraad || 0) * (a.inkoopprijs || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
