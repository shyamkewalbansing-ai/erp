import React, { useState, useEffect } from 'react';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Send,
  Download,
  History,
  Clock,
  ChevronDown,
  Filter,
  MoreVertical,
  Wifi
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Stat Card Component (Total Income, Expense, Savings style)
const StatCard = ({ title, value, trend, trendValue, icon: Icon, loading, variant = 'default' }) => {
  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = trend === 'up';

  return (
    <Card className={`border-0 shadow-sm rounded-2xl ${variant === 'savings' ? 'bg-emerald-50' : 'bg-white'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-slate-500 font-medium">{title}</span>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'expense' ? 'bg-slate-100' : 
              variant === 'savings' ? 'bg-emerald-100' : 
              'bg-emerald-50'
            }`}>
              <Icon className={`w-5 h-5 ${
                variant === 'expense' ? 'text-slate-600' : 'text-emerald-600'
              }`} />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Since Last Week</span>
          <span className={`flex items-center text-sm font-medium px-2 py-0.5 rounded ${
            isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {trendValue}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Credit Card Component
const CreditCardDisplay = ({ name, balance, expiry, cvv }) => (
  <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-2xl p-5 text-white relative overflow-hidden">
    {/* Wifi icon */}
    <div className="absolute top-4 right-4">
      <Wifi className="w-6 h-6 rotate-90 opacity-80" />
    </div>
    
    {/* Card chip pattern */}
    <div className="flex gap-1 mb-8">
      <div className="w-8 h-6 bg-yellow-300/80 rounded-sm" />
    </div>
    
    <div className="mb-6">
      <div className="text-emerald-100 text-xs mb-1">Card Holder</div>
      <div className="text-xl font-semibold">{name}</div>
    </div>
    
    <div className="flex items-end justify-between">
      <div>
        <div className="text-emerald-100 text-xs mb-1">Balance Amount</div>
        <div className="text-2xl font-bold">{balance}</div>
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <div className="text-emerald-100 text-xs">EXP</div>
          <div className="font-medium">{expiry}</div>
        </div>
        <div>
          <div className="text-emerald-100 text-xs">CVV</div>
          <div className="font-medium">{cvv}</div>
        </div>
      </div>
    </div>
  </div>
);

// Quick Action Button
const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-3 hover:bg-slate-50 rounded-xl transition-colors"
  >
    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
      <Icon className="w-5 h-5 text-slate-600" />
    </div>
    <span className="text-xs text-slate-600 font-medium">{label}</span>
  </button>
);

// Activity Item
const ActivityItem = ({ name, action, time, avatar }) => (
  <div className="flex items-center gap-3 py-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
      {avatar || name?.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-900">{name}</div>
      <div className="text-xs text-slate-500 truncate">{action}</div>
    </div>
    <div className="text-xs text-slate-400">{time}</div>
  </div>
);

// Transaction Row
const TransactionRow = ({ name, category, date, time, amount, note, status }) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50">
    <td className="py-4 px-4">
      <div className="font-medium text-slate-900">{name}</div>
      <div className="text-xs text-slate-500">{category}</div>
    </td>
    <td className="py-4 px-4 text-sm text-slate-600">
      <div>{date}</div>
      <div className="text-xs text-slate-400">{time}</div>
    </td>
    <td className="py-4 px-4 text-sm font-medium text-slate-900">{amount}</td>
    <td className="py-4 px-4 text-sm text-slate-500">{note}</td>
    <td className="py-4 px-4">
      {status === 'failed' ? (
        <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-full">Failed</span>
      ) : status === 'pending' ? (
        <span className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full">Pending</span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full">Success</span>
      )}
    </td>
  </tr>
);

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
        <p className="font-medium mb-1">{label} 2029</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm">
            {entry.name}: ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rates, setRates] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topKlanten, setTopKlanten] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, ratesRes, chartsRes] = await Promise.all([
        dashboardAPI.getSummary().catch(() => ({ data: {} })),
        exchangeRatesAPI.getLatest().catch(() => ({ data: {} })),
        dashboardAPI.getChartData().catch(() => ({ data: {} }))
      ]);

      setDashboardData(dashRes.data || {});
      setRates(ratesRes.data || {});
      
      // Process chart data from backend
      if (chartsRes.data?.omzet_kosten) {
        const formattedChartData = chartsRes.data.omzet_kosten.map(item => ({
          name: item.maand,
          Income: item.omzet || 0,
          Expense: item.kosten || 0
        }));
        setChartData(formattedChartData);
      }
      
      // Top customers
      if (chartsRes.data?.top_klanten) {
        setTopKlanten(chartsRes.data.top_klanten);
      }

      // Fetch recent transactions
      try {
        const transRes = await fetch(`${API_URL}/api/boekhouding/verkopen?limit=5`, { headers });
        if (transRes.ok) {
          const transData = await transRes.json();
          setTransactions(transData.slice(0, 5));
        }
      } catch (e) {
        console.error('Error fetching transactions:', e);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from dashboard data
  const totalIncome = dashboardData?.omzet?.deze_maand || 0;
  const totalExpense = dashboardData?.kosten?.deze_maand || 0;
  const totalSavings = dashboardData?.winst?.deze_maand || (totalIncome - totalExpense);
  const openstaandDebiteuren = dashboardData?.openstaand?.debiteuren || 0;
  const kasBalance = dashboardData?.liquiditeit?.bank_srd || 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            {rates?.USD_SRD && (
              <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-slate-500">USD/SRD:</span>
                <span className="font-medium text-slate-900 ml-1">{formatNumber(rates.USD_SRD.koers, 2)}</span>
              </div>
            )}
            {rates?.EUR_SRD && (
              <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-slate-500">EUR/SRD:</span>
                <span className="font-medium text-slate-900 ml-1">{formatNumber(rates.EUR_SRD.koers, 2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6">
              <StatCard
                title="Total Income"
                value={formatCurrency(totalIncome, 'SRD')}
                trend="up"
                trendValue="+1.78%"
                icon={TrendingUp}
                loading={loading}
              />
              <StatCard
                title="Total Expense"
                value={formatCurrency(totalExpense, 'SRD')}
                trend="up"
                trendValue="+1.78%"
                icon={TrendingDown}
                loading={loading}
                variant="expense"
              />
              <StatCard
                title="Total Savings"
                value={formatCurrency(totalSavings, 'SRD')}
                trend="up"
                trendValue="+1.78%"
                icon={PiggyBank}
                loading={loading}
                variant="savings"
              />
            </div>

            {/* Earning Section */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Omzet & Kosten Overzicht</div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-slate-900">
                        {formatCurrency(totalIncome, 'SRD')}
                      </span>
                      {totalIncome > 0 && (
                        <span className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          Omzet
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg">
                      Dit Jaar <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingBottom: 20 }}
                      />
                      <Bar 
                        dataKey="Income" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={35}
                      />
                      <Bar 
                        dataKey="Expense" 
                        fill="#fbbf24" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Status</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Transaction Name</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Note</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        [...Array(3)].map((_, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                            <td className="py-4 px-4"><Skeleton className="h-4 w-28" /></td>
                            <td className="py-4 px-4"><Skeleton className="h-4 w-16" /></td>
                          </tr>
                        ))
                      ) : transactions.length > 0 ? (
                        transactions.map((trans, index) => (
                          <TransactionRow
                            key={trans.id || index}
                            name={trans.klant_naam || trans.omschrijving || 'Verkoop'}
                            category={trans.betaalmethode === 'contant' ? 'Contant' : 'Pin'}
                            date={new Date(trans.datum || trans.created_at).toLocaleDateString('nl-NL')}
                            time={new Date(trans.datum || trans.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            amount={formatCurrency(trans.totaal || 0, 'SRD')}
                            note={trans.omschrijving || 'POS Verkoop'}
                            status={trans.status || 'success'}
                          />
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Geen recente transacties
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            {/* My Card Section */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">My Card</h3>
                  <Button variant="outline" size="sm" className="rounded-lg text-sm">
                    + Add Card
                  </Button>
                </div>

                <CreditCardDisplay
                  name="Kas Balans"
                  balance={formatCurrency(kasBalance, 'SRD')}
                  expiry=""
                  cvv=""
                />

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-2 mt-6">
                  <QuickActionButton icon={Wallet} label="POS" onClick={() => navigate('/app/boekhouding/pos')} />
                  <QuickActionButton icon={Send} label="Factuur" onClick={() => navigate('/app/boekhouding/verkoop')} />
                  <QuickActionButton icon={Download} label="Inkoop" onClick={() => navigate('/app/boekhouding/inkoop')} />
                  <QuickActionButton icon={History} label="Grootboek" onClick={() => navigate('/app/boekhouding/grootboek')} />
                </div>
              </CardContent>
            </Card>

            {/* Openstaand Debiteuren */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Openstaand Debiteuren</h3>
                  <button className="text-slate-400 hover:text-slate-600" onClick={() => navigate('/app/boekhouding/debiteuren')}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-sm text-slate-500 mb-2">
                  <span className="font-medium text-slate-900 text-lg">{formatCurrency(openstaandDebiteuren, 'SRD')}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {dashboardData?.openstaand?.facturen_count || 0} openstaande facturen
                </div>
              </CardContent>
            </Card>

            {/* Top Klanten */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Top Klanten</h3>
                
                <div className="text-xs font-medium text-slate-400 uppercase mb-2">Op basis van omzet</div>
                
                <div className="space-y-1">
                  {topKlanten.length > 0 ? (
                    topKlanten.slice(0, 5).map((klant, idx) => (
                      <ActivityItem
                        key={idx}
                        name={klant.naam || 'Onbekend'}
                        action={`${klant.facturen || 0} facturen`}
                        time={formatCurrency(klant.omzet || 0, 'SRD')}
                        avatar={klant.naam?.charAt(0) || '?'}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-slate-400 text-center py-4">
                      Nog geen klantdata
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
