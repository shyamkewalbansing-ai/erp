import React, { createContext, useContext, useState, useEffect } from 'react';

const KassaAuthContext = createContext(null);

export const useKassaAuth = () => {
  const context = useContext(KassaAuthContext);
  if (!context) {
    throw new Error('useKassaAuth must be used within a KassaAuthProvider');
  }
  return context;
};

export const KassaAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('kassa_token'));

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/kassa/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setBusiness(data.business);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/kassa/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login mislukt');
    }

    const data = await response.json();
    localStorage.setItem('kassa_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setBusiness(data.business);
    return data;
  };

  const register = async (data) => {
    const response = await fetch(`${API_URL}/api/kassa/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registratie mislukt');
    }

    const result = await response.json();
    localStorage.setItem('kassa_token', result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    setBusiness(result.business);
    return result;
  };

  const logout = () => {
    localStorage.removeItem('kassa_token');
    setToken(null);
    setUser(null);
    setBusiness(null);
  };

  const value = {
    user,
    business,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: fetchUser
  };

  return (
    <KassaAuthContext.Provider value={value}>
      {children}
    </KassaAuthContext.Provider>
  );
};

export default KassaAuthContext;
