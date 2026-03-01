import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { Calendar, TrendingUp, TrendingDown, CreditCard, Wallet, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const formatCurrency = (amount) => amount === null || amount === undefined ? '€ 0,00' : `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const maandNamen = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

export default function PlanningPage() {
  const { token } = useAuth();
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchPlanning = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/schuldbeheer/planning?maand=${selectedMonth}&jaar=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij ophalen planning');
      setPlanning(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth, selectedYear]);

  useEffect(() => { fetchPlanning(); }, [fetchPlanning]);

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'positief': return 'text-green-600 bg-green-50';
      case 'negatief': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'positief': return <CheckCircle2 className="w-6 h-6" />;
      case 'negatief': return <AlertCircle className="w-6 h-6" />;
      default: return <Wallet className="w-6 h-6" />;
    }
  };

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maandplanning</h1>
            <p className="text-gray-500">Overzicht van uw maandelijkse cashflow</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 font-medium min-w-[180px] text-center">
              {maandNamen[selectedMonth - 1]} {selectedYear}
            </div>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : planning && (
          <>
            {/* Status Card */}
            <div className={`rounded-xl p-6 ${getStatusColor(planning.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(planning.status)}
                  <div>
                    <h2 className="text-lg font-semibold">
                      {planning.status === 'positief' ? 'Positieve maand' : planning.status === 'negatief' ? 'Let op: Negatieve maand' : 'Neutrale maand'}
                    </h2>
                    <p className="text-sm opacity-80">
                      {planning.status === 'positief' ? 'U houdt geld over deze maand' : planning.status === 'negatief' ? 'Uw uitgaven overschrijden uw inkomsten' : 'Uw inkomsten en uitgaven zijn in balans'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Vrij besteedbaar</p>
                  <p className="text-3xl font-bold">{formatCurrency(planning.vrij_besteedbaar)}</p>
                </div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-500">Inkomsten</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(planning.totaal_inkomsten)}</p>
                <p className="text-xs text-gray-400 mt-1">{planning.details?.inkomsten_items || 0} inkomstenbronnen</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm text-gray-500">Vaste Lasten</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">-{formatCurrency(planning.vaste_lasten)}</p>
                <p className="text-xs text-gray-400 mt-1">{planning.details?.vaste_lasten_items || 0} vaste uitgaven</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-500">Schuld Betalingen</span>
                </div>
                <p className="text-2xl font-bold text-red-600">-{formatCurrency(planning.schuld_betalingen)}</p>
                <p className="text-xs text-gray-400 mt-1">{planning.details?.schulden_met_regeling || 0} actieve regelingen</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">Variabele Uitgaven</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">-{formatCurrency(planning.variabele_uitgaven)}</p>
                <p className="text-xs text-gray-400 mt-1">{planning.details?.variabele_uitgaven_items || 0} uitgaven deze maand</p>
              </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Maandoverzicht</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Totaal Inkomsten</span>
                  <span className="font-semibold text-green-600">+{formatCurrency(planning.totaal_inkomsten)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Vaste Lasten</span>
                  <span className="font-semibold text-amber-600">-{formatCurrency(planning.vaste_lasten)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Schuld Betalingen (regelingen)</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(planning.schuld_betalingen)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Variabele Uitgaven</span>
                  <span className="font-semibold text-purple-600">-{formatCurrency(planning.variabele_uitgaven)}</span>
                </div>
                <div className="flex items-center justify-between py-3 bg-gray-50 rounded-lg px-4 mt-4">
                  <span className="font-semibold text-gray-900">Vrij Besteedbaar</span>
                  <span className={`text-xl font-bold ${planning.vrij_besteedbaar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(planning.vrij_besteedbaar)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
