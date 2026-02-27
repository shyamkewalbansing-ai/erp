import React, { useState, useEffect } from 'react';
import { Landmark, Plus, Upload, RefreshCcw, Search, Download, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';

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

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const BankPage = () => {
  const [bankrekeningen, setBankrekeningen] = useState([]);
  const [mutaties, setMutaties] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importBank, setImportBank] = useState('DSB');
  const [importFile, setImportFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [bankForm, setBankForm] = useState({
    naam: '', rekeningnummer: '', bank: 'DSB', valuta: 'SRD',
    grootboekrekening: '1120', beginsaldo: 0
  });

  const banken = [
    { code: 'DSB', naam: 'De Surinaamsche Bank N.V.' },
    { code: 'Finabank', naam: 'Finabank N.V.' },
    { code: 'Hakrinbank', naam: 'Hakrinbank N.V.' },
    { code: 'Republic', naam: 'Republic Bank Suriname N.V.' },
    { code: 'SPSB', naam: 'Surinaamse Postspaarbank' },
    { code: 'VCB', naam: 'Volkscredietbank' },
    { code: 'SCB', naam: 'Surichange Bank N.V.' },
    { code: 'Godo', naam: 'Godo Bank' },
    { code: 'Trustbank', naam: 'Trustbank Amanah' },
    { code: 'Southern', naam: 'Southern Commercial Bank N.V.' },
    { code: 'NOB', naam: 'Nationale Ontwikkelingsbank' },
  ];

  useEffect(() => { loadBankrekeningen(); }, []);

  const loadBankrekeningen = async () => {
    try {
      setLoading(true);
      const data = await api('/bankrekeningen');
      setBankrekeningen(data);
      if (data.length > 0 && !selectedBank) {
        setSelectedBank(data[0]);
        loadMutaties(data[0].id);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadMutaties = async (bankId) => {
    try {
      const data = await api(`/bankrekeningen/${bankId}/mutaties`);
      setMutaties(data);
    } catch (err) { setError(err.message); }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    try {
      await api('/bankrekeningen', { method: 'POST', body: JSON.stringify(bankForm) });
      setSuccess('Bankrekening aangemaakt');
      setShowBankModal(false);
      loadBankrekeningen();
    } catch (err) { setError(err.message); }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile || !selectedBank) return;

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/boekhouding/bankrekeningen/${selectedBank.id}/import-bank?bank_naam=${importBank}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData }
      );
      const result = await response.json();
      if (response.ok) {
        setSuccess(`${result.imported} mutaties geimporteerd`);
        setShowImportModal(false);
        loadMutaties(selectedBank.id);
      } else {
        throw new Error(result.detail || 'Import mislukt');
      }
    } catch (err) { setError(err.message); }
  };

  const selectBank = (bank) => {
    setSelectedBank(bank);
    loadMutaties(bank.id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Landmark className="w-7 h-7 mr-3 text-blue-600" />Bank & Kas
          </h1>
          <p className="text-gray-500 mt-1">Beheer uw bankrekeningen en mutaties</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowImportModal(true)} disabled={!selectedBank}
            className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <Upload className="w-5 h-5 mr-2" />Importeren
          </button>
          <button onClick={() => setShowBankModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />Nieuwe Rekening
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          {error || success}
          <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Bankrekeningen sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b font-medium text-gray-900">Bankrekeningen</div>
            <div className="divide-y">
              {bankrekeningen.map(bank => (
                <button key={bank.id} onClick={() => selectBank(bank)}
                  className={`w-full p-4 text-left hover:bg-gray-50 ${selectedBank?.id === bank.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
                  <div className="font-medium text-gray-900">{bank.naam}</div>
                  <div className="text-sm text-gray-500">{bank.bank}</div>
                  <div className={`text-sm font-medium mt-1 ${bank.huidig_saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(bank.huidig_saldo, bank.valuta)}
                  </div>
                </button>
              ))}
              {bankrekeningen.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">Geen bankrekeningen</div>
              )}
            </div>
          </div>
        </div>

        {/* Mutaties */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{selectedBank?.naam || 'Selecteer een rekening'}</h3>
                <p className="text-sm text-gray-500">{selectedBank?.rekeningnummer}</p>
              </div>
              {selectedBank && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Huidig saldo</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedBank.huidig_saldo, selectedBank.valuta)}
                  </div>
                </div>
              )}
            </div>

            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tegenpartij</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mutaties.map(mut => (
                  <tr key={mut.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{mut.datum}</td>
                    <td className="px-6 py-4 text-sm">{mut.omschrijving}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mut.naam_tegenpartij || mut.tegenrekening || '-'}</td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${mut.bedrag >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(mut.bedrag, selectedBank?.valuta)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${mut.status === 'geboekt' ? 'bg-green-100 text-green-700' : mut.status === 'gematcht' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {mut.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {mutaties.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Geen mutaties gevonden</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Bank Modal */}
      <Modal isOpen={showBankModal} onClose={() => setShowBankModal(false)} title="Nieuwe Bankrekening">
        <form onSubmit={handleCreateBank} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
            <input type="text" required value={bankForm.naam}
              onChange={(e) => setBankForm({ ...bankForm, naam: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" placeholder="Bijv. DSB Zakelijk" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
            <select value={bankForm.bank}
              onChange={(e) => setBankForm({ ...bankForm, bank: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              {banken.map(b => <option key={b.code} value={b.code}>{b.naam}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rekeningnummer</label>
            <input type="text" required value={bankForm.rekeningnummer}
              onChange={(e) => setBankForm({ ...bankForm, rekeningnummer: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select value={bankForm.valuta}
                onChange={(e) => setBankForm({ ...bankForm, valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="SRD">SRD</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beginsaldo</label>
              <input type="number" step="0.01" value={bankForm.beginsaldo}
                onChange={(e) => setBankForm({ ...bankForm, beginsaldo: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowBankModal(false)} className="px-4 py-2 border rounded-lg">Annuleren</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Aanmaken</button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Bank Mutaties Importeren">
        <form onSubmit={handleImport} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700">Importeren naar: <strong>{selectedBank?.naam}</strong></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Formaat</label>
            <select value={importBank} onChange={(e) => setImportBank(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg">
              {banken.map(b => <option key={b.code} value={b.code}>{b.naam}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Selecteer de bank waarvan het exportbestand afkomstig is</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV Bestand</label>
            <input type="file" accept=".csv,.txt" onChange={(e) => setImportFile(e.target.files[0])}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded-lg">Annuleren</button>
            <button type="submit" disabled={!importFile} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Importeren</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankPage;