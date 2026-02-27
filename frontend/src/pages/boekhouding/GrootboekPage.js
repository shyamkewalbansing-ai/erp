import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Search, Filter, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function GrootboekPage() {
  const { token } = useAuth();
  const [rekeningen, setRekeningen] = useState([]);
  const [dagboeken, setDagboeken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rekeningen');
  const [filterType, setFilterType] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [rekRes, dagRes] = await Promise.all([
        fetch(`${API_URL}/api/boekhouding/rekeningen`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/boekhouding/dagboeken`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (rekRes.ok) setRekeningen(await rekRes.json());
      if (dagRes.ok) setDagboeken(await dagRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRekeningen = filterType === 'all' ? rekeningen : rekeningen.filter(r => r.type === filterType);
  const types = ['all', 'activa', 'passiva', 'omzet', 'kosten'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grootboek</h1>
          <p className="text-gray-500">Beheer rekeningschema en dagboeken</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuwe Rekening</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{rekeningen.length}</p>
          <p className="text-sm text-gray-500">Rekeningen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{dagboeken.length}</p>
          <p className="text-sm text-gray-500">Dagboeken</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{rekeningen.filter(r => r.type === 'activa').length}</p>
          <p className="text-sm text-gray-500">Activa</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{rekeningen.filter(r => r.type === 'passiva').length}</p>
          <p className="text-sm text-gray-500">Passiva</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['rekeningen', 'dagboeken', 'journaalposten'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'rekeningen' && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="flex gap-2">
              {types.map((t) => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    filterType === t ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {t === 'all' ? 'Alle' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Naam</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Categorie</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
              filteredRekeningen.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-900">{r.code}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{r.naam}</td>
                  <td className="px-6 py-3"><span className={`px-2 py-1 text-xs rounded-full ${
                    r.type === 'activa' ? 'bg-blue-100 text-blue-600' :
                    r.type === 'passiva' ? 'bg-purple-100 text-purple-600' :
                    r.type === 'omzet' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>{r.type}</span></td>
                  <td className="px-6 py-3 text-sm text-gray-500">{r.categorie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'dagboeken' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dagboeken.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{d.naam}</p>
                  <p className="text-sm text-gray-500">Code: {d.code}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Type: {d.type}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'journaalposten' && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Journaalposten overzicht</p>
        </div>
      )}
    </div>
  );
}
