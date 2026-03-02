import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Filter,
  ArrowUpDown,
  RefreshCw,
  MoreVertical,
  Calendar,
  Download,
  Maximize2,
  Settings,
  Bell,
  Search
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
  Tooltip,
  Legend,
  ComposedChart,
  Area
} from 'recharts';

// KPI Card - Exact match to reference design
const KPICard = ({ title, value, vsLY, vsBudget, currency = '', suffix = '' }) => {
  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(3).replace('.', '.')}`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(0)}`;
      }
      return val.toString();
    }
    return val;
  };

  return (
    <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</span>
          <span className="text-xs text-gray-400 font-medium">YTD</span>
        </div>
        
        {/* Main Value */}
        <div className="mb-4">
          <span className="text-3xl font-bold text-[#0ea5e9]">
            {formatValue(value)}{suffix}
          </span>
          {currency && <span className="text-lg font-medium text-[#0ea5e9] ml-1">{currency}</span>}
        </div>
        
        {/* VS LY and VS BUDGET */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">VS LY</p>
            <p className={`text-sm font-bold ${vsLY >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {vsLY >= 0 ? '+' : ''}{vsLY}%
            </p>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">VS BUDGET</p>
            <p className={`text-sm font-bold ${vsBudget >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {vsBudget >= 0 ? '+' : ''}{vsBudget}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Loading Card
const LoadingKPICard = () => (
  <Card className="bg-white border border-gray-100 rounded-xl shadow-sm">
    <CardContent className="p-5">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-10 w-32 mb-4" />
      <div className="flex gap-4 pt-3 border-t border-gray-100">
        <div className="flex-1">
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Chart Header with controls
const ChartHeader = ({ title, showDropdown = false, dropdownValue, onDropdownChange }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {showDropdown && (
        <Select value={dropdownValue} onValueChange={onDropdownChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full_year">Accounting full year</SelectItem>
            <SelectItem value="q1">Q1 2024</SelectItem>
            <SelectItem value="q2">Q2 2024</SelectItem>
            <SelectItem value="q3">Q3 2024</SelectItem>
            <SelectItem value="q4">Q4 2024</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
        <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
        <Download className="w-3.5 h-3.5 text-gray-400" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
        <Settings className="w-3.5 h-3.5 text-gray-400" />
      </Button>
    </div>
  </div>
);

// Custom Legend
const CustomLegend = ({ items }) => (
  <div className="flex items-center justify-end gap-4 mb-4">
    {items.map((item, index) => (
      <div key={index} className="flex items-center gap-2">
        <div 
          className={`w-3 h-3 rounded-sm`} 
          style={{ backgroundColor: item.color }}
        />
        <span className="text-xs text-gray-500">{item.label}</span>
      </div>
    ))}
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rates, setRates] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('full_year');
  const [dateRange, setDateRange] = useState('Sep.10 2024 - Dec 16 2024');

  // Chart data
  const [ebitdaData, setEbitdaData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [cashflowData, setCashflowData] = useState([]);

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
      
      // EBITDA & Gross Margin Forecasts data
      setEbitdaData([
        { month: 'JAN 2024', revenue: 8000000, ebitda: 4000000, ebitdaCum: 4000000, margin: 48 },
        { month: 'FEB 2024', revenue: 5000000, ebitda: 3000000, ebitdaCum: 7000000, margin: 47 },
        { month: 'MAR 2024', revenue: 6000000, ebitda: 4500000, ebitdaCum: 11500000, margin: 48 },
        { month: 'APR 2024', revenue: 18000000, ebitda: 12000000, ebitdaCum: 23500000, margin: 65 },
        { month: 'MAY 2024', revenue: 22000000, ebitda: 15000000, ebitdaCum: 38500000, margin: 68 },
        { month: 'JUN 2024', revenue: 35000000, ebitda: 25000000, ebitdaCum: 63500000, margin: 72 },
        { month: 'JUL 2024', revenue: 18000000, ebitda: 12000000, ebitdaCum: 75500000, margin: 65 },
        { month: 'AUG 2024', revenue: 48000000, ebitda: 35000000, ebitdaCum: 110500000, margin: 75 },
        { month: 'SEP 2024', revenue: 55000000, ebitda: 40000000, ebitdaCum: 150500000, margin: 78 },
        { month: 'OCT 2024', revenue: 45000000, ebitda: 32000000, ebitdaCum: 182500000, margin: 72 }
      ]);

      // Forecast Financial Performance data
      setForecastData([
        { month: 'Jan', cy: 95000000, forecast: 100000000, budget: 85000000, y1: 65000000 },
        { month: 'Feb', cy: 65000000, forecast: 70000000, budget: 50000000, y1: 55000000 },
        { month: 'Mar', cy: 50000000, forecast: 55000000, budget: 45000000, y1: 48000000 },
        { month: 'Apr', cy: 35000000, forecast: 40000000, budget: 30000000, y1: 32000000 },
        { month: 'May', cy: 25000000, forecast: 28000000, budget: 22000000, y1: 20000000 }
      ]);

      // Cashflow data
      setCashflowData([
        { month: 'Jan', collection: 95000000, balance: 100000000, trend: 98 },
        { month: 'Feb', collection: 85000000, balance: 90000000, trend: 92 },
        { month: 'Mar', collection: 100000000, balance: 105000000, trend: 102 },
        { month: 'Apr', collection: 80000000, balance: 85000000, trend: 88 },
        { month: 'May', collection: 70000000, balance: 75000000, trend: 78 },
        { month: 'Jun', collection: 95000000, balance: 100000000, trend: 95 },
        { month: 'Jul', collection: 110000000, balance: 115000000, trend: 108 },
        { month: 'Aug', collection: 105000000, balance: 110000000, trend: 105 },
        { month: 'Sep', collection: 90000000, balance: 95000000, trend: 92 },
        { month: 'Oct', collection: 115000000, balance: 120000000, trend: 112 }
      ]);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract values for KPI cards
  const omzet = dashboardData?.omzet?.deze_maand || 1459000;
  const kosten = dashboardData?.kosten?.deze_maand || 0;
  const winst = dashboardData?.winst?.deze_maand || (omzet - kosten);
  const ebitdaPercent = 26;
  const grossMargin = 78;
  const fixedCosts = dashboardData?.kosten?.vast || 2882000;

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="boekhouding-dashboard">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left - Title */}
          <h1 className="text-xl font-semibold text-gray-800">Trend & Forecast</h1>
          
          {/* Right - User controls */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Bell className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Search className="w-5 h-5 text-gray-500" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-[#0ea5e9] flex items-center justify-center">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left filters */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 text-xs text-gray-600">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filter tasks
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-gray-600">
              <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
              Sort tasks
            </Button>
            <span className="text-sm text-gray-500 ml-2">Ma 12:45 | 2024</span>
          </div>
          
          {/* Right controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 text-xs text-gray-600">
              <Calendar className="w-3.5 h-3.5 mr-2" />
              {dateRange}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-gray-600">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {loading ? (
            <>
              <LoadingKPICard />
              <LoadingKPICard />
              <LoadingKPICard />
              <LoadingKPICard />
              <LoadingKPICard />
            </>
          ) : (
            <>
              <KPICard
                title="EBITDA"
                value="1.459.000"
                currency="€"
                vsLY={109}
                vsBudget={22}
              />
              <KPICard
                title="EBITDA%"
                value={ebitdaPercent}
                suffix="%"
                vsLY={58}
                vsBudget={37}
              />
              <KPICard
                title="GROSS MARGIN"
                value={grossMargin}
                suffix="%"
                vsLY={96}
                vsBudget={82}
              />
              <KPICard
                title="GROSS MARGIN%"
                value={grossMargin}
                suffix="%"
                vsLY={96}
                vsBudget={82}
              />
              <KPICard
                title="FIXED COSTS"
                value="2.882.000"
                currency="€"
                vsLY={269}
                vsBudget={119}
              />
            </>
          )}
        </div>

        {/* Main Chart - EBITDA & Gross Margin Forecasts */}
        <Card className="bg-white border border-gray-100 rounded-xl shadow-sm mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">EBITDA & Gross Margin Forcasts</h3>
              <CustomLegend items={[
                { color: '#1e3a5f', label: 'REVENUE' },
                { color: '#0ea5e9', label: 'EBITDA' },
                { color: '#64748b', label: 'EBITDA CUMULATED' },
                { color: '#1e293b', label: 'GROSS MARGIN PERCENTAGE' }
              ]} />
            </div>
            <div className="h-72">
              {loading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ebitdaData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'margin') return [`${value}%`, 'Gross Margin'];
                        return [`€${(value/1000000).toFixed(1)}M`, name];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="revenue" 
                      fill="#1e3a5f" 
                      radius={[2, 2, 0, 0]}
                      barSize={20}
                      name="Revenue"
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="ebitda" 
                      fill="#0ea5e9" 
                      radius={[2, 2, 0, 0]}
                      barSize={20}
                      name="EBITDA"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="margin" 
                      stroke="#1e293b" 
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 2, stroke: '#0ea5e9' }}
                      name="margin"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Forecast Financial Performance */}
          <Card className="bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <ChartHeader 
                title="Forcast Financial Performance" 
                showDropdown={true}
                dropdownValue={selectedPeriod}
                onDropdownChange={setSelectedPeriod}
              />
              <CustomLegend items={[
                { color: '#1e3a5f', label: 'CY' },
                { color: '#0ea5e9', label: 'PREVIOUS FORCAST' },
                { color: '#94a3b8', label: 'BUDGET' },
                { color: '#cbd5e1', label: 'Y-1' }
              ]} />
              <div className="h-56">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        formatter={(value) => [`€${(value/1000000).toFixed(1)}M`]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <Bar dataKey="cy" fill="#1e3a5f" radius={[2, 2, 0, 0]} barSize={14} />
                      <Bar dataKey="forecast" fill="#0ea5e9" radius={[2, 2, 0, 0]} barSize={14} />
                      <Bar dataKey="budget" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={14} />
                      <Bar dataKey="y1" fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cashflow */}
          <Card className="bg-white border border-gray-100 rounded-xl shadow-sm">
            <CardContent className="p-5">
              <ChartHeader title="Cashflow" />
              <CustomLegend items={[
                { color: '#0ea5e9', label: 'CLIENT COLLECTION' },
                { color: '#1e293b', label: 'CASH BALANCE' }
              ]} />
              <div className="h-56">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'trend') return [`${value}`, 'Trend'];
                          return [`€${(value/1000000).toFixed(1)}M`, name];
                        }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <Bar 
                        dataKey="collection" 
                        fill="#0ea5e9" 
                        radius={[2, 2, 0, 0]}
                        barSize={24}
                        name="Client Collection"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="trend" 
                        stroke="#1e293b" 
                        strokeWidth={2}
                        dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 2, stroke: '#0ea5e9' }}
                        name="trend"
                      />
                    </ComposedChart>
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
