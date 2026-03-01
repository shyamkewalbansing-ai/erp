import React, { useState, useEffect } from 'react';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Receipt,
  Wallet,
  DollarSign,
  Euro,
  Landmark,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Stat Card Component - Original Style
const StatCard = ({ title, value, subtitle, icon: Icon, color, loading }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-7 w-28 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const colorStyles = {
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
    rose: { bg: 'bg-rose-100', icon: 'text-rose-600' }
  };

  const style = colorStyles[color] || colorStyles.slate;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
            <p className="text-xl font-bold text-slate-900 mb-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-full ${style.bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${style.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Ouderdom Item
const OuderdomItem = ({ label, amount, percentage, color }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
    <div className="text-right">
      <span className="text-sm font-medium text-slate-900">{amount}</span>
      <span className="text-xs text-slate-400 ml-2">({percentage}%)</span>
    </div>
  </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3">
        <p className="font-medium text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value, 'SRD')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rates, setRates] = useState(null);
  const [chartData, setChartData] = useState([]);
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
      
      // Process chart data
      if (chartsRes.data?.omzet_kosten) {
        const formattedChartData = chartsRes.data.omzet_kosten.map(item => ({
          name: item.maand,
          Omzet: item.omzet || 0,
          Kosten: item.kosten || 0
        }));
        setChartData(formattedChartData);
      } else {
        // Default chart data if none available
        setChartData([
          { name: 'Jan', Omzet: 0, Kosten: 0 },
          { name: 'Feb', Omzet: 0, Kosten: 0 },
          { name: 'Mrt', Omzet: 0, Kosten: 0 },
          { name: 'Apr', Omzet: 0, Kosten: 0 },
          { name: 'Mei', Omzet: 0, Kosten: 0 },
          { name: 'Jun', Omzet: 0, Kosten: 0 }
        ]);
      }

      // Process ouderdom data
      if (chartsRes.data?.ouderdom_debiteuren) {
        setOuderdomData(chartsRes.data.ouderdom_debiteuren);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract values from dashboard data
  const omzet = dashboardData?.omzet?.deze_maand || 0;
  const kosten = dashboardData?.kosten?.deze_maand || 0;
  const winst = dashboardData?.winst?.deze_maand || (omzet - kosten);
  const debiteuren = dashboardData?.openstaand?.debiteuren || 0;
  const crediteuren = dashboardData?.openstaand?.crediteuren || 0;
  const btwTeBetalen = dashboardData?.btw?.te_betalen || 0;
  const btwTeVorderen = dashboardData?.btw?.te_vorderen || 0;
  const bankSRD = dashboardData?.liquiditeit?.bank_srd || 0;
  const bankUSD = dashboardData?.liquiditeit?.bank_usd || 0;
  const bankEUR = dashboardData?.liquiditeit?.bank_eur || 0;

  // Calculate ouderdom totals
  const ouderdomTotaal = ouderdomData.reduce((sum, item) => sum + (item.bedrag || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="boekhouding-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500">Overzicht van uw boekhouding</p>
            </div>
            <div className="flex items-center gap-4">
              {rates?.USD_SRD && (
                <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-sm border border-slate-200">
                  <span className="text-slate-500">USD/SRD:</span>
                  <span className="font-semibold text-slate-900 ml-1">{formatNumber(rates.USD_SRD.koers, 2)}</span>
                </div>
              )}
              {rates?.EUR_SRD && (
                <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-sm border border-slate-200">
                  <span className="text-slate-500">EUR/SRD:</span>
                  <span className="font-semibold text-slate-900 ml-1">{formatNumber(rates.EUR_SRD.koers, 2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Omzet"
            value={formatCurrency(omzet, 'SRD')}
            subtitle="Deze maand"
            icon={TrendingUp}
            color="emerald"
            loading={loading}
          />
          <StatCard
            title="Kosten"
            value={formatCurrency(kosten, 'SRD')}
            subtitle="Deze maand"
            icon={TrendingDown}
            color="red"
            loading={loading}
          />
          <StatCard
            title="Winst"
            value={formatCurrency(winst, 'SRD')}
            subtitle="Deze maand"
            icon={Wallet}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Debiteuren"
            value={formatCurrency(debiteuren, 'SRD')}
            subtitle="Openstaand"
            icon={Users}
            color="amber"
            loading={loading}
          />
          <StatCard
            title="Crediteuren"
            value={formatCurrency(crediteuren, 'SRD')}
            subtitle="Openstaand"
            icon={Building2}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="BTW te betalen"
            value={formatCurrency(btwTeBetalen, 'SRD')}
            subtitle="Aangifte periode"
            icon={Receipt}
            color="rose"
            loading={loading}
          />
          <StatCard
            title="Bank SRD"
            value={formatCurrency(bankSRD, 'SRD')}
            subtitle="Saldo"
            icon={Landmark}
            color="slate"
            loading={loading}
          />
          <StatCard
            title="Bank USD"
            value={formatCurrency(bankUSD, 'USD')}
            subtitle="Saldo"
            icon={DollarSign}
            color="cyan"
            loading={loading}
          />
          <StatCard
            title="Bank EUR"
            value={formatCurrency(bankEUR, 'EUR')}
            subtitle="Saldo"
            icon={Euro}
            color="indigo"
            loading={loading}
          />
          <StatCard
            title="BTW te vorderen"
            value={formatCurrency(btwTeVorderen, 'SRD')}
            subtitle="Voorbelasting"
            icon={AlertCircle}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cashflow Chart */}
          <Card className="bg-white border border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">Cashflow Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => formatNumber(value, 0)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingBottom: 10 }}
                      />
                      <Bar 
                        dataKey="Omzet" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="Kosten" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ouderdomsanalyse Debiteuren */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">Ouderdomsanalyse Debiteuren</CardTitle>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <OuderdomItem 
                    label="0-30 dagen" 
                    amount={formatCurrency(ouderdomData.find(d => d.periode === '0-30')?.bedrag || 0, 'SRD')}
                    percentage={ouderdomTotaal > 0 ? Math.round(((ouderdomData.find(d => d.periode === '0-30')?.bedrag || 0) / ouderdomTotaal) * 100) : 0}
                    color="bg-emerald-500"
                  />
                  <OuderdomItem 
                    label="31-60 dagen" 
                    amount={formatCurrency(ouderdomData.find(d => d.periode === '31-60')?.bedrag || 0, 'SRD')}
                    percentage={ouderdomTotaal > 0 ? Math.round(((ouderdomData.find(d => d.periode === '31-60')?.bedrag || 0) / ouderdomTotaal) * 100) : 0}
                    color="bg-amber-500"
                  />
                  <OuderdomItem 
                    label="61-90 dagen" 
                    amount={formatCurrency(ouderdomData.find(d => d.periode === '61-90')?.bedrag || 0, 'SRD')}
                    percentage={ouderdomTotaal > 0 ? Math.round(((ouderdomData.find(d => d.periode === '61-90')?.bedrag || 0) / ouderdomTotaal) * 100) : 0}
                    color="bg-orange-500"
                  />
                  <OuderdomItem 
                    label=">90 dagen" 
                    amount={formatCurrency(ouderdomData.find(d => d.periode === '>90')?.bedrag || 0, 'SRD')}
                    percentage={ouderdomTotaal > 0 ? Math.round(((ouderdomData.find(d => d.periode === '>90')?.bedrag || 0) / ouderdomTotaal) * 100) : 0}
                    color="bg-red-500"
                  />
                  
                  <div className="border-t border-slate-200 mt-4 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Totaal Openstaand</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(debiteuren, 'SRD')}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
