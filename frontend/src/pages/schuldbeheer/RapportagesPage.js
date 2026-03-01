import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { BarChart3, Users, Calendar, TrendingUp, TrendingDown, FileText, Download, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const reportTypes = [
  { id: 'schuld-per-schuldeiser', label: 'Schuld per Schuldeiser', icon: Users, description: 'Overzicht van schulden per schuldeiser' },
  { id: 'schuld-per-categorie', label: 'Schuld per Categorie', icon: FileText, description: 'Schulden gegroepeerd per type' },
  { id: 'betaalhistorie', label: 'Betaalhistorie', icon: Calendar, description: 'Betalingen per maand over 12 maanden' },
  { id: 'cashflow', label: 'Maandelijkse Cashflow', icon: TrendingUp, description: 'Inkomsten vs uitgaven per maand' },
  { id: 'jaaroverzicht', label: 'Jaaroverzicht', icon: BarChart3, description: 'Totaaloverzicht van het jaar' }
];

export default function RapportagesPage() {
  const { token } = useAuth();
  const [selectedReport, setSelectedReport] = useState('schuld-per-schuldeiser');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/schuldbeheer/rapportages/${selectedReport}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij ophalen rapport');
      setReportData(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedReport]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const renderSchuldPerSchuldeiser = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-blue-600">Totaal Schuldeisers</p><p className="text-2xl font-bold text-blue-700">{reportData.totalen?.totaal_schuldeisers || 0}</p></div>
        <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-600">Oorspronkelijk</p><p className="text-2xl font-bold text-gray-700">{formatCurrency(reportData.totalen?.totaal_oorspronkelijk)}</p></div>
        <div className="bg-red-50 rounded-lg p-4"><p className="text-sm text-red-600">Openstaand</p><p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.totalen?.totaal_openstaand)}</p></div>
        <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-green-600">Betaald</p><p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.totalen?.totaal_betaald)}</p></div>
      </div>
      {reportData.rapport?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schuldeiser</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aantal</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Oorspronkelijk</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Openstaand</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betaald</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.rapport.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.relatie_naam}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.relatie_type}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.aantal_schulden}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(r.totaal_oorspronkelijk)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(r.totaal_openstaand)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.totaal_betaald)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: `${r.percentage_afgelost}%`}}></div></div>
                      <span className="text-sm text-gray-600">{r.percentage_afgelost}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="text-center py-12 text-gray-500">Geen data beschikbaar</div>}
    </div>
  );

  const renderCashflow = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-green-600">Totaal Inkomsten</p><p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.totalen?.totaal_inkomsten)}</p></div>
        <div className="bg-red-50 rounded-lg p-4"><p className="text-sm text-red-600">Totaal Uitgaven</p><p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.totalen?.totaal_uitgaven)}</p></div>
        <div className="bg-amber-50 rounded-lg p-4"><p className="text-sm text-amber-600">Schuld Betalingen</p><p className="text-2xl font-bold text-amber-700">{formatCurrency(reportData.totalen?.totaal_schuld_betalingen)}</p></div>
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-blue-600">Netto</p><p className={`text-2xl font-bold ${reportData.totalen?.totaal_netto >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(reportData.totalen?.totaal_netto)}</p></div>
      </div>
      {reportData.rapport?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maand</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inkomsten</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Uitgaven</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Schuld</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Netto</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.rapport.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.maand}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.inkomsten)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.uitgaven)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(r.schuld_betalingen)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.netto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(r.netto)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'positief' ? 'bg-green-100 text-green-700' : r.status === 'negatief' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.status === 'positief' ? 'Positief' : r.status === 'negatief' ? 'Negatief' : 'Neutraal'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="text-center py-12 text-gray-500">Geen data beschikbaar</div>}
    </div>
  );

  const renderBetaalhistorie = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-green-600">Totaal Betalingen</p><p className="text-2xl font-bold text-green-700">{reportData.totalen?.totaal_betalingen || 0}</p></div>
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-blue-600">Totaal Bedrag</p><p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.totalen?.totaal_bedrag)}</p></div>
        <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-purple-600">Gemiddeld/Maand</p><p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.totalen?.gemiddeld_per_maand)}</p></div>
      </div>
      {reportData.rapport?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maand</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aantal Betalingen</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Totaal Betaald</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.rapport.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.maand}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.aantal_betalingen}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(r.totaal_betaald)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="text-center py-12 text-gray-500">Geen betalingen gevonden</div>}
    </div>
  );

  const renderJaaroverzicht = () => (
    <div className="space-y-6">
      <div className="text-center"><h2 className="text-3xl font-bold text-gray-900">Jaaroverzicht {reportData.jaar}</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" />Inkomsten</h3>
          <p className="text-3xl font-bold text-green-600 mb-4">{formatCurrency(reportData.inkomsten?.totaal)}</p>
          <div className="space-y-2">
            {reportData.inkomsten?.per_bron && Object.entries(reportData.inkomsten.per_bron).map(([bron, bedrag]) => (
              <div key={bron} className="flex justify-between text-sm"><span className="text-gray-600 capitalize">{bron}</span><span className="font-medium">{formatCurrency(bedrag)}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-600" />Uitgaven</h3>
          <p className="text-3xl font-bold text-red-600 mb-4">{formatCurrency(reportData.uitgaven?.totaal)}</p>
          <div className="space-y-2">
            {reportData.uitgaven?.per_categorie && Object.entries(reportData.uitgaven.per_categorie).map(([cat, bedrag]) => (
              <div key={cat} className="flex justify-between text-sm"><span className="text-gray-600 capitalize">{cat}</span><span className="font-medium">{formatCurrency(bedrag)}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" />Samenvatting</h3>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-gray-600">Schuld Betalingen</span><span className="font-bold text-amber-600">{formatCurrency(reportData.schuld_betalingen)}</span></div>
            <hr />
            <div className="flex justify-between"><span className="text-gray-600">Netto Resultaat</span><span className={`font-bold text-xl ${reportData.netto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(reportData.netto)}</span></div>
            <hr />
            <div className="text-sm text-gray-500 space-y-1">
              <p>Gem. inkomen/maand: {formatCurrency(reportData.samenvatting?.gemiddeld_inkomen_per_maand)}</p>
              <p>Gem. uitgaven/maand: {formatCurrency(reportData.samenvatting?.gemiddelde_uitgaven_per_maand)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchuldPerCategorie = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-blue-600">Categorieën</p><p className="text-2xl font-bold text-blue-700">{reportData.totalen?.totaal_categorieen || 0}</p></div>
        <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-600">Totaal Schulden</p><p className="text-2xl font-bold text-gray-700">{reportData.totalen?.totaal_schulden || 0}</p></div>
        <div className="bg-red-50 rounded-lg p-4"><p className="text-sm text-red-600">Totaal Openstaand</p><p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.totalen?.totaal_openstaand)}</p></div>
      </div>
      {reportData.rapport?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aantal</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Oorspronkelijk</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Openstaand</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betaald</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.rapport.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{r.categorie}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.aantal_schulden}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(r.totaal_oorspronkelijk)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(r.totaal_openstaand)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.totaal_betaald)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="text-center py-12 text-gray-500">Geen data beschikbaar</div>}
    </div>
  );

  const renderReport = () => {
    if (!reportData) return null;
    switch (selectedReport) {
      case 'schuld-per-schuldeiser': return renderSchuldPerSchuldeiser();
      case 'schuld-per-categorie': return renderSchuldPerCategorie();
      case 'betaalhistorie': return renderBetaalhistorie();
      case 'cashflow': return renderCashflow();
      case 'jaaroverzicht': return renderJaaroverzicht();
      default: return <div>Selecteer een rapport</div>;
    }
  };

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapportages</h1>
          <p className="text-gray-500">Overzichten en analyses van uw financiële situatie</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {reportTypes.map((report) => (
            <button key={report.id} onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border text-left transition-all ${selectedReport === report.id ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
              <report.icon className={`w-6 h-6 mb-2 ${selectedReport === report.id ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className={`font-medium text-sm ${selectedReport === report.id ? 'text-blue-900' : 'text-gray-900'}`}>{report.label}</p>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : renderReport()}
      </div>
    </SchuldbeheerLayout>
  );
}
