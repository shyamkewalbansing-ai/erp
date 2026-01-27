import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenantAuth } from '../context/TenantAuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Home, Loader2, Mail, Lock, User } from 'lucide-react';

export default function TenantLogin() {
  const navigate = useNavigate();
  const { login, register } = useTenantAuth();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Welkom terug!');
      navigate('/huurder');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }
    setLoading(true);
    try {
      await register(registerForm.email, registerForm.password);
      toast.success('Account aangemaakt! Welkom!');
      navigate('/huurder');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-emerald-600">
            <Home className="w-8 h-8" />
            <span>Huurders Portaal</span>
          </Link>
          <p className="text-gray-500 mt-2">Beheer uw huur, betalingen en meterstanden</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle>Welkom</CardTitle>
            <CardDescription>Log in of maak een account aan</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Inloggen</TabsTrigger>
                <TabsTrigger value="register">Registreren</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mailadres</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="uw@email.com"
                        className="pl-10"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Wachtwoord</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Inloggen
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mailadres</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="uw@email.com"
                        className="pl-10"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Gebruik het e-mailadres dat uw verhuurder heeft geregistreerd
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Wachtwoord</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Minimaal 6 tekens"
                        className="pl-10"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Bevestig wachtwoord</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Account Aanmaken
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t text-center text-sm text-gray-500">
              <p>Bent u een verhuurder?</p>
              <Link to="/login" className="text-emerald-600 hover:underline font-medium">
                Ga naar verhuurder login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
