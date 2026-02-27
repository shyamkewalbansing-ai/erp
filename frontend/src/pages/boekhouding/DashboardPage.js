import React, { useState, useEffect } from 'react';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  Calculator,
  RefreshCw,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Metric Card component matching reference design
const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, loading, iconBg = "bg-blue-50", iconColor = "text-blue-500" }) => {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200" data-testid={`metric-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} />
          </div>
        </div>
        <div className="font-mono text-2xl font-semibold text-slate-900 mb-1">
          {value}
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue}
            </span>
          )}
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Small stat card for the second row
const SmallStatCard = ({ title, value, icon: Icon, iconBg = "bg-blue-50", iconColor = "text-blue-500", subtitle, loading }) => {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
            <p className="font-mono text-xl font-semibold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Bank card component
const BankCard = ({ title, currency, value, loading }) => {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    );
  }

  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'SRD';
  const formattedValue = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
        <p className="font-mono text-xl font-semibold text-slate-900">
          {symbol === 'SRD' ? `SRD ${formattedValue}` : `${symbol} ${formattedValue}`}
        </p>
      </CardContent>
    </Card>
  );
};

const COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#dc2626'];

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [rates, setRates] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [summaryRes, ratesRes] = await Promise.all([
        axios.get(`${API_URL}/api/boekhouding/dashboard`, { headers }),
        axios.get(`${API_URL}/api/boekhouding/wisselkoersen/latest`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setRates(ratesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      setChartsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`${API_URL}/api/boekhouding/dashboard/charts`, { headers });
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchChartData();
  }, []);

  // Format number with Dutch locale (1.925,00)
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const omzet = summary?.omzet?.deze_maand || 0;
  const kosten = summary?.kosten?.deze_maand || 0;
  const winst = summary?.winst?.deze_maand || 0;
  const debiteuren = summary?.openstaand?.debiteuren || 0;
  const crediteuren = summary?.openstaand?.crediteuren || 0;
  const btwBetalen = summary?.btw?.te_betalen || 0;
  const btwVorderen = summary?.btw?.te_vorderen || 0;
  const openstaandeFacturen = summary?.openstaande_facturen || 0;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welkom terug! Hier is uw financiële overzicht.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {rates?.EUR_SRD && (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">EUR/SRD:</span>
              <span className="font-mono font-medium text-slate-900 ml-2">
                {formatNumber(rates.EUR_SRD.koers, 2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Omzet"
          value={formatAmount(omzet)}
          subtitle="Deze periode"
          icon={TrendingUp}
          trend={omzet > 0 ? "up" : null}
          trendValue={omzet > 0 ? "+12%" : ""}
          loading={loading}
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
        <MetricCard
          title="Kosten"
          value={formatAmount(kosten)}
          subtitle="Deze periode"
          icon={TrendingDown}
          loading={loading}
          iconBg="bg-red-50"
          iconColor="text-red-400"
        />
        <MetricCard
          title="Winst"
          value={formatAmount(winst)}
          subtitle="Netto resultaat"
          icon={Wallet}
          trend={winst > 0 ? "up" : winst < 0 ? "down" : null}
          trendValue={winst < 0 ? "Negatief" : ""}
          loading={loading}
          iconBg={winst >= 0 ? "bg-green-50" : "bg-red-50"}
          iconColor={winst >= 0 ? "text-green-500" : "text-red-400"}
        />
        <MetricCard
          title="Openstaande Facturen"
          value={openstaandeFacturen.toString()}
          subtitle={`${summary?.vervallen_facturen || 0} vervallen`}
          icon={FileText}
          loading={loading}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
      </div>

      {/* Second Row - Debiteuren, Crediteuren, BTW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SmallStatCard
          title="Debiteuren"
          value={formatAmount(debiteuren)}
          subtitle={`${summary?.aantal_debiteuren || 0} klanten`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <SmallStatCard
          title="Crediteuren"
          value={formatAmount(crediteuren)}
          subtitle={`${summary?.aantal_crediteuren || 0} leveranciers`}
          icon={Truck}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          loading={loading}
        />
        <SmallStatCard
          title="BTW te betalen"
          value={formatAmount(btwBetalen)}
          subtitle="Huidige periode"
          icon={Calculator}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          loading={loading}
        />
        <SmallStatCard
          title="BTW te vorderen"
          value={formatAmount(btwVorderen)}
          subtitle="Huidige periode"
          icon={Calculator}
          iconBg="bg-teal-50"
          iconColor="text-teal-500"
          loading={loading}
        />
      </div>

      {/* Third Row - Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BankCard
          title="Bank SRD"
          currency="SRD"
          value={summary?.liquiditeit?.bank_srd || 0}
          loading={loading}
        />
        <BankCard
          title="Bank USD"
          currency="USD"
          value={summary?.liquiditeit?.bank_usd || 0}
          loading={loading}
        />
        <BankCard
          title="Bank EUR"
          currency="EUR"
          value={summary?.liquiditeit?.bank_eur || 0}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Chart */}
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Cashflow Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {chartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData?.cashflow || []}>
                    <defs>
                      <linearGradient id="colorInkomsten" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="maand" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                      formatter={(value) => formatAmount(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inkomsten" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorInkomsten)" 
                      dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ouderdom Debiteuren Chart */}
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Ouderdomsanalyse Debiteuren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {chartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.ouderdom || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => formatAmount(value)}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {debiteuren > 10000 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  Openstaande debiteuren: {formatAmount(debiteuren)}
                </p>
                <p className="text-sm text-amber-600">
                  Bekijk uw debiteuren en stuur herinneringen indien nodig.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
