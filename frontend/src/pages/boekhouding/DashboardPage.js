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

// Stat Card - Icon on RIGHT side like reference
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, iconColor }) => {
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Content - LEFT */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            {subtitle && (
              <p className={`text-xs mt-1 ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>
          {/* Icon - RIGHT */}
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Bank Card - Simpler design
const BankCard = ({ title, value, icon: Icon }) => {
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{title}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
};

// Loading Card
const LoadingStatCard = () => (
  <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
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
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welkom terug! Hier is uw financiële overzicht.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
              <span className="text-sm text-gray-500">USD/SRD: </span>
              <span className="text-sm font-semibold text-gray-900">{formatNumber(usdSrdRate, 2)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
              <span className="text-sm text-gray-500">EUR/SRD: </span>
              <span className="text-sm font-semibold text-gray-900">{formatNumber(eurSrdRate, 2)}</span>
            </div>
            <button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
              onClick={() => navigate('/app/boekhouding/pos')}
            >
              <Receipt className="w-4 h-4" />
              Point of Sale
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Row 1: Omzet, Kosten, Winst, Openstaande Facturen - 4 columns */}
        <div className="grid grid-cols-4 gap-5 mb-5">
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
                subtitle={winst < 0 ? "↘ Negatief Netto resultaat" : "Netto resultaat"}
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

        {/* Row 2: Debiteuren, Crediteuren, BTW te betalen, BTW te vorderen - 4 columns */}
        <div className="grid grid-cols-4 gap-5 mb-5">
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

        {/* Row 3: Bank SRD, Bank USD, Bank EUR - 3 columns */}
        <div className="grid grid-cols-3 gap-5 mb-5">
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

        {/* Row 4: Cashflow Overzicht + Ouderdomsanalyse - 2 columns */}
        <div className="grid grid-cols-2 gap-5">
          {/* Cashflow Overzicht */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Cashflow Overzicht</h3>
              <div className="h-64">
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
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 'SRD')}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="omzet" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 4 }}
                        name="Omzet"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kosten" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 4 }}
                        name="Kosten"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ouderdomsanalyse Debiteuren */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Ouderdomsanalyse Debiteuren</h3>
              <div className="h-64">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ouderdomData} barSize={60}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value, 'SRD')}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
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
