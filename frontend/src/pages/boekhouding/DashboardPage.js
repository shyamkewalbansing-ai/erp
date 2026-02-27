import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Receipt,
  Landmark,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const formatCurrency = (amount, currency = 'SRD') => {
  if (amount === null || amount === undefined) return `${currency} 0,00`;
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `${currency} ${formatted}`;
};

const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-500', iconBg: 'bg-green-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', iconBg: 'bg-red-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-500', iconBg: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', iconBg: 'bg-purple-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-500', iconBg: 'bg-cyan-100' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs mt-1 flex items-center gap-1">
              {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
              <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}>
                {subtitle}
              </span>
            </p>
          )}
        </div>
        <div className={`w-10 h-10 ${c.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
};

const SmallCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 ${colors[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boekhouding/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welkom terug! Hier is uw financiële overzicht.</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Omzet"
          value={formatCurrency(data?.omzet?.deze_maand || 0)}
          subtitle="+12% Deze periode"
          trend="up"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Kosten"
          value={formatCurrency(data?.kosten?.deze_maand || 0)}
          subtitle="Deze periode"
          icon={TrendingDown}
          color="red"
        />
        <KPICard
          title="Winst"
          value={formatCurrency(data?.winst?.deze_maand || 0)}
          subtitle={data?.winst?.deze_maand < 0 ? 'Negatief Netto resultaat' : 'Netto resultaat'}
          trend={data?.winst?.deze_maand >= 0 ? 'up' : 'down'}
          icon={TrendingUp}
          color={data?.winst?.deze_maand >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Openstaande Facturen"
          value={data?.openstaand?.debiteuren_count || 0}
          subtitle={`${data?.openstaand?.verlopen || 0} vervallen`}
          icon={Receipt}
          color="yellow"
        />
      </div>

      {/* Middle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Debiteuren"
          value={formatCurrency(data?.openstaand?.debiteuren || 0)}
          subtitle={`${data?.debiteuren_count || 0} klanten`}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Crediteuren"
          value={formatCurrency(data?.openstaand?.crediteuren || 0)}
          subtitle={`${data?.crediteuren_count || 0} leveranciers`}
          icon={Building2}
          color="cyan"
        />
        <KPICard
          title="BTW te betalen"
          value={formatCurrency(data?.btw?.te_betalen || 0)}
          subtitle="Huidige periode"
          icon={Receipt}
          color="green"
        />
        <KPICard
          title="BTW te vorderen"
          value={formatCurrency(data?.btw?.te_vorderen || 0)}
          subtitle="Huidige periode"
          icon={Receipt}
          color="yellow"
        />
      </div>

      {/* Bank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SmallCard
          title="Bank SRD"
          value={formatCurrency(data?.liquiditeit?.bank_srd || 0, 'SRD')}
          icon={Landmark}
          color="blue"
        />
        <SmallCard
          title="Bank USD"
          value={formatCurrency(data?.liquiditeit?.bank_usd || 0, '$')}
          icon={Landmark}
          color="green"
        />
        <SmallCard
          title="Bank EUR"
          value={formatCurrency(data?.liquiditeit?.bank_eur || 0, '€')}
          icon={Landmark}
          color="purple"
        />
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Cashflow Overzicht</h3>
          <div className="h-48 flex items-center justify-center text-gray-400">
            {/* Chart placeholder */}
            <p>Grafiek wordt hier weergegeven</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ouderdomsanalyse Debiteuren</h3>
          <div className="h-48 flex items-center justify-center text-gray-400">
            {/* Chart placeholder */}
            <p>Grafiek wordt hier weergegeven</p>
          </div>
        </div>
      </div>
    </div>
  );
}
