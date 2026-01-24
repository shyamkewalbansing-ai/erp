import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import Apartments from "./pages/Apartments";
import Payments from "./pages/Payments";
import Facturen from "./pages/Facturen";
import Leningen from "./pages/Leningen";
import Contracten from "./pages/Contracten";
import OndertekeningPage from "./pages/OndertekeningPage";
import Deposits from "./pages/Deposits";
import Kasgeld from "./pages/Kasgeld";
import Onderhoud from "./pages/Onderhoud";
import Werknemers from "./pages/Werknemers";
import Abonnement from "./pages/Abonnement";
import Admin from "./pages/Admin";
import Instellingen from "./pages/Instellingen";
import Layout from "./components/Layout";
import "@/App.css";

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
    return <Navigate to="/admin" replace />;
  }
  
  // If subscription is not active, redirect to subscription page
  if (!hasActiveSubscription()) {
    return <Navigate to="/abonnement" replace />;
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
    return <Navigate to="/dashboard" replace />;
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
    return <Navigate to={isSuperAdmin() ? "/admin" : "/dashboard"} replace />;
  }
  
  return children;
};

// Smart redirect based on user role
const SmartRedirect = () => {
  const { isSuperAdmin } = useAuth();
  return <Navigate to={isSuperAdmin() ? "/admin" : "/dashboard"} replace />;
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
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          <Route path="/reset-wachtwoord/:token" element={<ResetPassword />} />
          
          {/* Public Contract Signing Page (no auth required) */}
          <Route path="/onderteken/:token" element={<OndertekeningPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<SmartRedirect />} />
            
            {/* Subscription page is always accessible for logged-in customers */}
            <Route path="abonnement" element={<CustomerOnlyRoute><Abonnement /></CustomerOnlyRoute>} />
            
            {/* Settings page accessible for all logged-in users */}
            <Route path="instellingen" element={<Instellingen />} />
            
            {/* Admin pages only for superadmin */}
            <Route path="admin" element={
              <AdminRoute><Admin /></AdminRoute>
            } />
            
            {/* These routes require active subscription (customers only) */}
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
            <Route path="werknemers" element={
              <SubscriptionRoute><Werknemers /></SubscriptionRoute>
            } />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
