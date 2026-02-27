import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Eye, Mail, Phone, MapPin, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BACKEND_URL}/api/boekhouding${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error((await response.json()).detail || 'API Error');
  return response.json();
};

const formatCurrency = (amount, valuta = 'SRD') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: valuta,
  }).format(amount || 0);
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const DebiteurenPage = () => {
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDebiteur, setEditingDebiteur] = useState(null);
  const [formData, setFormData] = useState({
    bedrijfsnaam: '', contactpersoon: '', adres: '', postcode: '', plaats: '',
    land: 'Suriname', telefoon: '', email: '', btw_nummer: '', kvk_nummer: '',
    valuta: 'SRD', betaalconditie_dagen: 30, kredietlimiet: 0, actief: true
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { loadDebiteuren(); }, []);

  const loadDebiteuren = async () => {
    try {
      setLoading(true);
      const data = await api('/debiteuren');
      setDebiteuren(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDebiteur) {
        await api(`/debiteuren/${editingDebiteur.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        setSuccess('Debiteur bijgewerkt');
      } else {
        await api('/debiteuren', { method: 'POST', body: JSON.stringify(formData) });
        setSuccess('Debiteur aangemaakt');
      }
      setShowModal(false);
      loadDebiteuren();
      resetForm();
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({ bedrijfsnaam: '', contactpersoon: '', adres: '', postcode: '', plaats: '',
      land: 'Suriname', telefoon: '', email: '', btw_nummer: '', kvk_nummer: '',
      valuta: 'SRD', betaalconditie_dagen: 30, kredietlimiet: 0, actief: true });
    setEditingDebiteur(null);
  };

  const openEdit = (debiteur) => {
    setEditingDebiteur(debiteur);
    setFormData(debiteur);
    setShowModal(true);
  };

  const filtered = debiteuren.filter(d =>
    d.bedrijfsnaam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.klantnummer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-7 h-7 mr-3 text-blue-600" />Debiteuren
          </h1>
          <p className="text-gray-500 mt-1">Beheer uw klanten en openstaande posten</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />Nieuwe Debiteur
        </button>
      </div>

      {(error || success) && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          {error || success}
          <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Zoeken op naam, email of klantnummer..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Laden...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valuta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Openstaand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((deb) => (
                <tr key={deb.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{deb.bedrijfsnaam}</div>
                    <div className="text-sm text-gray-500">{deb.klantnummer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500"><Mail className="w-4 h-4 mr-1" />{deb.email}</div>
                    <div className="flex items-center text-sm text-gray-500"><Phone className="w-4 h-4 mr-1" />{deb.telefoon}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{deb.valuta}</td>
                  <td className="px-6 py-4">
                    <span className={deb.openstaand_saldo > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                      {formatCurrency(deb.openstaand_saldo, deb.valuta)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${deb.actief ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {deb.actief ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(deb)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Geen debiteuren gevonden</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDebiteur ? 'Debiteur Bewerken' : 'Nieuwe Debiteur'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
              <input type="text" required value={formData.bedrijfsnaam}
                onChange={(e) => setFormData({ ...formData, bedrijfsnaam: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
              <input type="text" value={formData.contactpersoon}
                onChange={(e) => setFormData({ ...formData, contactpersoon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
              <input type="tel" value={formData.telefoon}
                onChange={(e) => setFormData({ ...formData, telefoon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <input type="text" value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
              <input type="text" value={formData.plaats}
                onChange={(e) => setFormData({ ...formData, plaats: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
              <input type="text" value={formData.land}
                onChange={(e) => setFormData({ ...formData, land: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BTW Nummer</label>
              <input type="text" value={formData.btw_nummer}
                onChange={(e) => setFormData({ ...formData, btw_nummer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select value={formData.valuta}
                onChange={(e) => setFormData({ ...formData, valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="SRD">SRD - Surinaamse Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betaaltermijn (dagen)</label>
              <input type="number" value={formData.betaalconditie_dagen}
                onChange={(e) => setFormData({ ...formData, betaalconditie_dagen: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kredietlimiet</label>
              <input type="number" step="0.01" value={formData.kredietlimiet}
                onChange={(e) => setFormData({ ...formData, kredietlimiet: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="actief" checked={formData.actief}
              onChange={(e) => setFormData({ ...formData, actief: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="actief" className="ml-2 text-sm text-gray-700">Actief</label>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuleren</button>
            <button type="submit" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />{editingDebiteur ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DebiteurenPage;