import React, { useState, useEffect } from 'react';
import { dashboardAPI, exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ChevronDown,
  Wallet,
  Zap,
  BarChart3,
  ArrowRight,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// My Balance Card
const BalanceCard = ({ balance, earnedLastTime, bonus, loading }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-12 w-40 mb-4" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700">My Balance</span>
          <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            All time <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mb-4">
          <span className="text-sm text-slate-500">Total balance</span>
          <div className="text-4xl font-bold text-slate-900">
            {formatCurrency(balance, 'SRD')}<span className="text-2xl text-slate-400">.00</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Total earned last time</span>
            <span className="text-emerald-500 font-medium">+{formatCurrency(earnedLastTime, 'SRD')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Total bonus</span>
            <span className="text-emerald-500 font-medium">+{formatCurrency(bonus, 'SRD')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// My Income Card with mini chart
const IncomeCard = ({ totalIncome, salary, business, investment, loading }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-36 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Mini sparkline data
  const sparkData = [3, 5, 4, 6, 5, 7, 6, 8, 7, 6, 8, 9];

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">My Income</span>
          <span className="text-xs text-slate-400">July 2024</span>
        </div>
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-sm text-slate-500">Total Income</span>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalIncome, 'SRD')}<span className="text-xl text-slate-400">.00</span>
            </div>
          </div>
          
          {/* Mini Chart */}
          <div className="flex gap-0.5 items-end h-12">
            {sparkData.map((val, i) => (
              <div 
                key={i}
                className={`w-2 rounded-sm ${i >= 8 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                style={{ height: `${val * 5}px` }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Min</span>
            <span className="text-emerald-500">-2.4% APR</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Earned</span>
            <span className="text-emerald-500">+$458.00</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 mb-1">Salary</div>
            <div className="text-lg font-semibold text-slate-900">{formatNumber(salary / 1000, 1)}K</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Business</div>
            <div className="text-lg font-semibold text-slate-900">{formatNumber(business / 1000, 1)}K</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Investment</div>
            <div className="text-lg font-semibold text-slate-900">{formatNumber(investment / 1000, 1)}K</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Total Expense Card with progress
const ExpenseCard = ({ totalExpense, minApr, earned, goalPercent, loading }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-36 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Progress bar data (daily spending)
  const progressData = Array(20).fill(0).map(() => Math.random() * 100);

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">July 2024</span>
        </div>
        
        <div className="text-3xl font-bold text-slate-900 mb-4">
          {formatCurrency(totalExpense, 'SRD')}<span className="text-xl text-slate-400">.00</span>
        </div>
        <div className="text-sm text-slate-500 mb-4">Total expense</div>
        
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Min</span>
            <span className="text-emerald-500">{minApr}% APR</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Earned</span>
            <span className="text-emerald-500">+{formatCurrency(earned, 'SRD')}</span>
          </div>
        </div>
        
        {/* Progress scale */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        
        {/* Progress bars */}
        <div className="flex gap-0.5 h-16 items-end mb-2">
          {progressData.map((val, i) => (
            <div 
              key={i}
              className={`flex-1 rounded-sm ${val > 70 ? 'bg-emerald-500' : val > 40 ? 'bg-emerald-300' : 'bg-emerald-100'}`}
              style={{ height: `${Math.max(val, 20)}%` }}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">July 2024</span>
          <span className="flex items-center gap-1 text-emerald-500">
            With a goal of {goalPercent}% <Zap className="w-4 h-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Remaining Monthly Card
const RemainingMonthlyCard = ({ percentage, needs, food, education, loading }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700">Remaining Monthly</span>
          <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            Budget setting <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-start gap-6">
          {/* Big percentage */}
          <div>
            <div className="text-6xl font-bold text-slate-900">{percentage}<span className="text-3xl">%</span></div>
            <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
              <BarChart3 className="w-4 h-4" />
              Additional AVG <span className="text-emerald-500">2.4%</span>
            </div>
          </div>
          
          {/* Description */}
          <div className="text-sm text-slate-500 mt-2">
            You're in great shape—your monthly usage is still very safe
          </div>
        </div>
        
        {/* Category bars */}
        <div className="flex gap-2 mt-6">
          {/* Needs */}
          <div className="flex-1 bg-emerald-100 rounded-xl p-4 relative overflow-hidden" style={{ minHeight: '120px' }}>
            <div className="relative z-10">
              <div className="text-2xl font-bold text-emerald-800">{needs}%</div>
              <div className="text-sm text-emerald-700">Needs</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 text-xs text-emerald-600">
              ${(7890).toLocaleString()}
            </div>
          </div>
          
          {/* Food */}
          <div className="flex-1 bg-emerald-400 rounded-xl p-4 relative overflow-hidden" style={{ minHeight: '100px' }}>
            <div className="relative z-10">
              <div className="text-2xl font-bold text-white">{food}%</div>
              <div className="text-sm text-emerald-100">Food</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 text-xs text-emerald-200">
              ${(9500).toLocaleString()}
            </div>
          </div>
          
          {/* Education */}
          <div className="flex-1 bg-emerald-500 rounded-xl p-4 relative overflow-hidden" style={{ minHeight: '80px' }}>
            <div className="relative z-10">
              <div className="text-2xl font-bold text-white">{education}%</div>
              <div className="text-sm text-emerald-100">Education</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Transaction Row
const TransactionRow = ({ icon, name, date, type, amount, status }) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50">
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-medium text-slate-900">{name}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-sm text-slate-600">{date}</td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${
          type === 'Bank Transfer' ? 'bg-emerald-100' : 'bg-orange-100'
        }`}>
          <Wallet className={`w-3 h-3 ${type === 'Bank Transfer' ? 'text-emerald-600' : 'text-orange-600'}`} />
        </div>
        <span className="text-sm text-slate-600">{type}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-sm font-medium text-slate-900">{formatCurrency(amount, 'SRD')}</td>
    <td className="py-4 px-4">
      <span className={`text-sm font-medium ${
        status === 'Completed' ? 'text-emerald-500' : 
        status === 'Pending' ? 'text-amber-500' : 'text-red-500'
      }`}>
        {status}
      </span>
    </td>
    <td className="py-4 px-4">
      <button className="text-slate-400 hover:text-slate-600">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </td>
  </tr>
);

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
        <p className="font-medium mb-1">● Income</p>
        <p className="text-lg font-bold">${payload[0]?.value?.toLocaleString()}.00</p>
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, ratesRes] = await Promise.all([
        dashboardAPI.getSummary().catch(() => ({ data: {} })),
        exchangeRatesAPI.getLatest().catch(() => ({ data: {} }))
      ]);

      setDashboardData(dashRes.data || {});
      setRates(ratesRes.data || {});

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

  // Chart data for Money Flow
  const chartData = [
    { name: 'Jan', Income: 4000, Expense: 2000, Space: 1500 },
    { name: 'Feb', Income: 5500, Expense: 2800, Space: 2000 },
    { name: 'Mar', Income: 4800, Expense: 2400, Space: 1800 },
    { name: 'Apr', Income: 6000, Expense: 3200, Space: 2200 },
    { name: 'May', Income: 7500, Expense: 3800, Space: 2800 },
    { name: 'Jun', Income: 9560, Expense: 4500, Space: 3500 },
    { name: 'Jul', Income: 8200, Expense: 4000, Space: 3000 },
    { name: 'Aug', Income: 7800, Expense: 3600, Space: 2800 },
    { name: 'Sep', Income: 6500, Expense: 3000, Space: 2400 },
    { name: 'Oct', Income: 5800, Expense: 2600, Space: 2000 },
    { name: 'Nov', Income: 6200, Expense: 2800, Space: 2200 },
    { name: 'Dec', Income: 7000, Expense: 3200, Space: 2600 },
  ];

  // Calculate totals from dashboard data
  const totalBalance = dashboardData?.kas_saldo || 74503;
  const totalIncome = dashboardData?.totaal_verkoop || 101333;
  const totalExpense = dashboardData?.totaal_inkoop || 26830;

  return (
    <div className="min-h-screen bg-slate-50/30">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Keep Track, Assess, and Enhance Your Financial Performance</p>
          </div>
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

      <div className="p-6 space-y-6">
        {/* Top Row - 3 Cards */}
        <div className="grid grid-cols-3 gap-6">
          <BalanceCard
            balance={totalBalance}
            earnedLastTime={14503}
            bonus={700}
            loading={loading}
          />
          <IncomeCard
            totalIncome={totalIncome}
            salary={28300}
            business={38500}
            investment={34400}
            loading={loading}
          />
          <ExpenseCard
            totalExpense={totalExpense}
            minApr={7.4}
            earned={800}
            goalPercent={75}
            loading={loading}
          />
        </div>

        {/* Middle Row - Money Flow + Remaining Monthly */}
        <div className="grid grid-cols-3 gap-6">
          {/* Money Flow Chart - 2 columns */}
          <div className="col-span-2">
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-slate-700">Money Flow</span>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-slate-500">Income</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-300"></div>
                        <span className="text-slate-500">Expense</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-100"></div>
                        <span className="text-slate-500">Space</span>
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                    Monthly <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Stacked Bar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} barGap={0}>
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
                      <Bar 
                        dataKey="Space" 
                        stackId="a"
                        fill="#d1fae5" 
                        radius={[0, 0, 0, 0]} 
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="Expense" 
                        stackId="a"
                        fill="#6ee7b7" 
                        radius={[0, 0, 0, 0]} 
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="Income" 
                        stackId="a"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={40}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Remaining Monthly - 1 column */}
          <RemainingMonthlyCard
            percentage={69}
            needs={89}
            food={78}
            education={42}
            loading={loading}
          />
        </div>

        {/* Transaction History */}
        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
              <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                All Transaction <ChevronDown className="w-4 h-4" />
                <Filter className="w-4 h-4 ml-2" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name ↕</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date ↕</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Transaction ↕</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Amount ↕</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status ↕</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-36" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-8" /></td>
                      </tr>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((trans, index) => (
                      <TransactionRow
                        key={trans.id || index}
                        icon={<div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">▶</div>}
                        name={trans.klant_naam || trans.omschrijving || 'POS Verkoop'}
                        date={`${new Date(trans.datum || trans.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${new Date(trans.datum || trans.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                        type={trans.betaalmethode === 'contant' ? 'Cash' : 'Bank Transfer'}
                        amount={trans.totaal || 0}
                        status={trans.status === 'pending' ? 'Pending' : 'Completed'}
                      />
                    ))
                  ) : (
                    <>
                      <TransactionRow
                        icon={<div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">▶</div>}
                        name="Youtube"
                        date="Aug 02, 2024 - 11:00 AM"
                        type="Bank Transfer"
                        amount={850}
                        status="Completed"
                      />
                      <TransactionRow
                        icon={<div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">♪</div>}
                        name="Spotify Premium"
                        date="Jun 01, 2024 - 01:58 PM"
                        type="Credit Card"
                        amount={15}
                        status="Pending"
                      />
                      <TransactionRow
                        icon={<div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-white text-xs font-bold">F</div>}
                        name="Figma"
                        date="May 24, 2024 - 09:11 AM"
                        type="Bank Transfer"
                        amount={1250.05}
                        status="Completed"
                      />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
