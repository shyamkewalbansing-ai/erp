import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, 
  Users, 
  Building2, 
  CreditCard, 
  Landmark, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Euro,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  FolderKanban,
  Receipt,
  FileSpreadsheet,
  Settings,
  History,
  Mail,
  BookOpen,
  Wallet,
  PiggyBank,
  BarChart3,
  Percent,
  Archive,
  MapPin,
  Layers
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  if (amount === null || amount === undefined) return `${currency} 0,00`;
  return `${currency} ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Module Card Component
const ModuleCard = ({ icon: Icon, title, description, onClick, color = 'blue', badge }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-${color}-200 transition-all cursor-pointer group`}
  >
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl bg-${color}-50 flex items-center justify-center group-hover:bg-${color}-100 transition-colors`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      {badge && (
        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${badge.color}-100 text-${badge.color}-700`}>
          {badge.text}
        </span>
      )}
    </div>
    <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
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

// Action Item Component
const ActionItem = ({ type, title, description, action }) => {
  const colors = {
    warning: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    success: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' }
  };
  const colorSet = colors[type] || colors.info;
  const IconComp = type === 'warning' ? AlertCircle : type === 'success' ? CheckCircle2 : Clock;

  return (
    <div className={`${colorSet.bg} border ${colorSet.border} rounded-lg p-4 flex items-start gap-3`}>
      <IconComp className={`w-5 h-5 ${colorSet.icon} mt-0.5`} />
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      {action && (
        <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
          {action}
        </button>
      )}
    </div>
  );
};

export default function BoekhoudingDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [actielijst, setActielijst] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setInitialized(true);
      } else if (response.status === 404) {
        setInitialized(false);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, [token]);

  // Fetch action list
  const fetchActielijst = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/dashboard/actielijst`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActielijst(data.acties || []);
      }
    } catch (error) {
      console.error('Error fetching actielijst:', error);
    }
  }, [token]);

  // Initialize accounting
  const initializeBoekhouding = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/init/volledig`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setInitialized(true);
        fetchDashboard();
        fetchActielijst();
      }
    } catch (error) {
      console.error('Error initializing:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDashboard();
      await fetchActielijst();
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchActielijst]);

  // Module definitions
  const modules = [
    { id: 'grootboek', icon: BookOpen, title: 'Grootboek', description: 'Rekeningschema, dagboeken en journaalposten', color: 'blue' },
    { id: 'debiteuren', icon: Users, title: 'Debiteuren', description: 'Klantbeheer en openstaande vorderingen', color: 'green' },
    { id: 'crediteuren', icon: Building2, title: 'Crediteuren', description: 'Leveranciers en te betalen facturen', color: 'purple' },
    { id: 'verkoopfacturen', icon: Receipt, title: 'Verkoop', description: 'Verkoopfacturen en offertes', color: 'emerald' },
    { id: 'inkoopfacturen', icon: FileText, title: 'Inkoop', description: 'Inkoopfacturen en bestellingen', color: 'orange' },
    { id: 'bank', icon: Landmark, title: 'Bank & Kas', description: 'Bankrekeningen en kasboek', color: 'sky' },
    { id: 'reconciliatie', icon: RefreshCw, title: 'Bank Reconciliatie', description: 'Automatisch matchen van mutaties', color: 'cyan' },
    { id: 'activa', icon: Archive, title: 'Vaste Activa', description: 'Activaregister en afschrijvingen', color: 'slate' },
    { id: 'kostenplaatsen', icon: MapPin, title: 'Kostenplaatsen', description: 'Afdelingen en budgetten', color: 'rose' },
    { id: 'wisselkoersen', icon: DollarSign, title: 'Wisselkoersen', description: 'Valutakoersen beheren', color: 'amber' },
    { id: 'voorraad', icon: Package, title: 'Voorraad', description: 'Artikelen en magazijnbeheer', color: 'teal' },
    { id: 'projecten', icon: FolderKanban, title: 'Projecten', description: 'Projecten en urenregistratie', color: 'indigo' },
    { id: 'btw', icon: Percent, title: 'BTW Module', description: 'BTW tarieven en aangifte', color: 'red' },
    { id: 'rapportages', icon: BarChart3, title: 'Rapportages', description: 'Balans, W&V en overzichten', color: 'violet' },
    { id: 'documenten', icon: FileSpreadsheet, title: 'Documenten', description: 'Document archief', color: 'gray' },
    { id: 'herinneringen', icon: Mail, title: 'Herinneringen', description: 'Betalingsherinneringen', color: 'pink' },
    { id: 'audit', icon: History, title: 'Audit Trail', description: 'Gebruikersactiviteiten log', color: 'stone' },
    { id: 'instellingen', icon: Settings, title: 'Instellingen', description: 'Boekhouding configuratie', color: 'neutral' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-2 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Show initialization screen if not initialized
  if (!initialized && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Calculator className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">Boekhouding Module</h1>
            <p className="mt-2 text-gray-600">
              Welkom bij de complete Surinaamse boekhoudoplossing. Start met het initialiseren van uw boekhouding.
            </p>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-xl text-left">
              <h3 className="font-semibold text-blue-900">Wat wordt aangemaakt:</h3>
              <ul className="mt-2 space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  76 standaard grootboekrekeningen (Surinaams schema)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  10 BTW codes (0%, 10%, 25%, import, export)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  5 dagboeken (Bank, Kas, Verkoop, Inkoop, Memoriaal)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Multi-valuta ondersteuning (SRD, USD, EUR)
                </li>
              </ul>
            </div>

            <button
              onClick={initializeBoekhouding}
              className="mt-6 w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Initialiseer Boekhouding
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Boekhouding</h1>
                <p className="text-sm text-gray-500">Compleet Surinaams boekhoudsysteem</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { fetchDashboard(); fetchActielijst(); }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
            {['dashboard', 'modules'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'dashboard' ? 'Dashboard' : 'Alle Modules'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Omzet deze maand"
                value={formatCurrency(dashboardData.omzet?.deze_maand)}
                icon={TrendingUp}
                color="green"
              />
              <KPICard
                title="Kosten deze maand"
                value={formatCurrency(dashboardData.kosten?.deze_maand)}
                icon={TrendingDown}
                color="red"
              />
              <KPICard
                title="Winst deze maand"
                value={formatCurrency(dashboardData.winst?.deze_maand)}
                icon={PiggyBank}
                color="blue"
              />
              <KPICard
                title="Omzet dit jaar"
                value={formatCurrency(dashboardData.omzet?.dit_jaar)}
                icon={BarChart3}
                color="purple"
              />
            </div>

            {/* Openstaand & Liquiditeit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Openstaand */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Openstaande Posten</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Debiteuren</span>
                    </div>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(dashboardData.openstaand?.debiteuren)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-red-600" />
                      <span className="text-gray-700">Crediteuren</span>
                    </div>
                    <span className="font-semibold text-red-700">
                      {formatCurrency(dashboardData.openstaand?.crediteuren)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liquiditeit */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Liquiditeit</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Banknote className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700">Bank SRD</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(dashboardData.liquiditeit?.bank_srd, 'SRD')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Bank USD</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(dashboardData.liquiditeit?.bank_usd, 'USD')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Euro className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">Bank EUR</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(dashboardData.liquiditeit?.bank_eur, 'EUR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BTW & Wisselkoersen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BTW Overzicht */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">BTW Overzicht</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Te betalen (verkoop)</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(dashboardData.btw?.te_betalen)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Te vorderen (inkoop)</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(dashboardData.btw?.te_vorderen)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-medium text-gray-900">Saldo</span>
                    <span className={`font-bold ${dashboardData.btw?.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(dashboardData.btw?.saldo || 0))}
                      <span className="text-sm font-normal ml-1">
                        {dashboardData.btw?.saldo > 0 ? 'te betalen' : 'te vorderen'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Wisselkoersen */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Wisselkoersen</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span>USD / SRD</span>
                    </div>
                    <span className="font-semibold">
                      {dashboardData.wisselkoersen?.usd_srd || 'Niet ingesteld'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Euro className="w-5 h-5 text-blue-600" />
                      <span>EUR / SRD</span>
                    </div>
                    <span className="font-semibold">
                      {dashboardData.wisselkoersen?.eur_srd || 'Niet ingesteld'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actielijst */}
            {actielijst.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Actielijst</h3>
                <div className="space-y-3">
                  {actielijst.map((actie, index) => (
                    <ActionItem
                      key={index}
                      type={actie.type}
                      title={actie.titel}
                      description={actie.beschrijving}
                      action="Bekijken"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Extra Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(dashboardData.voorraad?.waarde)}
                    </p>
                    <p className="text-sm text-gray-500">Voorraadwaarde</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.projecten?.actief || 0}
                    </p>
                    <p className="text-sm text-gray-500">Actieve projecten</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(dashboardData.liquiditeit?.kas_srd)}
                    </p>
                    <p className="text-sm text-gray-500">Kassaldo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(module => (
              <ModuleCard
                key={module.id}
                icon={module.icon}
                title={module.title}
                description={module.description}
                color={module.color}
                onClick={() => alert(`${module.title} module - Implementeer subpagina`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
