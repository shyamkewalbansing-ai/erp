import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Shield, LogOut, Store, Users, Package, ShoppingCart, 
  Loader2, Search, Crown, CheckCircle, AlertCircle, Clock,
  ArrowUpRight, Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function KassaSuperAdmin() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('kassa_superadmin_token'));
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState('basic');
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (token) {
      fetchBusinesses();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/kassa/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Login mislukt');
      }
      
      localStorage.setItem('kassa_superadmin_token', data.access_token);
      setToken(data.access_token);
      toast.success('Welkom, Superadmin!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/kassa/superadmin/businesses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error('Fout bij ophalen bedrijven');
      }
      
      const data = await response.json();
      setBusinesses(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/kassa/superadmin/businesses/${selectedBusiness.id}/plan?plan=${newPlan}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Fout bij wijzigen abonnement');
      }
      
      toast.success(`Abonnement gewijzigd naar ${newPlan.toUpperCase()}`);
      setShowPlanModal(false);
      fetchBusinesses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('kassa_superadmin_token');
    setToken(null);
    setBusinesses([]);
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'trial': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'trial': return <Clock className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'pro': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Superadmin</CardTitle>
            <CardDescription>Kassa POS Beheerderspaneel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="admin@kassapos.sr"
                  data-testid="superadmin-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  data-testid="superadmin-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="superadmin-login-btn">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50" data-testid="superadmin-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Superadmin Dashboard</h1>
                <p className="text-sm text-gray-500">Beheer alle Kassa POS bedrijven</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
                  <p className="text-sm text-gray-500">Totaal Bedrijven</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.filter(b => b.subscription_status === 'active').length}
                  </p>
                  <p className="text-sm text-gray-500">Actieve Abonnementen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.filter(b => b.subscription_status === 'trial').length}
                  </p>
                  <p className="text-sm text-gray-500">Proefperiodes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.reduce((sum, b) => sum + (b.order_count || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Totaal Bestellingen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Zoek bedrijven..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Businesses List */}
        <Card>
          <CardHeader>
            <CardTitle>Bedrijven</CardTitle>
            <CardDescription>Alle geregistreerde Kassa POS bedrijven</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Geen bedrijven gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Bedrijf</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Plan</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Producten</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Bestellingen</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Aangemaakt</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.map(business => (
                      <tr key={business.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Store className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{business.name}</p>
                              <p className="text-sm text-gray-500">{business.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(business.subscription_plan)}`}>
                            {business.subscription_plan === 'enterprise' && <Crown className="w-3 h-3 inline mr-1" />}
                            {(business.subscription_plan || 'basic').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(business.subscription_status)}`}>
                            {getStatusIcon(business.subscription_status)}
                            {business.subscription_status === 'active' ? 'Actief' : 
                             business.subscription_status === 'trial' ? 'Proef' : 'Verlopen'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{business.product_count || 0}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{business.order_count || 0}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">
                          {new Date(business.created_at).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBusiness(business);
                              setNewPlan(business.subscription_plan || 'basic');
                              setShowPlanModal(true);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Plan
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Change Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnement Wijzigen</DialogTitle>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Store className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{selectedBusiness.name}</p>
                  <p className="text-sm text-gray-500">{selectedBusiness.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Nieuw Abonnement</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['basic', 'pro', 'enterprise'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => setNewPlan(plan)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        newPlan === plan
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-bold ${newPlan === plan ? 'text-blue-700' : 'text-gray-700'}`}>
                        {plan.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {plan === 'basic' ? 'SRD 49/mo' : plan === 'pro' ? 'SRD 99/mo' : 'SRD 199/mo'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>Annuleren</Button>
            <Button onClick={updatePlan} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
