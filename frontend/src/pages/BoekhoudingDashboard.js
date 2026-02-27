import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const path = location.pathname;
    if (path.includes('/boekhouding/')) {
      const module = path.split('/boekhouding/')[1];
      if (module) setActiveModule(module);
    } else {
      setActiveModule('dashboard');
    }
  }, [location]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 ml-3">Boekhouding</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] hidden lg:block">
          <nav className="p-4 space-y-1">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeModule === module.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <module.icon className="w-5 h-5 mr-3" />
                {module.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeModule === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                  <p className="text-gray-500 mt-1">Overzicht van uw financiele situatie</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={loadDashboard}
                    className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Vernieuwen
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Openstaande Debiteuren"
                  value={totaalDebiteuren}
                  subtitle={`${dashboardData?.aantal_openstaande_facturen || 0} facturen`}
                  icon={Users}
                  color="blue"
                />
                <KPICard
                  title="Openstaande Crediteuren"
                  value={totaalCrediteuren}
                  icon={Building2}
                  color="purple"
                />
                <KPICard
                  title="Bank/Kas Saldo"
                  value={totaalBank}
                  subtitle={`Kas: ${formatCurrency(dashboardData?.kas_saldo || 0)}`}
                  icon={Landmark}
                  color="green"
                />
                <KPICard
                  title="BTW Positie"
                  value={formatCurrency(dashboardData?.btw_saldo || 0)}
                  subtitle={dashboardData?.btw_saldo > 0 ? 'Te betalen' : 'Te vorderen'}
                  icon={Calculator}
                  color={dashboardData?.btw_saldo > 0 ? 'red' : 'green'}
                />
              </div>

              {/* Second Row KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                  title="Voorraadwaarde"
                  value={formatCurrency(dashboardData?.voorraadwaarde || 0)}
                  icon={Warehouse}
                  color="yellow"
                />
                <KPICard
                  title="Vervallen Facturen"
                  value={dashboardData?.aantal_vervallen_facturen || 0}
                  subtitle="Vereist actie"
                  icon={AlertCircle}
                  color={dashboardData?.aantal_vervallen_facturen > 0 ? 'red' : 'green'}
                />
                <KPICard
                  title="Open Facturen"
                  value={dashboardData?.aantal_openstaande_facturen || 0}
                  icon={Receipt}
                  color="blue"
                />
              </div>

              {/* Action Items & Quick Access */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Action Items */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                    Actiepunten
                  </h3>
                  <div className="mt-4 space-y-3">
                    {actielijst.length > 0 ? (
                      actielijst.map((actie, index) => (
                        <ActionItem
                          key={index}
                          message={actie.bericht}
                          action={actie.actie}
                          priority={actie.prioriteit}
                          onClick={() => console.log('Action:', actie.type)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                        <p>Geen openstaande acties</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Access */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Snelle Acties
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveModule('verkoop')}
                      className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Nieuwe Factuur
                    </button>
                    <button
                      onClick={() => setActiveModule('inkoop')}
                      className="flex items-center p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Inkoop Boeken
                    </button>
                    <button
                      onClick={() => setActiveModule('reconciliatie')}
                      className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <RefreshCcw className="w-5 h-5 mr-2" />
                      Bank Import
                    </button>
                    <button
                      onClick={() => setActiveModule('rapportages')}
                      className="flex items-center p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <FileBarChart className="w-5 h-5 mr-2" />
                      Rapporten
                    </button>
                  </div>
                </div>
              </div>

              {/* Module Cards */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ModuleCard
                    title="Grootboek"
                    description="Rekeningschema, dagboeken en journaalposten"
                    icon={BookOpen}
                    onClick={() => setActiveModule('grootboek')}
                  />
                  <ModuleCard
                    title="Debiteuren"
                    description="Klantenbeheer en verkoopfacturen"
                    icon={Users}
                    onClick={() => setActiveModule('debiteuren')}
                    badge={dashboardData?.aantal_vervallen_facturen > 0 ? `${dashboardData.aantal_vervallen_facturen} vervallen` : null}
                  />
                  <ModuleCard
                    title="Crediteuren"
                    description="Leveranciers en inkoopfacturen"
                    icon={Building2}
                    onClick={() => setActiveModule('crediteuren')}
                  />
                  <ModuleCard
                    title="Bank & Kas"
                    description="Bankmutaties en kasboek"
                    icon={Landmark}
                    onClick={() => setActiveModule('bank')}
                  />
                  <ModuleCard
                    title="Voorraad"
                    description="Artikelen en magazijnbeheer"
                    icon={Warehouse}
                    onClick={() => setActiveModule('voorraad')}
                  />
                  <ModuleCard
                    title="Projecten"
                    description="Urenregistratie en projectfacturatie"
                    icon={FolderKanban}
                    onClick={() => setActiveModule('projecten')}
                  />
                  <ModuleCard
                    title="BTW Aangifte"
                    description="BTW codes en aangifterapporten"
                    icon={Calculator}
                    onClick={() => setActiveModule('btw')}
                  />
                  <ModuleCard
                    title="Rapportages"
                    description="Balans, W&V en meer"
                    icon={FileBarChart}
                    onClick={() => setActiveModule('rapportages')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other modules - will be expanded */}
          {activeModule !== 'dashboard' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  {(() => {
                    const module = modules.find(m => m.id === activeModule);
                    const Icon = module?.icon || BookOpen;
                    return <Icon className="w-8 h-8 text-blue-600" />;
                  })()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-4">
                  {modules.find(m => m.id === activeModule)?.name || 'Module'}
                </h2>
                <p className="text-gray-500 mt-2">
                  Deze module wordt binnenkort uitgebreid met alle functionaliteit.
                </p>
                <button
                  onClick={() => setActiveModule('dashboard')}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Terug naar Dashboard
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BoekhoudingDashboard;
