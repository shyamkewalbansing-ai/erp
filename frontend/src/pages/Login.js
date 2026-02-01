import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  KeyRound, 
  Sparkles,
  Shield,
  Zap,
  Users,
  CheckCircle,
  Building2,
  BarChart3,
  Play
} from 'lucide-react';
import api, { getLandingSettings } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [settings, setSettings] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getLandingSettings().then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welkom terug!');
      navigate('/app/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Vul uw e-mailadres in');
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setResetSent(true);
      toast.success('Instructies verzonden naar uw e-mail');
    } catch (error) {
      setResetSent(true);
      toast.success('Als dit e-mailadres bestaat, ontvangt u instructies');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Beautiful gradient with features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.4),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.4),transparent_50%)]"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-10 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link to="/">
              <img 
                src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                alt="Facturatie N.V." 
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Welkom bij<br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Facturatie N.V.
                </span>
              </h2>
              <p className="text-lg text-slate-300 max-w-md">
                Het complete ERP platform voor Surinaamse bedrijven. Beheer uw bedrijf eenvoudig en efficiënt.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Building2, text: 'Vastgoed, HRM & Auto Dealer modules' },
                { icon: Shield, text: 'Veilig en betrouwbaar platform' },
                { icon: Zap, text: 'Snel en modern ontwerp' },
                { icon: Users, text: '500+ tevreden klanten' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-white/90">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex gap-8">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
              { value: '6+', label: 'Modules' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link to="/">
              <img 
                src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
                alt="Facturatie N.V." 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Welkom terug
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Inloggen</h1>
            <p className="text-slate-600">
              Log in om uw bedrijf te beheren
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium text-slate-700">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium text-slate-700">Wachtwoord</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  data-testid="forgot-password-link"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  required
                  data-testid="login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 font-semibold text-base"
              disabled={loading}
              data-testid="login-submit"
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

          {/* Demo link */}
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Probeer eerst de demo?</p>
                <Link to="/demo" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Bekijk demo →
                </Link>
              </div>
            </div>
          </div>

          {/* Register link */}
          <p className="mt-8 text-center text-slate-600">
            Nog geen account?{' '}
            <Link 
              to="/register" 
              className="text-emerald-600 font-semibold hover:text-emerald-700"
              data-testid="register-link"
            >
              Registreer hier
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={closeForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold">Wachtwoord vergeten?</DialogTitle>
            <DialogDescription>
              {resetSent 
                ? 'Controleer uw inbox voor de reset instructies.'
                : 'Vul uw e-mailadres in en we sturen u instructies om uw wachtwoord te herstellen.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {!resetSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="naam@voorbeeld.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-12 h-12"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verstuur instructies'
                )}
              </Button>
            </form>
          ) : (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">E-mail verzonden! Controleer uw inbox.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
