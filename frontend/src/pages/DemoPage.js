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
  Sparkles,
  Star,
  Zap,
  Shield,
  Clock,
  Play,
  CheckCircle,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Demo URL
const DEMO_URL = 'https://demogebruiker.facturatie.sr';
const DEMO_EMAIL = 'demo@facturatie.sr';
const DEMO_PASSWORD = 'demo2024';

// Modules data with images
const MODULES = [
  {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    description: 'Panden, huurders, betalingen en onderhoud',
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-200',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    features: ['Huurdersbeheer', 'Facturatie', 'Meterstanden', 'Huurders Portal']
  },
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Personeel, verlof en aanwezigheid',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    shadowColor: 'shadow-blue-200',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    features: ['Personeelsdossiers', 'Verlofbeheer', 'Aanwezigheid', 'Loonlijst']
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Voertuigen, verkoop en multi-valuta',
    icon: Car,
    gradient: 'from-orange-500 to-red-600',
    shadowColor: 'shadow-orange-200',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
    features: ['Voertuigbeheer', 'Verkoop', 'SRD/EUR/USD', 'Klanten Portal']
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'GPT-4 powered klantenservice',
    icon: MessageSquare,
    gradient: 'from-purple-500 to-pink-600',
    shadowColor: 'shadow-purple-200',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    features: ['24/7 Support', 'Meertalig', 'Aanpasbaar', 'Chat History']
  },
  {
    id: 'cms',
    name: 'CMS & Website',
    description: 'Beheer uw website content',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    shadowColor: 'shadow-cyan-200',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80',
    features: ['Pagina Builder', 'Menu Beheer', 'SEO Tools', 'Media Library']
  },
  {
    id: 'rapportage',
    name: 'Rapportage',
    description: 'Analytics en inzichten',
    icon: BarChart3,
    gradient: 'from-teal-500 to-emerald-600',
    shadowColor: 'shadow-teal-200',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
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
    toast.success(`${field === 'url' ? 'Demo URL' : field === 'email' ? 'E-mailadres' : 'Wachtwoord'} gekopieerd!`);
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
  };

  const handleDemoLogin = async () => {
    setLoggingIn(true);
    
    // Redirect to demo subdomain - will auto-login there
    window.location.href = DEMO_URL + '/login?auto=true';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-500/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-40 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30 px-4 py-2">
            <Play className="w-4 h-4 mr-2" />
            Live Demo
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ervaar het{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Platform
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Ontdek alle modules met onze live demo. Geen registratie nodig, 
            direct toegang tot alle functies.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { value: '6+', label: 'Modules', icon: Sparkles },
              { value: 'Gratis', label: 'Geen kosten', icon: Zap },
              { value: 'Direct', label: 'Toegang', icon: Rocket },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
                <stat.icon className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login Card Section */}
      <section className="py-12 -mt-10 relative z-10">
        <div className="max-w-lg mx-auto px-4">
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-2xl opacity-20"></div>
          
          {/* Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Demo Omgeving</h2>
              <p className="text-emerald-100 text-sm mt-1">Probeer alle functies gratis uit</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Demo URL */}
              <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Demo URL</p>
                      <p className="text-slate-800 font-mono font-semibold text-sm">{DEMO_URL}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-10 w-10 p-0 rounded-xl"
                    onClick={() => copyToClipboard(DEMO_URL, 'url')}
                  >
                    {copied.url ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Automatisch inloggen</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Klik op "Start Demo" om automatisch in te loggen en alle functies te verkennen. 
                      Demo data wordt na 1 uur automatisch verwijderd.
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <Button 
                size="lg"
                onClick={handleDemoLogin}
                disabled={loggingIn}
                className="w-full h-14 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xl shadow-emerald-200 text-base"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Demo laden...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Demo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-slate-400">
                U wordt automatisch ingelogd op de demo omgeving
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              <Sparkles className="w-4 h-4 mr-2" />
              Beschikbaar in Demo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Alle Modules Ontgrendeld
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ervaar de volledige kracht van ons platform met toegang tot alle modules
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MODULES.map((module, index) => {
              const IconComponent = module.icon;
              
              return (
                <div
                  key={module.id}
                  className="group relative"
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${module.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-all duration-500`}></div>
                  
                  {/* Card */}
                  <div className="relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                    {/* Image Header */}
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={module.image} 
                        alt={module.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${module.gradient} opacity-80`}></div>
                      
                      {/* Icon */}
                      <div className="absolute bottom-4 left-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-xl">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {/* Check badge */}
                      <div className="absolute top-4 right-4">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Waarom Demo?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Probeer voor u koopt
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Ervaar alle functies zonder verplichtingen
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: 'Direct Toegang', desc: 'Geen registratie nodig', color: 'from-emerald-400 to-teal-500' },
              { icon: Shield, title: 'Alle Functies', desc: 'Volledige toegang', color: 'from-teal-400 to-cyan-500' },
              { icon: Clock, title: 'Geen Limiet', desc: 'Neem uw tijd', color: 'from-cyan-400 to-blue-500' },
              { icon: Star, title: 'Gratis', desc: 'Geen kosten', color: 'from-blue-400 to-indigo-500' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all group">
                <div className={`w-14 h-14 mb-4 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Klaar om te beginnen?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
              Start nu met de demo of bekijk onze prijzen voor een eigen account
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-200"
                onClick={handleDemoLogin}
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                Start Demo Nu
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="h-14 px-8 rounded-full border-slate-300 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => navigate('/prijzen')}
              >
                Bekijk Prijzen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
