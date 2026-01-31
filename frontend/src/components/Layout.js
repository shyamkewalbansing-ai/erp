import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyAddons, getWorkspaceSettings, updateWorkspaceSettings, updateWorkspaceDomain } from '../lib/api';
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
  ShoppingCart
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

// Navigation items for Auto Dealer add-on
const autoDealerNavItems = [
  { to: '/app/autodealer', icon: LayoutDashboard, label: 'Auto Dashboard', addon: 'autodealer' },
  { to: '/app/autodealer/voertuigen', icon: Car, label: 'Voertuigen', addon: 'autodealer' },
  { to: '/app/autodealer/klanten', icon: Users, label: 'Klanten', addon: 'autodealer' },
  { to: '/app/autodealer/verkopen', icon: ShoppingCart, label: 'Verkopen', addon: 'autodealer' },
];

export default function Layout() {
  const { user, logout, hasActiveSubscription, isSuperAdmin, workspace, branding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAddons, setActiveAddons] = useState([]);
  const [addonsLoaded, setAddonsLoaded] = useState(false);
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

  // Load user's active add-ons
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
              <img 
                src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                alt="Facturatie N.V." 
                className="h-5 w-auto"
              />
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

              {/* Auto Dealer Section */}
              {hasAddon('autodealer') && (
                <div className="mb-2">
                  <div className="px-3 py-2 mt-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto Dealer</p>
                  </div>
                  {autoDealerNavItems.filter(item => hasAddon(item.addon)).map((item) => (
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
                className={`nav-item w-full justify-between ${(location.pathname === '/instellingen' || location.pathname === '/abonnement' || location.pathname === '/app/workspace' || location.pathname === '/app/betaalmethodes') ? 'active' : ''}`}
                data-testid="nav-instellingen-dropdown"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <span>Instellingen</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown items */}
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

        {/* Super Admin badge at bottom */}
        {isSuperAdmin() && (
          <div className="p-4 border-t border-border mt-auto flex-shrink-0">
            <Badge className="w-full justify-center bg-primary/10 text-primary border-primary/20">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Desktop header with notifications */}
        <header className="desktop-header hidden lg:flex header-glass px-8 py-3 items-center justify-between border-b border-border/50">
          {/* Left side - User info & Workspace/Portal buttons */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate max-w-[150px]">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</p>
              </div>
            </div>
            
            {/* Workspace & Portal buttons */}
            {!isSuperAdmin() && (
              <div className="flex items-center gap-2">
                {/* Workspace button */}
                {workspace && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openWorkspaceDialog}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    data-testid="workspace-btn"
                    title="Workspace Beheren"
                  >
                    <Globe className="w-4 h-4" />
                  </Button>
                )}
                {/* Tenant Portal button - only if vastgoed_beheer addon is active */}
                {hasAddon('vastgoed_beheer') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open('/huurder/login', '_blank')}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    data-testid="tenant-portal-btn"
                    title="Huurders Portaal"
                  >
                    <Building2 className="w-4 h-4" />
                  </Button>
                )}
                {/* Employee Portal button - only if hrm addon is active */}
                {hasAddon('hrm') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open('/werknemer/login', '_blank')}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    data-testid="employee-portal-btn"
                    title="Werknemers Portaal"
                  >
                    <Briefcase className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Theme, Notifications, Logout */}
          <div className="flex items-center gap-3">
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
            <Button 
              variant="outline" 
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </header>

        {/* Mobile header */}
        <header className="mobile-header lg:hidden header-glass px-4 py-3 flex items-center justify-between">
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
            <Button 
              variant="outline" 
              size="icon"
              className="border-red-200 text-red-600 hover:bg-red-50 w-9 h-9"
              onClick={handleLogout}
              data-testid="logout-btn-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">
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
                      Maak een A-record aan dat wijst naar {workspaceData?.domain?.server_ip || '45.79.123.456'}
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
