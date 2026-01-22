import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import Apartments from "./pages/Apartments";
import Payments from "./pages/Payments";
import Deposits from "./pages/Deposits";
import Kasgeld from "./pages/Kasgeld";
import Onderhoud from "./pages/Onderhoud";
import Werknemers from "./pages/Werknemers";
import Abonnement from "./pages/Abonnement";
import Admin from "./pages/Admin";
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
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Subscription page is always accessible for logged-in users */}
            <Route path="abonnement" element={<Abonnement />} />
            
            {/* Admin page only for superadmin */}
            <Route path="admin" element={
              <AdminRoute><Admin /></AdminRoute>
            } />
            
            {/* These routes require active subscription */}
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
