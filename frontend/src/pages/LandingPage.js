import { useState, useEffect, memo, lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowRight, 
  Check, 
  Shield, 
  Headphones,
  Phone,
  Loader2,
  Building2,
  Users,
  BarChart3,
  CheckCircle,
  Briefcase,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  Sparkles
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Lazy load ChatWidget
const ChatWidget = lazy(() => import('../components/ChatWidget'));

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Memoized components for performance - Glass morphism design
const FeatureCard = memo(({ icon: Icon, title, description, delay = 0 }) => (
  <Card className="group relative overflow-hidden border border-emerald-100/50 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-12px_rgba(12,175,96,0.2)] transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: `${delay}ms` }}>
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <CardContent className="relative p-8">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-heading text-xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h3>
      <p className="font-body text-gray-600 leading-relaxed">{description}</p>
    </CardContent>
  </Card>
));

FeatureCard.displayName = 'FeatureCard';

const IndustryCard = memo(({ icon: Icon, title, description }) => (
  <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <CardContent className="relative p-6">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="font-body text-gray-400 text-sm leading-relaxed">{description}</p>
    </CardContent>
  </Card>
));

IndustryCard.displayName = 'IndustryCard';

export default function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes, cmsRes] = await Promise.all([
        axios.get(`${API_URL}/public/landing/settings`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/public/addons`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/public/cms/page/home`).catch(() => ({ data: null }))
      ]);
      
      setSettings(settingsRes.data);
      setAddons(addonsRes.data || []);
      setCmsContent(cmsRes.data);
    } catch (error) {
      console.error('Error loading landing page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get CMS section by id
  const getCmsSection = (sectionId) => {
    if (!cmsContent?.sections) return null;
    return cmsContent.sections.find(s => s.id === sectionId);
  };

  // Helper to get CMS section content with fallback
  const getCmsSectionContent = (sectionId, field, fallback) => {
    const section = getCmsSection(sectionId);
    return section?.[field] || fallback;
  };

  const formatCurrency = (amount) => {
    return `SRD ${new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (selectedAddons.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }
    if (!orderForm.password || orderForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/public/orders`, {
        ...orderForm,
        addon_ids: selectedAddons
      });
      
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        toast.success('Uw account is aangemaakt! U wordt nu ingelogd...');
        
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '' });
        setSelectedAddons([]);
        setOrderDialogOpen(false);
        
        setTimeout(() => {
          window.location.href = '/app/mijn-modules';
        }, 1000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getTotalPrice = () => {
    return addons
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + (a.price || 0), 0);
  };

  // Partner logos - from CMS settings (memoized - must be before early return)
  const partners = useMemo(() => {
    if (settings?.partners?.length > 0) {
      return settings.partners.filter(p => p && p.logo);
    }
    return [];
  }, [settings?.partners]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Features data
  const features = [
    {
      icon: Shield,
      title: 'SSL-encryptie',
      description: 'Alle gegevens worden veilig opgeslagen met SSL-encryptie en voldoen aan de geldende lokale privacyregels.'
    },
    {
      icon: TrendingUp,
      title: 'Gegarandeerde groei',
      description: 'Ons platform helpt u tijd te besparen, fouten te voorkomen en sneller betaald te krijgen.'
    },
    {
      icon: Headphones,
      title: '24/7 Ondersteuning',
      description: 'Ons team helpt je persoonlijk en vriendelijk. Gewoon duidelijke uitleg wanneer jij die nodig hebt.'
    }
  ];

  // Module features with images from addons
  const getModuleIcon = (slug) => {
    const icons = {
      'boekhouding': BarChart3,
      'hrm': Users,
      'projecten': Briefcase,
      'leads': Target,
      'crm': Target,
      'vastgoed_beheer': Building2,
      'verhuur': Building2
    };
    return icons[slug] || BarChart3;
  };

  // Industry solutions
  const industries = [
    { icon: Building2, title: 'Verhuur Beheer', description: 'Intuïtieve oplossing om al uw verhuuractiviteiten te stroomlijnen.' },
    { icon: Sparkles, title: 'Beauty & Spa', description: 'Stroomlijnt de spa-operaties met online boekingen en veilige betalingen.' },
    { icon: Settings, title: 'AutoDealer', description: 'Alles-in-één oplossing voor het beheren van auto\'s, voorraad en verkoop.' },
    { icon: Calendar, title: 'Hotel & Kamers', description: 'Complete oplossing die hoteloperaties vereenvoudigt.' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white grain-overlay">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section - Modern asymmetrical layout */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/40 to-cyan-200/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-100/50 to-teal-100/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 right-1/4 w-[300px] h-[300px] bg-gradient-to-t from-emerald-50/80 to-transparent rounded-full blur-2xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8 lg:pr-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-medium text-emerald-700 font-body">#1 ERP Platform in Suriname</span>
              </div>
              
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight" data-testid="hero-title">
                {getCmsSectionContent('hero', 'title', 'Het Surinaamse SaaS‑platform met een volledig geïntegreerd ERP‑ en HRM‑systeem').split('ERP')[0]}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">ERP‑ en HRM‑systeem</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed font-body" data-testid="hero-subtitle">
                {getCmsSectionContent('hero', 'content', 'Boekhouding, HRM, leads, projecten, sales & post-sale, verhuur en reserveringen – efficiënt, overzichtelijk en volledig geïntegreerd.')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all font-body font-semibold" onClick={() => navigate('/prijzen')} data-testid="hero-cta-primary">
                  Ontvang het pakket
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full transition-all font-body font-medium" onClick={() => navigate('/prijzen')} data-testid="hero-cta-secondary">
                  Direct Bestellen
                </Button>
              </div>
              
              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                      {['JK', 'SM', 'RB', 'AV'][i-1]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 font-body">500+ tevreden klanten</p>
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview Card */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-3xl blur-2xl scale-95"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-900/10 p-6 border border-white/50">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900">Facturatie ERP</h3>
                    <p className="text-sm text-gray-500 font-body">Dashboard Overview</p>
                  </div>
                  <Badge className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200">Live</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-sm text-gray-600 font-body">Omzet</p>
                    <p className="text-2xl font-bold text-emerald-600 font-heading">SRD 125K</p>
                    <p className="text-xs text-emerald-500 mt-1 font-body">+12% deze maand</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-gray-600 font-body">Klanten</p>
                    <p className="text-2xl font-bold text-blue-600 font-heading">248</p>
                    <p className="text-xs text-blue-500 mt-1 font-body">+8 deze week</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-100">
                    <p className="text-sm text-gray-600 font-body">Projecten</p>
                    <p className="text-2xl font-bold text-purple-600 font-heading">32</p>
                    <p className="text-xs text-purple-500 mt-1 font-body">4 actief</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-100">
                    <p className="text-sm text-gray-600 font-body">Facturen</p>
                    <p className="text-2xl font-bold text-orange-600 font-heading">156</p>
                    <p className="text-xs text-orange-500 mt-1 font-body">98% betaald</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section - Minimal elegant design */}
      {partners.length > 0 && (
        <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-emerald-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 mb-10 font-body" data-testid="partners-content">
              {getCmsSectionContent('partners', 'content', 'Onze beste partners en meer dan 500+ klanten in Suriname zijn tevreden over onze diensten').split('500+')[0]}
              <strong className="text-gray-700 font-semibold">500+ klanten</strong> in Suriname zijn tevreden over onze diensten
            </p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
              {partners.map((partner, i) => (
                <div key={i} className="grayscale hover:grayscale-0 transition-all duration-300 opacity-50 hover:opacity-100 transform hover:scale-105">
                  <img 
                    src={partner.logo} 
                    alt={partner.name}
                    className="h-10 md:h-12 w-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Bento Grid Style */}
      <section className="py-24 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-body">Waarom Facturatie.sr</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Veilig, snel en betrouwbaar
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-body">
              Ontworpen voor Surinaamse ondernemers die hun administratie willen stroomlijnen
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* Module Features Section - Detailed with modern cards */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0caf60 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-body">Onze Modules</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight" data-testid="boekhouding-section-title">
              {getCmsSectionContent('boekhouding', 'title', 'Complete bedrijfsoplossingen')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-body" data-testid="boekhouding-section-content">
              {getCmsSectionContent('boekhouding', 'content', 'Vereenvoudig uw boekhouding en facturering. Beheer moeiteloos uw administratie.').split('.')[0]}.
            </p>
          </div>

          {/* Boekhouding Module */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 font-body">Boekhouding</span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                {getCmsSectionContent('boekhouding', 'title', 'Boekhouding')}
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed font-body">
                {getCmsSectionContent('boekhouding', 'content', 'Vereenvoudig uw boekhouding en facturering. Beheer moeiteloos uw administratie.')}
              </p>
              <ul className="space-y-4">
                {['Vereenvoudig uw boekhouding en facturering', 'Neem de controle over uw voorraad', 'Breng uw project van voorstel tot betaling'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-700 font-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
                <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-100">
                  <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-heading font-semibold text-gray-900">Boekhouding Module</h4>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop" 
                      alt="Boekhouding Dashboard" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HRM Module */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-100">
                  <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-heading font-semibold text-gray-900">HRM Module</h4>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=300&fit=crop" 
                      alt="HRM Dashboard" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 font-body">HRM</span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight" data-testid="hrm-title">
                {getCmsSectionContent('hrm', 'title', 'Alles wat je nodig hebt voor succesvol HRM')}
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed font-body" data-testid="hrm-content">
                {getCmsSectionContent('hrm', 'content', 'Deze functie maakt het voor een bedrijf eenvoudiger om de persoonlijke, bedrijfs- en bankgegevens van werknemers bij te houden.')}
              </p>
              <ul className="space-y-4">
                {['Belangrijke zaken van werknemers beheren', 'Help uw medewerkers productiever te worden', 'Beheer salarissen in slechts een paar klikken'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-700 font-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Projecten Module */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-6">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 font-body">Projecten</span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight" data-testid="projecten-title">
                {getCmsSectionContent('projecten', 'title', 'Beheer al je projecten eenvoudig')}
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed font-body" data-testid="projecten-content">
                {getCmsSectionContent('projecten', 'content', 'Heb je een groot team of werk je aan meerdere projecten tegelijk? Beheer taakprioriteiten en creëer extra werkruimtes.')}
              </p>
              <ul className="space-y-4">
                {['Kanban Taakbeheer', 'Mijlpalen creëren en subtaken toewijzen', 'Oplossen van bugs'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-700 font-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
                <div className="relative bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-100">
                  <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-heading font-semibold text-gray-900">Projecten Module</h4>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&h=300&fit=crop" 
                      alt="Projecten Dashboard" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leads & CRM Module */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
                <div className="relative bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6 border border-orange-100">
                  <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-heading font-semibold text-gray-900">Leads & CRM Module</h4>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop" 
                      alt="CRM Dashboard" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 mb-6">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700 font-body">Leads & CRM</span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight" data-testid="leads-title">
                {getCmsSectionContent('leads', 'title', 'Beheer uw leads beter. Converteer sneller')}
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed font-body" data-testid="leads-content">
                {getCmsSectionContent('leads', 'content', 'Verhoog uw omzet met een effectieve tool voor leadmanagement. Bepaal de waarde van leads en ontwikkel veelbelovende leads met gemak.')}
              </p>
              <ul className="space-y-4">
                {['Beheer al je leads onder één dak', 'Kostenbesheerste Leadaanpak', 'Ontvang Maatwerkrapporten'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-700 font-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section - From Database - Bento Grid */}
      <section className="py-24 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 font-body">Prijzen</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Onze Modules
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-body">
              Kies de modules die het beste bij uw bedrijf passen
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {addons.map((addon) => {
              const Icon = getModuleIcon(addon.slug);
              return (
                <Card key={addon.id} className="group relative overflow-hidden border border-gray-100 bg-white hover:shadow-[0_12px_40px_-12px_rgba(12,175,96,0.15)] transition-all duration-300 hover:-translate-y-1">
                  <div className="h-36 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                    <Icon className="w-14 h-14 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">{addon.name}</h3>
                    <p className="text-gray-600 text-sm mb-5 line-clamp-2 font-body">{addon.description || 'Beheer module voor uw bedrijf'}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-emerald-600 font-heading">{formatCurrency(addon.price)}</span>
                        <span className="text-sm text-gray-500 font-body">/mnd</span>
                      </div>
                      <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-body" onClick={() => {
                        setSelectedAddons([addon.id]);
                        setOrderDialogOpen(true);
                      }} data-testid={`order-addon-${addon.id}`}>
                        Bestellen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-14">
            <Button size="lg" onClick={() => navigate('/modules')} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-full px-8 shadow-lg shadow-emerald-500/25 font-body font-semibold" data-testid="view-all-prices-btn">
              Bekijk alle prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Solutions - Dark Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-body">Sectoren</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 tracking-tight" data-testid="industries-title">
              {getCmsSectionContent('industries', 'title', 'Verhuur, Beauty, Auto & Hotel – compleet beheer in één platform')}
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto font-body" data-testid="industries-content">
              {getCmsSectionContent('industries', 'content', 'Beheer moeiteloos jouw verhuuractiviteiten, beauty spa afspraken, autodealer processen en hotel- en kamerreserveringen.')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((industry, index) => (
              <IndustryCard key={index} {...industry} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Modern Gradient */}
      <section className="py-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight" data-testid="cta-title">
            {getCmsSectionContent('cta', 'title', 'Facturatie.sr – uw administratie eenvoudig geregeld')}
          </h2>
          <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto font-body" data-testid="cta-content">
            {getCmsSectionContent('cta', 'content', 'Beheer facturering, boekhouding en voorraad in één systeem. Bespaar tijd, verhoog efficiëntie en voldoe moeiteloos aan fiscale verplichtingen.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-base bg-white text-emerald-700 hover:bg-emerald-50 rounded-full shadow-lg font-body font-semibold" onClick={() => navigate('/modules')} data-testid="cta-pricing-btn">
              Bekijk Prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base border-2 border-white/30 text-white hover:bg-white/10 rounded-full font-body font-medium" onClick={() => navigate('/modules')} data-testid="cta-order-btn">
              Direct Bestellen
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bestelling Plaatsen</DialogTitle>
            <DialogDescription>
              Selecteer de modules die u wilt bestellen en vul uw gegevens in
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input 
                  required
                  value={orderForm.name}
                  onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                  placeholder="Uw volledige naam"
                />
              </div>
              <div className="space-y-2">
                <Label>Bedrijfsnaam</Label>
                <Input 
                  value={orderForm.company_name}
                  onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                  placeholder="Uw bedrijfsnaam"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input 
                  type="email"
                  required
                  value={orderForm.email}
                  onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                  placeholder="uw@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefoon *</Label>
                <Input 
                  required
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                  placeholder="+597 ..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Wachtwoord * (voor uw account)</Label>
              <Input 
                type="password"
                required
                minLength={6}
                value={orderForm.password}
                onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                placeholder="Minimaal 6 tekens"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Selecteer Module(s) *</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {addons.map((addon) => (
                  <div 
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddons.includes(addon.id) 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                    onClick={() => toggleAddonSelection(addon.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedAddons.includes(addon.id) 
                          ? 'border-emerald-500 bg-emerald-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedAddons.includes(addon.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{addon.name}</span>
                        {addon.description && (
                          <p className="text-xs text-gray-500">{addon.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-emerald-600 font-semibold whitespace-nowrap">{formatCurrency(addon.price)}/mnd</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedAddons.length > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Totaal per maand:</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(getTotalPrice())}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting || selectedAddons.length === 0} className="bg-emerald-500 hover:bg-emerald-600">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verzenden...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Bestelling Versturen
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
