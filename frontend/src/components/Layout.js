import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyAddons } from '../lib/api';
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
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import NotificationBell from './NotificationBell';
import AIAssistant from './AIAssistant';

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
];

export default function Layout() {
  const { user, logout, hasActiveSubscription, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAddons, setActiveAddons] = useState([]);
  const [addonsLoaded, setAddonsLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Load user's active add-ons
  useEffect(() => {
    const loadAddons = async () => {
      if (!isSuperAdmin() && user) {
        try {
          const res = await getMyAddons();
          const activeSlugs = res.data
            .filter(a => a.status === 'active')
            .map(a => a.addon_slug);
          setActiveAddons(activeSlugs);
        } catch (error) {
          console.error('Error loading addons:', error);
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

  // Get visible nav items based on active add-ons
  const getVisibleNavItems = () => {
    const vastgoedItems = vastgoedNavItems.filter(item => hasAddon(item.addon));
    const hrmItems = hrmNavItems.filter(item => hasAddon(item.addon));
    return [...vastgoedItems, ...hrmItems];
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

  const isSubscriptionActive = hasActiveSubscription();
  const showTrialBadge = user?.subscription_status === 'trial';
  const showExpiredBadge = user?.subscription_status === 'expired';
  
  // Get branding from context
  const { branding, workspace } = useAuth();

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
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Logo - Use workspace branding */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center">
            {branding?.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt={branding.portal_name || 'Logo'} 
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : user?.logo && !isSuperAdmin() ? (
              <img 
                src={user.logo} 
                alt="Bedrijfslogo" 
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                  alt="Facturatie N.V." 
                  className="h-5 w-auto"
                />
                {workspace && !isSuperAdmin() && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {branding?.portal_name || workspace.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subscription Status Banner */}
        {!isSuperAdmin() && (showTrialBadge || showExpiredBadge) && (
          <div className={`mx-4 mt-4 p-3 rounded-lg ${showExpiredBadge ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
            <div className="flex items-center gap-2">
              <Package className={`w-4 h-4 ${showExpiredBadge ? 'text-red-500' : 'text-blue-500'}`} />
              <span className={`text-xs font-medium ${showExpiredBadge ? 'text-red-500' : 'text-blue-500'}`}>
                {showExpiredBadge ? 'Abonnement verlopen' : 'Proefperiode'}
              </span>
            </div>
            <NavLink 
              to="/abonnement" 
              className="text-xs text-muted-foreground hover:underline mt-1 block"
              onClick={() => setSidebarOpen(false)}
            >
              {showExpiredBadge ? 'Activeer nu →' : 'Bekijk details →'}
            </NavLink>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {/* Admin link - only for superadmin */}
          {isSuperAdmin() && (
            <>
              <NavLink
                to="/app/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-testid="nav-admin"
              >
                <Crown className="w-5 h-5" />
                <span>Beheerder</span>
                <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20">Admin</Badge>
              </NavLink>
            </>
          )}

          {/* Customer navigation - only for non-superadmin users with active add-ons */}
          {!isSuperAdmin() && addonsLoaded && (
            <>
              {/* Vastgoed Beheer Section */}
              {hasAddon('vastgoed_beheer') && (
                <div className="mb-2">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vastgoed Beheer</p>
                  </div>
                  {vastgoedNavItems.filter(item => hasAddon(item.addon)).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSubscriptionActive && !isSuperAdmin() ? 'opacity-50 pointer-events-none' : ''}`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
                    </NavLink>
                  ))}
                </div>
              )}

              {/* HRM Section */}
              {hasAddon('hrm') && (
                <div className="mb-2">
                  <div className="px-3 py-2 mt-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HRM Module</p>
                  </div>
                  {hrmNavItems.filter(item => hasAddon(item.addon)).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isSubscriptionActive && !isSuperAdmin() ? 'opacity-50 pointer-events-none' : ''}`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          )}

          {/* No add-ons message for customers */}
          {!isSuperAdmin() && addonsLoaded && getVisibleNavItems().length === 0 && (
            <div className="px-3 py-4 text-center">
              <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Geen actieve modules</p>
              <NavLink 
                to="/app/abonnement" 
                className="text-xs text-primary hover:underline mt-1 block"
                onClick={() => setSidebarOpen(false)}
              >
                Bekijk beschikbare add-ons →
              </NavLink>
            </div>
          )}

          {/* Mijn Modules link - always visible for customers */}
          {!isSuperAdmin() && (
            <NavLink
              to="/app/mijn-modules"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-mijn-modules"
            >
              <Boxes className="w-5 h-5" />
              <span>Mijn Modules</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
            </NavLink>
          )}

          {/* Settings dropdown - for customers only */}
          {!isSuperAdmin() && (
            <div className="mt-2">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`nav-item w-full justify-between ${(location.pathname === '/instellingen' || location.pathname === '/abonnement' || location.pathname === '/app/workspace') ? 'active' : ''}`}
                data-testid="nav-instellingen-dropdown"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <span>Instellingen</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown items */}
              <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
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
                  {/* Huurinstellingen - only visible with Vastgoed Beheer add-on */}
                  {hasAddon('vastgoed_beheer') && (
                    <NavLink
                      to="/app/instellingen"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `nav-item text-sm ${isActive ? 'active' : ''}`}
                      data-testid="nav-instellingen-sub"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Huurinstellingen</span>
                    </NavLink>
                  )}
                  <NavLink
                    to="/app/abonnement"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `nav-item text-sm ${isActive ? 'active' : ''}`}
                    data-testid="nav-abonnement"
                  >
                    <Package className="w-4 h-4" />
                    <span>Abonnement</span>
                    {showExpiredBadge && (
                      <Badge className="ml-auto text-[10px] bg-red-500/10 text-red-500 border-red-500/20">!</Badge>
                    )}
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* User section - fixed at bottom */}
        <div className="p-4 border-t border-border mt-auto flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          {isSuperAdmin() && (
            <Badge className="mt-3 w-full justify-center bg-primary/10 text-primary border-primary/20">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Desktop header with notifications */}
        <header className="hidden lg:flex sticky top-0 z-20 header-glass px-8 py-3 items-center justify-end gap-3 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="theme-toggle"
            data-testid="theme-toggle-btn"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          {!isSuperAdmin() && <NotificationBell />}
        </header>

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 header-glass px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="theme-toggle w-9 h-9"
              data-testid="theme-toggle-btn-mobile"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {!isSuperAdmin() && <NotificationBell />}
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* AI Assistant - only for customers */}
      {!isSuperAdmin() && <AIAssistant />}
    </div>
  );
}
