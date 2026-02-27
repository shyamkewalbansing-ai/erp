import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCcw, Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle, X, Globe, History, ArrowRight, Building2, Save } from 'lucide-react';

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

const formatNumber = (num, decimals = 4) => {
  return new Intl.NumberFormat('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Currency Card Component
const CurrencyCard = ({ from, to, rate, date, source, trend }) => {
  const isIncrease = trend > 0;
  const flagEmoji = {
    'SRD': '🇸🇷',
    'USD': '🇺🇸',
    'EUR': '🇪🇺'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow" data-testid={`currency-card-${from}-${to}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{flagEmoji[from] || '💱'}</span>
          <span className="font-semibold text-gray-900">{from}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-2xl">{flagEmoji[to] || '💱'}</span>
          <span className="font-semibold text-gray-900">{to}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
            {isIncrease ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend).toFixed(2)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">
        {formatNumber(rate)}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{formatDate(date)}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${source === 'centrale_bank' || source === 'centrale_bank_live' ? 'bg-blue-100 text-blue-700' : source === 'fallback_indicatief' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
          {source === 'centrale_bank' || source === 'centrale_bank_live' ? 'CBvS' : source === 'fallback_indicatief' ? 'Indicatief' : source || 'Handmatig'}
        </span>
      </div>
    </div>
  );
};

const WisselkoersenPage = () => {
  const [koersen, setKoersen] = useState([]);
  const [actueelKoersen, setActueelKoersen] = useState({});
  const [historiek, setHistoriek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCB, setLoadingCB] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('actueel');
  const [cbResult, setCbResult] = useState(null);

  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split('T')[0],
    van_valuta: 'USD',
    naar_valuta: 'SRD',
    koers: '',
    bron: 'handmatig'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [actueelRes, historyRes] = await Promise.all([
        api('/wisselkoersen/actueel'),
        api('/wisselkoersen')
      ]);
      setActueelKoersen(actueelRes.koersen || actueelRes);
      setHistoriek(historyRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentraleBank = async () => {
    try {
      setLoadingCB(true);
      setCbResult(null);
      const result = await api('/wisselkoersen/centrale-bank-live');
      setCbResult(result);
      if (result.success) {
        setSuccess(`${result.koersen?.length || 0} koersen opgehaald van ${result.bron === 'centrale_bank_live' ? 'Centrale Bank' : 'fallback'}`);
        loadData();
      } else {
        setError(result.message || 'Ophalen mislukt');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCB(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/wisselkoersen', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setSuccess('Wisselkoers opgeslagen');
      setShowModal(false);
      loadData();
      setFormData({
        datum: new Date().toISOString().split('T')[0],
        van_valuta: 'USD',
        naar_valuta: 'SRD',
        koers: '',
        bron: 'handmatig'
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Prepare current rates for display
  const currentRates = Object.entries(actueelKoersen).map(([key, value]) => ({
    key,
    from: value.van,
    to: value.naar,
    rate: value.koers,
    date: value.datum,
    source: value.bron
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center" data-testid="wisselkoersen-title">
            <DollarSign className="w-7 h-7 mr-3 text-blue-600" />Wisselkoersen
          </h1>
          <p className="text-gray-500 mt-1">Beheer valutakoersen voor uw administratie</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchCentraleBank}
            disabled={loadingCB}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            data-testid="fetch-cbvs-btn"
          >
            {loadingCB ? (
              <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Building2 className="w-5 h-5 mr-2" />
            )}
            CBvS Ophalen
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            data-testid="add-rate-btn"
          >
            <Plus className="w-5 h-5 mr-2" />Handmatig Toevoegen
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          {error || success}
          <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* CBvS Result Info */}
      {cbResult && (
        <div className={`mb-6 p-4 rounded-xl border ${cbResult.success ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start">
            <Globe className="w-5 h-5 mr-3 mt-0.5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Centrale Bank van Suriname</h3>
              <p className="text-sm text-gray-600 mt-1">{cbResult.message}</p>
              {cbResult.note && (
                <p className="text-xs text-yellow-700 mt-2 bg-yellow-100 px-2 py-1 rounded">{cbResult.note}</p>
              )}
              {cbResult.koersen && cbResult.koersen.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cbResult.koersen.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm shadow-sm">
                      {k.van_valuta} → {k.naar_valuta}: <strong>{formatNumber(k.koers, 4)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('actueel')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'actueel' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-actueel"
        >
          <Globe className="w-4 h-4 mr-2" />Actuele Koersen
        </button>
        <button
          onClick={() => setActiveTab('historiek')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'historiek' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-historiek"
        >
          <History className="w-4 h-4 mr-2" />Historiek
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Koersen laden...
        </div>
      ) : (
        <>
          {/* Actuele Koersen Tab */}
          {activeTab === 'actueel' && (
            <div>
              {currentRates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Geen koersen beschikbaar</h3>
                  <p className="text-gray-500 mt-2">Haal koersen op van de Centrale Bank of voeg handmatig toe.</p>
                  <button
                    onClick={fetchCentraleBank}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    CBvS Koersen Ophalen
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentRates.map((rate) => (
                    <CurrencyCard
                      key={rate.key}
                      from={rate.from}
                      to={rate.to}
                      rate={rate.rate}
                      date={rate.date}
                      source={rate.source}
                    />
                  ))}
                </div>
              )}

              {/* Quick Reference */}
              {currentRates.length > 0 && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <RefreshCcw className="w-5 h-5 mr-2 text-blue-600" />Snelle Omrekening
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {actueelKoersen.USD_to_SRD && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-sm text-gray-500">1 USD =</div>
                        <div className="text-xl font-bold text-gray-900">{formatNumber(actueelKoersen.USD_to_SRD.koers, 2)} SRD</div>
                      </div>
                    )}
                    {actueelKoersen.EUR_to_SRD && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-sm text-gray-500">1 EUR =</div>
                        <div className="text-xl font-bold text-gray-900">{formatNumber(actueelKoersen.EUR_to_SRD.koers, 2)} SRD</div>
                      </div>
                    )}
                    {actueelKoersen.SRD_to_USD && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-sm text-gray-500">1 SRD =</div>
                        <div className="text-xl font-bold text-gray-900">{formatNumber(actueelKoersen.SRD_to_USD.koers, 4)} USD</div>
                      </div>
                    )}
                    {actueelKoersen.SRD_to_EUR && (
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <div className="text-sm text-gray-500">1 SRD =</div>
                        <div className="text-xl font-bold text-gray-900">{formatNumber(actueelKoersen.SRD_to_EUR.koers, 4)} EUR</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historiek Tab */}
          {activeTab === 'historiek' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Koers Historiek</h3>
                <p className="text-sm text-gray-500">Laatste 100 geregistreerde koersen</p>
              </div>
              <table className="w-full" data-testid="historiek-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Van</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naar</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Koers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bron</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historiek.map((koers) => (
                    <tr key={koers.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{formatDate(koers.datum)}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{koers.van_valuta}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{koers.naar_valuta}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium">
                        {formatNumber(koers.koers)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          koers.bron === 'centrale_bank' || koers.bron === 'centrale_bank_live' ? 'bg-blue-100 text-blue-700' :
                          koers.bron === 'fallback_indicatief' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {koers.bron === 'centrale_bank' || koers.bron === 'centrale_bank_live' ? 'CBvS' : 
                           koers.bron === 'fallback_indicatief' ? 'Indicatief' : 
                           koers.bron || 'Handmatig'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historiek.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Geen historische koersen beschikbaar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Rate Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Wisselkoers Toevoegen">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={formData.datum}
              onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              data-testid="input-datum"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Van Valuta</label>
              <select
                value={formData.van_valuta}
                onChange={(e) => setFormData({ ...formData, van_valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="select-van-valuta"
              >
                <option value="SRD">SRD - Surinaamse Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naar Valuta</label>
              <select
                value={formData.naar_valuta}
                onChange={(e) => setFormData({ ...formData, naar_valuta: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="select-naar-valuta"
              >
                <option value="SRD">SRD - Surinaamse Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Koers</label>
            <input
              type="number"
              step="0.0001"
              value={formData.koers}
              onChange={(e) => setFormData({ ...formData, koers: parseFloat(e.target.value) || '' })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Bijv. 36.50"
              required
              data-testid="input-koers"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hoeveel {formData.naar_valuta} voor 1 {formData.van_valuta}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bron</label>
            <select
              value={formData.bron}
              onChange={(e) => setFormData({ ...formData, bron: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="select-bron"
            >
              <option value="handmatig">Handmatig</option>
              <option value="centrale_bank">Centrale Bank</option>
              <option value="bank">Bank</option>
              <option value="wisselkantoor">Wisselkantoor</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              data-testid="save-rate-btn"
            >
              <Save className="w-4 h-4 mr-2" />Opslaan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WisselkoersenPage;
