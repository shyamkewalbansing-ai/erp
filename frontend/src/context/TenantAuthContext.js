import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const TenantAuthContext = createContext(null);

export function TenantAuthProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const checkAuth = async () => {
      const token = localStorage.getItem('tenant_token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${API_URL}/tenant-portal/me`);
          setTenant(response.data);
        } catch {
          localStorage.removeItem('tenant_token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/tenant-portal/login`, { email, password });
    const { access_token, tenant: tenantData } = response.data;
    localStorage.setItem('tenant_token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setTenant(tenantData);
    return tenantData;
  };

  const register = async (email, password) => {
    const response = await axios.post(`${API_URL}/tenant-portal/register`, { email, password });
    const { access_token, tenant: tenantData } = response.data;
    localStorage.setItem('tenant_token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setTenant(tenantData);
    return tenantData;
  };

  const logout = () => {
    localStorage.removeItem('tenant_token');
    delete axios.defaults.headers.common['Authorization'];
    setTenant(null);
  };

  return (
    <TenantAuthContext.Provider value={{ tenant, loading, login, register, logout, isAuthenticated: !!tenant }}>
      {children}
    </TenantAuthContext.Provider>
  );
}

export function useTenantAuth() {
  const context = useContext(TenantAuthContext);
  if (!context) {
    throw new Error('useTenantAuth must be used within TenantAuthProvider');
  }
  return context;
}
