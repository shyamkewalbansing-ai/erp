import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { isTenantSubdomain, getTenantSubdomain } from '../lib/subdomain';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Helper to get tenant identifier from hostname
const getTenantIdentifier = () => {
  const hostname = window.location.hostname;
  
  // Check for tenant subdomain (e.g., demogebruiker.facturatie.sr)
  if (isTenantSubdomain()) {
    return getTenantSubdomain();
  }
  
  // Check for custom domain (not facturatie.sr or subdomains)
  if (!hostname.includes('facturatie.sr') && 
      !hostname.includes('localhost') && 
      !hostname.includes('preview.emergentagent.com')) {
    return hostname; // Return full custom domain
  }
  
  return null;
};

// Default branding
const DEFAULT_BRANDING = {
  logo_url: null,
  favicon_url: null,
  primary_color: '#0caf60',
  secondary_color: '#059669',
  portal_name: 'Facturatie'
};

// Convert hex to HSL for CSS variables
const hexToHSL = (hex) => {
  if (!hex) return null;
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [workspace, setWorkspace] = useState(null);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [tenantIdentifier] = useState(getTenantIdentifier());

  // Fetch public branding for tenant subdomains/custom domains (no auth required)
  const fetchPublicBranding = useCallback(async () => {
    if (!tenantIdentifier) {
      setBrandingLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/workspace/branding-public/${tenantIdentifier}`);
      setBranding({
        logo_url: response.data.logo_url,
        favicon_url: response.data.favicon_url,
        primary_color: response.data.primary_color || '#0caf60',
        secondary_color: response.data.secondary_color || '#059669',
        portal_name: response.data.portal_name || response.data.workspace_name
      });
      setWorkspace({
        id: response.data.workspace_id,
        name: response.data.workspace_name,
        slug: response.data.slug
      });
    } catch (error) {
      console.error('Failed to fetch public branding:', error);
    } finally {
      setBrandingLoading(false);
    }
  }, [tenantIdentifier]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
      // Fetch workspace after user is loaded
      try {
        const wsResponse = await axios.get(`${API_URL}/workspace/current`);
        setWorkspace(wsResponse.data.workspace);
        setBranding(wsResponse.data.branding || DEFAULT_BRANDING);
      } catch {
        // If workspace fetch fails but we're on a tenant domain, keep the public branding
        if (!tenantIdentifier) {
          setBranding(DEFAULT_BRANDING);
        }
      }
    } catch {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [tenantIdentifier]);

  // Fetch public branding when on tenant subdomain (before auth check)
  useEffect(() => {
    fetchPublicBranding();
  }, [fetchPublicBranding]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  // Apply branding CSS variables
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      
      // Set hex values for direct use
      root.style.setProperty('--brand-primary', branding.primary_color || '#0caf60');
      root.style.setProperty('--brand-secondary', branding.secondary_color || '#059669');
      
      // Convert to HSL and update shadcn/tailwind CSS variables
      const primaryHSL = hexToHSL(branding.primary_color);
      const secondaryHSL = hexToHSL(branding.secondary_color);
      
      if (primaryHSL) {
        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--ring', primaryHSL);
        root.style.setProperty('--chart-1', primaryHSL);
      }
      
      // Update favicon if available
      if (branding.favicon_url) {
        const favicon = document.querySelector("link[rel='icon']");
        if (favicon) {
          favicon.href = branding.favicon_url;
        }
      }
      
      // Update page title if portal name is set
      if (branding.portal_name) {
        document.title = branding.portal_name;
      }
    }
  }, [branding]);

  const fetchWorkspace = async () => {
    try {
      const response = await axios.get(`${API_URL}/workspace/current`);
      setWorkspace(response.data.workspace);
      setBranding(response.data.branding || DEFAULT_BRANDING);
    } catch {
      setBranding(DEFAULT_BRANDING);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
      await fetchWorkspace();
      return response.data;
    } catch {
      return null;
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    // Fetch workspace branding after login
    setTimeout(fetchWorkspace, 100);
    
    return userData;
  };

  const register = async (name, email, password, company_name) => {
    const response = await axios.post(`${API_URL}/auth/register`, { 
      name, 
      email, 
      password,
      company_name 
    });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    // Fetch workspace branding after register
    setTimeout(fetchWorkspace, 100);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setWorkspace(null);
    setBranding(DEFAULT_BRANDING);
  };

  const updateBranding = async (newBranding) => {
    try {
      await axios.put(`${API_URL}/workspace/branding`, newBranding);
      setBranding(prev => ({ ...prev, ...newBranding }));
      return true;
    } catch (error) {
      console.error('Error updating branding:', error);
      return false;
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return user.subscription_status === 'active' || user.subscription_status === 'trial';
  };

  // Check if user is superadmin
  const isSuperAdmin = () => {
    return user?.role === 'superadmin';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      token,
      refreshUser,
      hasActiveSubscription,
      isSuperAdmin,
      workspace,
      branding,
      updateBranding,
      fetchWorkspace
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
