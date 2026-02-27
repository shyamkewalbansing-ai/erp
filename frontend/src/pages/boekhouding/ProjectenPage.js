import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, FolderKanban, Clock, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;

export default function ProjectenPage() {
  const { token } = useAuth();
  const [projecten, setProjecten] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjecten = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/projecten`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProjecten(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProjecten(); }, [fetchProjecten]);

  const actief = projecten.filter(p => p.status === 'actief').length;
  const totaalBudget = projecten.reduce((s, p) => s + (p.budget || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projecten</h1>
          <p className="text-gray-500">Beheer projecten en urenregistratie</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuw Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{actief}</p>
              <p className="text-sm text-gray-500">Actieve projecten</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totaalBudget)}</p>
          <p className="text-sm text-gray-500">Totaal budget</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Uren deze maand</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="col-span-3 text-center py-12 text-gray-500">Laden...</p> :
        projecten.length === 0 ? <p className="col-span-3 text-center py-12 text-gray-500"><FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-300" />Geen projecten</p> :
        projecten.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{p.naam}</p>
                <p className="text-sm text-gray-500">{p.code}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                p.status === 'actief' ? 'bg-green-100 text-green-600' :
                p.status === 'afgerond' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>{p.status}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatCurrency(p.budget, p.valuta)}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{p.totaal_uren || 0} uur</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
