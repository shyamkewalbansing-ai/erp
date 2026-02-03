import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowRight, 
  Check, 
  Loader2,
  Phone,
  Package,
  Sparkles,
  Building2,
  Gift,
  User,
  Mail,
  Lock,
  Building,
  Shield,
  Clock,
  Users,
  Car,
  MessageSquare,
  Fuel,
  Star,
  ChevronRight,
  Calculator,
  Headphones,
  Gem,
  Scissors,
  BarChart3,
  Globe,
  Zap,
  ShoppingCart
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Module icons and styling mapping
const MODULE_CONFIG = {
  'hrm': { 
    icon: Users, 
    gradient: 'from-blue-500 to-indigo-600', 
    lightBg: 'bg-blue-50',
    shadow: 'shadow-blue-500/20',
    category: 'HR & Personeel'
  },
  'vastgoed_beheer': { 
    icon: Building2, 
    gradient: 'from-purple-500 to-violet-600', 
    lightBg: 'bg-purple-50',
    shadow: 'shadow-purple-500/20',
    category: 'Vastgoed'
  },
  'autodealer': { 
    icon: Car, 
    gradient: 'from-orange-500 to-red-600', 
    lightBg: 'bg-orange-50',
    shadow: 'shadow-orange-500/20',
    category: 'Handel'
  },
  'boekhouding': { 
    icon: Calculator, 
    gradient: 'from-emerald-500 to-green-600', 
    lightBg: 'bg-emerald-50',
    shadow: 'shadow-emerald-500/20',
    category: 'Financieel'
  },
  'pompstation': { 
    icon: Fuel, 
    gradient: 'from-amber-500 to-orange-600', 
    lightBg: 'bg-amber-50',
    shadow: 'shadow-amber-500/20',
    category: 'Tankstation'
  },
  'beautyspa': { 
    icon: Scissors, 
    gradient: 'from-pink-500 to-rose-600', 
    lightBg: 'bg-pink-50',
    shadow: 'shadow-pink-500/20',
    category: 'Beauty & Wellness'
  },
  'ai-chatbot': { 
    icon: MessageSquare, 
    gradient: 'from-cyan-500 to-teal-600', 
    lightBg: 'bg-cyan-50',
    shadow: 'shadow-cyan-500/20',
    category: 'AI & Automatisering'
  },
  'chatbot': { 
    icon: MessageSquare, 
    gradient: 'from-cyan-500 to-teal-600', 
    lightBg: 'bg-cyan-50',
    shadow: 'shadow-cyan-500/20',
    category: 'AI & Automatisering'
  },
  'default': { 
    icon: Package, 
    gradient: 'from-slate-500 to-gray-600', 
    lightBg: 'bg-slate-50',
    shadow: 'shadow-slate-500/20',
    category: 'Overig'
  }
};

const getModuleConfig = (slug) => MODULE_CONFIG[slug] || MODULE_CONFIG['default'];

// Default features for modules without specific features
const getDefaultFeatures = (module) => {
  const defaults = {
    'hrm': ['Personeelsbeheer', 'Verlofregistratie', 'Salarisadministratie', 'Afdelingen beheer'],
    'vastgoed_beheer': ['Huurders beheer', 'Appartementen', 'Contracten', 'Betalingen & Facturen'],
    'autodealer': ['Voertuigenbeheer', 'Klanten CRM', 'Verkoop registratie', 'Multi-valuta'],
    'boekhouding': ['Grootboek', 'Debiteuren/Crediteuren', 'BTW aangifte', 'Rapportages'],
    'pompstation': ['Tank monitoring', 'POS/Kassa', 'Diensten beheer', 'Dagrapportages'],
    'beautyspa': ['Afspraken', 'Behandelingen', 'Klanten CRM', 'POS systeem'],
  };
  return defaults[module.slug] || ['Volledige functionaliteit', 'Rapportages', 'Data export', 'Support'];
};

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [hoveredModule, setHoveredModule] = useState(null);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    password_confirm: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes] = await Promise.all([
        axios.get(`${API_URL}/public/landing/settings`).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/public/addons`).catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data || {});
      // Filter out test addons and sort: free first, then by price
      const filteredModules = (addonsRes.data || [])
        .filter(m => m.is_active && !m.slug?.includes('test'))
        .sort((a, b) => {
          if (a.is_free && !b.is_free) return -1;
          if (!a.is_free && b.is_free) return 1;
          return (a.price || 0) - (b.price || 0);
        });
      setModules(filteredModules);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'Op aanvraag';
    if (amount === 0) return 'GRATIS';
    return `SRD ${amount.toLocaleString('nl-NL')}`;
  };

  const handleSelectModule = (module) => {
    setSelectedModule(module);
    setOrderDialogOpen(true);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderForm.name || !orderForm.email || !orderForm.password || !orderForm.company_name) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    
    if (orderForm.password !== orderForm.password_confirm) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }

    setSubmitting(true);
    
    try {
      const orderData = {
        name: orderForm.name,
        email: orderForm.email,
        phone: orderForm.phone || '',
        password: orderForm.password,
        company_name: orderForm.company_name,
        addon_ids: selectedModule ? [selectedModule.id] : [],
        message: `Module: ${selectedModule?.name || 'Gratis start'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success('Account aangemaakt! U wordt doorgestuurd...');
        setOrderDialogOpen(false);
        
        setTimeout(() => {
          window.location.href = '/app/dashboard';
        }, 1000);
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-emerald-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/70">Modules laden...</p>
        </div>
      </div>
    );
  }

  const freeModules = modules.filter(m => m.is_free || m.price === 0);
  const paidModules = modules.filter(m => !m.is_free && m.price > 0);

  return (
    <div className="min-h-screen bg-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
            Transparante Prijzen • Betaal per Module
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Alle Modules{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                & Prijzen
              </span>
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Kies de modules die bij uw bedrijf passen. Begin gratis met onze Boekhouding module en breid uit wanneer u groeit.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{modules.length}</div>
              <div className="text-slate-400 text-sm">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{freeModules.length}</div>
              <div className="text-slate-400 text-sm">Gratis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">3</div>
              <div className="text-slate-400 text-sm">Valuta's</div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Module Section */}
      {freeModules.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-emerald-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2">
                <Gift className="w-4 h-4 mr-2" />
                Gratis voor Iedereen
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Start Gratis met Boekhouding
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Onze complete boekhoudmodule is gratis voor alle Surinaamse bedrijven
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {freeModules.map((module) => {
                const config = getModuleConfig(module.slug);
                const IconComponent = config.icon;
                const features = module.highlights?.length > 0 
                  ? module.highlights.slice(0, 6) 
                  : getDefaultFeatures(module);
                
                return (
                  <div
                    key={module.id}
                    className="relative bg-white rounded-3xl overflow-hidden border-2 border-emerald-200 shadow-xl shadow-emerald-500/10"
                  >
                    {/* Free Banner */}
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 text-sm font-bold rounded-bl-2xl">
                        100% GRATIS
                      </div>
                    </div>

                    <div className="p-8 md:p-10">
                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Left: Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.shadow}`}>
                              <IconComponent className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <Badge className="mb-2 bg-slate-100 text-slate-600 text-xs">
                                {config.category}
                              </Badge>
                              <h3 className="text-2xl font-bold text-slate-900">{module.name}</h3>
                            </div>
                          </div>
                          
                          <p className="text-slate-600 mb-6 leading-relaxed">
                            {module.description}
                          </p>

                          <div className="flex items-center gap-4">
                            <Button
                              onClick={() => handleSelectModule(module)}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-emerald-500/25"
                            >
                              Gratis Starten
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/modules/${module.slug}`)}
                              className="px-6 py-6"
                            >
                              Meer Info
                            </Button>
                          </div>
                        </div>

                        {/* Right: Features */}
                        <div className="flex-1 bg-slate-50 rounded-2xl p-6">
                          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-500" />
                            Inclusief
                          </h4>
                          <ul className="space-y-3">
                            {features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                                  <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                                </div>
                                <span className="text-slate-700 text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Premium Modules Grid */}
      {paidModules.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200 px-4 py-2">
                <Gem className="w-4 h-4 mr-2" />
                Premium Modules
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Breid uit met Premium
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Kies de modules die perfect aansluiten bij uw bedrijfsvoering
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paidModules.map((module) => {
                const config = getModuleConfig(module.slug);
                const IconComponent = config.icon;
                const isHovered = hoveredModule === module.id;
                const features = module.highlights?.length > 0 
                  ? module.highlights.slice(0, 4) 
                  : getDefaultFeatures(module);
                
                return (
                  <div
                    key={module.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    {/* Glow Effect */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.gradient} rounded-3xl blur-xl transition-all duration-500 ${
                      isHovered ? 'opacity-30' : 'opacity-0'
                    }`}></div>
                    
                    {/* Card */}
                    <div className={`relative h-full bg-white rounded-3xl overflow-hidden transition-all duration-300 border-2 ${
                      isHovered ? 'border-transparent shadow-2xl -translate-y-1' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      {/* Header */}
                      <div className={`p-6 ${config.lightBg}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.shadow}`}>
                            <IconComponent className="w-7 h-7 text-white" />
                          </div>
                          <Badge className="bg-white/80 text-slate-600 text-xs backdrop-blur-sm">
                            {config.category}
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{module.name}</h3>
                        <p className="text-slate-600 text-sm line-clamp-2">{module.description}</p>
                      </div>

                      {/* Features */}
                      <div className="p-6 pt-4">
                        <ul className="space-y-2.5 mb-6">
                          {features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <div className={`flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center mt-0.5`}>
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                              <span className="text-slate-600 text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Price & CTA */}
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex items-end justify-between mb-4">
                            <div>
                              <span className="text-3xl font-bold text-slate-900">
                                {formatCurrency(module.price)}
                              </span>
                              {module.price > 0 && (
                                <span className="text-slate-500 text-sm ml-1">/maand</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSelectModule(module)}
                              className={`flex-1 bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-lg ${config.shadow}`}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Bestellen
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => navigate(`/modules/${module.slug}`)}
                              className="shrink-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Comparison / Benefits */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Waarom Facturatie.sr?</h2>
            <p className="text-slate-600">Alles wat u nodig heeft voor uw Surinaamse onderneming</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Globe, 
                title: 'Multi-Valuta', 
                desc: 'SRD, USD en EUR volledig ondersteund',
                gradient: 'from-blue-500 to-indigo-600'
              },
              { 
                icon: Shield, 
                title: 'Veilig & Betrouwbaar', 
                desc: 'Bank-niveau encryptie en 99.9% uptime',
                gradient: 'from-emerald-500 to-teal-600'
              },
              { 
                icon: Headphones, 
                title: 'Lokale Support', 
                desc: 'Surinaams team voor al uw vragen',
                gradient: 'from-purple-500 to-violet-600'
              },
              { 
                icon: BarChart3, 
                title: 'BTW Compliant', 
                desc: 'Surinaamse BTW-tarieven ingebouwd',
                gradient: 'from-orange-500 to-red-600'
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Klaar om te Beginnen?
          </h2>
          <p className="text-lg sm:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Start vandaag nog gratis met onze Boekhouding module en ontdek hoe Facturatie.sr uw bedrijf kan helpen groeien.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => freeModules[0] && handleSelectModule(freeModules[0])}
              className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl px-10 py-6 text-lg font-semibold"
            >
              Gratis Account Aanmaken
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/contact')}
              className="border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              Bel Ons
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {selectedModule && (
            <>
              <div className={`bg-gradient-to-br ${getModuleConfig(selectedModule.slug).gradient} p-6 text-white`}>
                <DialogTitle className="text-2xl font-bold mb-2">
                  {selectedModule.name}
                </DialogTitle>
                <DialogDescription className="text-white/80">
                  {selectedModule.is_free || selectedModule.price === 0 
                    ? 'Gratis module - geen kosten' 
                    : `${formatCurrency(selectedModule.price)} per maand`
                  }
                </DialogDescription>
              </div>
              
              <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700 font-medium">Naam *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={orderForm.name}
                        onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                        className="pl-10"
                        placeholder="Uw naam"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">Bedrijfsnaam *</Label>
                    <div className="relative mt-1">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={orderForm.company_name}
                        onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                        className="pl-10"
                        placeholder="Bedrijf N.V."
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-700 font-medium">E-mailadres *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      type="email"
                      value={orderForm.email}
                      onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                      className="pl-10"
                      placeholder="email@bedrijf.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-700 font-medium">Telefoon</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      type="tel"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                      className="pl-10"
                      placeholder="+597 ..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700 font-medium">Wachtwoord *</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        type="password"
                        value={orderForm.password}
                        onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                        className="pl-10"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">Bevestig *</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        type="password"
                        value={orderForm.password_confirm}
                        onChange={(e) => setOrderForm({...orderForm, password_confirm: e.target.value})}
                        className="pl-10"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* What's included */}
                <div className={`p-4 rounded-xl border ${getModuleConfig(selectedModule.slug).lightBg} border-slate-200`}>
                  <p className="text-sm font-semibold text-slate-800 mb-2">Inbegrepen:</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedModule.highlights?.slice(0, 4) || getDefaultFeatures(selectedModule)).map((feature, i) => (
                      <Badge key={i} variant="secondary" className="bg-white text-slate-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        {typeof feature === 'string' ? feature.split(' ').slice(0, 3).join(' ') : feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting}
                  className={`w-full bg-gradient-to-r ${getModuleConfig(selectedModule.slug).gradient} hover:opacity-90 text-white py-6 text-lg font-semibold shadow-lg`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Even geduld...
                    </>
                  ) : (
                    <>
                      Account Aanmaken
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <p className="text-center text-xs text-slate-500">
                  Door te registreren gaat u akkoord met onze voorwaarden en privacybeleid.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
