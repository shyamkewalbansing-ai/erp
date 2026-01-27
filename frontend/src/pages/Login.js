import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Building2, Mail, Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';
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
      navigate('/dashboard');
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
      // Don't reveal if email exists or not for security
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
      {/* Left side - Image with overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={settings?.login_image_url || "https://customer-assets.emergentagent.com/job_modular-erp-19/artifacts/kribqmjl_261F389D-0F54-4D61-963C-4B58A923ED3D.png"}
          alt="Facturatie ERP"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 via-emerald-900/50 to-emerald-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-medium font-body">500+ actieve gebruikers</span>
          </div>
          <h2 className="font-heading text-3xl font-bold mb-3 tracking-tight">Welkom bij Facturatie N.V.</h2>
          <p className="text-base text-white/90 font-body leading-relaxed max-w-md">
            Beheer uw bedrijf eenvoudig met onze complete ERP-oplossing. Boekhouding, HRM en meer op één plek.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="mb-10">
            <img 
              src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
              alt="Facturatie N.V." 
              className="h-10 md:h-12 w-auto"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welkom terug</h2>
            <p className="text-gray-600 font-body">
              Log in om uw bedrijf te beheren
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-body font-medium">E-mailadres</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 bg-white border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all font-body"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-body font-medium">Wachtwoord</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium font-body transition-colors"
                  data-testid="forgot-password-link"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 bg-white border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all font-body"
                  required
                  data-testid="login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all font-body font-semibold text-base"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  Inloggen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-gray-600 font-body">
            Nog geen account?{' '}
            <Link 
              to="/register" 
              className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              data-testid="register-link"
            >
              Registreer hier
            </Link>
          </p>
          
          {/* Tenant portal link */}
          <p className="mt-4 text-center">
            <Link 
              to="/huurder/login" 
              className="text-sm text-gray-500 hover:text-emerald-600 transition-colors font-body"
              data-testid="tenant-login-link"
            >
              Bent u een huurder? Klik hier
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={closeForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Wachtwoord vergeten
            </DialogTitle>
            <DialogDescription>
              {resetSent 
                ? 'Controleer uw e-mail voor verdere instructies.'
                : 'Vul uw e-mailadres in om uw wachtwoord te resetten.'}
            </DialogDescription>
          </DialogHeader>
          
          {!resetSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mailadres</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="naam@voorbeeld.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="reset-email-input"
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeForgotPassword}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={resetLoading} data-testid="reset-submit-btn">
                  {resetLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Verstuur reset link
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Als het e-mailadres <strong>{resetEmail}</strong> in ons systeem voorkomt, 
                ontvangt u binnen enkele minuten een e-mail met instructies om uw wachtwoord te resetten.
              </p>
              <Button onClick={closeForgotPassword} data-testid="close-reset-modal">
                Terug naar inloggen
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
