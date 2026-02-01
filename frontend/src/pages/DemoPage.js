import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  LogIn,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';

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
    color: 'from-emerald-500 to-emerald-600',
    features: ['Huurdersbeheer', 'Facturatie', 'Meterstanden', 'Huurders Portal']
  },
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Personeel, verlof en aanwezigheid',
    icon: Users,
    color: 'from-teal-500 to-teal-600',
    features: ['Personeelsdossiers', 'Verlofbeheer', 'Aanwezigheid', 'Loonlijst']
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Voertuigen, verkoop en multi-valuta',
    icon: Car,
    color: 'from-cyan-500 to-cyan-600',
    features: ['Voertuigbeheer', 'Verkoop', 'SRD/EUR/USD', 'Klanten Portal']
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'GPT-4 powered klantenservice',
    icon: MessageSquare,
    color: 'from-violet-500 to-violet-600',
    features: ['24/7 Support', 'Meertalig', 'Aanpasbaar', 'Chat History']
  },
  {
    id: 'cms',
    name: 'CMS & Website',
    description: 'Beheer uw website content',
    icon: Globe,
    color: 'from-blue-500 to-blue-600',
    features: ['Pagina Builder', 'Menu Beheer', 'SEO Tools', 'Media Library']
  },
  {
    id: 'rapportage',
    name: 'Rapportage',
    description: 'Analytics en inzichten',
    icon: BarChart3,
    color: 'from-orange-500 to-orange-600',
    features: ['Dashboards', 'PDF Export', 'Automatische Rapporten', 'Grafieken']
  }
];

export default function DemoPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

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

  const handleDemoLogin = async () => {
    setLoggingIn(true);
    
    try {
      const response = await api.post('/auth/login', {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD
      });

      if (response.data?.access_token) {
        // Store token and user data
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        toast.success('Welkom bij de demo!');
        
        // Navigate to dashboard
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Inloggen mislukt. Probeer het opnieuw.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">Probeer de </span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Demo</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Ervaar alle modules direct. Geen registratie nodig.
          </p>

          <Button 
            size="lg"
            onClick={handleDemoLogin}
            disabled={loggingIn}
            className="h-16 px-12 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-2xl shadow-emerald-500/25 transition-all duration-300 hover:scale-105"
          >
            {loggingIn ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Inloggen...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-3" />
                Direct Starten
                <ArrowRight className="w-5 h-5 ml-3" />
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((module) => {
              const IconComponent = module.icon;
              
              return (
                <div
                  key={module.id}
                  className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {module.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-5">
                    {module.description}
                  </p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {module.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <Button 
              size="lg"
              onClick={handleDemoLogin}
              disabled={loggingIn}
              className="h-14 px-10 text-base font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-300"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Inloggen...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Start de Demo
                </>
              )}
            </Button>
            
            <p className="mt-6 text-slate-500 text-sm">
              Alle data wordt automatisch opgeruimd
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
