import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyAddons, getWorkspaceSettings, updateWorkspaceSettings, updateWorkspaceDomain, getSidebarOrder, updateUserProfile, uploadProfilePhoto } from '../lib/api';
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
  BookOpen,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Gamepad2,
  Link
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

// Server IP from environment variable for DNS instructions
const SERVER_IP = process.env.REACT_APP_SERVER_IP || '72.62.174.80';

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
  { to: '/app/boekhouding/activa', icon: Building2, label: 'Vaste Activa', addon: 'boekhouding' },
  { to: '/app/boekhouding/kostenplaatsen', icon: Target, label: 'Kostenplaatsen', addon: 'boekhouding' },
  { to: '/app/boekhouding/rapportages', icon: BarChart3, label: 'Rapportages', addon: 'boekhouding' },
  { to: '/app/boekhouding/handleiding', icon: BookOpen, label: 'Handleiding', addon: 'boekhouding' },
];

// Inkoop module navigation - Deel van Boekhouding
const inkoopNavItems = [
  { to: '/app/inkoop', icon: LayoutDashboard, label: 'Inkoop Dashboard', addon: 'boekhouding' },
  { to: '/app/inkoop/leveranciers', icon: Building2, label: 'Leveranciers', addon: 'boekhouding' },
  { to: '/app/inkoop/offertes', icon: FileText, label: 'Inkoopoffertes', addon: 'boekhouding' },
  { to: '/app/inkoop/orders', icon: ShoppingCart, label: 'Inkooporders', addon: 'boekhouding' },
  { to: '/app/inkoop/ontvangsten', icon: Package, label: 'Goederenontvangst', addon: 'boekhouding' },
];

// Verkoop module navigation - Deel van Boekhouding
const verkoopNavItems = [
  { to: '/app/verkoop', icon: LayoutDashboard, label: 'Verkoop Dashboard', addon: 'boekhouding' },
  { to: '/app/verkoop/klanten', icon: Users, label: 'Klanten', addon: 'boekhouding' },
  { to: '/app/verkoop/offertes', icon: FileText, label: 'Verkoopoffertes', addon: 'boekhouding' },
  { to: '/app/verkoop/orders', icon: ShoppingCart, label: 'Verkooporders', addon: 'boekhouding' },
  { to: '/app/verkoop/prijslijsten', icon: Banknote, label: 'Prijslijsten', addon: 'boekhouding' },
];

// Voorraad module navigation - Deel van Boekhouding
const voorraadNavItems = [
  { to: '/app/voorraad', icon: LayoutDashboard, label: 'Voorraad Dashboard', addon: 'boekhouding' },
  { to: '/app/voorraad/artikelen', icon: Package, label: 'Artikelen', addon: 'boekhouding' },
  { to: '/app/voorraad/magazijnen', icon: Building2, label: 'Magazijnen', addon: 'boekhouding' },
  { to: '/app/voorraad/mutaties', icon: Zap, label: 'Voorraadmutaties', addon: 'boekhouding' },
  { to: '/app/voorraad/inventarisatie', icon: Target, label: 'Inventarisatie', addon: 'boekhouding' },
];

// Projecten module navigation - Deel van Boekhouding
const projectenNavItems = [
  { to: '/app/projecten', icon: LayoutDashboard, label: 'Projecten Dashboard', addon: 'boekhouding' },
  { to: '/app/projecten/overzicht', icon: Briefcase, label: 'Alle Projecten', addon: 'boekhouding' },
  { to: '/app/projecten/uren', icon: Clock, label: 'Urenregistratie', addon: 'boekhouding' },
];

// Suribet Retailer Management module navigation
const suribetNavItems = [
  { to: '/app/suribet', icon: LayoutDashboard, label: 'Dashboard', addon: 'suribet' },
  { to: '/app/suribet/dagrapporten', icon: FileText, label: 'Dagrapporten', addon: 'suribet' },
  { to: '/app/suribet/uitbetalingen', icon: Banknote, label: 'Uitbetalingen', addon: 'suribet' },
  { to: '/app/suribet/machines', icon: Gamepad2, label: 'Machines', addon: 'suribet' },
  { to: '/app/suribet/kasboek', icon: Wallet, label: 'Kasboek', addon: 'suribet' },
  { to: '/app/suribet/werknemers', icon: Users2, label: 'Werknemers', addon: 'suribet' },
  { to: '/app/suribet/loonuitbetaling', icon: Banknote, label: 'Loonuitbetaling', addon: 'suribet' },
  { to: '/app/suribet/portaal', icon: Link, label: 'Suribet', addon: 'suribet', isPortalLink: true },
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
  
  // User dropdown state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  
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
    inkoop: { name: 'Inkoop', items: inkoopNavItems, icon: ShoppingCart, alwaysShow: true },
    verkoop: { name: 'Verkoop', items: verkoopNavItems, icon: Banknote, alwaysShow: true },
    voorraad: { name: 'Voorraad', items: voorraadNavItems, icon: Package, alwaysShow: true },
    projecten: { name: 'Projecten', items: projectenNavItems, icon: Briefcase, alwaysShow: true },
    suribet: { name: 'Suribet', items: suribetNavItems, icon: Gamepad2 },
  };

  // Get modules in the correct order based on user preference
  const getOrderedModules = () => {
    const defaultOrder = ['vastgoed_beheer', 'suribet', 'hrm', 'autodealer', 'beauty', 'pompstation', 'boekhouding', 'inkoop', 'verkoop', 'voorraad', 'projecten'];
    
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

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* White Sidebar - Connected to Header */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo Area - Same height as header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-inner">
            {/* Logo */}
            {!isCollapsed ? (
              branding?.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.portal_name || 'Logo'} 
                  className="h-7 w-auto max-w-[140px] object-contain"
                />
              ) : user?.logo && !isSuperAdmin() ? (
                <img 
                  src={user.logo} 
                  alt="Bedrijfslogo" 
                  className="h-7 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <>
                  {/* Light mode logo (dark text) */}
                  <img 
                    src="https://customer-assets.emergentagent.com/job_e0e6d0f3-5640-4b42-9035-36d9fba2aead/artifacts/sn638vwv_logo_dark.webp" 
                    alt="FACTURATIE" 
                    className="h-8 w-auto object-contain dark:hidden"
                  />
                  {/* Dark mode logo (light text) */}
                  <img 
                    src="https://customer-assets.emergentagent.com/job_e0e6d0f3-5640-4b42-9035-36d9fba2aead/artifacts/4jn2bbd5_logo_light.webp" 
                    alt="FACTURATIE" 
                    className="h-8 w-auto object-contain hidden dark:block"
                  />
                </>
              )
            ) : (
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-base">F</span>
              </div>
            )}
          </div>
          {/* Toggle Button */}
          {!isCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="sidebar-toggle-btn hidden lg:flex"
              title="Sidebar inklappen"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="sidebar-toggle-btn hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-600"
              style={{ width: '24px', height: '24px', borderRadius: '50%' }}
              title="Sidebar uitklappen"
            >
              <PanelLeftOpen className="w-3 h-3 text-slate-600" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Admin link - only for superadmin */}
          {isSuperAdmin() && (
            <NavLink
              to="/app/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`}
              data-testid="nav-admin"
              title="Beheerder"
            >
              <Crown className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Beheerder</span>}
              {!isCollapsed && <Badge className="ml-auto text-[10px] bg-amber-100 text-amber-700 border-amber-200">Admin</Badge>}
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
                          className={`nav-item ${!isSubscriptionActive && !config.alwaysShow ? 'opacity-50 pointer-events-none' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                          data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                          title={item.label}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                          {!isCollapsed && <ExternalLink className="w-4 h-4 ml-auto opacity-40" />}
                        </a>
                      ) : (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSubscriptionActive && !config.alwaysShow ? 'opacity-50 pointer-events-none' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                          data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                          title={item.label}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                        </NavLink>
                      )
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* Settings dropdown */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`nav-item w-full ${(location.pathname === '/app/instellingen' || location.pathname === '/app/abonnement' || location.pathname === '/app/workspace' || location.pathname === '/app/betaalmethodes') ? 'active' : ''} ${isCollapsed ? 'justify-center' : 'justify-between'}`}
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
              <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pl-4 mt-2 space-y-1">
                  {/* System Settings */}
                  <NavLink
                    to="/app/instellingen"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item text-sm py-2.5 ${isActive ? 'active' : ''}`}
                    data-testid="nav-systeeminstellingen"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Systeeminstellingen</span>
                  </NavLink>
                  {/* Workspace Settings */}
                  <NavLink
                    to="/app/workspace"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item text-sm py-2.5 ${isActive ? 'active' : ''}`}
                    data-testid="nav-workspace"
                  >
                    <Users className="w-4 h-4" />
                    <span>Workspace & Team</span>
                  </NavLink>
                  <NavLink
                    to="/app/abonnement"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item text-sm py-2.5 ${isActive ? 'active' : ''}`}
                    data-testid="nav-abonnement"
                  >
                    <Package className="w-4 h-4" />
                    <span>Mijn Modules</span>
                    {showExpiredBadge && (
                      <Badge className="ml-auto text-[10px] bg-red-100 text-red-600 border-red-200">!</Badge>
                    )}
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className={`main-content ${isCollapsed ? 'main-content-expanded' : ''}`}>
        {/* Desktop header - Modern Minimal Style */}
        <header className={`desktop-header hidden lg:flex`}>
          {/* Left side - User Profile with Dropdown */}
          <div className="flex items-center gap-4">
            {/* User Profile - Modern Pill Style with Dropdown */}
            <div className="user-dropdown-container" ref={userDropdownRef}>
              <div 
                className="header-user-profile user-dropdown-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                {user?.profile_photo ? (
                  <img 
                    src={user?.profile_photo} 
                    alt={user?.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="header-user-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="header-user-info">
                  <span className="header-user-name">{user?.name}</span>
                  <span className="header-user-email">{user?.email}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {/* Dropdown Menu */}
              <div className={`user-dropdown-menu ${userDropdownOpen ? 'open' : ''}`}>
                <button className="user-dropdown-item" onClick={() => { setUserDropdownOpen(false); navigate('/app/instellingen'); }}>
                  <Settings className="w-4 h-4" />
                  <span>Systeeminstellingen</span>
                </button>
                <button className="user-dropdown-item" onClick={() => { setUserDropdownOpen(false); navigate('/app/workspace'); }}>
                  <Users className="w-4 h-4" />
                  <span>Workspace & Team</span>
                </button>
                <button className="user-dropdown-item" onClick={() => { setUserDropdownOpen(false); navigate('/app/abonnement'); }}>
                  <Package className="w-4 h-4" />
                  <span>Mijn Modules</span>
                </button>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
                  <LogOut className="w-4 h-4" />
                  <span>Uitloggen</span>
                </button>
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            {!isSuperAdmin() && (
              <div className="flex items-center gap-2">
                {workspace && (
                  <button
                    onClick={openWorkspaceDialog}
                    className="header-quick-btn emerald"
                    data-testid="workspace-btn"
                    title="Workspace Beheren"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                )}
                {hasAddon('vastgoed_beheer') && (
                  <button
                    onClick={() => window.open('/huurder/login', '_blank')}
                    className="header-quick-btn blue"
                    data-testid="tenant-portal-btn"
                    title="Huurders Portaal"
                  >
                    <Building2 className="w-4 h-4" />
                  </button>
                )}
                {hasAddon('hrm') && (
                  <button
                    onClick={() => window.open('/werknemer/login', '_blank')}
                    className="header-quick-btn purple"
                    data-testid="employee-portal-btn"
                    title="Werknemers Portaal"
                  >
                    <Briefcase className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Actions */}
          <div className="header-actions">
            <button
              onClick={toggleDarkMode}
              className="header-action-btn"
              data-testid="theme-toggle-btn"
              title={darkMode ? 'Lichte modus' : 'Donkere modus'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {!isSuperAdmin() && <NotificationBell />}
            <button 
              className="logout-btn"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Uitloggen</span>
            </button>
          </div>
        </header>

        {/* Mobile header - White matching sidebar */}
        <header className="mobile-header lg:hidden">
          <div className="mobile-header-left">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-btn"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Light mode logo */}
            <img 
              src="https://customer-assets.emergentagent.com/job_e0e6d0f3-5640-4b42-9035-36d9fba2aead/artifacts/sn638vwv_logo_dark.webp" 
              alt="FACTURATIE" 
              className="h-6 w-auto object-contain dark:hidden"
            />
            {/* Dark mode logo */}
            <img 
              src="https://customer-assets.emergentagent.com/job_e0e6d0f3-5640-4b42-9035-36d9fba2aead/artifacts/4jn2bbd5_logo_light.webp" 
              alt="FACTURATIE" 
              className="h-6 w-auto object-contain hidden dark:block"
            />
          </div>
          <div className="mobile-header-actions">
            <button
              onClick={toggleDarkMode}
              className="header-action-btn"
              data-testid="theme-toggle-btn-mobile"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!isSuperAdmin() && <NotificationBell />}
            <button 
              className="header-action-btn danger"
              onClick={handleLogout}
              data-testid="logout-btn-mobile"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
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
                      Maak een A-record aan dat wijst naar {workspaceData?.domain?.server_ip || SERVER_IP}
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
