import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantAuthProvider, useTenantAuth } from "./context/TenantAuthContext";
import BoekhoudingOfflineManager from "./components/BoekhoudingOfflineManager";
import OfflineSyncIndicator from "./components/OfflineSyncIndicator";
import React, { lazy, Suspense, memo } from "react";

// Critical pages - load immediately
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import PublicInvoiceGenerator from "./pages/PublicInvoiceGenerator";
import Layout from "./components/Layout";
import "@/App.css";

// Gratis Factuur pages - separate auth system
const GratisFactuurAuth = lazy(() => import("./pages/GratisFactuurAuth"));
const GratisFactuurDashboard = lazy(() => import("./pages/GratisFactuurDashboard"));
const GratisFactuurKlanten = lazy(() => import("./pages/GratisFactuurKlanten"));
const GratisFactuurFacturen = lazy(() => import("./pages/GratisFactuurFacturen"));
const GratisFactuurInstellingen = lazy(() => import("./pages/GratisFactuurInstellingen"));

// Staff Chat Dashboard
const StaffChatDashboard = lazy(() => import("./pages/StaffChatDashboard"));

// Tenant Portal pages
const TenantLogin = lazy(() => import("./pages/TenantLogin"));
const TenantDashboard = lazy(() => import("./pages/TenantDashboard"));

// AI Assistant standalone page
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));

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

// Employee Portal
const EmployeePortalLogin = lazy(() => import("./pages/EmployeePortalLogin"));
const EmployeePortalDashboard = lazy(() => import("./pages/EmployeePortalDashboard"));

// Boekhouding Module - Complete Finance OS
const BoekhoudingDashboard = lazy(() => import("./pages/boekhouding/DashboardPage"));
const BoekhoudingGrootboek = lazy(() => import("./pages/boekhouding/GrootboekPage"));
const BoekhoudingDebiteuren = lazy(() => import("./pages/boekhouding/DebiteruenPage"));
const BoekhoudingCrediteuren = lazy(() => import("./pages/boekhouding/CrediteruenPage"));
const BoekhoudingBankKas = lazy(() => import("./pages/boekhouding/BankKasPage"));
const BoekhoudingBTW = lazy(() => import("./pages/boekhouding/BTWPage"));
const BoekhoudingVerkoop = lazy(() => import("./pages/boekhouding/VerkoopPage"));
const BoekhoudingInkoop = lazy(() => import("./pages/boekhouding/InkoopPage"));
const BoekhoudingPOS = lazy(() => import("./pages/boekhouding/POSPage"));
const BoekhoudingPOSMobileScanner = lazy(() => import("./pages/boekhouding/POSMobileScannerPage"));
const BoekhoudingPOSPublicScanner = lazy(() => import("./pages/boekhouding/POSPublicScannerPage"));
const BoekhoudingPOSPermanentScanner = lazy(() => import("./pages/boekhouding/POSPermanentScannerPage"));
const BoekhoudingVoorraad = lazy(() => import("./pages/boekhouding/VoorraadPage"));
const BoekhoudingHRM = lazy(() => import("./pages/boekhouding/HRMPage"));
const BoekhoudingVasteActiva = lazy(() => import("./pages/boekhouding/VasteActivaPage"));
const BoekhoudingKostenplaatsen = lazy(() => import("./pages/boekhouding/KostenplaatsenPage"));
const BoekhoudingProjecten = lazy(() => import("./pages/boekhouding/ProjectenPage"));
const BoekhoudingRapportages = lazy(() => import("./pages/boekhouding/RapportagesPage"));
const BoekhoudingWisselkoersen = lazy(() => import("./pages/boekhouding/WisselkoersenPage"));
const BoekhoudingInstellingen = lazy(() => import("./pages/boekhouding/InstellingenPage"));
const BoekhoudingHerinneringen = lazy(() => import("./pages/boekhouding/HerinneringenPage"));
const BoekhoudingDocumenten = lazy(() => import("./pages/boekhouding/DocumentenPage"));
const BoekhoudingAuditTrail = lazy(() => import("./pages/boekhouding/AuditTrailPage"));
const BoekhoudingNieuweFactuur = lazy(() => import("./pages/boekhouding/NieuweFactuurPage"));
const BoekhoudingNieuweOfferte = lazy(() => import("./pages/boekhouding/NieuweOffertePage"));
const BoekhoudingNieuweDebiteur = lazy(() => import("./pages/boekhouding/NieuweDebiteurPage"));
const BoekhoudingNieuweLeverancier = lazy(() => import("./pages/boekhouding/NieuweLeverancierPage"));
const BoekhoudingNieuweBTWAangifte = lazy(() => import("./pages/boekhouding/NieuweBTWAangiftePage"));

// Schuldbeheer Module (Persoonlijke Boekhouding & Schuldenbeheer)
const SchuldbeheerDashboard = lazy(() => import("./pages/schuldbeheer/DashboardPage"));
const SchuldbeheerRelaties = lazy(() => import("./pages/schuldbeheer/RelatiesPage"));
const SchuldbeheerSchulden = lazy(() => import("./pages/schuldbeheer/SchuldenPage"));
const SchuldbeheerBetalingen = lazy(() => import("./pages/schuldbeheer/BetalingenPage"));
const SchuldbeheerInkomsten = lazy(() => import("./pages/schuldbeheer/InkomstenPage"));
const SchuldbeheerUitgaven = lazy(() => import("./pages/schuldbeheer/UitgavenPage"));
const SchuldbeheerRekeningen = lazy(() => import("./pages/schuldbeheer/RekeningenPage"));
const SchuldbeheerPlanning = lazy(() => import("./pages/schuldbeheer/PlanningPage"));
const SchuldbeheerRapportages = lazy(() => import("./pages/schuldbeheer/RapportagesPage"));
const SchuldbeheerDocumenten = lazy(() => import("./pages/schuldbeheer/DocumentenPage"));

// Vastgoed Kiosk Module - Public Pages (connects to external KIOSK backend)
const VastgoedKioskLayout = lazy(() => import("./components/vastgoed-kiosk/KioskLayout"));
const VastgoedKioskCompanySelect = lazy(() => import("./components/vastgoed-kiosk/CompanySelect"));
const VastgoedKioskAdmin = lazy(() => import("./components/vastgoed-kiosk/KioskAdminDashboard"));
const VastgoedSuperAdmin = lazy(() => import("./components/vastgoed-kiosk/SuperAdminDashboard"));
const HuurdersLayout = lazy(() => import("./components/vastgoed-kiosk/HuurdersLayout"));
const CustomDomainResolver = lazy(() => import("./components/vastgoed-kiosk/CustomDomainResolver"));


// Loading component for lazy loaded pages - minimal flash
const PageLoader = memo(() => (
  <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
  </div>
));

// Simple Suspense wrapper
const SafeSuspense = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

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
const SubscriptionRoute = ({ children, requiredAddon }) => {
  const { user, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  
  // Free modules (no subscription needed)
  const freeModules = [];
  
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
    return <Navigate to="/app/admin/klanten" replace />;
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
    return <Navigate to={isSuperAdmin() ? "/app/admin/klanten" : "/app/dashboard"} replace />;
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
        setTargetRoute("/app/admin/klanten");
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
          'boekhouding': '/app/boekhouding',
          'schuldbeheer': '/app/schuldbeheer',
        };

        // Default order
        const defaultOrder = ['boekhouding', 'schuldbeheer'];

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
    return <Navigate to="/app/admin/klanten" replace />;
  }
  
  return children;
};

// Tenant Portal App - separate from main app
function TenantPortalRoutes() {
  return (
    <TenantAuthProvider>
      <SafeSuspense>
        <Routes>
          <Route path="/login" element={<TenantLogin />} />
          <Route path="/" element={
            <TenantProtectedRoute><TenantDashboard /></TenantProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/huurder" replace />} />
        </Routes>
      </SafeSuspense>
    </TenantAuthProvider>
  );
}

// Employee Portal Routes
function EmployeePortalRoutes() {
  return (
    <SafeSuspense>
      <Routes>
        <Route path="/login" element={<EmployeePortalLogin />} />
        <Route path="/dashboard" element={<EmployeePortalDashboard />} />
        <Route path="/" element={<Navigate to="/werknemer/login" replace />} />
        <Route path="*" element={<Navigate to="/werknemer/login" replace />} />
      </Routes>
    </SafeSuspense>
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
          
          
          {/* Main App Routes */}
          <Route path="/*" element={<MainAppRoutes />} />
        </Routes>
        <Toaster richColors position="top-right" />
        <OfflineSyncIndicator />
        <BoekhoudingOfflineManager />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Helper function to check if current domain is a subdomain
function isSubdomain() {
  const hostname = window.location.hostname;
  const mainDomains = ['facturatie.sr', 'www.facturatie.sr', 'localhost', '127.0.0.1'];
  
  if (mainDomains.includes(hostname)) {
    return false;
  }
  
  // Preview environment - use path-based routing, not subdomain
  if (hostname.includes('.preview.emergentagent.com')) {
    return window.location.pathname.startsWith('/app');
  }
  
  // Check if it's a subdomain of facturatie.sr
  if (hostname.endsWith('.facturatie.sr')) {
    return true;
  }
  
  // Any other domain is treated as custom domain (subdomain behavior)
  return true;
}

// Check if we're on a potential custom kiosk domain
function isCustomKioskDomain() {
  const hostname = window.location.hostname;
  const knownDomains = ['facturatie.sr', 'www.facturatie.sr', 'app.facturatie.sr', 'localhost', '127.0.0.1'];
  if (knownDomains.includes(hostname)) return false;
  if (hostname.includes('.preview.emergentagent.com')) return false;
  if (hostname.endsWith('.facturatie.sr')) return false;
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
    <SafeSuspense>
      <Routes>
        {/* Landing Page - Only on main domain */}
        <Route path="/" element={
          isCustomKioskDomain() ? (
            <SafeSuspense><CustomDomainResolver /></SafeSuspense>
          ) : onSubdomain ? <Navigate to="/login" replace /> : <LandingPage />
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
            <Route path="/invoice" element={<PublicInvoiceGenerator />} />
            <Route path="/invoice-generator" element={<PublicInvoiceGenerator />} />
            
            {/* Gratis Factuur Dashboard System - Separate Auth */}
            <Route path="/invoice/login" element={<GratisFactuurAuth />} />
            <Route path="/invoice/register" element={<GratisFactuurAuth />} />
            <Route path="/invoice/dashboard" element={<GratisFactuurDashboard />} />
            <Route path="/invoice/klanten" element={<GratisFactuurKlanten />} />
            <Route path="/invoice/facturen" element={<GratisFactuurFacturen />} />
            <Route path="/invoice/facturen/nieuw" element={<PublicInvoiceGenerator showSaveOption={true} />} />
            <Route path="/invoice/facturen/:id" element={<PublicInvoiceGenerator showSaveOption={true} />} />
            <Route path="/invoice/facturen/:id/bewerken" element={<PublicInvoiceGenerator showSaveOption={true} />} />
            <Route path="/invoice/betalingen" element={<GratisFactuurFacturen />} />
            <Route path="/invoice/instellingen" element={<GratisFactuurInstellingen />} />
            
            {/* Staff Chat Dashboard - Public access with own auth */}
            <Route path="/staff-chat" element={<StaffChatDashboard />} />
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
        
        {/* Vastgoed Kiosk - Public Pages (connects to external KIOSK backend) */}
        <Route path="/vastgoed" element={
          <SafeSuspense>
            <VastgoedKioskCompanySelect />
          </SafeSuspense>
        } />
        <Route path="/vastgoed/admin" element={
          <SafeSuspense>
            <VastgoedKioskAdmin />
          </SafeSuspense>
        } />
        <Route path="/vastgoed/superadmin" element={
          <SafeSuspense>
            <VastgoedSuperAdmin />
          </SafeSuspense>
        } />
        <Route path="/vastgoed/:companyId" element={
          <SafeSuspense>
            <VastgoedKioskLayout />
          </SafeSuspense>
        } />
        <Route path="/huurders/:companyId" element={
          <SafeSuspense>
            <HuurdersLayout />
          </SafeSuspense>
        } />
        
        {/* AI Assistant Standalone Page - Always available */}
        <Route path="/ai" element={<AIAssistantPage />} />
        <Route path="/assistent" element={<AIAssistantPage />} />
        
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
        
        {/* PUBLIC POS Scanner - NO AUTH REQUIRED */}
        <Route path="/scan/:sessionCode" element={
          <SafeSuspense>
            <BoekhoudingPOSPublicScanner />
          </SafeSuspense>
        } />
        <Route path="/scan" element={
          <SafeSuspense>
            <BoekhoudingPOSPublicScanner />
          </SafeSuspense>
        } />
        
        {/* PERMANENT POS Scanner - NO AUTH REQUIRED, NEVER EXPIRES */}
        <Route path="/scan/p/:code" element={
          <SafeSuspense>
            <BoekhoudingPOSPermanentScanner />
          </SafeSuspense>
        } />
        
        {/* Protected Routes - with Layout */}
        <Route path="/app" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<SmartRedirect />} />
          <Route path="dashboard" element={
            <SubscriptionRoute><Dashboard /></SubscriptionRoute>
          } />
          <Route path="abonnement" element={<Abonnement />} />
          <Route path="instellingen" element={<Instellingen />} />
          <Route path="betaalmethodes" element={<BetaalmethodesPage />} />
          <Route path="workspace" element={
            <CustomerOnlyRoute><WorkspaceSettings /></CustomerOnlyRoute>
          } />
          <Route path="admin" element={
            <AdminRoute><Navigate to="/app/admin/klanten" replace /></AdminRoute>
          } />
          <Route path="admin/:adminTab" element={
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
          
          {/* Boekhouding Module Routes */}
          <Route path="boekhouding" element={<BoekhoudingDashboard />} />
          <Route path="boekhouding/grootboek" element={<BoekhoudingGrootboek />} />
          <Route path="boekhouding/debiteuren" element={<BoekhoudingDebiteuren />} />
          <Route path="boekhouding/crediteuren" element={<BoekhoudingCrediteuren />} />
          <Route path="boekhouding/bank-kas" element={<BoekhoudingBankKas />} />
          <Route path="boekhouding/btw" element={<BoekhoudingBTW />} />
          <Route path="boekhouding/btw/aangifte" element={<BoekhoudingNieuweBTWAangifte />} />
          <Route path="boekhouding/verkoop" element={<BoekhoudingVerkoop />} />
          <Route path="boekhouding/verkoop/nieuw" element={<BoekhoudingNieuweFactuur />} />
          <Route path="boekhouding/verkoop/offerte" element={<BoekhoudingNieuweOfferte />} />
          <Route path="boekhouding/debiteuren/nieuw" element={<BoekhoudingNieuweDebiteur />} />
          <Route path="boekhouding/crediteuren/nieuw" element={<BoekhoudingNieuweLeverancier />} />
          <Route path="boekhouding/inkoop" element={<BoekhoudingInkoop />} />
          <Route path="boekhouding/voorraad" element={<BoekhoudingVoorraad />} />
          <Route path="boekhouding/hrm" element={<BoekhoudingHRM />} />
          <Route path="boekhouding/vaste-activa" element={<BoekhoudingVasteActiva />} />
          <Route path="boekhouding/kostenplaatsen" element={<BoekhoudingKostenplaatsen />} />
          <Route path="boekhouding/projecten" element={<BoekhoudingProjecten />} />
          <Route path="boekhouding/rapportages" element={<BoekhoudingRapportages />} />
          <Route path="boekhouding/wisselkoersen" element={<BoekhoudingWisselkoersen />} />
          <Route path="boekhouding/instellingen" element={<BoekhoudingInstellingen />} />
          <Route path="boekhouding/herinneringen" element={<BoekhoudingHerinneringen />} />
          <Route path="boekhouding/documenten" element={<BoekhoudingDocumenten />} />
          <Route path="boekhouding/audit-trail" element={<BoekhoudingAuditTrail />} />
          
          {/* Schuldbeheer Module Routes */}
          <Route path="schuldbeheer" element={<SchuldbeheerDashboard />} />
          <Route path="schuldbeheer/relaties" element={<SchuldbeheerRelaties />} />
          <Route path="schuldbeheer/schulden" element={<SchuldbeheerSchulden />} />
          <Route path="schuldbeheer/betalingen" element={<SchuldbeheerBetalingen />} />
          <Route path="schuldbeheer/inkomsten" element={<SchuldbeheerInkomsten />} />
          <Route path="schuldbeheer/uitgaven" element={<SchuldbeheerUitgaven />} />
          <Route path="schuldbeheer/rekeningen" element={<SchuldbeheerRekeningen />} />
          <Route path="schuldbeheer/planning" element={<SchuldbeheerPlanning />} />
          <Route path="schuldbeheer/rapportages" element={<SchuldbeheerRapportages />} />
          <Route path="schuldbeheer/documenten" element={<SchuldbeheerDocumenten />} />
        </Route>
        
        {/* POS Fullscreen Route - Outside Layout */}
        <Route path="/app/boekhouding/pos" element={
          <ProtectedRoute>
            <SafeSuspense>
              <BoekhoudingPOS />
            </SafeSuspense>
          </ProtectedRoute>
        } />
        
        {/* POS Mobile Scanner - Fullscreen Camera */}
        <Route path="/app/boekhouding/pos/scanner" element={
          <ProtectedRoute>
            <SafeSuspense>
              <BoekhoudingPOSMobileScanner />
            </SafeSuspense>
          </ProtectedRoute>
        } />
        
        {/* Redirect old routes */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        
        {/* 404 - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SafeSuspense>
  );
}

export default AppWithRoutes;
