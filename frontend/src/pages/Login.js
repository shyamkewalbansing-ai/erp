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

// Helper to check if on subdomain/custom domain
function getWorkspaceFromDomain() {
  const hostname = window.location.hostname;
  const mainDomains = ['facturatie.sr', 'www.facturatie.sr', 'app.facturatie.sr', 'localhost', '127.0.0.1'];
  
  if (mainDomains.includes(hostname)) {
    return null;
  }
  
  // Extract subdomain from facturatie.sr
  if (hostname.endsWith('.facturatie.sr')) {
    return hostname.replace('.facturatie.sr', '');
  }
  
  // Custom domain - return the full domain
  return hostname;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [settings, setSettings] = useState(null);
  const [workspaceBranding, setWorkspaceBranding] = useState(null);
  const [autoLoginInProgress, setAutoLoginInProgress] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const workspaceSlug = getWorkspaceFromDomain();
    
    if (workspaceSlug) {
      // Load workspace branding for subdomain/custom domain
      api.get(`/workspace/branding-public/${workspaceSlug}`)
        .then(res => setWorkspaceBranding(res.data))
        .catch(() => {
          // Fallback to default settings
          getLandingSettings().then(res => setSettings(res.data)).catch(() => {});
        });
    } else {
      getLandingSettings().then(res => setSettings(res.data)).catch(() => {});
    }
    
    // Check for auto-login parameter (for demo)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === 'true') {
      handleAutoLogin();
    }
  }, []);

  const handleAutoLogin = async () => {
    setAutoLoginInProgress(true);
    try {
      await login('demo@facturatie.sr', 'demo2024');
      toast.success('Welkom bij de demo!');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Auto-login failed:', error);
      toast.error('Auto-login mislukt. Probeer handmatig in te loggen.');
      setAutoLoginInProgress(false);
    }
  };

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

  // Show loading screen during auto-login
  if (autoLoginInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Demo wordt geladen...</h2>
          <p className="text-emerald-200">Even geduld, u wordt automatisch ingelogd.</p>
        </div>
      </div>
    );
  }

  // Get branding values
  const brandingLogo = workspaceBranding?.logo_url || settings?.logo_url;
  const brandingName = workspaceBranding?.portal_name || settings?.company_name || 'Facturatie N.V.';
  const brandingPrimaryColor = workspaceBranding?.primary_color || '#0caf60';
  const brandingLoginImage = workspaceBranding?.login_image_url;
  const brandingLoginBg = workspaceBranding?.login_background_url;
  const brandingWelcomeText = workspaceBranding?.welcome_text || `Welkom bij ${brandingName}`;
  const brandingTagline = workspaceBranding?.tagline || 'Beheer uw bedrijf eenvoudig en efficiënt.';
  const isWorkspace = !!workspaceBranding;

  // ============================================
  // ORIGINAL FACTURATIE.SR LOGIN PAGE (not workspace)
  // ============================================
  if (!isWorkspace) {
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
                    placeholder="naam@bedrijf.sr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                    data-testid="login-email-input"
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
                    className="pl-12 h-12 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                    data-testid="login-password-input"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Inloggen...
                  </>
                ) : (
                  <>
                    Inloggen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 text-slate-500">
                  Nog geen account?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link 
              to="/register" 
              className="flex items-center justify-center gap-2 w-full h-12 border-2 border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 font-semibold rounded-xl transition-colors"
              data-testid="register-link"
            >
              Account aanmaken
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Footer */}
            <p className="text-center text-sm text-slate-500 mt-8">
              Door in te loggen gaat u akkoord met onze{' '}
              <Link to="/voorwaarden" className="text-emerald-600 hover:underline">voorwaarden</Link>
              {' '}en{' '}
              <Link to="/privacy" className="text-emerald-600 hover:underline">privacybeleid</Link>
            </p>
          </div>
        </div>

        {/* Forgot Password Dialog */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Wachtwoord vergeten?
              </DialogTitle>
              <DialogDescription>
                Voer uw e-mailadres in en we sturen u een link om uw wachtwoord te resetten.
              </DialogDescription>
            </DialogHeader>
            
            {resetSent ? (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">E-mail verzonden!</h3>
                <p className="text-slate-600">
                  Controleer uw inbox voor de reset link. Check ook uw spam folder.
                </p>
                <Button onClick={closeForgotPassword} className="mt-4">
                  Sluiten
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mailadres</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="naam@bedrijf.sr"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={closeForgotPassword}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verzenden...
                      </>
                    ) : (
                      'Verstuur reset link'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============================================
  // WORKSPACE/CUSTOM DOMAIN LOGIN PAGE (customizable)
  // ============================================
  return (
    <div className="min-h-screen flex">
      {/* Left side - Beautiful gradient with features or custom image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: brandingLoginBg 
            ? `url(${brandingLoginBg}) center/cover no-repeat` 
            : `linear-gradient(to bottom right, ${brandingPrimaryColor}dd, ${brandingPrimaryColor}99, #1e293b)`
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Background effects (only if no custom image) */}
        {!brandingLoginBg && (
          <>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)]"></div>
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.2),transparent_50%)]"></div>
            </div>
            
            {/* Floating shapes */}
            <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-40 left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </>
        )}
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            {brandingLogo ? (
              <img 
                src={brandingLogo} 
                alt={brandingName} 
                className="h-12 w-auto object-contain"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white">{brandingName}</h2>
            )}
          </div>

          {/* Custom Login Image or Features */}
          {brandingLoginImage ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <img 
                src={brandingLoginImage} 
                alt="Login" 
                className="max-w-full max-h-[400px] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  {brandingWelcomeText}
                </h2>
                <p className="text-lg text-slate-200 max-w-md">
                  {brandingTagline}
                </p>
              </div>
            </div>
          )}
          
          {/* Workspace branding footer */}
          <div className="text-center">
            <p className="text-white/60 text-sm">
              Powered by <span className="text-white/80 font-medium">Facturatie N.V.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            {brandingLogo ? (
              <img 
                src={brandingLogo} 
                alt={brandingName} 
                className="h-10 w-auto object-contain"
              />
            ) : (
              <h2 className="text-xl font-bold" style={{ color: brandingPrimaryColor }}>{brandingName}</h2>
            )}
          </div>

          {/* Header */}
          <div className="mb-8">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4"
              style={{ 
                backgroundColor: `${brandingPrimaryColor}20`, 
                color: brandingPrimaryColor 
              }}
            >
              <Sparkles className="w-4 h-4" />
              Welkom terug
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Inloggen</h1>
            <p className="text-slate-600">
              Log in bij {brandingName}
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
                  style={{ '--tw-ring-color': `${brandingPrimaryColor}40` }}
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
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Probeer eerst de demo?</p>
                <Link to="/demo" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1">
                  Bekijk demo 
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {['JK', 'SM', 'RB'].map((initials, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              500+ klanten vertrouwen ons
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
