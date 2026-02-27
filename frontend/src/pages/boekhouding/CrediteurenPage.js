import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Mail, Phone, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BACKEND_URL}/api/boekhouding${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
  });
  if (!response.ok) throw new Error((await response.json()).detail || 'API Error');
  return response.json();
};

const formatCurrency = (amount, valuta = 'SRD') => {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: valuta }).format(amount || 0);
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const CrediteurenPage = () => {
  const [crediteuren, setCrediteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCrediteur, setEditingCrediteur] = useState(null);
  const [formData, setFormData] = useState({
    bedrijfsnaam: '', contactpersoon: '', adres: '', postcode: '', plaats: '',
    land: 'Suriname', telefoon: '', email: '', btw_nummer: '', kvk_nummer: '',
    valuta: 'SRD', betaalconditie_dagen: 30, actief: true
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { loadCrediteuren(); }, []);

  const loadCrediteuren = async () => {
    try {
      setLoading(true);
      const data = await api('/crediteuren');
      setCrediteuren(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCrediteur) {
        await api(`/crediteuren/${editingCrediteur.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        setSuccess('Crediteur bijgewerkt');
      } else {
        await api('/crediteuren', { method: 'POST', body: JSON.stringify(formData) });
        setSuccess('Crediteur aangemaakt');
      }
      setShowModal(false);
      loadCrediteuren();
      resetForm();
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({
      bedrijfsnaam: '', contactpersoon: '', adres: '', postcode: '', plaats: '',
      land: 'Suriname', telefoon: '', email: '', btw_nummer: '', kvk_nummer: '',
      valuta: 'SRD', betaalconditie_dagen: 30, actief: true
    });
    setEditingCrediteur(null);
  };

  const openEdit = (crediteur) => {
    setEditingCrediteur(crediteur);
    setFormData(crediteur);
    setShowModal(true);
  };

  const filtered = crediteuren.filter(c =>
    c.bedrijfsnaam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.leveranciersnummer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center" data-testid="crediteuren-title">
            <Building2 className="w-7 h-7 mr-3 text-purple-600" />Crediteuren
          </h1>
          <p className="text-gray-500 mt-1">Beheer uw leveranciers en openstaande schulden</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          data-testid="add-crediteur-btn">
          <Plus className="w-5 h-5 mr-2" />Nieuwe Crediteur
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
            <input type="text" placeholder="Zoeken op naam, email of leveranciersnummer..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              data-testid="search-input" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Laden...</div>
        ) : (
          <table className="w-full" data-testid="crediteuren-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leverancier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valuta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Openstaand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{cred.bedrijfsnaam}</div>
                    <div className="text-sm text-gray-500">{cred.leveranciersnummer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500"><Mail className="w-4 h-4 mr-1" />{cred.email || '-'}</div>
                    <div className="flex items-center text-sm text-gray-500"><Phone className="w-4 h-4 mr-1" />{cred.telefoon || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{cred.valuta}</td>
                  <td className="px-6 py-4">
                    <span className={cred.openstaand_saldo > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {formatCurrency(cred.openstaand_saldo, cred.valuta)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cred.actief ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {cred.actief ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(cred)} className="p-1 text-gray-400 hover:text-purple-600" data-testid={`edit-btn-${cred.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Geen crediteuren gevonden</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCrediteur ? 'Crediteur Bewerken' : 'Nieuwe Crediteur'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
              <input type="text" required value={formData.bedrijfsnaam}
                onChange={(e) => setFormData({ ...formData, bedrijfsnaam: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                data-testid="input-bedrijfsnaam" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
              <input type="text" value={formData.contactpersoon}
                onChange={(e) => setFormData({ ...formData, contactpersoon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
              <input type="tel" value={formData.telefoon}
                onChange={(e) => setFormData({ ...formData, telefoon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <input type="text" value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
              <input type="text" value={formData.plaats}
                onChange={(e) => setFormData({ ...formData, plaats: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
              <input type="text" value={formData.land}
                onChange={(e) => setFormData({ ...formData, land: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BTW Nummer</label>
              <input type="text" value={formData.btw_nummer}
                onChange={(e) => setFormData({ ...formData, btw_nummer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select value={formData.valuta}
                onChange={(e) => setFormData({ ...formData, valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                <option value="SRD">SRD - Surinaamse Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betaaltermijn (dagen)</label>
              <input type="number" value={formData.betaalconditie_dagen}
                onChange={(e) => setFormData({ ...formData, betaalconditie_dagen: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="actief" checked={formData.actief}
              onChange={(e) => setFormData({ ...formData, actief: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
            <label htmlFor="actief" className="ml-2 text-sm text-gray-700">Actief</label>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuleren</button>
            <button type="submit" className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              data-testid="save-crediteur-btn">
              <Save className="w-4 h-4 mr-2" />{editingCrediteur ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CrediteurenPage;
