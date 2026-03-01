import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  CreditCard, 
  PiggyBank,
  Users,
  FileText,
  Calendar,
  Euro,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Target,
  Receipt,
  Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Format currency EUR
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '€ 0,00';
  return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// Quick Action Card
const QuickActionCard = ({ icon: Icon, title, description, onClick, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
    >
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
};

// Recent Payment Item
const RecentPaymentItem = ({ payment }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{payment.relatie_naam || 'Onbekend'}</p>
        <p className="text-sm text-gray-500">{payment.schuld_omschrijving}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-semibold text-green-600">{formatCurrency(payment.bedrag)}</p>
      <p className="text-xs text-gray-400">{payment.datum}</p>
    </div>
  </div>
);

// Status Badge
const StatusBadge = ({ status, count }) => {
  const colors = {
    open: 'bg-red-100 text-red-700',
    regeling: 'bg-amber-100 text-amber-700',
    betaald: 'bg-green-100 text-green-700',
    betwist: 'bg-purple-100 text-purple-700'
  };
  const labels = {
    open: 'Open',
    regeling: 'Regeling',
    betaald: 'Betaald',
    betwist: 'Betwist'
  };

  return (
    <div className={`px-3 py-2 rounded-lg ${colors[status]} flex items-center justify-between`}>
      <span className="text-sm font-medium">{labels[status]}</span>
      <span className="text-lg font-bold ml-2">{count}</span>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/schuldbeheer/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Fout bij ophalen dashboard');
      
      const data = await response.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <SchuldbeheerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SchuldbeheerLayout>
    );
  }

  if (error) {
    return (
      <SchuldbeheerLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      </SchuldbeheerLayout>
    );
  }

  const beschikbaarStatus = dashboard?.beschikbaar_saldo >= 0 ? 'positief' : 'negatief';

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Overzicht van uw financiële situatie</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Vernieuwen
          </button>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Totale Schuld"
            value={formatCurrency(dashboard?.totale_openstaande_schuld)}
            subtitle={`${dashboard?.aantal_schulden || 0} schulden`}
            icon={CreditCard}
            color="red"
          />
          <KPICard
            title="Totaal Afgelost"
            value={formatCurrency(dashboard?.totaal_afgelost)}
            icon={CheckCircle2}
            color="green"
            trend="up"
            trendValue="Goed bezig!"
          />
          <KPICard
            title="Maandelijkse Verplichtingen"
            value={formatCurrency(dashboard?.maandelijkse_verplichtingen)}
            subtitle="Per maand te betalen"
            icon={Calendar}
            color="amber"
          />
          <KPICard
            title="Beschikbaar Deze Maand"
            value={formatCurrency(dashboard?.beschikbaar_saldo)}
            subtitle={`Inkomsten: ${formatCurrency(dashboard?.totaal_inkomsten_maand)}`}
            icon={Wallet}
            color={beschikbaarStatus === 'positief' ? 'green' : 'red'}
            trend={beschikbaarStatus === 'positief' ? 'up' : 'down'}
          />
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schulden Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Schulden Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusBadge status="open" count={dashboard?.schulden_per_status?.open || 0} />
              <StatusBadge status="regeling" count={dashboard?.schulden_per_status?.regeling || 0} />
              <StatusBadge status="betaald" count={dashboard?.schulden_per_status?.betaald || 0} />
              <StatusBadge status="betwist" count={dashboard?.schulden_per_status?.betwist || 0} />
            </div>
          </div>

          {/* Grootste Schuldeiser */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              Grootste Schuldeiser
            </h3>
            {dashboard?.grootste_schuldeiser ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-red-600" />
                </div>
                <p className="font-semibold text-gray-900">{dashboard.grootste_schuldeiser.naam}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(dashboard.grootste_schuldeiser.bedrag)}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                <p>Geen openstaande schulden</p>
              </div>
            )}
          </div>

          {/* Cashflow Indicatie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              Maandelijkse Cashflow
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Inkomsten</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(dashboard?.totaal_inkomsten_maand)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Uitgaven</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(dashboard?.totaal_uitgaven_maand)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Schuld Betalingen</span>
                <span className="font-semibold text-amber-600">
                  -{formatCurrency(dashboard?.maandelijkse_verplichtingen)}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Beschikbaar</span>
                <span className={`font-bold text-lg ${beschikbaarStatus === 'positief' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard?.beschikbaar_saldo)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-400" />
                Recente Betalingen
              </h3>
              <button 
                onClick={() => navigate('/app/schuldbeheer/betalingen')}
                className="text-sm text-blue-600 hover:underline"
              >
                Bekijk alle
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {dashboard?.recente_betalingen?.length > 0 ? (
                dashboard.recente_betalingen.map((payment, idx) => (
                  <RecentPaymentItem key={idx} payment={payment} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2" />
                  <p>Nog geen betalingen geregistreerd</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" />
              Snelle Acties
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={CreditCard}
                title="Nieuwe Schuld"
                description="Registreer schuld"
                onClick={() => navigate('/app/schuldbeheer/schulden')}
                color="red"
              />
              <QuickActionCard
                icon={CheckCircle2}
                title="Betaling Toevoegen"
                description="Registreer betaling"
                onClick={() => navigate('/app/schuldbeheer/betalingen')}
                color="green"
              />
              <QuickActionCard
                icon={TrendingUp}
                title="Inkomst Toevoegen"
                description="Registreer inkomen"
                onClick={() => navigate('/app/schuldbeheer/inkomsten')}
                color="blue"
              />
              <QuickActionCard
                icon={TrendingDown}
                title="Uitgave Toevoegen"
                description="Registreer uitgave"
                onClick={() => navigate('/app/schuldbeheer/uitgaven')}
                color="amber"
              />
            </div>
          </div>
        </div>
      </div>
    </SchuldbeheerLayout>
  );
}
