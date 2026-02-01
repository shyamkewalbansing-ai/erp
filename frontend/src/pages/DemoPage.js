import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Play, 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  LogIn,
  Star,
  Shield,
  Zap,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Demo account credentials
const DEMO_CREDENTIALS = {
  email: 'demo@facturatie.sr',
  password: 'demo2024',
  name: 'Demo Gebruiker'
};

// Module data with screenshots
const DEMO_MODULES = [
  {
    id: 'hrm',
    name: 'HRM Module',
    description: 'Beheer personeel, verlof, aanwezigheid en meer',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/fc3a6f7a9ded44ab9a2fee6d6e23c9bba1f549b78f124edd0f36b657e15319fb.png',
    features: ['Medewerker overzicht', 'Verlofbeheer', 'Aanwezigheid', 'Employee Portal']
  },
  {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    description: 'Complete oplossing voor vastgoedbeheer',
    icon: Building2,
    gradient: 'from-teal-500 to-emerald-600',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/e79a18984e934f67abb761a7bbf10de82cffc3b7005f7905f865589c73b5d5d8.png',
    features: ['Panden & Units', 'Huurdersbeheer', 'Automatische facturatie', 'Huurders Portal']
  },
  {
    id: 'autodealer',
    name: 'Auto Dealer',
    description: 'Autohandel management met multi-valuta',
    icon: Car,
    gradient: 'from-emerald-600 to-green-500',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/b40b09dfdbf4f1c39d50cd000bd68233668e94a6e24cfdb811cde13f6e1d3f42.png',
    features: ['Voertuigvoorraad', 'Verkoop registratie', 'Multi-valuta (SRD/EUR/USD)', 'Klanten Portal']
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'Intelligente klantenservice automatisering',
    icon: MessageSquare,
    gradient: 'from-teal-600 to-cyan-500',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/9f87c486b6222e0495bd7d942a77b2dbce2cef6ecd8dbba1361aa856344351d8.png',
    features: ['GPT-4 Gesprekken', '24/7 Beschikbaar', 'Meertalig', 'Aanpasbaar']
  },
  {
    id: 'cms',
    name: 'CMS & Website',
    description: 'Beheer uw website content eenvoudig',
    icon: Globe,
    gradient: 'from-green-500 to-emerald-600',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/ce27624b803e1d403726312d40b0044eeb4ddd4b1333dfc77aa00a43e4f3aa89.png',
    features: ['Pagina Builder', 'Menu Beheer', 'SEO Tools', 'Media Bibliotheek']
  },
  {
    id: 'rapportage',
    name: 'Rapportage & Analytics',
    description: 'Inzichten in uw bedrijfsprestaties',
    icon: BarChart3,
    gradient: 'from-cyan-500 to-teal-600',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/b0ecf9c0e7ed690581dd5f0b448f579c1be0099d6e30400e9d2e3cea021ba320.png',
    features: ['Real-time Dashboards', 'Gedetailleerde Rapporten', 'PDF/Excel Export', 'Automatische E-mail']
  }
];

export default function DemoPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState({ email: false, password: false });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsRes = await api.get('/public/landing/settings').catch(() => ({ data: {} }));
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleDemoLogin = () => {
    // Store demo credentials for auto-fill
    sessionStorage.setItem('demoLogin', 'true');
    navigate('/login?demo=true');
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
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30">
            <Play className="w-4 h-4 mr-2" />
            Live Demo
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ervaar het zelf met onze Demo
          </h1>
          
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Log in met het demo account en ontdek alle functionaliteiten van onze modules.
            Geen registratie nodig - direct aan de slag!
          </p>

          {/* Demo Credentials Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Demo Inloggegevens</h3>
            </div>
            
            <div className="space-y-4">
              {/* Email */}
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-xs text-slate-400">E-mailadres</p>
                      <p className="text-white font-mono font-semibold">{DEMO_CREDENTIALS.email}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/10"
                    onClick={() => copyToClipboard(DEMO_CREDENTIALS.email, 'email')}
                  >
                    {copied.email ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-xs text-slate-400">Wachtwoord</p>
                      <p className="text-white font-mono font-semibold">
                        {showPassword ? DEMO_CREDENTIALS.password : '••••••••'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-white hover:bg-white/10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-white hover:bg-white/10"
                      onClick={() => copyToClipboard(DEMO_CREDENTIALS.password, 'password')}
                    >
                      {copied.password ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full mt-6 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-full text-base font-semibold"
              onClick={handleDemoLogin}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Inloggen met Demo Account
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Veilige demo omgeving</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Onbeperkt toegang</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Alle modules inbegrepen</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Showcase */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-50 text-emerald-700 border-emerald-200">
              <Star className="w-4 h-4 mr-2" />
              6 Complete Modules
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Alle modules in de demo
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Het demo account heeft toegang tot alle modules. Ontdek de functionaliteiten van elke module.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {DEMO_MODULES.map((module, index) => {
              const IconComponent = module.icon;
              
              return (
                <div
                  key={module.id}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-90`}></div>
                    <img 
                      src={module.image} 
                      alt={module.name}
                      className="w-full h-full object-cover mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    
                    {/* Icon Badge */}
                    <div className="absolute bottom-4 left-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Module Number */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                        Module {index + 1}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {module.name}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {module.description}
                    </p>
                    
                    {/* Features */}
                    <ul className="space-y-2">
                      {module.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Hoe werkt de demo?
            </h2>
            <p className="text-lg text-slate-600">
              In 3 eenvoudige stappen kunt u alle modules uitproberen
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Kopieer Gegevens</h3>
              <p className="text-slate-600">
                Kopieer het e-mailadres en wachtwoord van het demo account hierboven
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Log In</h3>
              <p className="text-slate-600">
                Klik op "Inloggen met Demo Account" en voer de gegevens in
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ontdek</h3>
              <p className="text-slate-600">
                Verken alle modules en functionaliteiten. Experimenteer vrijuit!
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="mt-12 bg-white rounded-2xl p-6 border border-amber-200 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Let op</h4>
                <p className="text-sm text-slate-600">
                  Het demo account is bedoeld om de functionaliteiten te verkennen. 
                  Data die u toevoegt kan door anderen worden gezien of worden gereset. 
                  Voor een eigen omgeving kunt u een account aanmaken.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Klaar om te starten?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Probeer de demo of maak direct uw eigen account aan
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8"
              onClick={handleDemoLogin}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Demo Proberen
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-slate-200"
              onClick={() => navigate('/modules-overzicht?order=true')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Eigen Account Aanmaken
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
