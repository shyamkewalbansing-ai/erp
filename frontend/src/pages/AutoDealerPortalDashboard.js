import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Car, 
  ShoppingBag, 
  DollarSign, 
  User, 
  LogOut, 
  ChevronRight,
  Calendar,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function AutoDealerPortalDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [customer, setCustomer] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('autodealer_customer_token');
    if (!token) {
      navigate('/klant-portaal/login');
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }, [navigate]);

  const fetchDashboard = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    
    try {
      const [dashboardRes, profileRes] = await Promise.all([
        axios.get(`${API_URL}/autodealer-portal/dashboard`, { headers }),
        axios.get(`${API_URL}/autodealer-portal/me`, { headers })
      ]);
      
      setDashboard(dashboardRes.data);
      setCustomer(profileRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('autodealer_customer_token');
        navigate('/klant-portaal/login');
      } else {
        toast.error('Fout bij laden van gegevens');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = () => {
    localStorage.removeItem('autodealer_customer_token');
    toast.success('Uitgelogd');
    navigate('/klant-portaal/login');
  };

  const formatCurrency = (amount, currency = 'SRD') => {
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'SRD';
    return `${symbol} ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-testid="customer-portal-dashboard">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Klant Portaal</h1>
                <p className="text-xs text-slate-400">{customer?.name || customer?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white"
                onClick={() => navigate('/klant-portaal/profiel')}
                data-testid="profile-btn"
              >
                <User className="w-4 h-4 mr-2" />
                Profiel
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welkom terug, {customer?.name?.split(' ')[0] || 'Klant'}!
          </h2>
          <p className="text-slate-400">
            Bekijk uw aankopen en voertuiggeschiedenis
          </p>
        </div>

        {/* Not Linked Warning */}
        {!dashboard?.linked && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-200 font-medium">Account niet gekoppeld</p>
                <p className="text-amber-300/70 text-sm">
                  Uw account is nog niet gekoppeld aan een klantrecord. Neem contact op met de dealer om uw aankopen te zien.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Totaal Aankopen</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.stats?.total_purchases || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Voertuigen</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.stats?.vehicles_owned || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Totaal Besteed (SRD)</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(dashboard?.stats?.total_spent?.srd || 0, 'SRD')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link to="/klant-portaal/aankopen" data-testid="purchases-link">
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Mijn Aankopen</p>
                    <p className="text-sm text-slate-400">Bekijk alle aankopen</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/klant-portaal/ondersteuning" data-testid="support-link">
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Ondersteuning</p>
                    <p className="text-sm text-slate-400">Hulp nodig?</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/klant-portaal/profiel" data-testid="profile-link">
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Mijn Profiel</p>
                    <p className="text-sm text-slate-400">Accountgegevens</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Purchases */}
        <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Recente Aankopen</CardTitle>
                <CardDescription className="text-slate-400">Uw laatste voertuigaankopen</CardDescription>
              </div>
              <Link to="/klant-portaal/aankopen">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                  Bekijk alle
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard?.recent_purchases?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recent_purchases.map((purchase) => (
                  <Link 
                    key={purchase.id} 
                    to={`/klant-portaal/aankopen/${purchase.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors">
                      {purchase.vehicle_image ? (
                        <img 
                          src={purchase.vehicle_image} 
                          alt={purchase.vehicle_name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-600 rounded-lg flex items-center justify-center">
                          <Car className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-white">{purchase.vehicle_name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(purchase.sale_date)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            purchase.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {purchase.status === 'completed' ? 'Voltooid' : purchase.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {formatCurrency(
                            purchase.total_price?.amount || 0, 
                            purchase.total_price?.currency || 'SRD'
                          )}
                        </p>
                        <ChevronRight className="w-4 h-4 text-slate-500 ml-auto mt-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nog geen aankopen</p>
                <p className="text-sm text-slate-500 mt-1">
                  Uw aankopen worden hier weergegeven
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Auto Dealer Klant Portaal
          </p>
        </div>
      </footer>
    </div>
  );
}
