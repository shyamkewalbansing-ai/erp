import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantAuthProvider, useTenantAuth } from "./context/TenantAuthContext";
import React, { lazy, Suspense, memo, useEffect } from "react";
import { preloadCriticalData } from "./lib/api";
import { initPerformanceMonitoring, prefetch } from "./lib/performance";

// Critical pages - load immediately
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import Layout from "./components/Layout";
import "@/App.css";

// Initialize performance monitoring and preload critical data
initPerformanceMonitoring();

// Preload critical data immediately
preloadCriticalData();

// Prefetch commonly used pages when browser is completely idle (after first paint)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for better performance timing
  const prefetchPages = () => {
    prefetch(() => import("./pages/Dashboard"));
    prefetch(() => import("./pages/ModulesPage"));
    prefetch(() => import("./pages/Login"));
  };
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetchPages, { timeout: 5000 });
  } else {
    setTimeout(prefetchPages, 3000);
  }
}

// Tenant Portal pages
const TenantLogin = lazy(() => import("./pages/TenantLogin"));
const TenantDashboard = lazy(() => import("./pages/TenantDashboard"));

// Lazy load non-critical pages for faster initial load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tenants = lazy(() => import("./pages/Tenants"));
const Apartments = lazy(() => import("./pages/Apartments"));
const Payments = lazy(() => import("./pages/Payments"));
const Facturen = lazy(() => import("./pages/Facturen"));
const Leningen = lazy(() => import("./pages/Leningen"));
const Contracten = lazy(() => import("./pages/Contracten"));
const OndertekeningPage = lazy(() => import("./pages/OndertekeningPage"));
const Deposits = lazy(() => import("./pages/Deposits"));
const Kasgeld = lazy(() => import("./pages/Kasgeld"));
const Onderhoud = lazy(() => import("./pages/Onderhoud"));
const Meterstanden = lazy(() => import("./pages/Meterstanden"));
const Werknemers = lazy(() => import("./pages/Werknemers"));
const Abonnement = lazy(() => import("./pages/Abonnement"));
const Admin = lazy(() => import("./pages/Admin"));
const Instellingen = lazy(() => import("./pages/Instellingen"));
const WorkspacesPage = lazy(() => import("./pages/WorkspacesPage"));
const DomeinenPage = lazy(() => import("./pages/DomeinenPage"));
const HRM = lazy(() => import("./pages/HRM"));
const HRMDashboard = lazy(() => import("./pages/HRMDashboard"));
const HRMPersoneel = lazy(() => import("./pages/HRMPersoneel"));
const HRMWerving = lazy(() => import("./pages/HRMWerving"));
const HRMContracten = lazy(() => import("./pages/HRMContracten"));
const HRMDocumenten = lazy(() => import("./pages/HRMDocumenten"));
const HRMVerlof = lazy(() => import("./pages/HRMVerlof"));
const HRMAanwezigheid = lazy(() => import("./pages/HRMAanwezigheid"));
const HRMLoonlijst = lazy(() => import("./pages/HRMLoonlijst"));
const HRMInstellingen = lazy(() => import("./pages/HRMInstellingen"));
const MijnModules = lazy(() => import("./pages/MijnModules"));
const WebsiteBeheer = lazy(() => import("./pages/WebsiteBeheer"));
const CMSPage = lazy(() => import("./pages/CMSPage"));
const ModulesPage = lazy(() => import("./pages/ModulesPage"));
const ModulesOverviewPage = lazy(() => import("./pages/ModulesOverviewPage"));
const ModuleDetailPage = lazy(() => import("./pages/ModuleDetailPage"));
const VoorwaardenPage = lazy(() => import("./pages/VoorwaardenPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const PrijzenPage = lazy(() => import("./pages/PrijzenPage"));
const OverOnsPage = lazy(() => import("./pages/OverOnsPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WorkspaceSettings = lazy(() => import("./pages/WorkspaceSettings"));
const BetaalmethodesPage = lazy(() => import("./pages/BetaalmethodesPage"));
const DomainManagementPage = lazy(() => import("./pages/DomainManagementPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));

// Public Spa Booking Portal
const SpaBookingPage = lazy(() => import("./pages/SpaBookingPage"));

// Employee Portal
const EmployeePortalLogin = lazy(() => import("./pages/EmployeePortalLogin"));
const EmployeePortalDashboard = lazy(() => import("./pages/EmployeePortalDashboard"));

// Auto Dealer Module
const AutoDealerDashboard = lazy(() => import("./pages/AutoDealerDashboard"));
const AutoDealerVoertuigen = lazy(() => import("./pages/AutoDealerVoertuigen"));
const AutoDealerKlanten = lazy(() => import("./pages/AutoDealerKlanten"));
const AutoDealerVerkopen = lazy(() => import("./pages/AutoDealerVerkopen"));

// Auto Dealer Customer Portal
const AutoDealerPortalLogin = lazy(() => import("./pages/AutoDealerPortalLogin"));
const AutoDealerPortalDashboard = lazy(() => import("./pages/AutoDealerPortalDashboard"));
const AutoDealerPortalPurchases = lazy(() => import("./pages/AutoDealerPortalPurchases"));

// Beauty Spa Module
const BeautySpaDashboard = lazy(() => import("./pages/BeautySpaDashboard"));
const BeautySpaClients = lazy(() => import("./pages/beautyspa/ClientsPage"));
const BeautySpaAppointments = lazy(() => import("./pages/beautyspa/AppointmentsPage"));
const BeautySpaTreatments = lazy(() => import("./pages/beautyspa/TreatmentsPage"));
const BeautySpaProducts = lazy(() => import("./pages/beautyspa/ProductsPage"));
const BeautySpaPOS = lazy(() => import("./pages/beautyspa/POSPage"));
const BeautySpaStaff = lazy(() => import("./pages/beautyspa/StaffPage"));
const BeautySpaQueue = lazy(() => import("./pages/beautyspa/QueuePage"));
const BeautySpaReports = lazy(() => import("./pages/beautyspa/ReportsPage"));
const BeautySpaVouchers = lazy(() => import("./pages/beautyspa/VouchersPage"));

// Pompstation (Gas Station) Module
const PompstationDashboard = lazy(() => import("./pages/pompstation/DashboardPage"));
const PompstationTanks = lazy(() => import("./pages/pompstation/TanksPage"));
const PompstationLeveringen = lazy(() => import("./pages/pompstation/LeveringenPage"));
const PompstationPompen = lazy(() => import("./pages/pompstation/PompenPage"));
const PompstationPOS = lazy(() => import("./pages/pompstation/POSPage"));
const PompstationWinkel = lazy(() => import("./pages/pompstation/WinkelPage"));
const PompstationDiensten = lazy(() => import("./pages/pompstation/DienstenPage"));
const PompstationPersoneel = lazy(() => import("./pages/pompstation/PersoneelPage"));
const PompstationVeiligheid = lazy(() => import("./pages/pompstation/VeiligheidPage"));
const PompstationRapportages = lazy(() => import("./pages/pompstation/RapportagesPage"));

// Handleiding Pages
const VastgoedHandleiding = lazy(() => import("./pages/handleiding/VastgoedHandleidingPage"));
const HRMHandleiding = lazy(() => import("./pages/handleiding/HRMHandleidingPage"));
const AutoDealerHandleiding = lazy(() => import("./pages/handleiding/AutoDealerHandleidingPage"));
const BeautySpaHandleiding = lazy(() => import("./pages/handleiding/BeautySpaHandleidingPage"));
const PompstationHandleiding = lazy(() => import("./pages/handleiding/PompstationHandleidingPage"));
const BoekhoudingHandleiding = lazy(() => import("./pages/handleiding/BoekhoudingHandleidingPage"));

// Boekhouding Module
const BoekhoudingDashboard = lazy(() => import("./pages/boekhouding/DashboardPage"));
const BoekhoudingGrootboek = lazy(() => import("./pages/boekhouding/GrootboekPage"));
const BoekhoudingDebiteuren = lazy(() => import("./pages/boekhouding/DebiterenPage"));
const BoekhoudingCrediteuren = lazy(() => import("./pages/boekhouding/CrediterenPage"));
const BoekhoudingVerkoopfacturen = lazy(() => import("./pages/boekhouding/VerkoopfacturenPage"));
const BoekhoudingBankrekeningen = lazy(() => import("./pages/boekhouding/BankrekeningenPage"));
const BoekhoudingRapportages = lazy(() => import("./pages/boekhouding/RapportagesPage"));
const BoekhoudingActiva = lazy(() => import("./pages/boekhouding/ActivaPage"));
const BoekhoudingKostenplaatsen = lazy(() => import("./pages/boekhouding/KostenplaatsenPage"));
const BoekhoudingBankReconciliatie = lazy(() => import("./pages/boekhouding/BankReconciliatiePage"));

// Inkoop Module
const InkoopDashboard = lazy(() => import("./pages/inkoop/DashboardPage"));
const InkoopLeveranciers = lazy(() => import("./pages/inkoop/LeveranciersPage"));
const InkoopOffertes = lazy(() => import("./pages/inkoop/OffertesPage"));
const InkoopOrders = lazy(() => import("./pages/inkoop/OrdersPage"));
const InkoopOntvangsten = lazy(() => import("./pages/inkoop/OntvangstenPage"));
const InkoopFacturen = lazy(() => import("./pages/boekhouding/InkoopfacturenPage"));

// Verkoop Module
const VerkoopDashboard = lazy(() => import("./pages/verkoop/DashboardPage"));
const VerkoopKlanten = lazy(() => import("./pages/verkoop/KlantenPage"));
const VerkoopOffertes = lazy(() => import("./pages/verkoop/OffertesPage"));
const VerkoopOrders = lazy(() => import("./pages/verkoop/OrdersPage"));
const VerkoopPrijslijsten = lazy(() => import("./pages/verkoop/PrijslijstenPage"));
const VerkoopFacturen = lazy(() => import("./pages/boekhouding/VerkoopfacturenPage"));

// Voorraad Module
const VoorraadDashboard = lazy(() => import("./pages/voorraad/DashboardPage"));
const VoorraadArtikelen = lazy(() => import("./pages/voorraad/ArtikelenPage"));
const VoorraadMagazijnen = lazy(() => import("./pages/voorraad/MagazijnenPage"));
const VoorraadMutaties = lazy(() => import("./pages/voorraad/MutatiesPage"));
const VoorraadInventarisatie = lazy(() => import("./pages/voorraad/InventarisatiePage"));

// Projecten Module
const ProjectenDashboard = lazy(() => import("./pages/projecten/DashboardPage"));
const ProjectenOverzicht = lazy(() => import("./pages/projecten/OverzichtPage"));
const ProjectenUren = lazy(() => import("./pages/projecten/UrenPage"));

// Suribet Module
const SuribetDashboard = lazy(() => import("./pages/suribet/DashboardPage"));
const SuribetMachines = lazy(() => import("./pages/suribet/MachinesPage"));
const SuribetDagrapporten = lazy(() => import("./pages/suribet/DagrapportenPage"));
const SuribetKasboek = lazy(() => import("./pages/suribet/KasboekPage"));
const SuribetUitbetalingen = lazy(() => import("./pages/suribet/UitbetalingenPage"));
const SuribetWerknemers = lazy(() => import("./pages/suribet/WerknemersPage"));
const SuribetLoonuitbetaling = lazy(() => import("./pages/suribet/LoonuitbetalingPage"));
const SuribetWerknemerPortaal = lazy(() => import("./pages/suribet/WerknemerPortaal"));
const SuribetPortaalLink = lazy(() => import("./pages/suribet/PortaalLinkPage"));
const SuribetMobileUpload = lazy(() => import("./pages/suribet/MobileUploadPage"));

// Loading component for lazy loaded pages
const PageLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
  </div>
));

// Tenant Protected Route
const TenantProtectedRoute = ({ children }) => {
  const { tenant, loading } = useTenantAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!tenant) {
    return <Navigate to="/huurder/login" replace />;
  }
  
  return children;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading, isSuperAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Subscription Protected Route - requires active subscription (customers only)
// Now allows access to dashboard even without modules - popup will show there
// Free modules like 'boekhouding' are always accessible
const SubscriptionRoute = ({ children, requiredAddon }) => {
  const { user, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  
  // Free modules that are always accessible
  const freeModules = ['boekhouding'];
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Superadmin should not access customer pages - redirect to admin
  if (isSuperAdmin()) {
    return <Navigate to="/app/admin" replace />;
  }
  
  // Free modules are always accessible
  if (requiredAddon && freeModules.includes(requiredAddon)) {
    return children;
  }
  
  // Allow access - dashboard will show popup if no modules are active
  // Individual module pages will redirect if specific addon is not active
  if (requiredAddon && !hasActiveSubscription()) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return children;
};

// Admin Route - requires superadmin role
const AdminRoute = ({ children }) => {
  const { user, loading, isSuperAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isSuperAdmin()) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return children;
};

// Public Route - redirect to appropriate page if logged in
const PublicRoute = ({ children }) => {
  const { user, loading, isSuperAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    // Superadmin goes to admin page, customers go to dashboard
    return <Navigate to={isSuperAdmin() ? "/app/admin" : "/app/dashboard"} replace />;
  }
  
  return children;
};

// Smart redirect based on user role and default dashboard setting
const SmartRedirect = () => {
  const { isSuperAdmin } = useAuth();
  const [targetRoute, setTargetRoute] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const determineRoute = async () => {
      // Superadmin always goes to admin
      if (isSuperAdmin()) {
        setTargetRoute("/app/admin");
        setLoading(false);
        return;
      }

      try {
        const { getMyAddons, getSidebarOrder } = await import('./lib/api');
        
        const [addonsResponse, sidebarResponse] = await Promise.all([
          getMyAddons(),
          getSidebarOrder()
        ]);

        const addons = addonsResponse.data || [];
        const sidebarSettings = sidebarResponse.data || {};
        const savedOrder = sidebarSettings.module_order || [];
        const defaultDashboard = sidebarSettings.default_dashboard;

        // Get active module slugs
        const activeModuleSlugs = addons
          .filter(addon => addon.status === 'active' || addon.status === 'trial')
          .map(addon => addon.addon_slug);

        // Module routes mapping
        const moduleRoutes = {
          'vastgoed_beheer': '/app/dashboard',
          'suribet': '/app/suribet',
          'hrm': '/app/hrm',
          'autodealer': '/app/autodealer',
          'beauty': '/app/beauty',
          'pompstation': '/app/pompstation',
          'boekhouding': '/app/boekhouding'
        };

        // Default order - same as Layout.js sidebar
        const defaultOrder = ['vastgoed_beheer', 'suribet', 'hrm', 'autodealer', 'beauty', 'pompstation', 'boekhouding'];

        // Get ordered modules (same logic as Layout.js getOrderedModules)
        let orderedModules = defaultOrder;
        if (savedOrder.length > 0) {
          orderedModules = [...savedOrder];
          // Add any modules not in saved order
          defaultOrder.forEach(slug => {
            if (!orderedModules.includes(slug)) {
              orderedModules.push(slug);
            }
          });
        }

        // Find first active module in the ordered list (= first in sidebar)
        let firstActiveModule = null;
        for (const slug of orderedModules) {
          if (activeModuleSlugs.includes(slug)) {
            firstActiveModule = slug;
            break;
          }
        }

        // Priority 1: User's explicit default dashboard choice (from settings)
        if (defaultDashboard && activeModuleSlugs.includes(defaultDashboard)) {
          setTargetRoute(moduleRoutes[defaultDashboard] || "/app/dashboard");
        }
        // Priority 2: First module in sidebar
        else if (firstActiveModule && moduleRoutes[firstActiveModule]) {
          setTargetRoute(moduleRoutes[firstActiveModule]);
        }
        // Fallback
        else {
          setTargetRoute("/app/dashboard");
        }
      } catch (error) {
        console.error('Error determining redirect:', error);
        setTargetRoute("/app/dashboard");
      }
      setLoading(false);
    };

    determineRoute();
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={targetRoute} replace />;
};

// Customer only route - superadmin cannot access
const CustomerOnlyRoute = ({ children }) => {
  const { user, loading, isSuperAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Superadmin should not access customer pages
  if (isSuperAdmin()) {
    return <Navigate to="/app/admin" replace />;
  }
  
  return children;
};

// Tenant Portal App - separate from main app
function TenantPortalRoutes() {
  return (
    <TenantAuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<TenantLogin />} />
          <Route path="/" element={
            <TenantProtectedRoute><TenantDashboard /></TenantProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/huurder" replace />} />
        </Routes>
      </Suspense>
    </TenantAuthProvider>
  );
}

// Employee Portal Routes
function EmployeePortalRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<EmployeePortalLogin />} />
        <Route path="/dashboard" element={<EmployeePortalDashboard />} />
        <Route path="/" element={<Navigate to="/werknemer/login" replace />} />
        <Route path="*" element={<Navigate to="/werknemer/login" replace />} />
      </Routes>
    </Suspense>
  );
}

// Main App with both portals
function AppWithRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Tenant Portal Routes */}
          <Route path="/huurder/*" element={<TenantPortalRoutes />} />
          
          {/* Employee Portal Routes */}
          <Route path="/werknemer/*" element={<EmployeePortalRoutes />} />
          
          {/* Auto Dealer Customer Portal Routes */}
          <Route path="/klant-portaal/*" element={<AutoDealerCustomerPortalRoutes />} />
          
          {/* Main App Routes */}
          <Route path="/*" element={<MainAppRoutes />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Auto Dealer Customer Portal Routes
function AutoDealerCustomerPortalRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<AutoDealerPortalLogin />} />
        <Route path="/" element={<AutoDealerPortalDashboard />} />
        <Route path="/aankopen" element={<AutoDealerPortalPurchases />} />
        <Route path="/aankopen/:id" element={<AutoDealerPortalPurchases />} />
        <Route path="*" element={<Navigate to="/klant-portaal" replace />} />
      </Routes>
    </Suspense>
  );
}

// Helper function to check if current domain is a subdomain
function isSubdomain() {
  const hostname = window.location.hostname;
  // Main domains that should show landing page
  const mainDomains = ['facturatie.sr', 'www.facturatie.sr', 'localhost', '127.0.0.1'];
  
  // Check if it's a main domain
  if (mainDomains.includes(hostname)) {
    return false;
  }
  
  // Preview environment - use path-based routing, not subdomain
  if (hostname.includes('.preview.emergentagent.com')) {
    // Only treat /app/* paths as subdomain behavior
    return window.location.pathname.startsWith('/app');
  }
  
  // Check if it's a subdomain of facturatie.sr
  if (hostname.endsWith('.facturatie.sr')) {
    return true;
  }
  
  // Any other domain is treated as custom domain (subdomain behavior)
  return true;
}

// Helper to check if we should redirect to app subdomain
function shouldRedirectToApp() {
  const hostname = window.location.hostname;
  return hostname === 'facturatie.sr' || hostname === 'www.facturatie.sr';
}

// Component that redirects main domain /login to app.facturatie.sr/login
function MainDomainAuthRedirect() {
  if (shouldRedirectToApp()) {
    const path = window.location.pathname;
    window.location.href = `https://app.facturatie.sr${path}`;
    return null;
  }
  return null;
}

// Main App Routes (existing)
function MainAppRoutes() {
  const onSubdomain = isSubdomain();
  const onMainDomain = shouldRedirectToApp();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing Page - Only on main domain */}
        <Route path="/" element={
          onSubdomain ? <Navigate to="/login" replace /> : <LandingPage />
        } />
        
        {/* Public pages - Only on main domain */}
        {!onSubdomain && (
          <>
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/modules-overzicht" element={<ModulesOverviewPage />} />
            <Route path="/modules/:slug" element={<ModuleDetailPage />} />
            <Route path="/prijzen" element={<PrijzenPage />} />
            <Route path="/over-ons" element={<OverOnsPage />} />
            <Route path="/voorwaarden" element={<VoorwaardenPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/help" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/demo" element={<DemoPage />} />
          </>
        )}
        
        {/* Redirect public pages to login on subdomains */}
        {onSubdomain && (
          <>
            <Route path="/modules" element={<Navigate to="/login" replace />} />
            <Route path="/modules-overzicht" element={<Navigate to="/login" replace />} />
            <Route path="/modules/:slug" element={<Navigate to="/login" replace />} />
            <Route path="/prijzen" element={<Navigate to="/login" replace />} />
            <Route path="/over-ons" element={<Navigate to="/login" replace />} />
            <Route path="/voorwaarden" element={<Navigate to="/login" replace />} />
            <Route path="/privacy" element={<Navigate to="/login" replace />} />
            <Route path="/faq" element={<Navigate to="/login" replace />} />
            <Route path="/help" element={<Navigate to="/login" replace />} />
            <Route path="/contact" element={<Navigate to="/login" replace />} />
            <Route path="/demo" element={<Navigate to="/login" replace />} />
          </>
        )}
        
        {/* Public Spa Booking Portal - Always available */}
        <Route path="/booking/spa/:workspaceId" element={<SpaBookingPage />} />
        
        {/* Public Suribet Werknemer Portal - Always available */}
        <Route path="/portal/suribet/:userId" element={<SuribetWerknemerPortaal />} />
        
        {/* Mobile Bon Upload - Public page for QR code scanning */}
        <Route path="/upload/suribet/:sessionId" element={<SuribetMobileUpload />} />
        
        {/* Dynamic CMS Pages - Only on main domain */}
        <Route path="/pagina/:slug" element={
          onSubdomain ? <Navigate to="/login" replace /> : <CMSPage />
        } />
        
        {/* Auth Routes - Redirect to app subdomain on main domain */}
        <Route path="/login" element={
          onMainDomain ? <MainDomainAuthRedirect /> : <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/register" element={
          onMainDomain ? <MainDomainAuthRedirect /> : <PublicRoute><Register /></PublicRoute>
        } />
        <Route path="/reset-wachtwoord/:token" element={<ResetPassword />} />
        
        {/* Public Contract Signing Page (no auth required) */}
        <Route path="/onderteken/:token" element={<OndertekeningPage />} />
        
        {/* Protected Routes - with Layout */}
        <Route path="/app" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<SmartRedirect />} />
          <Route path="dashboard" element={
            <SubscriptionRoute><Dashboard /></SubscriptionRoute>
          } />
          <Route path="tenants" element={
            <SubscriptionRoute><Tenants /></SubscriptionRoute>
          } />
          <Route path="apartments" element={
            <SubscriptionRoute><Apartments /></SubscriptionRoute>
          } />
          <Route path="payments" element={
            <SubscriptionRoute><Payments /></SubscriptionRoute>
          } />
          <Route path="facturen" element={
            <SubscriptionRoute><Facturen /></SubscriptionRoute>
          } />
          <Route path="leningen" element={
            <SubscriptionRoute><Leningen /></SubscriptionRoute>
          } />
          <Route path="contracten" element={
            <SubscriptionRoute><Contracten /></SubscriptionRoute>
          } />
          <Route path="deposits" element={
            <SubscriptionRoute><Deposits /></SubscriptionRoute>
          } />
          <Route path="kasgeld" element={
            <SubscriptionRoute><Kasgeld /></SubscriptionRoute>
          } />
          <Route path="onderhoud" element={
            <SubscriptionRoute><Onderhoud /></SubscriptionRoute>
          } />
          <Route path="meterstanden" element={
            <SubscriptionRoute><Meterstanden /></SubscriptionRoute>
          } />
          <Route path="werknemers" element={
            <SubscriptionRoute><Werknemers /></SubscriptionRoute>
          } />
          <Route path="vastgoed/handleiding" element={
            <SubscriptionRoute><VastgoedHandleiding /></SubscriptionRoute>
          } />
          <Route path="abonnement" element={<Abonnement />} />
          <Route path="instellingen" element={<Instellingen />} />
          <Route path="betaalmethodes" element={<BetaalmethodesPage />} />
          <Route path="workspace" element={
            <CustomerOnlyRoute><WorkspaceSettings /></CustomerOnlyRoute>
          } />
          <Route path="admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
          <Route path="admin/workspaces" element={
            <AdminRoute><WorkspacesPage /></AdminRoute>
          } />
          <Route path="admin/domeinen" element={
            <AdminRoute><DomeinenPage /></AdminRoute>
          } />
          <Route path="mijn-modules" element={<MijnModules />} />
          <Route path="website-beheer" element={
            <AdminRoute><WebsiteBeheer /></AdminRoute>
          } />
          
          {/* HRM Module Routes */}
          <Route path="hrm" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMDashboard /></SubscriptionRoute>
          } />
          <Route path="hrm/personeel" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMPersoneel /></SubscriptionRoute>
          } />
          <Route path="hrm/werving" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMWerving /></SubscriptionRoute>
          } />
          <Route path="hrm/contracten" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMContracten /></SubscriptionRoute>
          } />
          <Route path="hrm/documenten" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMDocumenten /></SubscriptionRoute>
          } />
          <Route path="hrm/verlof" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMVerlof /></SubscriptionRoute>
          } />
          <Route path="hrm/aanwezigheid" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMAanwezigheid /></SubscriptionRoute>
          } />
          <Route path="hrm/loonlijst" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMLoonlijst /></SubscriptionRoute>
          } />
          <Route path="hrm/instellingen" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMInstellingen /></SubscriptionRoute>
          } />
          <Route path="hrm/handleiding" element={
            <SubscriptionRoute requiredAddon="hrm"><HRMHandleiding /></SubscriptionRoute>
          } />
          
          {/* Auto Dealer Module Routes */}
          <Route path="autodealer" element={
            <SubscriptionRoute requiredAddon="autodealer"><AutoDealerDashboard /></SubscriptionRoute>
          } />
          <Route path="autodealer/voertuigen" element={
            <SubscriptionRoute requiredAddon="autodealer"><AutoDealerVoertuigen /></SubscriptionRoute>
          } />
          <Route path="autodealer/klanten" element={
            <SubscriptionRoute requiredAddon="autodealer"><AutoDealerKlanten /></SubscriptionRoute>
          } />
          <Route path="autodealer/verkopen" element={
            <SubscriptionRoute requiredAddon="autodealer"><AutoDealerVerkopen /></SubscriptionRoute>
          } />
          <Route path="autodealer/handleiding" element={
            <SubscriptionRoute requiredAddon="autodealer"><AutoDealerHandleiding /></SubscriptionRoute>
          } />
          
          {/* Beauty Spa Module Routes */}
          <Route path="beautyspa" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaDashboard /></SubscriptionRoute>
          } />
          <Route path="beautyspa/clients" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaClients /></SubscriptionRoute>
          } />
          <Route path="beautyspa/appointments" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaAppointments /></SubscriptionRoute>
          } />
          <Route path="beautyspa/treatments" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaTreatments /></SubscriptionRoute>
          } />
          <Route path="beautyspa/products" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaProducts /></SubscriptionRoute>
          } />
          <Route path="beautyspa/pos" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaPOS /></SubscriptionRoute>
          } />
          <Route path="beautyspa/staff" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaStaff /></SubscriptionRoute>
          } />
          <Route path="beautyspa/queue" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaQueue /></SubscriptionRoute>
          } />
          <Route path="beautyspa/reports" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaReports /></SubscriptionRoute>
          } />
          <Route path="beautyspa/vouchers" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaVouchers /></SubscriptionRoute>
          } />
          <Route path="beautyspa/handleiding" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaHandleiding /></SubscriptionRoute>
          } />
          
          {/* Pompstation (Gas Station) Module Routes */}
          <Route path="pompstation" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationDashboard /></SubscriptionRoute>
          } />
          <Route path="pompstation/tanks" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationTanks /></SubscriptionRoute>
          } />
          <Route path="pompstation/leveringen" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationLeveringen /></SubscriptionRoute>
          } />
          <Route path="pompstation/pompen" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationPompen /></SubscriptionRoute>
          } />
          <Route path="pompstation/kassa" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationPOS /></SubscriptionRoute>
          } />
          <Route path="pompstation/winkel" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationWinkel /></SubscriptionRoute>
          } />
          <Route path="pompstation/diensten" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationDiensten /></SubscriptionRoute>
          } />
          <Route path="pompstation/personeel" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationPersoneel /></SubscriptionRoute>
          } />
          <Route path="pompstation/veiligheid" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationVeiligheid /></SubscriptionRoute>
          } />
          <Route path="pompstation/rapportages" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationRapportages /></SubscriptionRoute>
          } />
          <Route path="pompstation/handleiding" element={
            <SubscriptionRoute requiredAddon="pompstation"><PompstationHandleiding /></SubscriptionRoute>
          } />

          {/* Boekhouding Module Routes - Gratis voor alle klanten */}
          <Route path="boekhouding" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingDashboard /></SubscriptionRoute>
          } />
          <Route path="boekhouding/grootboek" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingGrootboek /></SubscriptionRoute>
          } />
          <Route path="boekhouding/debiteuren" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingDebiteuren /></SubscriptionRoute>
          } />
          <Route path="boekhouding/crediteuren" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingCrediteuren /></SubscriptionRoute>
          } />
          <Route path="boekhouding/verkoopfacturen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingVerkoopfacturen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/bankrekeningen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingBankrekeningen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/rapportages" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingRapportages /></SubscriptionRoute>
          } />
          <Route path="boekhouding/btw" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingRapportages /></SubscriptionRoute>
          } />
          <Route path="boekhouding/handleiding" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingHandleiding /></SubscriptionRoute>
          } />
          <Route path="boekhouding/activa" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingActiva /></SubscriptionRoute>
          } />
          <Route path="boekhouding/kostenplaatsen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingKostenplaatsen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/bankreconciliatie" element={
            <SubscriptionRoute requiredAddon="boekhouding"><BoekhoudingBankReconciliatie /></SubscriptionRoute>
          } />
          
          {/* Inkoop Routes - Onderdeel van Boekhouding */}
          <Route path="boekhouding/inkoop" element={
            <SubscriptionRoute requiredAddon="boekhouding"><InkoopDashboard /></SubscriptionRoute>
          } />
          <Route path="boekhouding/inkoop/offertes" element={
            <SubscriptionRoute requiredAddon="boekhouding"><InkoopOffertes /></SubscriptionRoute>
          } />
          <Route path="boekhouding/inkoop/orders" element={
            <SubscriptionRoute requiredAddon="boekhouding"><InkoopOrders /></SubscriptionRoute>
          } />
          <Route path="boekhouding/inkoop/ontvangsten" element={
            <SubscriptionRoute requiredAddon="boekhouding"><InkoopOntvangsten /></SubscriptionRoute>
          } />
          <Route path="boekhouding/inkoop/facturen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><InkoopFacturen /></SubscriptionRoute>
          } />
          
          {/* Verkoop Routes - Onderdeel van Boekhouding */}
          <Route path="boekhouding/verkoop" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VerkoopDashboard /></SubscriptionRoute>
          } />
          <Route path="boekhouding/verkoop/offertes" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VerkoopOffertes /></SubscriptionRoute>
          } />
          <Route path="boekhouding/verkoop/orders" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VerkoopOrders /></SubscriptionRoute>
          } />
          <Route path="boekhouding/verkoop/facturen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VerkoopFacturen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/verkoop/prijslijsten" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VerkoopPrijslijsten /></SubscriptionRoute>
          } />
          
          {/* Voorraad Routes - Onderdeel van Boekhouding */}
          <Route path="boekhouding/voorraad" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VoorraadDashboard /></SubscriptionRoute>
          } />
          <Route path="boekhouding/voorraad/artikelen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VoorraadArtikelen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/voorraad/magazijnen" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VoorraadMagazijnen /></SubscriptionRoute>
          } />
          <Route path="boekhouding/voorraad/mutaties" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VoorraadMutaties /></SubscriptionRoute>
          } />
          <Route path="boekhouding/voorraad/inventarisatie" element={
            <SubscriptionRoute requiredAddon="boekhouding"><VoorraadInventarisatie /></SubscriptionRoute>
          } />
          
          {/* Projecten Routes - Onderdeel van Boekhouding */}
          <Route path="boekhouding/projecten" element={
            <SubscriptionRoute requiredAddon="boekhouding"><ProjectenDashboard /></SubscriptionRoute>
          } />
          <Route path="boekhouding/projecten/overzicht" element={
            <SubscriptionRoute requiredAddon="boekhouding"><ProjectenOverzicht /></SubscriptionRoute>
          } />
          <Route path="boekhouding/projecten/uren" element={
            <SubscriptionRoute requiredAddon="boekhouding"><ProjectenUren /></SubscriptionRoute>
          } />
          
          {/* Suribet Module Routes */}
          <Route path="suribet" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetDashboard /></SubscriptionRoute>
          } />
          <Route path="suribet/machines" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetMachines /></SubscriptionRoute>
          } />
          <Route path="suribet/dagrapporten" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetDagrapporten /></SubscriptionRoute>
          } />
          <Route path="suribet/uitbetalingen" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetUitbetalingen /></SubscriptionRoute>
          } />
          <Route path="suribet/kasboek" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetKasboek /></SubscriptionRoute>
          } />
          <Route path="suribet/werknemers" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetWerknemers /></SubscriptionRoute>
          } />
          <Route path="suribet/loonuitbetaling" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetLoonuitbetaling /></SubscriptionRoute>
          } />
          <Route path="suribet/portaal" element={
            <SubscriptionRoute requiredAddon="suribet"><SuribetPortaalLink /></SubscriptionRoute>
          } />
        </Route>
        
        {/* Redirect old routes to new app routes */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/tenants" element={<Navigate to="/app/tenants" replace />} />
        <Route path="/apartments" element={<Navigate to="/app/apartments" replace />} />
        <Route path="/payments" element={<Navigate to="/app/payments" replace />} />
        <Route path="/facturen" element={<Navigate to="/app/facturen" replace />} />
        <Route path="/leningen" element={<Navigate to="/app/leningen" replace />} />
        <Route path="/contracten" element={<Navigate to="/app/contracten" replace />} />
        <Route path="/deposits" element={<Navigate to="/app/deposits" replace />} />
        <Route path="/kasgeld" element={<Navigate to="/app/kasgeld" replace />} />
        <Route path="/onderhoud" element={<Navigate to="/app/onderhoud" replace />} />
        <Route path="/werknemers" element={<Navigate to="/app/werknemers" replace />} />
        
        {/* 404 - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppWithRoutes;
