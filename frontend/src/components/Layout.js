import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyAddons, getWorkspaceSettings, updateWorkspaceSettings, updateWorkspaceDomain, getSidebarOrder } from '../lib/api';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  Wallet,
  Banknote,
  Wrench,
  Users2,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Crown,
  Package,
  Settings,
  FileText,
  HandCoins,
  FileSignature,
  Moon,
  Sun,
  Layers,
  UserCog,
  Boxes,
  Target,
  Clock,
  Calendar,
  Zap,
  Globe,
  Copy,
  ExternalLink,
  Save,
  Loader2,
  Briefcase,
  Car,
  ShoppingCart,
  Sparkles,
  Scissors,
  BarChart3,
  Gift,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import NotificationBell from './NotificationBell';
import AIAssistant from './AIAssistant';
import { toast } from 'sonner';

// Navigation items for Vastgoed Beheer add-on
const vastgoedNavItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', addon: 'vastgoed_beheer' },
  { to: '/app/tenants', icon: Users, label: 'Huurders', addon: 'vastgoed_beheer' },
  { to: '/app/apartments', icon: Building2, label: 'Appartementen', addon: 'vastgoed_beheer' },
  { to: '/app/contracten', icon: FileSignature, label: 'Contracten', addon: 'vastgoed_beheer' },
  { to: '/app/payments', icon: CreditCard, label: 'Betalingen', addon: 'vastgoed_beheer' },
  { to: '/app/facturen', icon: FileText, label: 'Facturen', addon: 'vastgoed_beheer' },
  { to: '/app/leningen', icon: HandCoins, label: 'Leningen', addon: 'vastgoed_beheer' },
  { to: '/app/deposits', icon: Wallet, label: 'Borg', addon: 'vastgoed_beheer' },
  { to: '/app/kasgeld', icon: Banknote, label: 'Kasgeld', addon: 'vastgoed_beheer' },
  { to: '/app/onderhoud', icon: Wrench, label: 'Onderhoud', addon: 'vastgoed_beheer' },
  { to: '/app/meterstanden', icon: Zap, label: 'Meterstanden', addon: 'vastgoed_beheer' },
  { to: '/app/werknemers', icon: Users2, label: 'Werknemers', addon: 'vastgoed_beheer' },
  { to: '/app/instellingen', icon: Settings, label: 'Huurinstellingen', addon: 'vastgoed_beheer' },
  { to: '/app/vastgoed/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'vastgoed_beheer' },
];

// Navigation items for HRM add-on
const hrmNavItems = [
  { to: '/app/hrm', icon: LayoutDashboard, label: 'HRM Dashboard', addon: 'hrm' },
  { to: '/app/hrm/personeel', icon: Users, label: 'Personeel', addon: 'hrm' },
  { to: '/app/hrm/werving', icon: Target, label: 'Werving', addon: 'hrm' },
  { to: '/app/hrm/contracten', icon: FileSignature, label: 'Contracten', addon: 'hrm' },
  { to: '/app/hrm/documenten', icon: FileText, label: 'Documenten', addon: 'hrm' },
  { to: '/app/hrm/verlof', icon: Calendar, label: 'Verlof', addon: 'hrm' },
  { to: '/app/hrm/aanwezigheid', icon: Clock, label: 'Aanwezigheid', addon: 'hrm' },
  { to: '/app/hrm/loonlijst', icon: Banknote, label: 'Loonlijst', addon: 'hrm' },
  { to: '/app/hrm/instellingen', icon: Settings, label: 'HRM Instellingen', addon: 'hrm' },
  { to: '/app/hrm/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'hrm' },
];

// Navigation items for Auto Dealer add-on
const autoDealerNavItems = [
  { to: '/app/autodealer', icon: LayoutDashboard, label: 'Auto Dashboard', addon: 'autodealer' },
  { to: '/app/autodealer/voertuigen', icon: Car, label: 'Voertuigen', addon: 'autodealer' },
  { to: '/app/autodealer/klanten', icon: Users, label: 'Klanten', addon: 'autodealer' },
  { to: '/app/autodealer/verkopen', icon: ShoppingCart, label: 'Verkopen', addon: 'autodealer' },
  { to: '/klant-portaal', icon: Globe, label: 'Klant Portaal', addon: 'autodealer', external: true },
  { to: '/app/autodealer/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'autodealer' },
];

// Beauty Spa Module
const beautySpaItems = [
  { to: '/app/beautyspa', icon: Sparkles, label: 'Spa Dashboard', addon: 'beauty' },
  { to: '/app/beautyspa/clients', icon: Users, label: 'Klanten', addon: 'beauty' },
  { to: '/app/beautyspa/appointments', icon: Calendar, label: 'Afspraken', addon: 'beauty' },
  { to: '/app/beautyspa/treatments', icon: Scissors, label: 'Behandelingen', addon: 'beauty' },
  { to: '/app/beautyspa/products', icon: Package, label: 'Producten', addon: 'beauty' },
  { to: '/app/beautyspa/pos', icon: ShoppingCart, label: 'Kassa (POS)', addon: 'beauty' },
  { to: '/app/beautyspa/staff', icon: UserCog, label: 'Personeel', addon: 'beauty' },
  { to: '/app/beautyspa/reports', icon: BarChart3, label: 'Rapportages', addon: 'beauty' },
  { to: '/app/beautyspa/queue', icon: Clock, label: 'Wachtrij', addon: 'beauty' },
  { to: '/app/beautyspa/vouchers', icon: Gift, label: 'Vouchers', addon: 'beauty' },
  { to: '/app/beautyspa/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'beauty' },
];

// Pompstation (Gas Station) Module
const pompstationNavItems = [
  { to: '/app/pompstation', icon: LayoutDashboard, label: 'Pompstation Dashboard', addon: 'pompstation' },
  { to: '/app/pompstation/tanks', icon: Boxes, label: 'Brandstoftanks', addon: 'pompstation' },
  { to: '/app/pompstation/leveringen', icon: Briefcase, label: 'Leveringen', addon: 'pompstation' },
  { to: '/app/pompstation/pompen', icon: Zap, label: 'Pompen', addon: 'pompstation' },
  { to: '/app/pompstation/kassa', icon: ShoppingCart, label: 'Kassa (POS)', addon: 'pompstation' },
  { to: '/app/pompstation/winkel', icon: Package, label: 'Winkel Voorraad', addon: 'pompstation' },
  { to: '/app/pompstation/diensten', icon: Clock, label: 'Diensten', addon: 'pompstation' },
  { to: '/app/pompstation/personeel', icon: Users, label: 'Personeel', addon: 'pompstation' },
  { to: '/app/pompstation/veiligheid', icon: Target, label: 'Veiligheid', addon: 'pompstation' },
  { to: '/app/pompstation/rapportages', icon: BarChart3, label: 'Rapportages', addon: 'pompstation' },
  { to: '/app/pompstation/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'pompstation' },
];

// Boekhouding module navigation - GRATIS voor alle klanten
const boekhoudingNavItems = [
  { to: '/app/boekhouding', icon: LayoutDashboard, label: 'Dashboard', addon: 'boekhouding' },
  { to: '/app/boekhouding/grootboek', icon: FileText, label: 'Grootboek', addon: 'boekhouding' },
  { to: '/app/boekhouding/debiteuren', icon: Users, label: 'Debiteuren', addon: 'boekhouding' },
  { to: '/app/boekhouding/crediteuren', icon: Building2, label: 'Crediteuren', addon: 'boekhouding' },
  { to: '/app/boekhouding/verkoopfacturen', icon: FileText, label: 'Verkoopfacturen', addon: 'boekhouding' },
  { to: '/app/boekhouding/bankrekeningen', icon: CreditCard, label: 'Bank/Kas', addon: 'boekhouding' },
  { to: '/app/boekhouding/rapportages', icon: BarChart3, label: 'Rapportages', addon: 'boekhouding' },
  { to: '/app/boekhouding/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'boekhouding' },
];

export default function Layout() {
  const { user, logout, hasActiveSubscription, isSuperAdmin, workspace, branding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) return JSON.parse(saved);
    }
    return false;
  });
  
  // Auto-collapse sidebar for superadmin on first load
  const [superadminInitialized, setSuperadminInitialized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAddons, setActiveAddons] = useState([]);
  const [addonsLoaded, setAddonsLoaded] = useState(false);
  const [moduleOrder, setModuleOrder] = useState([]);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', slug: '' });
  const [domainForm, setDomainForm] = useState({ domain_type: 'subdomain', subdomain: '', custom_domain: '' });
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track screen size for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auto-collapse sidebar for superadmin on first visit
  useEffect(() => {
    if (user?.role === 'superadmin' && !superadminInitialized) {
      const superadminKey = 'superadminSidebarInitialized';
      const initialized = localStorage.getItem(superadminKey);
      if (!initialized) {
        setSidebarCollapsed(true);
        localStorage.setItem(superadminKey, 'true');
      }
      setSuperadminInitialized(true);
    }
  }, [user, superadminInitialized]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Only apply collapsed state on desktop
  const isCollapsed = sidebarCollapsed && isDesktop;

  // Load user's active add-ons and sidebar order
  useEffect(() => {
    const loadAddons = async () => {
      const isAdmin = user?.role === 'superadmin';
      if (!isAdmin && user) {
        try {
          const res = await getMyAddons();
          const activeSlugs = res.data
            .filter(a => a.status === 'active')
            .map(a => a.addon_slug);
          setActiveAddons(activeSlugs);
          
          // Also load sidebar order
          try {
            const orderRes = await getSidebarOrder();
            setModuleOrder(orderRes.data.module_order || []);
          } catch {
            setModuleOrder([]);
          }
        } catch {
          setActiveAddons([]);
        }
      }
      setAddonsLoaded(true);
    };
    loadAddons();
  }, [user]);

  // Check if user has a specific add-on
  const hasAddon = (addonSlug) => {
    if (isSuperAdmin()) return true;
    return activeAddons.includes(addonSlug);
  };

  // Module configurations for dynamic sidebar rendering
  const moduleConfigs = {
    vastgoed_beheer: { name: 'Vastgoed Beheer', items: vastgoedNavItems, icon: Building2 },
    hrm: { name: 'HRM Module', items: hrmNavItems, icon: Users },
    autodealer: { name: 'Auto Dealer', items: autoDealerNavItems, icon: Car },
    beauty: { name: 'Beauty Spa', items: beautySpaItems, icon: Sparkles },
    pompstation: { name: 'Pompstation', items: pompstationNavItems, icon: Zap },
    boekhouding: { name: 'Boekhouding', items: boekhoudingNavItems, icon: FileText, alwaysShow: true },
  };

  // Get modules in the correct order based on user preference
  const getOrderedModules = () => {
    const defaultOrder = ['vastgoed_beheer', 'hrm', 'autodealer', 'beauty', 'pompstation', 'boekhouding'];
    
    if (moduleOrder.length === 0) {
      return defaultOrder;
    }
    
    // Start with user's saved order
    const ordered = [...moduleOrder];
    
    // Add any modules not in the saved order (new modules)
    defaultOrder.forEach(slug => {
      if (!ordered.includes(slug)) {
        ordered.push(slug);
      }
    });
    
    return ordered;
  };

  // Get visible nav items based on active add-ons
  const getVisibleNavItems = () => {
    const vastgoedItems = vastgoedNavItems.filter(item => hasAddon(item.addon));
    const hrmItems = hrmNavItems.filter(item => hasAddon(item.addon));
    const autoDealerItems = autoDealerNavItems.filter(item => hasAddon(item.addon));
    return [...vastgoedItems, ...hrmItems, ...autoDealerItems];
  };

  // Auto-expand settings menu if on settings or subscription page
  useEffect(() => {
    if (location.pathname === '/instellingen' || location.pathname === '/abonnement') {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Workspace popup handlers
  const openWorkspaceDialog = async () => {
    try {
      const res = await getWorkspaceSettings();
      setWorkspaceData(res.data);
      if (res.data?.workspace) {
        setWorkspaceForm({
          name: res.data.workspace.name || '',
          slug: res.data.workspace.slug || ''
        });
        if (res.data.domain) {
          setDomainForm({
            domain_type: res.data.domain.type || 'subdomain',
            subdomain: res.data.domain.subdomain || '',
            custom_domain: res.data.domain.custom_domain || ''
          });
        }
      }
      setWorkspaceDialogOpen(true);
    } catch (error) {
      toast.error('Kon workspace gegevens niet laden');
    }
  };

  const handleSaveWorkspace = async () => {
    setSavingWorkspace(true);
    try {
      await updateWorkspaceSettings(workspaceForm);
      await updateWorkspaceDomain(domainForm);
      toast.success('Workspace instellingen opgeslagen');
      setWorkspaceDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd');
  };

  const getPortalUrl = () => {
    if (!workspaceData?.domain) return '';
    const d = workspaceData.domain;
    if (d.type === 'subdomain') {
      return `https://${d.full_subdomain || `${d.subdomain}.facturatie.sr`}`;
    }
    return d.custom_domain ? `https://${d.custom_domain}` : '';
  };

  const isSubscriptionActive = hasActiveSubscription();
  const showTrialBadge = user?.subscription_status === 'trial';
  const showExpiredBadge = user?.subscription_status === 'expired';

  return (
    <div className="app-container grain-overlay">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo and Toggle Button */}
        <div className={`sidebar-logo ${isCollapsed ? 'p-4' : 'p-5'}`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
            {/* Logo */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              {branding?.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.portal_name || 'Logo'} 
                  className={`${isCollapsed ? 'h-8 w-8' : 'h-8 w-auto max-w-[140px]'} object-contain`}
                />
              ) : user?.logo && !isSuperAdmin() ? (
                <img 
                  src={user.logo} 
                  alt="Bedrijfslogo" 
                  className={`${isCollapsed ? 'h-8 w-8' : 'h-8 w-auto max-w-[140px]'} object-contain`}
                />
              ) : (
                <img 
                  src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                  alt="Facturatie N.V." 
                  className={`${isCollapsed ? 'hidden' : 'h-5 w-auto'}`}
                />
              )}
            </div>
            {/* Toggle Button - ONLY visible on desktop (lg and up) */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 transition-all duration-200 flex-shrink-0"
              title={isCollapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {/* Admin link - only for superadmin */}
          {isSuperAdmin() && (
            <NavLink
              to="/app/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-3' : ''}`}
              data-testid="nav-admin"
              title="Beheerder"
            >
              <Crown className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Beheerder</span>}
              {!isCollapsed && <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20">Admin</Badge>}
            </NavLink>
          )}

          {/* Customer navigation - only for non-superadmin users with active add-ons */}
          {!isSuperAdmin() && addonsLoaded && (
            <>
              {/* Dynamic Module Sections - rendered in user's preferred order */}
              {getOrderedModules().map((moduleSlug, index) => {
                const config = moduleConfigs[moduleSlug];
                if (!config) return null;
                
                // Check if module should be shown
                const shouldShow = config.alwaysShow || hasAddon(moduleSlug);
                if (!shouldShow) return null;
                
                const ModuleIcon = config.icon;
                const isFirst = index === 0;
                
                return (
                  <div key={moduleSlug} className="mb-1">
                    {!isCollapsed && (
                      <div className={`module-group-header ${isFirst ? 'mt-2' : ''}`}>
                        <ModuleIcon className="w-3.5 h-3.5" />
                        {config.name}
                        {moduleSlug === 'boekhouding' && <span className="text-emerald-400 font-normal">(Gratis)</span>}
                      </div>
                    )}
                    {isCollapsed && !isFirst && <div className="mt-3 mb-3 mx-2 border-t border-primary/10" />}
                    {config.items.filter(item => config.alwaysShow || hasAddon(item.addon)).map((item) => (
                      item.external ? (
                        <a
                          key={item.to}
                          href={item.to}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setSidebarOpen(false)}
                          className={`nav-item ${!isSubscriptionActive && !isSuperAdmin() && !config.alwaysShow ? 'opacity-50 pointer-events-none' : ''} ${isCollapsed ? 'justify-center px-3' : ''}`}
                          data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                          title={item.label}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                          {!isCollapsed && <ExternalLink className="w-4 h-4 ml-auto opacity-50" />}
                        </a>
                      ) : (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSubscriptionActive && !isSuperAdmin() && !config.alwaysShow ? 'opacity-50 pointer-events-none' : ''} ${isCollapsed ? 'justify-center px-3' : ''}`}
                          data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                          title={item.label}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                          {!isCollapsed && <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />}
                        </NavLink>
                      )
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* Settings dropdown - for customers only */}
          {!isSuperAdmin() && (
            <div className="mt-2">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`nav-item w-full justify-between ${(location.pathname === '/instellingen' || location.pathname === '/abonnement' || location.pathname === '/app/workspace' || location.pathname === '/app/betaalmethodes') ? 'active' : ''} ${isCollapsed ? 'justify-center px-3' : ''}`}
                data-testid="nav-instellingen-dropdown"
                title="Instellingen"
              >
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>Instellingen</span>}
                </div>
                {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />}
              </button>
              
              {/* Dropdown items */}
              {!isCollapsed && (
                <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 mt-1 space-y-1">
                    {/* Workspace Settings - for customers only */}
                    {!isSuperAdmin() && (
                      <NavLink
                        to="/app/workspace"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `nav-item text-sm ${isActive ? 'active' : ''}`}
                        data-testid="nav-workspace"
                      >
                        <Users className="w-4 h-4" />
                        <span>Workspace & Team</span>
                      </NavLink>
                    )}
                    <NavLink
                      to="/app/betaalmethodes"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `nav-item text-sm ${isActive ? 'active' : ''}`}
                      data-testid="nav-betaalmethodes"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Betaalmethodes</span>
                    </NavLink>
                    <NavLink
                      to="/app/abonnement"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `nav-item text-sm ${isActive ? 'active' : ''}`}
                      data-testid="nav-abonnement"
                    >
                      <Package className="w-4 h-4" />
                      <span>Mijn Modules</span>
                      {showExpiredBadge && (
                        <Badge className="ml-auto text-[10px] bg-red-500/10 text-red-500 border-red-500/20">!</Badge>
                      )}
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Super Admin badge at bottom */}
        {isSuperAdmin() && !isCollapsed && (
          <div className="p-4 border-t border-border mt-auto flex-shrink-0">
            <Badge className="w-full justify-center bg-primary/10 text-primary border-primary/20">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className={`main-content ${isCollapsed ? 'main-content-expanded' : ''}`}>
        {/* Desktop header with notifications */}
        <header className={`desktop-header hidden lg:flex px-6 py-2.5 items-center justify-between header-glass ${isCollapsed ? 'desktop-header-expanded' : ''}`}>
          {/* Left side - User info & Workspace/Portal buttons */}
          <div className="flex items-center gap-3">
            {/* User info - Compact Modern Style */}
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <span className="text-xs font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs text-foreground truncate max-w-[120px]">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
              </div>
            </div>
            
            {/* Workspace & Portal buttons - Compact Style */}
            {!isSuperAdmin() && (
              <div className="flex items-center gap-1.5">
                {/* Workspace button */}
                {workspace && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openWorkspaceDialog}
                    className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 hover:border-emerald-500/30 transition-all"
                    data-testid="workspace-btn"
                    title="Workspace Beheren"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </Button>
                )}
                {/* Tenant Portal button - only if vastgoed_beheer addon is active */}
                {hasAddon('vastgoed_beheer') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open('/huurder/login', '_blank')}
                    className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 hover:border-blue-500/30 transition-all"
                    data-testid="tenant-portal-btn"
                    title="Huurders Portaal"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {/* Employee Portal button - only if hrm addon is active */}
                {hasAddon('hrm') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open('/werknemer/login', '_blank')}
                    className="w-8 h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border border-purple-500/20 hover:border-purple-500/30 transition-all"
                    data-testid="employee-portal-btn"
                    title="Werknemers Portaal"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Theme, Notifications, Logout - Compact Style */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/10 hover:border-slate-500/20 transition-all"
              data-testid="theme-toggle-btn"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {!isSuperAdmin() && <NotificationBell />}
            <Button 
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/10 hover:border-red-500/20 transition-all text-xs font-medium"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Uitloggen
            </Button>
          </div>
        </header>

        {/* Mobile header - Compact Style */}
        <header className="mobile-header lg:hidden px-4 py-2.5 flex items-center justify-between header-glass">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {user?.logo && !isSuperAdmin() ? (
              <img 
                src={user.logo} 
                alt="Bedrijfslogo" 
                className="h-6 w-auto max-w-[100px] object-contain"
              />
            ) : (
              <img 
                src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                alt="Facturatie N.V." 
                className="h-4 w-auto"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-300"
              data-testid="theme-toggle-btn-mobile"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {!isSuperAdmin() && <NotificationBell />}
            <Button 
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600"
              onClick={handleLogout}
              data-testid="logout-btn-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* AI Assistant - only for customers */}
      {!isSuperAdmin() && <AIAssistant />}

      {/* Workspace Management Dialog */}
      <Dialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Workspace Beheren
            </DialogTitle>
            <DialogDescription>Beheer uw workspace instellingen en domein</DialogDescription>
          </DialogHeader>
          
          {workspaceData?.has_workspace ? (
            <div className="space-y-6 py-4">
              {/* Portal URL */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800 mb-2">Uw Portaal URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded text-sm font-mono truncate">
                    {getPortalUrl()}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(getPortalUrl())}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <a href={getPortalUrl()} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                </div>
              </div>

              {/* Workspace Name & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workspace Naam</Label>
                  <Input
                    value={workspaceForm.name}
                    onChange={(e) => setWorkspaceForm({...workspaceForm, name: e.target.value})}
                    placeholder="Mijn Bedrijf"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    value={workspaceForm.slug}
                    onChange={(e) => setWorkspaceForm({...workspaceForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    placeholder="mijn-bedrijf"
                  />
                </div>
              </div>

              {/* Domain Settings */}
              <div className="space-y-3">
                <Label>Domein Type</Label>
                <Select value={domainForm.domain_type} onValueChange={(v) => setDomainForm({...domainForm, domain_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subdomain">Subdomein (gratis)</SelectItem>
                    <SelectItem value="custom">Eigen Domein</SelectItem>
                  </SelectContent>
                </Select>

                {domainForm.domain_type === 'subdomain' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={domainForm.subdomain}
                      onChange={(e) => setDomainForm({...domainForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                      placeholder={workspaceForm.slug || 'mijn-bedrijf'}
                      className="flex-1"
                    />
                    <span className="text-gray-500 text-sm">.facturatie.sr</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={domainForm.custom_domain}
                      onChange={(e) => setDomainForm({...domainForm, custom_domain: e.target.value})}
                      placeholder="portal.jouwbedrijf.nl"
                    />
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      Maak een A-record aan dat wijst naar {workspaceData?.domain?.server_ip || '72.62.174.117'}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick link to full settings */}
              <div className="pt-2 border-t">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-emerald-600"
                  onClick={() => { setWorkspaceDialogOpen(false); navigate('/app/workspace'); }}
                >
                  Naar volledige workspace instellingen →
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Geen workspace gevonden</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkspaceDialogOpen(false)}>Sluiten</Button>
            {workspaceData?.has_workspace && (
              <Button onClick={handleSaveWorkspace} disabled={savingWorkspace}>
                {savingWorkspace ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
