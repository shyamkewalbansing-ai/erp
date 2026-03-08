import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Store, ShoppingCart, BarChart3, Users, Package, CreditCard } from 'lucide-react';

export default function KassaLogin() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useKassaAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    business_name: '',
    email: '',
    password: '',
    phone: ''
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/kassa/pos');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Vul alle velden in');
      return;
    }

    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success('Welkom terug!');
      navigate('/kassa/pos');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.business_name || !registerData.email || !registerData.password) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    setLoading(true);
    try {
      await register(registerData);
      toast.success('Account aangemaakt! U kunt nu starten.');
      navigate('/kassa/pos');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12">
        <div className="max-w-lg text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Store className="w-7 h-7 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kassa POS</h1>
              <p className="text-gray-400">Point of Sale voor Suriname</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-6">
            Het complete kassasysteem voor uw bedrijf
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Snelle Verkoop</h3>
                <p className="text-gray-400 text-sm">Intuïtieve interface voor snelle afhandeling</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Voorraadbeheer</h3>
                <p className="text-gray-400 text-sm">Automatische voorraad bijwerking bij verkoop</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Klantenbeheer</h3>
                <p className="text-gray-400 text-sm">Loyaliteitsprogramma en klanthistorie</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold">Rapportages</h3>
                <p className="text-gray-400 text-sm">Uitgebreide verkoop- en voorraadanalyses</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold">Meerdere Betaalmethodes</h3>
                <p className="text-gray-400 text-sm">Cash, PIN en QR-betalingen</p>
              </div>
            </div>
          </div>

          {/* Pricing hint */}
          <div className="mt-10 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <span className="text-sm font-medium">14 dagen gratis proberen</span>
            </div>
            <p className="text-sm text-gray-400">
              Start vandaag nog zonder creditcard. Abonnementen vanaf SRD 49/maand.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Kassa POS</span>
            </div>
            <CardTitle>Welkom</CardTitle>
            <CardDescription>
              Log in of maak een account aan om te starten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Inloggen</TabsTrigger>
                <TabsTrigger value="register">Registreren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mailadres</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="uw@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      data-testid="login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Wachtwoord</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      data-testid="login-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="login-btn">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Inloggen
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-business">Bedrijfsnaam *</Label>
                    <Input
                      id="reg-business"
                      placeholder="Uw Winkel B.V."
                      value={registerData.business_name}
                      onChange={(e) => setRegisterData({ ...registerData, business_name: e.target.value })}
                      data-testid="register-business"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-mailadres *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="uw@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      data-testid="register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Wachtwoord *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimaal 8 tekens"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      data-testid="register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Telefoonnummer</Label>
                    <Input
                      id="reg-phone"
                      placeholder="+597 xxxxxxx"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-btn">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Gratis Starten
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    14 dagen gratis proberen. Geen creditcard nodig.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
