import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
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

export default function DebiteruenPage() {
  const { token } = useAuth();
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    naam: '',
    email: '',
    telefoon: '',
    adres: '',
    plaats: '',
    btw_nummer: '',
    betalingstermijn: 30,
    kredietlimiet: 0,
    valuta: 'SRD'
  });

  const fetchDebiteuren = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/debiteuren`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDebiteuren(data);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDebiteuren();
  }, [fetchDebiteuren]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/debiteuren`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ naam: '', email: '', telefoon: '', adres: '', plaats: '', btw_nummer: '', betalingstermijn: 30, kredietlimiet: 0, valuta: 'SRD' });
        fetchDebiteuren();
      }
    } catch (e) {
      console.error('Submit error:', e);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debiteuren</h1>
          <p className="text-gray-500">Beheer uw klanten en openstaande vorderingen</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Debiteur</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{debiteuren.length}</p>
              <p className="text-sm text-gray-500">Totaal klanten</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(debiteuren.reduce((sum, d) => sum + (d.openstaand_bedrag || 0), 0))}
              </p>
              <p className="text-sm text-gray-500">Openstaand bedrag</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Verlopen facturen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek debiteur..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 font-medium">Nummer</th>
              <th className="px-6 py-4 font-medium">Naam</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Telefoon</th>
              <th className="px-6 py-4 font-medium text-right">Openstaand</th>
              <th className="px-6 py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  Laden...
                </td>
              </tr>
            ) : debiteuren.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Geen debiteuren gevonden</p>
                </td>
              </tr>
            ) : (
              debiteuren.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{d.nummer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{d.naam}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.telefoon || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(d.openstaand_bedrag || 0, d.valuta)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nieuwe Debiteur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input
                  type="text"
                  required
                  value={formData.naam}
                  onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input
                    type="text"
                    value={formData.telefoon}
                    onChange={(e) => setFormData({ ...formData, telefoon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input
                  type="text"
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
                  <input
                    type="text"
                    value={formData.plaats}
                    onChange={(e) => setFormData({ ...formData, plaats: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BTW Nummer</label>
                  <input
                    type="text"
                    value={formData.btw_nummer}
                    onChange={(e) => setFormData({ ...formData, btw_nummer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
