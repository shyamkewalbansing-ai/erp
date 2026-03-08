import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, Store, ShoppingCart, BarChart3, Users, Package, CreditCard, ArrowRight, Check } from 'lucide-react';

export default function KassaLogin() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useKassaAuth();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
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

  const features = [
    { icon: ShoppingCart, title: 'Snelle Verkoop', desc: 'Intuïtieve POS interface' },
    { icon: Package, title: 'Voorraadbeheer', desc: 'Automatische tracking' },
    { icon: Users, title: 'Klantenbeheer', desc: 'Loyaliteitsprogramma' },
    { icon: BarChart3, title: 'Rapportages', desc: 'Uitgebreide analyses' },
    { icon: CreditCard, title: 'Betaalmethodes', desc: 'Cash, PIN & QR' }
  ];

  return (
    <div className="min-h-screen bg-white flex" data-testid="kassa-login">
      {/* Left Side - Hero/Features */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
              <Store className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Kassa POS</h1>
              <p className="text-blue-200">Point of Sale voor Suriname</p>
            </div>
          </div>
          
          {/* Main Headline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Het complete<br />kassasysteem voor<br />uw bedrijf
          </h2>
          
          <p className="text-blue-100 text-lg mb-10 max-w-md">
            Beheer uw verkopen, voorraad en klanten met één intuïtief systeem. 
            Speciaal ontworpen voor ondernemers in Suriname.
          </p>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-blue-200 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trial Banner */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center gap-2 text-emerald-300 mb-2">
              <Check className="w-5 h-5" />
              <span className="font-semibold">14 dagen gratis proberen</span>
            </div>
            <p className="text-blue-100 text-sm">
              Start vandaag nog zonder creditcard. Abonnementen vanaf SRD 49/maand.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Kassa POS</span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isRegister ? 'Account aanmaken' : 'Welkom terug'}
              </h2>
              <p className="text-gray-500">
                {isRegister ? 'Start uw 14-daagse gratis proefperiode' : 'Log in om door te gaan'}
              </p>
            </div>

            {!isRegister ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-gray-700 font-medium">E-mailadres</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="uw@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-gray-700 font-medium">Wachtwoord</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Uw wachtwoord"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="login-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-semibold shadow-lg shadow-blue-600/25" 
                  disabled={loading} 
                  data-testid="login-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Inloggen
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-business" className="text-gray-700 font-medium">Bedrijfsnaam *</Label>
                  <Input
                    id="reg-business"
                    placeholder="Uw Winkel B.V."
                    value={registerData.business_name}
                    onChange={(e) => setRegisterData({ ...registerData, business_name: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="register-business"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-gray-700 font-medium">E-mailadres *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="uw@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-gray-700 font-medium">Wachtwoord *</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Minimaal 8 tekens"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="register-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-gray-700 font-medium">Telefoonnummer</Label>
                  <Input
                    id="reg-phone"
                    placeholder="+597 xxxxxxx"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-semibold shadow-lg shadow-blue-600/25" 
                  disabled={loading} 
                  data-testid="register-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Gratis Starten
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500 pt-2">
                  14 dagen gratis proberen. Geen creditcard nodig.
                </p>
              </form>
            )}

            {/* Toggle between login/register */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-600">
                {isRegister ? 'Heeft u al een account?' : 'Nog geen account?'}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="ml-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                  type="button"
                >
                  {isRegister ? 'Inloggen' : 'Gratis registreren'}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Kassa POS - Point of Sale voor Suriname
          </p>
        </div>
      </div>
    </div>
  );
}
