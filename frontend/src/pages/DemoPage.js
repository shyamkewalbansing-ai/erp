import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Building2, 
  Car, 
  Sparkles,
  Scissors,
  Fuel,
  LogIn,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Play,
  CheckCircle,
  Rocket,
  Shield,
  Clock,
  RefreshCw,
  AlertTriangle,
  Zap,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Demo credentials
const DEMO_EMAIL = 'demo@facturatie.sr';
const DEMO_PASSWORD = 'Demo123!';

// Modules available in demo
const DEMO_MODULES = [
  {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    description: 'Beheer uw panden, huurders en betalingen',
    icon: Building2,
    color: 'emerald',
    features: ['Huurdersbeheer', 'Facturatie', 'Meterstanden', 'Contracten']
  },
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Personeel, verlof en salarissen',
    icon: Users,
    color: 'blue',
    features: ['Personeelsdossiers', 'Verlofbeheer', 'Aanwezigheid', 'Loonlijst']
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Voertuigen, verkoop en klanten',
    icon: Car,
    color: 'orange',
    features: ['Voertuigbeheer', 'Verkoop', 'Multi-valuta', 'Klanten Portal']
  },
  {
    id: 'beautyspa',
    name: 'Beauty & Spa',
    description: 'Afspraken en behandelingen',
    icon: Scissors,
    color: 'pink',
    features: ['Afspraken', 'Behandelingen', 'Klanten', 'Kassa']
  },
  {
    id: 'pompstation',
    name: 'Pompstation',
    description: 'Brandstofverkoop en voorraad',
    icon: Fuel,
    color: 'amber',
    features: ['Verkoop', 'Voorraad', 'Rapportages', 'Personeel']
  }
];

export default function DemoPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState({ email: false, password: false });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/landing/settings').catch(() => ({ data: {} }));
      setSettings(res.data || {});
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [field]: true });
    toast.success(`${field === 'email' ? 'E-mailadres' : 'Wachtwoord'} gekopieerd!`);
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
  };

  const handleAutoLogin = async () => {
    setLoggingIn(true);
    
    try {
      // Direct login with demo credentials
      const response = await api.post('/auth/login', {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD
      });
      
      if (response.data?.access_token) {
        // Store token and user data
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        toast.success('Welkom bij de demo! U bent nu ingelogd.');
        
        // Navigate to dashboard
        window.location.href = '/app/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500">Demo laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-32 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-4 py-2 text-sm">
            <Play className="w-4 h-4 mr-2" />
            Gratis Demo Omgeving
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Probeer{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Gratis
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Test alle modules zonder registratie. De demo wordt automatisch gereset, 
            dus u kunt vrijuit experimenteren.
          </p>

          {/* Demo Notice */}
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-4 py-2 text-amber-300 text-sm">
            <RefreshCw className="w-4 h-4" />
            Demo data wordt elk uur automatisch gereset
          </div>
        </div>
      </section>

      {/* Login Card - Overlapping Hero */}
      <section className="relative -mt-20 z-10 pb-16">
        <div className="max-w-xl mx-auto px-4">
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-2xl opacity-20"></div>
          
          {/* Main Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                <LogIn className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Demo Inloggen</h2>
              <p className="text-emerald-100 mt-1">Gebruik onderstaande gegevens</p>
            </div>
            
            <div className="p-8">
              {/* Credentials Display */}
              <div className="space-y-4 mb-8">
                {/* Email Field */}
                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Gebruikersnaam</p>
                        <p className="text-lg font-bold text-slate-800 font-mono">{DEMO_EMAIL}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-10 w-10 p-0 rounded-xl"
                      onClick={() => copyToClipboard(DEMO_EMAIL, 'email')}
                    >
                      {copied.email ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* Password Field */}
                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Wachtwoord</p>
                        <p className="text-lg font-bold text-slate-800 font-mono">
                          {showPassword ? DEMO_PASSWORD : '••••••••'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-10 w-10 p-0 rounded-xl"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-10 w-10 p-0 rounded-xl"
                        onClick={() => copyToClipboard(DEMO_PASSWORD, 'password')}
                      >
                        {copied.password ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Login Button */}
              <Button 
                size="lg"
                onClick={handleAutoLogin}
                disabled={loggingIn}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Inloggen...
                  </>
                ) : (
                  <>
                    <Rocket className="w-6 h-6 mr-3" />
                    Automatisch Inloggen
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </>
                )}
              </Button>

              {/* Info Text */}
              <p className="text-center text-sm text-slate-500 mt-4">
                Klik op de knop om direct in te loggen op de demo
              </p>

              {/* Demo Warning */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Demo Modus</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Dit is een test omgeving. Alle data die u invoert wordt automatisch verwijderd. 
                      Gebruik dit niet voor echte bedrijfsdata.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Modules */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle className="w-4 h-4 mr-2" />
              Beschikbaar in Demo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              5 Modules om te Testen
            </h2>
            <p className="text-lg text-slate-600">
              Al deze modules zijn volledig beschikbaar in de demo omgeving
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEMO_MODULES.map((module) => {
              const IconComponent = module.icon;
              const colorClasses = {
                emerald: 'from-emerald-500 to-teal-600 shadow-emerald-200',
                blue: 'from-blue-500 to-indigo-600 shadow-blue-200',
                orange: 'from-orange-500 to-red-600 shadow-orange-200',
                pink: 'from-pink-500 to-rose-600 shadow-pink-200',
                amber: 'from-amber-500 to-orange-600 shadow-amber-200'
              };
              
              return (
                <div
                  key={module.id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center shadow-lg mb-4`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{module.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {module.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* AI Assistant Card */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-xl font-bold mb-2">AI Assistent</h3>
              <p className="text-purple-100 text-sm mb-4">Slimme AI helper die u begeleidt</p>
              
              <div className="flex flex-wrap gap-2">
                {['GPT-4 Powered', 'Commando\'s', 'Hulp'].map((feature, i) => (
                  <span 
                    key={i}
                    className="text-xs px-2.5 py-1 bg-white/20 text-white rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: 'Direct Toegang', desc: 'Geen registratie nodig', color: 'emerald' },
              { icon: Shield, title: 'Veilige Omgeving', desc: 'Geen echte data risico', color: 'blue' },
              { icon: RefreshCw, title: 'Auto Reset', desc: 'Elk uur vers begin', color: 'orange' },
              { icon: Star, title: 'Alle Features', desc: 'Volledige toegang', color: 'purple' },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-${feature.color}-100 flex items-center justify-center`}>
                  <feature.icon className={`w-8 h-8 text-${feature.color}-600`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Klaar om te starten?</h2>
          <p className="text-emerald-100 mb-8">Log nu in en ontdek alle mogelijkheden</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleAutoLogin}
              disabled={loggingIn}
              className="h-14 px-8 bg-white text-emerald-700 hover:bg-emerald-50 rounded-full font-bold shadow-xl"
            >
              {loggingIn ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-5 h-5 mr-2" />
              )}
              Start Demo Nu
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-14 px-8 border-2 border-white/30 text-white hover:bg-white/10 rounded-full font-bold"
              onClick={() => navigate('/prijzen')}
            >
              Bekijk Prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
