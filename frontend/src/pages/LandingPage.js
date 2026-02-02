import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowRight, 
  Check, 
  Shield, 
  Headphones,
  Building2,
  Users,
  BarChart3,
  CheckCircle,
  Sparkles,
  Play,
  Car,
  MessageSquare,
  Globe,
  Zap,
  Star,
  Clock,
  TrendingUp,
  ChevronRight,
  Rocket
} from 'lucide-react';

// Lazy load non-critical components
const PublicNav = lazy(() => import('../components/PublicNav'));
const PublicFooter = lazy(() => import('../components/PublicFooter'));
const ChatWidget = lazy(() => import('../components/ChatWidget'));

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Minimal fallback components for critical path
const NavFallback = memo(() => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 h-16" />
));
const FooterFallback = memo(() => <div className="h-64 bg-slate-900" />);

// Helper function to get app URL (for login/register)
const getAppUrl = (path = '') => {
  const hostname = window.location.hostname;
  // If on localhost or development, use same domain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return path;
  }
  // If on main domain, redirect to app subdomain
  if (hostname === 'facturatie.sr' || hostname === 'www.facturatie.sr') {
    return `https://app.facturatie.sr${path}`;
  }
  // Otherwise use same domain
  return path;
};

// Optimized image component with lazy loading
const LazyImage = memo(({ src, alt, className, style }) => {
  const [loaded, setLoaded] = useState(false);
  const optimizedSrc = useMemo(() => {
    if (src?.includes('unsplash.com')) {
      return src.replace(/w=\d+/, 'w=600').replace(/q=\d+/, 'q=60');
    }
    return src;
  }, [src]);
  
  return (
    <div className={`relative ${className || ''}`} style={style}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
      )}
      <img 
        src={optimizedSrc} 
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
});

// Modules data
const MODULES = [
  {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    description: 'Panden, huurders, betalingen en onderhoud',
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-600',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  },
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Personeel, verlof en aanwezigheid',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Voertuigen, verkoop en multi-valuta',
    icon: Car,
    gradient: 'from-orange-500 to-red-600',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'GPT-4 powered klantenservice',
    icon: MessageSquare,
    gradient: 'from-purple-500 to-pink-600',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  },
  {
    id: 'cms',
    name: 'Website CMS',
    description: 'Beheer uw website content',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80',
  },
  {
    id: 'rapportage',
    name: 'Rapportage',
    description: 'Analytics en inzichten',
    icon: BarChart3,
    gradient: 'from-teal-500 to-emerald-600',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
  }
];

const FEATURES = [
  { icon: Shield, title: 'Veilig & Betrouwbaar', desc: 'SSL-encryptie en privacy conform lokale regels' },
  { icon: Zap, title: 'Snel & Modern', desc: 'Gebouwd met de nieuwste technologie' },
  { icon: Headphones, title: '24/7 Support', desc: 'Persoonlijke ondersteuning wanneer u het nodig heeft' },
  { icon: TrendingUp, title: 'Groei Gegarandeerd', desc: 'Bespaar tijd en krijg sneller betaald' },
];

const STATS = [
  { value: '500+', label: 'Tevreden Klanten' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
  { value: '6+', label: 'Modules' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsRes = await axios.get(`${API_URL}/public/landing/settings`).catch(() => ({ data: null }));
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading landing page:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30 px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                #1 ERP Platform in Suriname
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Het Complete{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  ERP Platform
                </span>
                {' '}voor uw Bedrijf
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-xl mx-auto lg:mx-0">
                Van vastgoedbeheer tot HRM, van autohandel tot AI-chatbot. 
                Alles wat u nodig heeft in één modern platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Button 
                  size="lg" 
                  className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-xl shadow-emerald-500/25 text-base font-semibold"
                  onClick={() => navigate('/demo')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Probeer Demo
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-14 px-8 border-white/20 text-white hover:bg-white/10 rounded-full text-base font-semibold"
                  onClick={() => window.location.href = getAppUrl('/login')}
                >
                  Inloggen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {['JK', 'SM', 'RB', 'AV'].map((initials, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-400">500+ tevreden klanten</p>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Facturatie ERP</h3>
                    <p className="text-sm text-slate-400">Dashboard Overview</p>
                  </div>
                  <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-400/30">Live</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Omzet', value: 'SRD 125K', change: '+12%', color: 'emerald' },
                    { label: 'Klanten', value: '248', change: '+8', color: 'blue' },
                    { label: 'Projecten', value: '32', change: '4 actief', color: 'purple' },
                    { label: 'Facturen', value: '156', change: '98% betaald', color: 'orange' },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-${stat.color}-500/10 backdrop-blur-sm rounded-xl p-4 border border-${stat.color}-500/20`}>
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                      <p className={`text-xs text-${stat.color}-400/80 mt-1`}>{stat.change}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              Waarom Facturatie.sr
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Veilig, Snel en Betrouwbaar
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ontworpen voor Surinaamse ondernemers die hun bedrijf willen laten groeien
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Sparkles className="w-4 h-4 mr-2" />
              Onze Modules
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Alles wat u Nodig Heeft
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Kies de modules die passen bij uw bedrijf. Flexibel en schaalbaar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((module, index) => {
              const IconComponent = module.icon;
              
              return (
                <div
                  key={module.id}
                  className="group relative cursor-pointer"
                  onClick={() => navigate(`/modules/${module.id === 'vastgoed' ? 'vastgoed-beheer' : module.id}`)}
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${module.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-all duration-500`}></div>
                  
                  {/* Card */}
                  <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300">
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={module.image} 
                        alt={module.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${module.gradient} opacity-80`}></div>
                      
                      {/* Icon */}
                      <div className="absolute bottom-4 left-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4">
                        {module.description}
                      </p>
                      <div className="flex items-center text-emerald-400 text-sm font-medium">
                        Meer info
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg"
              className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-xl shadow-emerald-500/25"
              onClick={() => navigate('/modules-overzicht')}
            >
              Bekijk Alle Modules
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              Hoe het Werkt
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              In 3 Stappen van Start
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Kies uw Modules', desc: 'Selecteer alleen de modules die u nodig heeft', icon: CheckCircle },
              { step: '2', title: 'Start Gratis', desc: 'Probeer 3 dagen gratis, geen creditcard nodig', icon: Rocket },
              { step: '3', title: 'Groei uw Bedrijf', desc: 'Bespaar tijd en verhoog uw productiviteit', icon: TrendingUp },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-300 to-transparent"></div>
                )}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200 text-white text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-16 text-center border border-slate-100 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Klaar om te Starten?
              </h2>
              <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
                Probeer alle modules gratis met onze demo of neem contact met ons op voor een persoonlijk gesprek.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="h-14 px-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all text-base font-semibold"
                  onClick={() => navigate('/demo')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Gratis Demo
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 rounded-full border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-base font-semibold"
                  onClick={() => navigate('/contact')}
                >
                  Contact Opnemen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
