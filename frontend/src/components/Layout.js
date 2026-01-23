import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Crown,
  Package,
  Settings,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// Navigation items for customers only (not for superadmin)
const customerNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Users, label: 'Huurders' },
  { to: '/apartments', icon: Building2, label: 'Appartementen' },
  { to: '/payments', icon: CreditCard, label: 'Betalingen' },
  { to: '/facturen', icon: FileText, label: 'Facturen' },
  { to: '/deposits', icon: Wallet, label: 'Borg' },
  { to: '/kasgeld', icon: Banknote, label: 'Kasgeld' },
  { to: '/onderhoud', icon: Wrench, label: 'Onderhoud' },
  { to: '/werknemers', icon: Users2, label: 'Werknemers' },
];

export default function Layout() {
  const { user, logout, hasActiveSubscription, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center">
            {user?.logo && !isSuperAdmin() ? (
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
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-testid="nav-admin"
              >
                <Crown className="w-5 h-5" />
                <span>Beheerder</span>
                <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20">Admin</Badge>
              </NavLink>
              <NavLink
                to="/instellingen"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-testid="nav-instellingen"
              >
                <Settings className="w-5 h-5" />
                <span>Instellingen</span>
              </NavLink>
            </>
          )}

          {/* Customer navigation - only for non-superadmin users */}
          {!isSuperAdmin() && customerNavItems.map((item) => (
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

          {/* Subscription link - for customers only */}
          {!isSuperAdmin() && (
            <NavLink
              to="/abonnement"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-abonnement"
            >
              <Package className="w-5 h-5" />
              <span>Abonnement</span>
              {showExpiredBadge && (
                <Badge className="ml-auto text-[10px] bg-red-500/10 text-red-500 border-red-500/20">!</Badge>
              )}
            </NavLink>
          )}

          {/* Settings link - for customers only */}
          {!isSuperAdmin() && (
            <NavLink
              to="/instellingen"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-instellingen-customer"
            >
              <Settings className="w-5 h-5" />
              <span>Instellingen</span>
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
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
            <Badge className="mb-3 w-full justify-center bg-primary/10 text-primary border-primary/20">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          )}
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 glass-header px-4 py-3 flex items-center gap-4">
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
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
