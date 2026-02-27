import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Receipt, TrendingUp, TrendingDown } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'SRD 0,00';
  return `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount)}`;
};

export default function BTWPage() {
  const { token } = useAuth();
  const [aangifte, setAangifte] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [aangifteRes, codesRes] = await Promise.all([
        fetch(`${API_URL}/api/boekhouding/btw/aangifte`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/boekhouding/btw/codes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (aangifteRes.ok) setAangifte(await aangifteRes.json());
      if (codesRes.ok) setCodes(await codesRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;

  const saldo = (aangifte?.saldo?.te_betalen_aan_belastingdienst || 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">BTW Module</h1>
        <p className="text-gray-500">Beheer BTW tarieven en bekijk aangifte overzicht</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(aangifte?.verkoop?.totaal_btw)}</p>
              <p className="text-sm text-gray-500">BTW Verkoop</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(aangifte?.inkoop?.totaal_btw)}</p>
              <p className="text-sm text-gray-500">BTW Inkoop</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${saldo >= 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
              <Receipt className={`w-5 h-5 ${saldo >= 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(Math.abs(saldo))}</p>
              <p className="text-sm text-gray-500">{saldo >= 0 ? 'Te betalen' : 'Te vorderen'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">BTW Aangifte Q{aangifte?.periode?.kwartaal} {aangifte?.periode?.jaar}</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Omzet 25%</span>
              <span className="font-medium">{formatCurrency(aangifte?.verkoop?.omzet_per_tarief?.V25)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">BTW 25%</span>
              <span className="font-medium">{formatCurrency(aangifte?.verkoop?.btw_per_tarief?.V25)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Omzet 10%</span>
              <span className="font-medium">{formatCurrency(aangifte?.verkoop?.omzet_per_tarief?.V10)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">BTW 10%</span>
              <span className="font-medium">{formatCurrency(aangifte?.verkoop?.btw_per_tarief?.V10)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span>Totaal BTW Verkoop</span>
              <span>{formatCurrency(aangifte?.verkoop?.totaal_btw)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">BTW Codes</h3>
          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <span className="font-medium text-gray-900">{c.code}</span>
                  <span className="ml-2 text-gray-500 text-sm">{c.naam}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  c.type === 'verkoop' ? 'bg-green-100 text-green-600' :
                  c.type === 'inkoop' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
