import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Send, Download, Eye, Edit2, X, Save, AlertCircle, CheckCircle, CreditCard, FileText, Trash2 } from 'lucide-react';

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

const formatCurrency = (amount, valuta = 'SRD') => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: valuta }).format(amount || 0);

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl ${widths[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const VerkoopfacturenPage = () => {
  const [facturen, setFacturen] = useState([]);
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBetalingModal, setShowBetalingModal] = useState(false);
  const [selectedFactuur, setSelectedFactuur] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    debiteur_id: '', factuurdatum: new Date().toISOString().split('T')[0], valuta: 'SRD', koers: 1,
    regels: [{ omschrijving: '', aantal: 1, eenheid: 'stuk', prijs_per_eenheid: 0, btw_code: 'V25', btw_percentage: 25 }],
    opmerkingen: ''
  });

  const [betalingData, setBetalingData] = useState({ bedrag: 0, datum: new Date().toISOString().split('T')[0], betaalwijze: 'bank' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [facturenRes, debiteurenRes] = await Promise.all([
        api('/verkoopfacturen'),
        api('/debiteuren')
      ]);
      setFacturen(facturenRes.items || facturenRes);
      setDebiteuren(debiteurenRes);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const addRegel = () => {
    setFormData({ ...formData, regels: [...formData.regels, { omschrijving: '', aantal: 1, eenheid: 'stuk', prijs_per_eenheid: 0, btw_code: 'V25', btw_percentage: 25 }] });
  };

  const removeRegel = (index) => {
    if (formData.regels.length > 1) {
      setFormData({ ...formData, regels: formData.regels.filter((_, i) => i !== index) });
    }
  };

  const updateRegel = (index, field, value) => {
    const newRegels = [...formData.regels];
    newRegels[index] = { ...newRegels[index], [field]: value };
    if (field === 'btw_code') {
      newRegels[index].btw_percentage = value === 'V25' ? 25 : value === 'V10' ? 10 : 0;
    }
    setFormData({ ...formData, regels: newRegels });
  };

  const calculateTotals = () => {
    let subtotaal = 0, btw = 0;
    formData.regels.forEach(r => {
      const rSub = r.aantal * r.prijs_per_eenheid;
      subtotaal += rSub;
      btw += rSub * (r.btw_percentage / 100);
    });
    return { subtotaal, btw, totaal: subtotaal + btw };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/verkoopfacturen', { method: 'POST', body: JSON.stringify(formData) });
      setSuccess('Factuur aangemaakt');
      setShowModal(false);
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleVerzenden = async (factuurId) => {
    try {
      await api(`/verkoopfacturen/${factuurId}/verzenden`, { method: 'POST' });
      setSuccess('Factuur verzonden en geboekt');
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleBetaling = async (e) => {
    e.preventDefault();
    try {
      await api(`/verkoopfacturen/${selectedFactuur.id}/betaling?bedrag=${betalingData.bedrag}&datum=${betalingData.datum}&betaalwijze=${betalingData.betaalwijze}`, { method: 'POST' });
      setSuccess('Betaling geregistreerd');
      setShowBetalingModal(false);
      loadData();
    } catch (err) { setError(err.message); }
  };

  const downloadPDF = async (factuurId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/boekhouding/verkoopfacturen/${factuurId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Download mislukt');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Factuur_${factuurId}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { setError(err.message); }
  };

  const statusColors = {
    concept: 'bg-gray-100 text-gray-700',
    verzonden: 'bg-blue-100 text-blue-700',
    gedeeltelijk_betaald: 'bg-yellow-100 text-yellow-700',
    betaald: 'bg-green-100 text-green-700',
    vervallen: 'bg-red-100 text-red-700',
    geannuleerd: 'bg-gray-100 text-gray-500'
  };

  const totals = calculateTotals();
  const filtered = facturen.filter(f =>
    (!statusFilter || f.status === statusFilter) &&
    (f.factuurnummer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     f.debiteur_naam?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Receipt className="w-7 h-7 mr-3 text-blue-600" />Verkoopfacturen
          </h1>
          <p className="text-gray-500 mt-1">Facturatie en betalingen beheren</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />Nieuwe Factuur
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
        <div className="p-4 border-b flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Zoeken..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Alle statussen</option>
            <option value="concept">Concept</option>
            <option value="verzonden">Verzonden</option>
            <option value="gedeeltelijk_betaald">Gedeeltelijk betaald</option>
            <option value="betaald">Betaald</option>
            <option value="vervallen">Vervallen</option>
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-gray-500">Laden...</div> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factuur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totaal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Openstaand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{f.factuurnummer}</td>
                  <td className="px-6 py-4 text-gray-500">{f.debiteur_naam || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{f.factuurdatum}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(f.totaal, f.valuta)}</td>
                  <td className="px-6 py-4">
                    <span className={f.openstaand_bedrag > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                      {formatCurrency(f.openstaand_bedrag, f.valuta)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f.status] || 'bg-gray-100'}`}>
                      {f.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    {f.status === 'concept' && (
                      <button onClick={() => handleVerzenden(f.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Verzenden">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {['verzonden', 'gedeeltelijk_betaald', 'vervallen'].includes(f.status) && (
                      <button onClick={() => { setSelectedFactuur(f); setBetalingData({ ...betalingData, bedrag: f.openstaand_bedrag }); setShowBetalingModal(true); }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded" title="Betaling">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                    {f.status !== 'concept' && (
                      <button onClick={() => downloadPDF(f.id)} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Geen facturen gevonden</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* New Invoice Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nieuwe Factuur" size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
              <select required value={formData.debiteur_id}
                onChange={(e) => setFormData({ ...formData, debiteur_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Selecteer klant</option>
                {debiteuren.map(d => <option key={d.id} value={d.id}>{d.bedrijfsnaam}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factuurdatum</label>
              <input type="date" value={formData.factuurdatum}
                onChange={(e) => setFormData({ ...formData, factuurdatum: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select value={formData.valuta}
                onChange={(e) => setFormData({ ...formData, valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="SRD">SRD</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Factuurregels</label>
              <button type="button" onClick={addRegel} className="text-sm text-blue-600 hover:text-blue-700">+ Regel toevoegen</button>
            </div>
            <table className="w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Omschrijving</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Aantal</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">Prijs</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">BTW</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">Totaal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {formData.regels.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">
                      <input type="text" value={r.omschrijving} required
                        onChange={(e) => updateRegel(i, 'omschrijving', e.target.value)}
                        className="w-full px-2 py-1 border rounded" placeholder="Omschrijving" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" min="0.01" step="0.01" value={r.aantal}
                        onChange={(e) => updateRegel(i, 'aantal', parseFloat(e.target.value) || 1)}
                        className="w-full px-2 py-1 border rounded" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" min="0" step="0.01" value={r.prijs_per_eenheid}
                        onChange={(e) => updateRegel(i, 'prijs_per_eenheid', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded" />
                    </td>
                    <td className="px-2 py-1">
                      <select value={r.btw_code} onChange={(e) => updateRegel(i, 'btw_code', e.target.value)}
                        className="w-full px-2 py-1 border rounded">
                        <option value="V25">25%</option><option value="V10">10%</option><option value="V0">0%</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {formatCurrency(r.aantal * r.prijs_per_eenheid * (1 + r.btw_percentage/100), formData.valuta)}
                    </td>
                    <td className="px-2 py-1">
                      <button type="button" onClick={() => removeRegel(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-end space-y-1 text-sm">
              <div className="w-48 space-y-1">
                <div className="flex justify-between"><span>Subtotaal:</span><span>{formatCurrency(totals.subtotaal, formData.valuta)}</span></div>
                <div className="flex justify-between"><span>BTW:</span><span>{formatCurrency(totals.btw, formData.valuta)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Totaal:</span><span>{formatCurrency(totals.totaal, formData.valuta)}</span></div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opmerkingen</label>
            <textarea value={formData.opmerkingen}
              onChange={(e) => setFormData({ ...formData, opmerkingen: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" rows="2" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuleren</button>
            <button type="submit" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />Factuur Aanmaken
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showBetalingModal} onClose={() => setShowBetalingModal(false)} title="Betaling Registreren" size="sm">
        <form onSubmit={handleBetaling} className="space-y-4">
          <p className="text-gray-500">Factuur: <strong>{selectedFactuur?.factuurnummer}</strong></p>
          <p className="text-gray-500">Openstaand: <strong>{formatCurrency(selectedFactuur?.openstaand_bedrag, selectedFactuur?.valuta)}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag</label>
            <input type="number" step="0.01" max={selectedFactuur?.openstaand_bedrag} value={betalingData.bedrag}
              onChange={(e) => setBetalingData({ ...betalingData, bedrag: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input type="date" value={betalingData.datum}
              onChange={(e) => setBetalingData({ ...betalingData, datum: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Betaalwijze</label>
            <select value={betalingData.betaalwijze}
              onChange={(e) => setBetalingData({ ...betalingData, betaalwijze: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="bank">Bank</option><option value="kas">Kas</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowBetalingModal(false)} className="px-4 py-2 border rounded-lg">Annuleren</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Betaling Registreren</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VerkoopfacturenPage;