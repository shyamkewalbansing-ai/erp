import React, { useState, useEffect } from 'react';
import { FileBarChart, Download, Calendar, TrendingUp, TrendingDown, Scale, BarChart3, PieChart, AlertCircle, X } from 'lucide-react';

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

const RapportagesPage = () => {
  const [activeReport, setActiveReport] = useState('balans');
  const [loading, setLoading] = useState(false);
  const [balans, setBalans] = useState(null);
  const [winstVerlies, setWinstVerlies] = useState(null);
  const [proefSaldibalans, setProefSaldibalans] = useState(null);
  const [periodeVan, setPeriodeVan] = useState(new Date().getFullYear() + '-01-01');
  const [periodeTot, setPeriodeTot] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);

  const loadBalans = async () => {
    try {
      setLoading(true);
      const data = await api(`/rapportages/balans?datum=${periodeTot}`);
      setBalans(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadWinstVerlies = async () => {
    try {
      setLoading(true);
      const data = await api(`/rapportages/winst-verlies?periode_van=${periodeVan}&periode_tot=${periodeTot}`);
      setWinstVerlies(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadProefSaldibalans = async () => {
    try {
      setLoading(true);
      const data = await api('/rapportages/proef-saldibalans');
      setProefSaldibalans(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeReport === 'balans') loadBalans();
    else if (activeReport === 'winstverlies') loadWinstVerlies();
    else if (activeReport === 'proefsaldi') loadProefSaldibalans();
  }, [activeReport]);

  const reports = [
    { id: 'balans', name: 'Balans', icon: Scale },
    { id: 'winstverlies', name: 'Winst & Verlies', icon: TrendingUp },
    { id: 'proefsaldi', name: 'Proef/Saldibalans', icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileBarChart className="w-7 h-7 mr-3 text-blue-600" />Rapportages
          </h1>
          <p className="text-gray-500 mt-1">Financiele overzichten en analyses</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-center bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Report Selector */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {reports.map(report => (
          <button key={report.id} onClick={() => setActiveReport(report.id)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeReport === report.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
            <report.icon className="w-4 h-4 mr-2" />{report.name}
          </button>
        ))}
      </div>

      {/* Period Selector */}
      {(activeReport === 'balans' || activeReport === 'winstverlies') && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-end gap-4">
            {activeReport === 'winstverlies' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Van</label>
                <input type="date" value={periodeVan} onChange={(e) => setPeriodeVan(e.target.value)}
                  className="px-3 py-2 border rounded-lg" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeReport === 'balans' ? 'Datum' : 'Tot'}
              </label>
              <input type="date" value={periodeTot} onChange={(e) => setPeriodeTot(e.target.value)}
                className="px-3 py-2 border rounded-lg" />
            </div>
            <button onClick={activeReport === 'balans' ? loadBalans : loadWinstVerlies}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Genereren
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Rapport wordt gegenereerd...</div>
      ) : (
        <>
          {/* Balans Report */}
          {activeReport === 'balans' && balans && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Balans per {balans.datum}</h2>
                <p className={`text-sm ${balans.in_balans ? 'text-green-600' : 'text-red-600'}`}>
                  {balans.in_balans ? '✓ Balans is in evenwicht' : '✗ Balans is NIET in evenwicht'}
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x">
                {/* Activa */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 text-center bg-blue-50 py-2 rounded">ACTIVA</h3>
                  <table className="w-full">
                    <tbody>
                      {balans.activa?.details?.filter(r => r.saldo !== 0).map((rek, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 text-sm">{rek.nummer}</td>
                          <td className="py-2 text-sm">{rek.naam}</td>
                          <td className="py-2 text-sm text-right font-medium">{formatCurrency(rek.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan="2" className="py-3">Totaal Activa</td>
                        <td className="py-3 text-right">{formatCurrency(balans.totaal_activa)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Passiva + EV */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 text-center bg-purple-50 py-2 rounded">PASSIVA & EIGEN VERMOGEN</h3>
                  <table className="w-full">
                    <tbody>
                      {balans.passiva?.details?.filter(r => r.saldo !== 0).map((rek, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 text-sm">{rek.nummer}</td>
                          <td className="py-2 text-sm">{rek.naam}</td>
                          <td className="py-2 text-sm text-right font-medium">{formatCurrency(Math.abs(rek.saldo))}</td>
                        </tr>
                      ))}
                      {balans.eigen_vermogen?.details?.filter(r => r.saldo !== 0).map((rek, i) => (
                        <tr key={`ev-${i}`} className="border-b">
                          <td className="py-2 text-sm">{rek.nummer}</td>
                          <td className="py-2 text-sm">{rek.naam}</td>
                          <td className="py-2 text-sm text-right font-medium">{formatCurrency(Math.abs(rek.saldo))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-purple-50 font-bold">
                        <td colSpan="2" className="py-3">Totaal Passiva & EV</td>
                        <td className="py-3 text-right">{formatCurrency(balans.totaal_passiva_ev)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Winst & Verlies Report */}
          {activeReport === 'winstverlies' && winstVerlies && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Winst & Verliesrekening</h2>
                <p className="text-sm text-gray-500">{winstVerlies.periode_van} t/m {winstVerlies.periode_tot}</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Omzet */}
                <div>
                  <h3 className="font-semibold text-green-700 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />Omzet
                  </h3>
                  <div className="pl-4 space-y-1">
                    {winstVerlies.omzet?.details?.filter(r => r.saldo !== 0).map((rek, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-sm">{rek.nummer} - {rek.naam}</span>
                        <span className="font-medium">{formatCurrency(Math.abs(rek.saldo))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-green-700">
                      <span>Totaal Omzet</span>
                      <span>{formatCurrency(winstVerlies.omzet?.totaal)}</span>
                    </div>
                  </div>
                </div>

                {/* Kosten */}
                <div>
                  <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-2" />Kosten
                  </h3>
                  <div className="pl-4 space-y-1">
                    {winstVerlies.kosten?.details?.filter(r => r.saldo !== 0).map((rek, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-sm">{rek.nummer} - {rek.naam}</span>
                        <span className="font-medium">{formatCurrency(Math.abs(rek.saldo))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-red-700">
                      <span>Totaal Kosten</span>
                      <span>{formatCurrency(winstVerlies.kosten?.totaal)}</span>
                    </div>
                  </div>
                </div>

                {/* Resultaat */}
                <div className={`p-4 rounded-xl ${winstVerlies.netto_winst >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Netto Resultaat</span>
                    <span className={`text-2xl font-bold ${winstVerlies.netto_winst >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(winstVerlies.netto_winst)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proef/Saldibalans */}
          {activeReport === 'proefsaldi' && proefSaldibalans && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Proef- en Saldibalans</h2>
                <p className={`text-sm ${proefSaldibalans.in_balans ? 'text-green-600' : 'text-red-600'}`}>
                  {proefSaldibalans.in_balans ? '✓ In balans' : '✗ NIET in balans'}
                </p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debet</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {proefSaldibalans.rekeningen?.filter(r => r.debet > 0 || r.credit > 0).map((rek, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-sm">{rek.nummer}</td>
                      <td className="px-6 py-3 text-sm">{rek.naam}</td>
                      <td className="px-6 py-3 text-right font-medium text-blue-600">
                        {rek.debet > 0 ? formatCurrency(rek.debet) : ''}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-green-600">
                        {rek.credit > 0 ? formatCurrency(rek.credit) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan="2" className="px-6 py-3">Totaal</td>
                    <td className="px-6 py-3 text-right text-blue-700">{formatCurrency(proefSaldibalans.totaal_debet)}</td>
                    <td className="px-6 py-3 text-right text-green-700">{formatCurrency(proefSaldibalans.totaal_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RapportagesPage;