import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Eye, Edit2, X, Save, AlertCircle, CheckCircle, FileText, ChevronRight, ChevronDown } from 'lucide-react';

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

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
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

// Rekening Type Badge
const TypeBadge = ({ type }) => {
  const colors = {
    activa: 'bg-blue-100 text-blue-700',
    passiva: 'bg-purple-100 text-purple-700',
    eigen_vermogen: 'bg-indigo-100 text-indigo-700',
    omzet: 'bg-green-100 text-green-700',
    kosten: 'bg-red-100 text-red-700'
  };
  const labels = {
    activa: 'Activa',
    passiva: 'Passiva',
    eigen_vermogen: 'Eigen Vermogen',
    omzet: 'Omzet',
    kosten: 'Kosten'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {labels[type] || type}
    </span>
  );
};

const GrootboekPage = () => {
  const [rekeningen, setRekeningen] = useState([]);
  const [dagboeken, setDagboeken] = useState([]);
  const [journaalposten, setJournaalposten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [activeTab, setActiveTab] = useState('rekeningen');
  const [showModal, setShowModal] = useState(false);
  const [showJournaalModal, setShowJournaalModal] = useState(false);
  const [selectedRekening, setSelectedRekening] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [formData, setFormData] = useState({
    nummer: '', naam: '', type: 'activa', omschrijving: '', valuta: 'SRD',
    btw_relevant: false, kostenplaats_verplicht: false, actief: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rekRes, dagRes, jourRes] = await Promise.all([
        api('/rekeningen'),
        api('/dagboeken'),
        api('/journaalposten?limit=50')
      ]);
      setRekeningen(rekRes);
      setDagboeken(dagRes);
      setJournaalposten(jourRes.items || jourRes);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedRekening) {
        await api(`/rekeningen/${selectedRekening.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        setSuccess('Rekening bijgewerkt');
      } else {
        await api('/rekeningen', { method: 'POST', body: JSON.stringify(formData) });
        setSuccess('Rekening aangemaakt');
      }
      setShowModal(false);
      loadData();
      resetForm();
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({
      nummer: '', naam: '', type: 'activa', omschrijving: '', valuta: 'SRD',
      btw_relevant: false, kostenplaats_verplicht: false, actief: true
    });
    setSelectedRekening(null);
  };

  const openEdit = (rekening) => {
    setSelectedRekening(rekening);
    setFormData(rekening);
    setShowModal(true);
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Filter rekeningen
  const filtered = rekeningen.filter(r =>
    (!filterType || r.type === filterType) &&
    (r.nummer?.includes(searchQuery) || r.naam?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group rekeningen by type
  const grouped = filtered.reduce((acc, rek) => {
    const type = rek.type || 'overig';
    if (!acc[type]) acc[type] = [];
    acc[type].push(rek);
    return acc;
  }, {});

  const typeOrder = ['activa', 'passiva', 'eigen_vermogen', 'omzet', 'kosten'];
  const typeLabels = {
    activa: 'Activa',
    passiva: 'Passiva',
    eigen_vermogen: 'Eigen Vermogen',
    omzet: 'Omzet',
    kosten: 'Kosten'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center" data-testid="grootboek-title">
            <BookOpen className="w-7 h-7 mr-3 text-blue-600" />Grootboek
          </h1>
          <p className="text-gray-500 mt-1">Rekeningschema, dagboeken en journaalposten</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          data-testid="add-rekening-btn">
          <Plus className="w-5 h-5 mr-2" />Nieuwe Rekening
        </button>
      </div>

      {(error || success) && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          {error || success}
          <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'rekeningen', label: 'Rekeningschema', icon: BookOpen },
          { id: 'dagboeken', label: 'Dagboeken', icon: FileText },
          { id: 'journaalposten', label: 'Journaalposten', icon: FileText }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            data-testid={`tab-${tab.id}`}>
            <tab.icon className="w-4 h-4 mr-2" />{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : (
        <>
          {/* Rekeningschema Tab */}
          {activeTab === 'rekeningen' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b flex gap-4">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Zoeken op nummer of naam..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="search-rekening" />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="filter-type">
                  <option value="">Alle types</option>
                  <option value="activa">Activa</option>
                  <option value="passiva">Passiva</option>
                  <option value="eigen_vermogen">Eigen Vermogen</option>
                  <option value="omzet">Omzet</option>
                  <option value="kosten">Kosten</option>
                </select>
              </div>

              <div className="divide-y">
                {typeOrder.filter(type => grouped[type]?.length > 0).map(type => (
                  <div key={type}>
                    <button
                      onClick={() => toggleGroup(type)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        {expandedGroups[type] !== false ? <ChevronDown className="w-5 h-5 mr-2" /> : <ChevronRight className="w-5 h-5 mr-2" />}
                        <span className="font-semibold text-gray-900">{typeLabels[type]}</span>
                        <span className="ml-2 text-sm text-gray-500">({grouped[type].length} rekeningen)</span>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(grouped[type].reduce((sum, r) => sum + (r.saldo || 0), 0))}
                      </div>
                    </button>
                    {expandedGroups[type] !== false && (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-t">
                          <tr>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                            <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">BTW</th>
                            <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {grouped[type].sort((a, b) => a.nummer.localeCompare(b.nummer)).map(rek => (
                            <tr key={rek.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-mono text-sm font-medium text-blue-600">{rek.nummer}</td>
                              <td className="px-6 py-3 text-sm">{rek.naam}</td>
                              <td className={`px-6 py-3 text-sm text-right font-medium ${rek.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(rek.saldo, rek.valuta)}
                              </td>
                              <td className="px-6 py-3 text-sm">
                                {rek.btw_relevant && <span className="text-blue-600">BTW</span>}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button onClick={() => openEdit(rek)} className="p-1 text-gray-400 hover:text-blue-600">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dagboeken Tab */}
          {activeTab === 'dagboeken' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <table className="w-full" data-testid="dagboeken-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valuta</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laatst Gebruikt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dagboeken.map(dag => (
                    <tr key={dag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">{dag.code}</td>
                      <td className="px-6 py-4">{dag.naam}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dag.type === 'bank' ? 'bg-blue-100 text-blue-700' :
                          dag.type === 'kas' ? 'bg-green-100 text-green-700' :
                          dag.type === 'verkoop' ? 'bg-purple-100 text-purple-700' :
                          dag.type === 'inkoop' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {dag.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">{dag.valuta}</td>
                      <td className="px-6 py-4 text-gray-500">#{dag.laatst_gebruikt_nummer || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${dag.actief ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {dag.actief ? 'Actief' : 'Inactief'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Journaalposten Tab */}
          {activeTab === 'journaalposten' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Recente Journaalposten</h3>
              </div>
              <table className="w-full" data-testid="journaalposten-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boekstuk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dagboek</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {journaalposten.map(post => {
                    const totaal = post.regels?.reduce((sum, r) => sum + (r.debet || 0), 0) || 0;
                    return (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-medium text-blue-600">{post.boekstuknummer}</td>
                        <td className="px-6 py-4 text-sm">{post.datum}</td>
                        <td className="px-6 py-4 text-sm">{post.dagboek_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{post.omschrijving}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(totaal)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.status === 'geboekt' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {post.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {journaalposten.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Geen journaalposten gevonden</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Rekening Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedRekening ? 'Rekening Bewerken' : 'Nieuwe Rekening'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rekeningnummer *</label>
              <input type="text" required value={formData.nummer}
                onChange={(e) => setFormData({ ...formData, nummer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bijv. 1000" data-testid="input-nummer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="select-type">
                <option value="activa">Activa</option>
                <option value="passiva">Passiva</option>
                <option value="eigen_vermogen">Eigen Vermogen</option>
                <option value="omzet">Omzet</option>
                <option value="kosten">Kosten</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
              <input type="text" required value={formData.naam}
                onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="input-naam" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
              <textarea value={formData.omschrijving}
                onChange={(e) => setFormData({ ...formData, omschrijving: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select value={formData.valuta}
                onChange={(e) => setFormData({ ...formData, valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="SRD">SRD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input type="checkbox" checked={formData.btw_relevant}
                onChange={(e) => setFormData({ ...formData, btw_relevant: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">BTW relevant</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={formData.kostenplaats_verplicht}
                onChange={(e) => setFormData({ ...formData, kostenplaats_verplicht: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">Kostenplaats verplicht</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={formData.actief}
                onChange={(e) => setFormData({ ...formData, actief: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">Actief</span>
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuleren</button>
            <button type="submit" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              data-testid="save-rekening-btn">
              <Save className="w-4 h-4 mr-2" />{selectedRekening ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GrootboekPage;
