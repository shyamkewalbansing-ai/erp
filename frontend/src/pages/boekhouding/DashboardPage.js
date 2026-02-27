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
  RefreshCw
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

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, loading, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    blue: "bg-blue-100 text-blue-600"
  };

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
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
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

const COLORS = ['#22c55e', '#f59e0b', '#f97316', '#dc2626'];

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

  const omzet = summary?.omzet?.deze_maand || 0;
  const kosten = summary?.kosten?.deze_maand || 0;
  const winst = summary?.winst?.deze_maand || 0;
  const debiteuren = summary?.openstaand?.debiteuren || 0;
  const crediteuren = summary?.openstaand?.crediteuren || 0;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welkom terug! Hier is uw financiële overzicht.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchChartData(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <div className="flex items-center gap-2 text-sm">
            {rates?.USD_SRD && (
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-slate-500">USD:</span>
                <span className="font-mono font-medium text-slate-900 ml-1">
                  {formatNumber(rates.USD_SRD.koers, 2)}
                </span>
              </div>
            )}
            {rates?.EUR_SRD && (
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-slate-500">EUR:</span>
                <span className="font-mono font-medium text-slate-900 ml-1">
                  {formatNumber(rates.EUR_SRD.koers, 2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Omzet"
          value={formatCurrency(omzet)}
          subtitle="Deze maand"
          icon={TrendingUp}
          trend={omzet > 0 ? "up" : null}
          trendValue={omzet > 0 ? "Actief" : ""}
          loading={loading}
          color="green"
        />
        <MetricCard
          title="Kosten"
          value={formatCurrency(kosten)}
          subtitle="Deze maand"
          icon={TrendingDown}
          loading={loading}
          color="red"
        />
        <MetricCard
          title="Winst"
          value={formatCurrency(winst)}
          subtitle="Netto resultaat"
          icon={Wallet}
          trend={winst > 0 ? "up" : winst < 0 ? "down" : null}
          trendValue={winst > 0 ? "Positief" : winst < 0 ? "Negatief" : ""}
          loading={loading}
          color={winst >= 0 ? "green" : "red"}
        />
        <MetricCard
          title="Debiteuren"
          value={formatCurrency(debiteuren)}
          subtitle="Openstaand"
          icon={Users}
          loading={loading}
          color="blue"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Crediteuren"
          value={formatCurrency(crediteuren)}
          subtitle="Te betalen"
          icon={Truck}
          loading={loading}
          color="amber"
        />
        <Card className="border-slate-200" data-testid="bank-srd">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Bank SRD</span>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="font-mono text-2xl font-semibold text-slate-900">
                {formatCurrency(summary?.liquiditeit?.bank_srd || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="bank-foreign">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Bank USD / EUR</span>
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-slate-500">USD</span>
                  <div className="font-mono text-lg font-semibold text-slate-900">
                    $ {formatNumber(summary?.liquiditeit?.bank_usd || 0, 2)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">EUR</span>
                  <div className="font-mono text-lg font-semibold text-slate-900">
                    € {formatNumber(summary?.liquiditeit?.bank_eur || 0, 2)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Omzet & Kosten + Cashflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Omzet vs Kosten Chart */}
        <Card className="border-slate-200" data-testid="revenue-expense-chart">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Omzet vs Kosten per Maand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.omzet_kosten || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="omzet" fill="#22c55e" radius={[4, 4, 0, 0]} name="Omzet" />
                    <Bar dataKey="kosten" fill="#ef4444" radius={[4, 4, 0, 0]} name="Kosten" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cashflow Area Chart */}
        <Card className="border-slate-200" data-testid="cashflow-chart">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Cashflow Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData?.cashflow || []}>
                    <defs>
                      <linearGradient id="colorInkomsten" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUitgaven" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="inkomsten" stroke="#22c55e" fillOpacity={1} fill="url(#colorInkomsten)" name="Inkomsten" />
                    <Area type="monotone" dataKey="uitgaven" stroke="#ef4444" fillOpacity={1} fill="url(#colorUitgaven)" name="Uitgaven" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Ouderdom Donut + Top Klanten */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ouderdom Donut Chart */}
        <Card className="border-slate-200" data-testid="aging-chart">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Ouderdomsanalyse Debiteuren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData?.ouderdom || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => value > 0 ? `${name}` : ''}
                    >
                      {(chartData?.ouderdom || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Klanten */}
        <Card className="border-slate-200" data-testid="top-customers">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Top 5 Klanten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : chartData?.top_klanten?.length > 0 ? (
                chartData.top_klanten.map((klant, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{klant.naam}</p>
                        <p className="text-xs text-slate-500">{klant.facturen} facturen</p>
                      </div>
                    </div>
                    <div className="font-mono font-medium text-slate-900">
                      {formatCurrency(klant.omzet)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Nog geen klantgegevens beschikbaar
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {debiteuren > 10000 && (
        <Card className="border-amber-200 bg-amber-50" data-testid="receivables-alert">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  Openstaande debiteuren: {formatCurrency(debiteuren)}
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
