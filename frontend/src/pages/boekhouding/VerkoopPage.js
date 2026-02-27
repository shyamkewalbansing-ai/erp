import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  FileText,
  ShoppingCart,
  Receipt,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Send,
  Trash2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => {
  if (amount === null || amount === undefined) return `${currency} 0,00`;
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `${currency} ${formatted}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-gray-100 text-gray-600',
    verzonden: 'bg-blue-100 text-blue-600',
    betaald: 'bg-green-100 text-green-600',
    herinnering: 'bg-yellow-100 text-yellow-600',
    gedeeltelijk_betaald: 'bg-orange-100 text-orange-600',
  };
  const labels = {
    concept: 'Concept',
    verzonden: 'Verzonden',
    betaald: 'Betaald',
    herinnering: 'Herinnering',
    gedeeltelijk_betaald: 'Gedeeltelijk',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.concept}`}>
      {labels[status] || status}
    </span>
  );
};

export default function VerkoopPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('facturen');
  const [facturen, setFacturen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ offertes: 0, orders: 0, facturen: 0 });

  const fetchFacturen = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/verkoopfacturen`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFacturen(data);
        setStats(prev => ({ ...prev, facturen: data.length }));
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFacturen();
  }, [fetchFacturen]);

  const tabs = [
    { id: 'offertes', label: 'Offertes', icon: FileText, count: stats.offertes },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: stats.orders },
    { id: 'facturen', label: 'Facturen', icon: Receipt, count: stats.facturen },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verkoop</h1>
          <p className="text-gray-500">Beheer offertes, orders en verkoopfacturen</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Nieuwe Factuur</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                activeTab === tab.id ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{tab.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{tab.count}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  tab.id === 'offertes' ? 'bg-blue-50' : tab.id === 'orders' ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    tab.id === 'offertes' ? 'text-blue-500' : tab.id === 'orders' ? 'text-green-500' : 'text-yellow-500'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-100">
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoeken..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Table */}
        {activeTab === 'facturen' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium">Nummer</th>
                  <th className="px-6 py-4 font-medium">Datum</th>
                  <th className="px-6 py-4 font-medium">Klant</th>
                  <th className="px-6 py-4 font-medium">Vervaldatum</th>
                  <th className="px-6 py-4 font-medium text-right">Bedrag</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Laden...
                    </td>
                  </tr>
                ) : facturen.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Geen facturen gevonden
                    </td>
                  </tr>
                ) : (
                  facturen.map((f) => (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {f.factuurnummer}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(f.factuurdatum)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {f.debiteur_naam}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(f.vervaldatum)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(f.totaal_incl_btw, f.valuta)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={f.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Send className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'offertes' && (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Geen offertes gevonden</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="p-12 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Geen orders gevonden</p>
          </div>
        )}
      </div>
    </div>
  );
}
