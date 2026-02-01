import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  LogIn,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Demo credentials
const DEMO_EMAIL = 'demo@facturatie.sr';
const DEMO_PASSWORD = 'demo2024';

// Modules data
const MODULES = [
  {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    description: 'Panden, huurders, betalingen en onderhoud',
    icon: Building2,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500',
    features: ['Huurdersbeheer', 'Facturatie', 'Meterstanden', 'Huurders Portal']
  },
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Personeel, verlof en aanwezigheid',
    icon: Users,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500',
    features: ['Personeelsdossiers', 'Verlofbeheer', 'Aanwezigheid', 'Loonlijst']
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Voertuigen, verkoop en multi-valuta',
    icon: Car,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500',
    features: ['Voertuigbeheer', 'Verkoop', 'SRD/EUR/USD', 'Klanten Portal']
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'GPT-4 powered klantenservice',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500',
    features: ['24/7 Support', 'Meertalig', 'Aanpasbaar', 'Chat History']
  },
  {
    id: 'cms',
    name: 'CMS & Website',
    description: 'Beheer uw website content',
    icon: Globe,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-500',
    features: ['Pagina Builder', 'Menu Beheer', 'SEO Tools', 'Media Library']
  },
  {
    id: 'rapportage',
    name: 'Rapportage',
    description: 'Analytics en inzichten',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500',
    features: ['Dashboards', 'PDF Export', 'Automatische Rapporten', 'Grafieken']
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

  const handleDemoLogin = async () => {
    setLoggingIn(true);
    
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      toast.success('Welkom bij de demo!');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Inloggen mislukt. Probeer het opnieuw.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl"></div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 bg-emerald-100 text-emerald-700 border-emerald-200">
            <Sparkles className="w-4 h-4 mr-2" />
            Live Demo
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-slate-800">Probeer de </span>
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Demo</span>
          </h1>
          
          <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
            Ervaar alle modules direct. Geen registratie nodig.
          </p>

          {/* Credentials Card */}
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-6 mb-8">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Inloggegevens
            </h3>
            
            {/* Email */}
            <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500">E-mailadres</p>
                    <p className="text-slate-800 font-mono text-sm font-medium">{DEMO_EMAIL}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-9 w-9 p-0"
                  onClick={() => copyToClipboard(DEMO_EMAIL, 'email')}
                >
                  {copied.email ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500">Wachtwoord</p>
                    <p className="text-slate-800 font-mono text-sm font-medium">
                      {showPassword ? DEMO_PASSWORD : '••••••••'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-9 w-9 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-9 w-9 p-0"
                    onClick={() => copyToClipboard(DEMO_PASSWORD, 'password')}
                  >
                    {copied.password ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button 
              size="lg"
              onClick={handleDemoLogin}
              disabled={loggingIn}
              className="w-full h-12 font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-lg shadow-emerald-200"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Inloggen...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Direct Inloggen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
            Beschikbare Modules
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((module) => {
              const IconComponent = module.icon;
              
              return (
                <div
                  key={module.id}
                  className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {module.name}
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {module.description}
                  </p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5">
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
          </div>

          {/* Bottom Note */}
          <p className="mt-10 text-center text-slate-400 text-sm">
            Demo data wordt automatisch opgeruimd
          </p>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
