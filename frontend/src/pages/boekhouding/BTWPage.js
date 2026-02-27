import React, { useState, useEffect } from 'react';
import { Calculator, Download, Calendar, AlertCircle, CheckCircle, X, FileText, TrendingUp, TrendingDown } from 'lucide-react';

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

const BTWPage = () => {
  const [btwCodes, setBtwCodes] = useState([]);
  const [btwAangifte, setBtwAangifte] = useState(null);
  const [controlelijst, setControlelijst] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodeVan, setPeriodeVan] = useState(new Date().getFullYear() + '-01-01');
  const [periodeTot, setPeriodeTot] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('aangifte');

  useEffect(() => {
    loadBTWCodes();
    loadBTWAangifte();
    loadControlelijst();
  }, []);

  const loadBTWCodes = async () => {
    try {
      const data = await api('/btw/codes');
      setBtwCodes(data);
    } catch (err) { console.error(err); }
  };

  const loadBTWAangifte = async () => {
    try {
      setLoading(true);
      const data = await api(`/btw/aangifte?periode_van=${periodeVan}&periode_tot=${periodeTot}`);
      setBtwAangifte(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadControlelijst = async () => {
    try {
      const data = await api('/btw/controlelijst');
      setControlelijst(data.problemen || []);
    } catch (err) { console.error(err); }
  };

  const handlePeriodeChange = () => {
    loadBTWAangifte();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calculator className="w-7 h-7 mr-3 text-blue-600" />BTW Module
          </h1>
          <p className="text-gray-500 mt-1">BTW aangifte en overzichten</p>
        </div>
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
        {['aangifte', 'codes', 'controle'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab === 'aangifte' ? 'BTW Aangifte' : tab === 'codes' ? 'BTW Codes' : 'Controlelijst'}
          </button>
        ))}
      </div>

      {activeTab === 'aangifte' && (
        <>
          {/* Period Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periode van</label>
                <input type="date" value={periodeVan} onChange={(e) => setPeriodeVan(e.target.value)}
                  className="px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periode tot</label>
                <input type="date" value={periodeTot} onChange={(e) => setPeriodeTot(e.target.value)}
                  className="px-3 py-2 border rounded-lg" />
              </div>
              <button onClick={handlePeriodeChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Berekenen
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Laden...</div>
          ) : btwAangifte && (
            <div className="grid grid-cols-2 gap-6">
              {/* Verkoop BTW */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b bg-blue-50">
                  <h3 className="font-semibold text-blue-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />BTW op Verkopen
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Omzet hoog tarief (25%)</span>
                    <span className="font-medium">{formatCurrency(btwAangifte.verkoop?.omzet_hoog_tarief)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">BTW hoog tarief</span>
                    <span className="font-medium text-blue-600">{formatCurrency(btwAangifte.verkoop?.btw_hoog_tarief)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Omzet laag tarief (10%)</span>
                    <span className="font-medium">{formatCurrency(btwAangifte.verkoop?.omzet_laag_tarief)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">BTW laag tarief</span>
                    <span className="font-medium text-blue-600">{formatCurrency(btwAangifte.verkoop?.btw_laag_tarief)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Omzet 0% / vrijgesteld</span>
                    <span className="font-medium">{formatCurrency(btwAangifte.verkoop?.omzet_nul_tarief + btwAangifte.verkoop?.omzet_vrijgesteld)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 -mx-4 px-4 rounded-b-lg font-semibold">
                    <span>Totaal BTW verkopen</span>
                    <span className="text-blue-700">{formatCurrency(btwAangifte.verkoop?.totaal_btw)}</span>
                  </div>
                </div>
              </div>

              {/* Inkoop BTW */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b bg-green-50">
                  <h3 className="font-semibold text-green-900 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2" />BTW Aftrek (Inkoop)
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Aftrekbare BTW inkopen</span>
                    <span className="font-medium text-green-600">{formatCurrency(btwAangifte.inkoop?.btw_aftrekbaar)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 -mx-4 px-4 rounded-b-lg font-semibold">
                    <span>Totaal BTW aftrek</span>
                    <span className="text-green-700">{formatCurrency(btwAangifte.inkoop?.btw_aftrekbaar)}</span>
                  </div>
                </div>
              </div>

              {/* Saldo */}
              <div className="col-span-2 bg-white rounded-xl border-2 border-blue-200">
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-sm text-gray-500">BTW op verkopen</div>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(btwAangifte.verkoop?.totaal_btw)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">BTW aftrek inkopen</div>
                      <div className="text-2xl font-bold text-green-600">- {formatCurrency(btwAangifte.inkoop?.btw_aftrekbaar)}</div>
                    </div>
                    <div className={`p-4 rounded-xl ${btwAangifte.saldo?.te_betalen > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <div className="text-sm text-gray-500">
                        {btwAangifte.saldo?.te_betalen > 0 ? 'Te betalen BTW' : 'Te vorderen BTW'}
                      </div>
                      <div className={`text-3xl font-bold ${btwAangifte.saldo?.te_betalen > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(btwAangifte.saldo?.te_betalen || btwAangifte.saldo?.te_vorderen)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'codes' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omschrijving</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {btwCodes.map(code => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-medium">{code.code}</td>
                  <td className="px-6 py-4">{code.omschrijving}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${code.type === 'verkoop' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {code.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{code.percentage}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${code.actief ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {code.actief ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'controle' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b">
            <h3 className="font-semibold">BTW Controlelijst</h3>
            <p className="text-sm text-gray-500">Facturen met ontbrekende of onjuiste BTW</p>
          </div>
          {controlelijst.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">Geen BTW problemen gevonden</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probleem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {controlelijst.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{item.type}</td>
                    <td className="px-6 py-4 font-medium">{item.nummer}</td>
                    <td className="px-6 py-4 text-orange-600">{item.probleem}</td>
                    <td className="px-6 py-4 text-gray-500">{item.datum}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.bedrag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default BTWPage;