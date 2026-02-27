import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, ShoppingBag, Search, Filter, Eye, Trash2, Check } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('nl-NL') : '-';

const StatusBadge = ({ status }) => {
  const styles = { nieuw: 'bg-gray-100 text-gray-600', geboekt: 'bg-blue-100 text-blue-600', betaald: 'bg-green-100 text-green-600', gedeeltelijk_betaald: 'bg-orange-100 text-orange-600' };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.nieuw}`}>{status}</span>;
};

export default function InkoopPage() {
  const { token } = useAuth();
  const [facturen, setFacturen] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFacturen = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/inkoopfacturen`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setFacturen(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchFacturen(); }, [fetchFacturen]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inkoop</h1>
          <p className="text-gray-500">Beheer inkoopfacturen</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /><span>Nieuwe Factuur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{facturen.length}</p>
          <p className="text-sm text-gray-500">Facturen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(facturen.reduce((s, f) => s + (f.totaal_incl_btw || 0), 0))}</p>
          <p className="text-sm text-gray-500">Totaal inkoop</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(facturen.reduce((s, f) => s + (f.openstaand_bedrag || 0), 0))}</p>
          <p className="text-sm text-gray-500">Te betalen</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Zoeken..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" /><span>Filter</span>
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Nummer</th>
              <th className="px-6 py-4 font-medium">Extern Nr</th>
              <th className="px-6 py-4 font-medium">Leverancier</th>
              <th className="px-6 py-4 font-medium">Datum</th>
              <th className="px-6 py-4 font-medium text-right">Bedrag</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Laden...</td></tr> :
            facturen.length === 0 ? <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500"><ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />Geen facturen</td></tr> :
            facturen.map((f) => (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{f.intern_nummer}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.extern_factuurnummer}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{f.crediteur_naam}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(f.factuurdatum)}</td>
                <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(f.totaal_incl_btw, f.valuta)}</td>
                <td className="px-6 py-4"><StatusBadge status={f.status} /></td>
                <td className="px-6 py-4"><div className="flex gap-2"><button className="text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
