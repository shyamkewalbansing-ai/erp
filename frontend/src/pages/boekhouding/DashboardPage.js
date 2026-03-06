import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  FileText,
  Landmark,
  DollarSign,
  Euro,
  Receipt
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// Stat Card - Responsive with icon on RIGHT
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, iconColor }) => {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Content - LEFT */}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">{value}</p>
            {subtitle && (
              <p className={`text-[10px] sm:text-xs mt-0.5 truncate ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>
          {/* Icon - RIGHT */}
          <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Bank Card - Responsive
const BankCard = ({ title, value, icon: Icon }) => {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-500">{title}</span>
        </div>
        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{value}</p>
      </CardContent>
    </Card>
  );
};

// Loading Card - Responsive
const LoadingStatCard = () => (
  <Card className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 mb-2 sm:mb-3" />
          <Skeleton className="h-6 sm:h-8 w-20 sm:w-28 mb-1.5 sm:mb-2" />
          <Skeleton className="h-2.5 sm:h-3 w-12 sm:w-16" />
        </div>
        <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rates, setRates] = useState(null);
  const [cashflowData, setCashflowData] = useState([]);
  const [ouderdomData, setOuderdomData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, ratesRes, chartsRes] = await Promise.all([
        dashboardAPI.getSummary().catch(() => ({ data: {} })),
        exchangeRatesAPI.getLatest().catch(() => ({ data: {} })),
        dashboardAPI.getChartData().catch(() => ({ data: {} }))
      ]);

      setDashboardData(dashRes.data || {});
      setRates(ratesRes.data || {});
      
      // Cashflow data with two lines (omzet and kosten)
      if (chartsRes.data?.omzet_kosten) {
        setCashflowData(chartsRes.data.omzet_kosten.map(item => ({
          name: item.maand,
          omzet: item.omzet || 0,
          kosten: item.kosten || 0
        })));
      } else {
        setCashflowData([
          { name: 'Jan', omzet: 35000, kosten: 30000 },
          { name: 'Feb', omzet: 55000, kosten: 40000 },
          { name: 'Mrt', omzet: 60000, kosten: 45000 },
          { name: 'Apr', omzet: 58000, kosten: 50000 },
          { name: 'Mei', omzet: 62000, kosten: 48000 },
          { name: 'Jun', omzet: 70000, kosten: 52000 }
        ]);
      }

      // Ouderdom data for bar chart
      setOuderdomData([
        { name: '0-30', value: 25000 },
        { name: '31-60', value: 15000 },
        { name: '61-90', value: 8000 }
      ]);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract values
  const omzet = dashboardData?.omzet?.deze_maand || 0;
  const kosten = dashboardData?.kosten?.deze_maand || 0;
  const winst = dashboardData?.winst?.deze_maand || (omzet - kosten);
  const debiteuren = dashboardData?.openstaand?.debiteuren || 0;
  const debiteurenKlanten = dashboardData?.openstaand?.debiteuren_count || 0;
  const crediteuren = dashboardData?.openstaand?.crediteuren || 0;
  const crediteurenLeveranciers = dashboardData?.openstaand?.crediteuren_count || 0;
  const btwTeBetalen = dashboardData?.btw?.te_betalen || 0;
  const btwTeVorderen = dashboardData?.btw?.te_vorderen || 0;
  const bankSRD = dashboardData?.liquiditeit?.bank_srd || 0;
  const bankUSD = dashboardData?.liquiditeit?.bank_usd || 0;
  const bankEUR = dashboardData?.liquiditeit?.bank_eur || 0;
  const openstaandeFacturen = dashboardData?.openstaand?.facturen_count || 0;
  const vervallenFacturen = dashboardData?.openstaand?.vervallen_count || 0;

  const eurSrdRate = rates?.EUR_SRD?.koers || 44.50;
  const usdSrdRate = rates?.USD_SRD?.koers || 36.50;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="boekhouding-dashboard">
      {/* Header - Responsive */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          {/* Mobile: Stack layout, Desktop: Row layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm truncate">Welkom terug! Hier is uw financiële overzicht.</p>
            </div>
            
            {/* Exchange rates and POS button */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              <div className="bg-gray-50 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-gray-200 flex-shrink-0">
                <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500">USD/SRD: </span>
                <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-900">{formatNumber(usdSrdRate, 2)}</span>
              </div>
              <div className="bg-gray-50 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-gray-200 flex-shrink-0">
                <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500">EUR/SRD: </span>
                <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-900">{formatNumber(eurSrdRate, 2)}</span>
              </div>
              <button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-xs lg:text-sm flex items-center gap-1 sm:gap-2 transition-colors flex-shrink-0 whitespace-nowrap"
                onClick={() => navigate('/app/boekhouding/pos')}
              >
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                Point of Sale
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - No padding, responsive gaps */}
      <div className="p-0">
        {/* Row 1: Omzet, Kosten, Winst, Openstaande Facturen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 pb-0 sm:pb-0 lg:pb-0">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
            </>
          ) : (
            <>
              <StatCard
                title="Omzet"
                value={formatCurrency(omzet, 'SRD')}
                subtitle="↗ +12% Deze periode"
                subtitleColor="text-emerald-600"
                icon={TrendingUp}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
              />
              <StatCard
                title="Kosten"
                value={formatCurrency(kosten, 'SRD')}
                subtitle="Deze periode"
                icon={TrendingDown}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />
              <StatCard
                title="Winst"
                value={formatCurrency(winst, 'SRD')}
                subtitle={winst < 0 ? "↘ Negatief" : "Netto resultaat"}
                subtitleColor={winst < 0 ? "text-red-500" : "text-gray-400"}
                icon={Receipt}
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
              />
              <StatCard
                title="Openstaande Facturen"
                value={openstaandeFacturen.toString()}
                subtitle={`${vervallenFacturen} vervallen`}
                icon={FileText}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
              />
            </>
          )}
        </div>

        {/* Row 2: Debiteuren, Crediteuren, BTW te betalen, BTW te vorderen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 pb-0 sm:pb-0 lg:pb-0">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
            </>
          ) : (
            <>
              <StatCard
                title="Debiteuren"
                value={formatCurrency(debiteuren, 'SRD')}
                subtitle={`${debiteurenKlanten} klanten`}
                icon={Users}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
              />
              <StatCard
                title="Crediteuren"
                value={formatCurrency(crediteuren, 'SRD')}
                subtitle={`${crediteurenLeveranciers} leveranciers`}
                icon={Truck}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
              />
              <StatCard
                title="BTW te betalen"
                value={formatCurrency(btwTeBetalen, 'SRD')}
                subtitle="Huidige periode"
                icon={FileText}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
              />
              <StatCard
                title="BTW te vorderen"
                value={formatCurrency(btwTeVorderen, 'SRD')}
                subtitle="Huidige periode"
                icon={FileText}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
              />
            </>
          )}
        </div>

        {/* Row 3: Bank SRD, Bank USD, Bank EUR */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 pb-0 sm:pb-0 lg:pb-0">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
            </>
          ) : (
            <>
              <BankCard
                title="Bank SRD"
                value={formatCurrency(bankSRD, 'SRD')}
                icon={Landmark}
              />
              <BankCard
                title="Bank USD"
                value={formatCurrency(bankUSD, 'USD')}
                icon={DollarSign}
              />
              <BankCard
                title="Bank EUR"
                value={formatCurrency(bankEUR, 'EUR')}
                icon={Euro}
              />
            </>
          )}
        </div>

        {/* Row 4: Cashflow Overzicht + Ouderdomsanalyse - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4">
          {/* Cashflow Overzicht */}
          <Card className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 lg:mb-6">Cashflow Overzicht</h3>
              <div className="h-48 sm:h-56 lg:h-64">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 'SRD')}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="omzet" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 3 }}
                        name="Omzet"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kosten" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 3 }}
                        name="Kosten"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ouderdomsanalyse Debiteuren */}
          <Card className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 lg:mb-6">Ouderdomsanalyse Debiteuren</h3>
              <div className="h-48 sm:h-56 lg:h-64">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ouderdomData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 'SRD')}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        name="Bedrag"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
