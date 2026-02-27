import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Building2, Landmark, RefreshCcw,
  Package, Warehouse, DollarSign, Receipt, ShoppingCart, Truck,
  FolderKanban, FileBarChart, Calculator, FileText, HelpCircle,
  Settings, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  ChevronRight, Plus, Search, Filter, Download, Upload, ArrowUpRight,
  ArrowDownRight, Clock, Calendar, CreditCard, Wallet, PiggyBank,
  BarChart3, PieChart, Activity, ArrowLeft
} from 'lucide-react';

// Lazy load sub-pages
const DebiteurenPage = lazy(() => import('./boekhouding/DebiteurenPage'));
const CrediteurenPage = lazy(() => import('./boekhouding/CrediteurenPage'));
const VerkoopfacturenPage = lazy(() => import('./boekhouding/VerkoopfacturenPage'));
const BankPage = lazy(() => import('./boekhouding/BankPage'));
const GrootboekPage = lazy(() => import('./boekhouding/GrootboekPage'));
const BTWPage = lazy(() => import('./boekhouding/BTWPage'));
const RapportagesPage = lazy(() => import('./boekhouding/RapportagesPage'));
const WisselkoersenPage = lazy(() => import('./boekhouding/WisselkoersenPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// API Helper
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BACKEND_URL}/api/boekhouding${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API Error');
  }
  return response.json();
};

// Format currency
const formatCurrency = (amount, valuta = 'SRD') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: valuta,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'red' ? 'bg-red-100' : color === 'yellow' ? 'bg-yellow-100' : 'bg-purple-100'}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-3 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span className="ml-1">{trendValue}</span>
        </div>
      )}
    </div>
  );
};

// Module Card Component
const ModuleCard = ({ title, description, icon: Icon, onClick, badge }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
  >
    <div className="flex items-start justify-between">
      <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      {badge && (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <h3 className="font-semibold text-gray-900 mt-4">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    <div className="flex items-center text-blue-600 mt-4 text-sm font-medium">
      <span>Openen</span>
      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);

// Action Item Component
const ActionItem = ({ type, message, action, priority, onClick }) => {
  const priorityColors = {
    hoog: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    laag: 'border-l-blue-500 bg-blue-50',
  };

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${priorityColors[priority] || priorityColors.medium}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{message}</p>
          <p className="text-sm text-gray-500 mt-1">{action}</p>
        </div>
        <button
          onClick={onClick}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Actie
        </button>
      </div>
    </div>
  );
};

const BoekhoudingDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [actielijst, setActielijst] = useState([]);
  const [error, setError] = useState(null);

  // Handle URL-based module selection
  useEffect(() => {
    const path = window.location.pathname;
    console.log('Full path:', path);
    
    // Extract module from URL like /app/boekhouding/verkoop -> verkoop
    const match = path.match(/\/boekhouding\/([^/]+)/);
    if (match && match[1]) {
      console.log('Module from URL:', match[1]);
      setActiveModule(match[1]);
    } else if (path.endsWith('/boekhouding') || path.endsWith('/boekhouding/')) {
      setActiveModule('dashboard');
    }
  }, [location.pathname]);

  // Check if system is initialized
  const checkInitialization = async () => {
    try {
      const rekeningen = await api('/rekeningen?limit=1');
      return rekeningen && rekeningen.length > 0;
    } catch {
      return false;
    }
  };

  // Initialize system
  const initializeSystem = async () => {
    try {
      setLoading(true);
      await api('/init/volledig', { method: 'POST' });
      setInitialized(true);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboard, acties] = await Promise.all([
        api('/dashboard'),
        api('/dashboard/actielijst'),
      ]);
      setDashboardData(dashboard);
      setActielijst(acties.acties || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const isInit = await checkInitialization();
      setInitialized(isInit);
      if (isInit) {
        await loadDashboard();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Module navigation
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/app/boekhouding' },
    { id: 'grootboek', name: 'Grootboek', icon: BookOpen, path: '/app/boekhouding/grootboek' },
    { id: 'debiteuren', name: 'Debiteuren', icon: Users, path: '/app/boekhouding/debiteuren' },
    { id: 'crediteuren', name: 'Crediteuren', icon: Building2, path: '/app/boekhouding/crediteuren' },
    { id: 'bank', name: 'Bank/Kas', icon: Landmark, path: '/app/boekhouding/bank' },
    { id: 'verkoop', name: 'Verkoop', icon: Receipt, path: '/app/boekhouding/verkoop' },
    { id: 'wisselkoersen', name: 'Wisselkoersen', icon: DollarSign, path: '/app/boekhouding/wisselkoersen' },
    { id: 'rapportages', name: 'Rapportages', icon: FileBarChart, path: '/app/boekhouding/rapportages' },
    { id: 'btw', name: 'BTW', icon: Calculator, path: '/app/boekhouding/btw' },
  ];

  // Navigate to module
  const handleModuleClick = (module) => {
    setActiveModule(module.id);
    if (module.path) {
      navigate(module.path);
    }
  };

  // Initialization screen
  if (!initialized && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">
            Boekhouding Module
          </h1>
          <p className="text-gray-500 mt-2">
            Welkom bij de complete boekhoudoplossing voor Suriname.
            Initialiseer het systeem om te beginnen.
          </p>
          <div className="mt-6 space-y-3 text-left bg-gray-50 rounded-xl p-4">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              Surinaams rekeningschema (76 rekeningen)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              BTW codes (0%, 10%, 25%, vrijgesteld)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              Multi-valuta (SRD, USD, EUR)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              5 standaard dagboeken
            </div>
          </div>
          <button
            onClick={initializeSystem}
            disabled={loading}
            className="mt-6 w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Bezig met initialiseren...' : 'Systeem Initialiseren'}
          </button>
        </div>
      </div>
    );
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Laden...</p>
        </div>
      </div>
    );
  }

  // Calculate totals for dashboard
  const totaalDebiteuren = Object.entries(dashboardData?.openstaande_debiteuren || {})
    .map(([valuta, bedrag]) => `${formatCurrency(bedrag, valuta)}`)
    .join(' | ') || formatCurrency(0);

  const totaalCrediteuren = Object.entries(dashboardData?.openstaande_crediteuren || {})
    .map(([valuta, bedrag]) => `${formatCurrency(bedrag, valuta)}`)
    .join(' | ') || formatCurrency(0);

  const totaalBank = Object.entries(dashboardData?.bank_saldi || {})
    .map(([valuta, bedrag]) => `${formatCurrency(bedrag, valuta)}`)
    .join(' | ') || formatCurrency(0);

  return (
    <div className="space-y-6">
      {/* Render sub-module pages based on URL */}
      {activeModule === 'debiteuren' && (
        <Suspense fallback={<PageLoader />}>
          <DebiteurenPage />
        </Suspense>
      )}
      {activeModule === 'crediteuren' && (
        <Suspense fallback={<PageLoader />}>
          <CrediteurenPage />
        </Suspense>
      )}
      {activeModule === 'verkoop' && (
        <Suspense fallback={<PageLoader />}>
          <VerkoopfacturenPage />
        </Suspense>
      )}
      {activeModule === 'bank' && (
        <Suspense fallback={<PageLoader />}>
          <BankPage />
        </Suspense>
      )}
      {activeModule === 'grootboek' && (
        <Suspense fallback={<PageLoader />}>
          <GrootboekPage />
        </Suspense>
      )}
      {activeModule === 'btw' && (
        <Suspense fallback={<PageLoader />}>
          <BTWPage />
        </Suspense>
      )}
      {activeModule === 'rapportages' && (
        <Suspense fallback={<PageLoader />}>
          <RapportagesPage />
        </Suspense>
      )}
      {activeModule === 'wisselkoersen' && (
        <Suspense fallback={<PageLoader />}>
          <WisselkoersenPage />
        </Suspense>
      )}
      
      {/* Dashboard Content - Default View */}
      {activeModule === 'dashboard' && (
        <div className="space-y-6">
          {/* Page Header with EUR/SRD Rate */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-500 mt-1">Overzicht van uw financiele situatie</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <span className="text-sm text-gray-500">EUR/SRD: </span>
                <span className="font-semibold text-gray-900">{dashboardData?.wisselkoers_eur_srd || '44,50'}</span>
              </div>
              <button
                onClick={loadDashboard}
                className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Vernieuwen
              </button>
            </div>
          </div>

          {/* KPI Cards Row 1 - Main Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Omzet"
              value={formatCurrency(dashboardData?.omzet_periode || 0)}
              subtitle="+12% Deze periode"
              icon={TrendingUp}
              color="green"
            />
            <KPICard
              title="Kosten"
              value={formatCurrency(dashboardData?.kosten_periode || 0)}
              subtitle="Deze periode"
              icon={TrendingDown}
              color="red"
            />
            <KPICard
              title="Winst"
              value={formatCurrency((dashboardData?.omzet_periode || 0) - (dashboardData?.kosten_periode || 0))}
              subtitle={((dashboardData?.omzet_periode || 0) - (dashboardData?.kosten_periode || 0)) < 0 ? "Negatief Netto resultaat" : "Positief Netto resultaat"}
              icon={(dashboardData?.omzet_periode || 0) - (dashboardData?.kosten_periode || 0) >= 0 ? TrendingUp : TrendingDown}
              color={(dashboardData?.omzet_periode || 0) - (dashboardData?.kosten_periode || 0) >= 0 ? "green" : "red"}
            />
            <KPICard
              title="Openstaande Facturen"
              value={dashboardData?.aantal_openstaande_facturen || 0}
              subtitle={`${dashboardData?.aantal_vervallen_facturen || 0} vervallen`}
              icon={Receipt}
              color="blue"
            />
          </div>

          {/* KPI Cards Row 2 - Debiteuren/Crediteuren/BTW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Debiteuren"
              value={totaalDebiteuren}
              subtitle={`${Object.keys(dashboardData?.openstaande_debiteuren || {}).length || 0} klanten`}
              icon={Users}
              color="blue"
            />
            <KPICard
              title="Crediteuren"
              value={totaalCrediteuren}
              subtitle={`${Object.keys(dashboardData?.openstaande_crediteuren || {}).length || 0} leveranciers`}
              icon={Building2}
              color="purple"
            />
            <KPICard
              title="BTW te betalen"
              value={formatCurrency(dashboardData?.btw_positie?.af_te_dragen || 0)}
              subtitle="Huidige periode"
              icon={Calculator}
              color="yellow"
            />
            <KPICard
              title="BTW te vorderen"
              value={formatCurrency(dashboardData?.btw_positie?.voorbelasting || 0)}
              subtitle="Huidige periode"
              icon={Calculator}
              color="green"
            />
          </div>

          {/* KPI Cards Row 3 - Bank Balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Bank SRD"
              value={formatCurrency(dashboardData?.bank_saldi?.SRD || 0, 'SRD')}
              icon={Landmark}
              color="blue"
            />
            <KPICard
              title="Bank USD"
              value={formatCurrency(dashboardData?.bank_saldi?.USD || 0, 'USD')}
              icon={Landmark}
              color="green"
            />
            <KPICard
              title="Bank EUR"
              value={formatCurrency(dashboardData?.bank_saldi?.EUR || 0, 'EUR')}
              icon={Landmark}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cashflow Chart Placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Cashflow Overzicht
              </h3>
              <div className="mt-4 h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <span className="text-gray-400">Grafiek wordt geladen...</span>
              </div>
            </div>

            {/* Debtor Aging Chart Placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-500" />
                Ouderdomsanalyse Debiteuren
              </h3>
              <div className="mt-4 h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <span className="text-gray-400">Grafiek wordt geladen...</span>
              </div>
            </div>
          </div>

          {/* Action List */}
          {actielijst && actielijst.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center mb-4">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                Actielijst
              </h3>
              <div className="space-y-3">
                {actielijst.slice(0, 5).map((item, index) => (
                  <ActionItem
                    key={index}
                    {...item}
                    onClick={() => {
                      if (item.module) {
                        const mod = modules.find(m => m.id === item.module);
                        if (mod) handleModuleClick(mod);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoekhoudingDashboard;
