import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, FileText, Download } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount) => `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;

export default function RapportagesPage() {
  const { token } = useAuth();
  const [activeReport, setActiveReport] = useState('balans');
  const [balans, setBalans] = useState(null);
  const [wv, setWV] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balansRes, wvRes] = await Promise.all([
        fetch(`${API_URL}/api/boekhouding/rapportages/balans`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/boekhouding/rapportages/winst-verlies`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (balansRes.ok) setBalans(await balansRes.json());
      if (wvRes.ok) setWV(await wvRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reports = [
    { id: 'balans', label: 'Balans' },
    { id: 'winst-verlies', label: 'Winst & Verlies' },
    { id: 'btw', label: 'BTW Aangifte' },
    { id: 'debiteuren', label: 'Debiteuren' },
    { id: 'crediteuren', label: 'Crediteuren' },
    { id: 'cashflow', label: 'Cashflow' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapportages</h1>
          <p className="text-gray-500">Financiële overzichten en rapporten</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" /><span>Exporteren</span>
        </button>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {reports.map((r) => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeReport === r.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {activeReport === 'balans' && balans && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Activa</h3>
                <div className="space-y-2">
                  {(balans.activa || []).map((a, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-600">{a.code} - {a.naam}</span>
                      <span className="font-medium">{formatCurrency(a.saldo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-lg">
                    <span>Totaal Activa</span>
                    <span>{formatCurrency(balans.totaal_activa)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Passiva</h3>
                <div className="space-y-2">
                  {(balans.passiva || []).map((p, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-600">{p.code} - {p.naam}</span>
                      <span className="font-medium">{formatCurrency(p.saldo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-lg">
                    <span>Totaal Passiva</span>
                    <span>{formatCurrency(balans.totaal_passiva)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'winst-verlies' && wv && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Winst & Verlies {wv.jaar}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Omzet</h4>
                  {(wv.omzet || []).map((o, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-600">{o.naam}</span>
                      <span className="font-medium text-green-600">{formatCurrency(o.bedrag)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold">
                    <span>Totaal Omzet</span>
                    <span className="text-green-600">{formatCurrency(wv.totaal_omzet)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Kosten</h4>
                  {(wv.kosten || []).map((k, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-600">{k.naam}</span>
                      <span className="font-medium text-red-600">{formatCurrency(k.bedrag)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold">
                    <span>Totaal Kosten</span>
                    <span className="text-red-600">{formatCurrency(wv.totaal_kosten)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between text-xl font-bold">
                <span>Netto Resultaat</span>
                <span className={wv.netto_winst >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(wv.netto_winst)}
                </span>
              </div>
            </div>
          )}

          {['btw', 'debiteuren', 'crediteuren', 'cashflow'].includes(activeReport) && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{reports.find(r => r.id === activeReport)?.label} rapport</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
