import React, { useState, useEffect } from 'react';
import { dashboardAPI, exchangeRatesAPI } from '../lib/api';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
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
  Calculator
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

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

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, ratesRes] = await Promise.all([
          dashboardAPI.getSummary(),
          exchangeRatesAPI.getLatest()
        ]);
        setSummary(summaryRes.data);
        setRates(ratesRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock chart data
  const cashflowData = [
    { month: 'Jan', inkomsten: 45000, uitgaven: 32000 },
    { month: 'Feb', inkomsten: 52000, uitgaven: 38000 },
    { month: 'Mrt', inkomsten: 48000, uitgaven: 35000 },
    { month: 'Apr', inkomsten: 61000, uitgaven: 42000 },
    { month: 'Mei', inkomsten: 55000, uitgaven: 39000 },
    { month: 'Jun', inkomsten: 67000, uitgaven: 45000 },
  ];

  const agingData = [
    { name: 'Huidig', value: 25000 },
    { name: '30 dagen', value: 15000 },
    { name: '60 dagen', value: 8000 },
    { name: '90 dagen', value: 5000 },
    { name: '90+ dagen', value: 2000 },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welkom terug! Hier is uw financiële overzicht.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {rates?.USD && (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">USD/SRD:</span>
              <span className="font-mono font-medium text-slate-900 ml-2">
                {formatNumber(rates.USD.rate, 2)}
              </span>
            </div>
          )}
          {rates?.EUR && (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-slate-500">EUR/SRD:</span>
              <span className="font-mono font-medium text-slate-900 ml-2">
                {formatNumber(rates.EUR.rate, 2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Omzet"
          value={formatCurrency(summary?.revenue || 0)}
          subtitle="Deze periode"
          icon={TrendingUp}
          trend="up"
          trendValue="+12%"
          loading={loading}
          color="green"
        />
        <MetricCard
          title="Kosten"
          value={formatCurrency(summary?.expenses || 0)}
          subtitle="Deze periode"
          icon={TrendingDown}
          loading={loading}
          color="red"
        />
        <MetricCard
          title="Winst"
          value={formatCurrency(summary?.profit || 0)}
          subtitle="Netto resultaat"
          icon={Wallet}
          trend={summary?.profit > 0 ? "up" : "down"}
          trendValue={summary?.profit > 0 ? "Positief" : "Negatief"}
          loading={loading}
          color={summary?.profit > 0 ? "green" : "red"}
        />
        <MetricCard
          title="Openstaande Facturen"
          value={summary?.open_invoices || 0}
          subtitle={`${summary?.overdue_invoices || 0} vervallen`}
          icon={Receipt}
          loading={loading}
          color={summary?.overdue_invoices > 0 ? "amber" : "blue"}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Debiteuren"
          value={formatCurrency(summary?.outstanding_receivables || 0)}
          subtitle={`${summary?.customer_count || 0} klanten`}
          icon={Users}
          loading={loading}
          color="blue"
        />
        <MetricCard
          title="Crediteuren"
          value={formatCurrency(summary?.outstanding_payables || 0)}
          subtitle={`${summary?.supplier_count || 0} leveranciers`}
          icon={Truck}
          loading={loading}
          color="amber"
        />
        <MetricCard
          title="BTW te betalen"
          value={formatCurrency(summary?.btw_balance > 0 ? summary?.btw_balance : 0)}
          subtitle="Huidige periode"
          icon={Calculator}
          loading={loading}
          color={summary?.btw_balance > 0 ? "red" : "green"}
        />
        <MetricCard
          title="BTW te vorderen"
          value={formatCurrency(summary?.btw_balance < 0 ? Math.abs(summary?.btw_balance) : 0)}
          subtitle="Huidige periode"
          icon={Calculator}
          loading={loading}
          color="green"
        />
      </div>

      {/* Bank Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200" data-testid="bank-srd">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank SRD
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="font-mono text-2xl font-semibold text-slate-900">
                {formatCurrency(summary?.bank_balances?.SRD || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="bank-usd">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="font-mono text-2xl font-semibold text-slate-900">
                {formatCurrency(summary?.bank_balances?.USD || 0, 'USD')}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200" data-testid="bank-eur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bank EUR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="font-mono text-2xl font-semibold text-slate-900">
                {formatCurrency(summary?.bank_balances?.EUR || 0, 'EUR')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Chart */}
        <Card className="border-slate-200" data-testid="cashflow-chart">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Cashflow Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="inkomsten" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e' }}
                    name="Inkomsten"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uitgaven" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                    name="Uitgaven"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Aging Chart */}
        <Card className="border-slate-200" data-testid="aging-chart">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Ouderdomsanalyse Debiteuren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bedrag" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {summary?.overdue_invoices > 0 && (
        <Card className="border-amber-200 bg-amber-50" data-testid="overdue-alert">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  U heeft {summary.overdue_invoices} vervallen facturen
                </p>
                <p className="text-sm text-amber-600">
                  Bekijk uw debiteuren voor meer details.
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
