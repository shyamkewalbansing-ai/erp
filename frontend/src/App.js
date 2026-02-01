import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantAuthProvider, useTenantAuth } from "./context/TenantAuthContext";
import { lazy, Suspense, memo } from "react";

// Critical pages - load immediately
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import Layout from "./components/Layout";
import "@/App.css";

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
const BeautySpaLayout = lazy(() => import("./pages/beautyspa/BeautySpaLayout"));
const BeautySpaClients = lazy(() => import("./pages/beautyspa/ClientsPage"));
const BeautySpaAppointments = lazy(() => import("./pages/beautyspa/AppointmentsPage"));
const BeautySpaTreatments = lazy(() => import("./pages/beautyspa/TreatmentsPage"));
const BeautySpaProducts = lazy(() => import("./pages/beautyspa/ProductsPage"));
const BeautySpaPOS = lazy(() => import("./pages/beautyspa/POSPage"));
const BeautySpaStaff = lazy(() => import("./pages/beautyspa/StaffPage"));
const BeautySpaQueue = lazy(() => import("./pages/beautyspa/QueuePage"));
const BeautySpaReports = lazy(() => import("./pages/beautyspa/ReportsPage"));
const BeautySpaVouchers = lazy(() => import("./pages/beautyspa/VouchersPage"));

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
const SubscriptionRoute = ({ children }) => {
  const { user, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  
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
  
  // If subscription is not active, redirect to subscription page
  if (!hasActiveSubscription()) {
    return <Navigate to="/app/abonnement" replace />;
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

// Smart redirect based on user role
const SmartRedirect = () => {
  const { isSuperAdmin } = useAuth();
  return <Navigate to={isSuperAdmin() ? "/app/admin" : "/app/dashboard"} replace />;
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

// Main App Routes (existing)
function MainAppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing Page - Critical, loaded immediately */}
        <Route path="/" element={<LandingPage />} />
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
        
        {/* Public Spa Booking Portal */}
        <Route path="/booking/spa/:workspaceId" element={<SpaBookingPage />} />
        
        {/* Dynamic CMS Pages */}
        <Route path="/pagina/:slug" element={<CMSPage />} />
        
        {/* Public Auth Routes */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute><Register /></PublicRoute>
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
          <Route path="abonnement" element={<Abonnement />} />
          <Route path="instellingen" element={<Instellingen />} />
          <Route path="betaalmethodes" element={<BetaalmethodesPage />} />
          <Route path="workspace" element={
            <CustomerOnlyRoute><WorkspaceSettings /></CustomerOnlyRoute>
          } />
          <Route path="admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
          <Route path="admin/domeinen" element={
            <AdminRoute><DomainManagementPage /></AdminRoute>
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
          
          {/* Beauty Spa Module */}
          <Route path="beautyspa" element={
            <SubscriptionRoute requiredAddon="beauty"><BeautySpaLayout /></SubscriptionRoute>
          }>
            <Route path="clients" element={<BeautySpaClients />} />
            <Route path="appointments" element={<BeautySpaAppointments />} />
            <Route path="treatments" element={<BeautySpaTreatments />} />
            <Route path="products" element={<BeautySpaProducts />} />
            <Route path="pos" element={<BeautySpaPOS />} />
            <Route path="staff" element={<BeautySpaStaff />} />
            <Route path="queue" element={<BeautySpaQueue />} />
            <Route path="reports" element={<BeautySpaReports />} />
            <Route path="vouchers" element={<BeautySpaVouchers />} />
          </Route>
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
