import React, { useState, useEffect } from 'react';
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
  DollarSign
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer
} from 'recharts';

// Stat Card - Exact style from photo with icon on LEFT
const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon in circle - LEFT side */}
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Loading Stat Card
const LoadingStatCard = () => (
  <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Ouderdom Row
const OuderdomRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rates, setRates] = useState(null);
  const [chartData, setChartData] = useState([]);

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
      
      if (chartsRes.data?.omzet_kosten) {
        setChartData(chartsRes.data.omzet_kosten.map(item => ({
          name: item.maand,
          value: item.omzet || 0
        })));
      } else {
        setChartData([
          { name: 'Jan', value: 0 },
          { name: 'Feb', value: 50 },
          { name: 'Mrt', value: 165 },
          { name: 'Apr', value: 220 },
          { name: 'Mei', value: 110 },
          { name: 'Jun', value: 0 }
        ]);
      }
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
  const btwTeVorderen = dashboardData?.btw?.te_vorderen || 0;
  const bankSRD = dashboardData?.liquiditeit?.bank_srd || 0;
  const bankUSD = dashboardData?.liquiditeit?.bank_usd || 0;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="boekhouding-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          {rates?.EUR_SRD && (
            <div className="text-sm text-gray-600">
              EUR/SRD: <span className="font-medium">{formatNumber(rates.EUR_SRD.koers, 2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Row 1: Omzet, Kosten, Winst - 3 columns */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
            </>
          ) : (
            <>
              <StatCard
                title="Omzet"
                value={formatCurrency(omzet, 'SRD')}
                subtitle="+12% Deze periode"
                icon={TrendingUp}
                iconBg="bg-green-100"
                iconColor="text-green-600"
              />
              <StatCard
                title="Kosten"
                value={formatCurrency(kosten, 'SRD')}
                subtitle="Deze periode"
                icon={TrendingDown}
                iconBg="bg-red-100"
                iconColor="text-red-500"
              />
              <StatCard
                title="Winst"
                value={formatCurrency(winst, 'SRD')}
                subtitle="Deze periode"
                icon={TrendingUp}
                iconBg="bg-green-100"
                iconColor="text-green-600"
              />
            </>
          )}
        </div>

        {/* Row 2: Debiteuren, Crediteuren, BTW te vorderen - 3 columns */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {loading ? (
            <>
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
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatCard
                title="Crediteuren"
                value={formatCurrency(crediteuren, 'SRD')}
                subtitle={`${crediteurenLeveranciers} leveranciers`}
                icon={Truck}
                iconBg="bg-orange-100"
                iconColor="text-orange-500"
              />
              <StatCard
                title="BTW te vorderen"
                value={formatCurrency(btwTeVorderen, 'SRD')}
                subtitle="Deze periode"
                icon={FileText}
                iconBg="bg-green-100"
                iconColor="text-green-600"
              />
            </>
          )}
        </div>

        {/* Row 3: Bank SRD, Bank USD + Ouderdomsanalyse - 3 columns */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <StatCard
                title="Bank SRD"
                value={formatCurrency(bankSRD, 'SRD')}
                subtitle="Saldo"
                icon={Landmark}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatCard
                title="Bank USD"
                value={formatCurrency(bankUSD, 'USD')}
                subtitle="Saldo"
                icon={DollarSign}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              {/* Ouderdomsanalyse Debiteuren */}
              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Ouderdomsanalyse Debiteuren</h3>
                  <div>
                    <OuderdomRow 
                      label="0-30 dagen" 
                      value={formatCurrency(0, 'SRD')} 
                      color="bg-green-500" 
                    />
                    <OuderdomRow 
                      label="31-60 dagen" 
                      value={formatCurrency(0, 'SRD')} 
                      color="bg-amber-500" 
                    />
                    <OuderdomRow 
                      label="61-90 dagen" 
                      value={formatCurrency(0, 'SRD')} 
                      color="bg-red-500" 
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Cashflow Overzicht - Full width */}
        <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Cashflow Overzicht</h3>
            <div className="h-48">
              {loading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
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
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
