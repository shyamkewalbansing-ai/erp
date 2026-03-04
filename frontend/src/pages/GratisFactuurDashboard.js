import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, CreditCard, Settings, LogOut,
  Plus, TrendingUp, Clock, AlertTriangle, CheckCircle, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Auth helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('gratis_factuur_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Sidebar Component
function Sidebar({ activeTab, user }) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('gratis_factuur_token');
    localStorage.removeItem('gratis_factuur_user');
    navigate('/gratis-factuur/login');
    toast.success('Uitgelogd');
  };
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/gratis-factuur/dashboard' },
    { id: 'facturen', label: 'Facturen', icon: FileText, path: '/gratis-factuur/facturen' },
    { id: 'klanten', label: 'Klanten', icon: Users, path: '/gratis-factuur/klanten' },
    { id: 'betalingen', label: 'Betalingen', icon: CreditCard, path: '/gratis-factuur/betalingen' },
    { id: 'instellingen', label: 'Instellingen', icon: Settings, path: '/gratis-factuur/instellingen' },
  ];
  
  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <Link to="/gratis-factuur" className="flex items-center gap-2">
          <img 
            src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"
            alt="Facturatie.sr"
            className="h-8 w-auto brightness-0 invert"
          />
        </Link>
        <p className="text-xs text-slate-500 mt-1">Gratis Facturatie</p>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-slate-800">
        <p className="text-white font-medium truncate">{user?.bedrijfsnaam || 'Mijn Bedrijf'}</p>
        <p className="text-slate-400 text-sm truncate">{user?.email}</p>
      </div>
      
      {/* Menu */}
      <nav className="flex-1 p-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              activeTab === item.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      {/* Quick Action */}
      <div className="p-4 border-t border-slate-800">
        <Link to="/gratis-factuur/facturen/nieuw">
          <Button className="w-full bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Factuur
          </Button>
        </Link>
      </div>
      
      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Uitloggen</span>
        </button>
      </div>
    </div>
  );
}

// Dashboard Layout Wrapper
export function DashboardLayout({ children, activeTab }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('gratis_factuur_token');
    const storedUser = localStorage.getItem('gratis_factuur_user');
    
    if (!token) {
      navigate('/gratis-factuur/login');
      return;
    }
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Verify token
    fetch(`${API_URL}/api/gratis-factuur/auth/me`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Token invalid');
        return res.json();
      })
      .then(data => {
        setUser(data);
        localStorage.setItem('gratis_factuur_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('gratis_factuur_token');
        localStorage.removeItem('gratis_factuur_user');
        navigate('/gratis-factuur/login');
      });
  }, [navigate]);
  
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activeTab={activeTab} user={user} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

// Main Dashboard Page
export default function GratisFactuurDashboard() {
  const [stats, setStats] = useState(null);
  const [recentFacturen, setRecentFacturen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userValuta, setUserValuta] = useState('SRD');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [statsRes, facturenRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/gratis-factuur/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/gratis-factuur/facturen`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/gratis-factuur/auth/me`, { headers: getAuthHeaders() })
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      if (facturenRes.ok) {
        const facturenData = await facturenRes.json();
        setRecentFacturen(facturenData.slice(0, 5));
      }
      
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.standaard_valuta) {
          setUserValuta(userData.standaard_valuta);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount, valuta) => {
    const v = valuta || userValuta;
    if (v === 'EUR') return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
    if (v === 'USD') return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    return `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };
  
  if (loading) {
    return (
      <DashboardLayout activeTab="dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout activeTab="dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <Link to="/gratis-factuur/facturen/nieuw">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </Link>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totale Omzet</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats?.totaal_omzet || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats?.totaal_openstaand || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verlopen Facturen</p>
                <p className="text-2xl font-bold text-red-600">{stats?.verlopen_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Klanten</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.klanten_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-slate-700">Openstaand</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats?.openstaand_count || 0}</p>
            <p className="text-sm text-slate-500">facturen</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium text-slate-700">Deelbetaling</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats?.deelbetaling_count || 0}</p>
            <p className="text-sm text-slate-500">facturen</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-slate-700">Betaald</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats?.betaald_count || 0}</p>
            <p className="text-sm text-slate-500">facturen</p>
          </div>
        </div>
        
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recente Facturen</h2>
              <Link to="/gratis-factuur/facturen" className="text-sm text-teal-600 hover:text-teal-700">
                Alle bekijken →
              </Link>
            </div>
          </div>
          
          {recentFacturen.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nog geen facturen</p>
              <Link to="/gratis-factuur/facturen/nieuw">
                <Button className="mt-4 bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste factuur maken
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentFacturen.map((factuur) => (
                <Link
                  key={factuur.id}
                  to={`/gratis-factuur/facturen/${factuur.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      factuur.status === 'betaald' ? 'bg-green-100' :
                      factuur.status === 'deelbetaling' ? 'bg-yellow-100' : 'bg-orange-100'
                    }`}>
                      {factuur.status === 'betaald' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileText className={`w-5 h-5 ${
                          factuur.status === 'deelbetaling' ? 'text-yellow-600' : 'text-orange-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{factuur.nummer}</p>
                      <p className="text-sm text-slate-500">{factuur.klant_naam}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(factuur.totaal, factuur.valuta)}
                    </p>
                    <p className="text-xs text-slate-500">{factuur.datum}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
