import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Loader2, 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  FileText,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Gift,
  User,
  Mail,
  Lock,
  Phone,
  Building,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  CreditCard,
  Puzzle
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Module UI metadata for display
const MODULE_UI_DATA = {
  'hrm': {
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    category: 'Personeel',
    features: [
      'Personeelsbeheer met alle werknemergegevens',
      'Verlofaanvragen en goedkeuringsworkflow',
      'Aanwezigheidsregistratie met in/uitklokken'
    ]
  },
  'vastgoed_beheer': {
    icon: Building2,
    gradient: 'from-teal-500 to-emerald-600',
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    category: 'Vastgoed',
    features: [
      'Panden en units beheer',
      'Huurdersbeheer met contracten',
      'Automatische facturatie'
    ]
  },
  'autodealer': {
    icon: Car,
    gradient: 'from-emerald-600 to-green-500',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-green-500',
    category: 'Automotive',
    features: [
      'Voertuigvoorraad beheer',
      'Verkoop- en aankoopregistratie',
      'Multi-valuta ondersteuning'
    ]
  },
  'ai-chatbot': {
    icon: MessageSquare,
    gradient: 'from-teal-600 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-teal-600 to-cyan-500',
    category: 'AI',
    features: [
      'GPT-4 aangedreven conversaties',
      'Meertalige ondersteuning',
      '24/7 beschikbaarheid'
    ]
  },
  'cms': {
    icon: Globe,
    gradient: 'from-green-500 to-emerald-600',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    category: 'Content',
    features: [
      'Drag & drop pagina builder',
      'Menu en navigatie beheer',
      'SEO optimalisatie tools'
    ]
  },
  'rapportage': {
    icon: BarChart3,
    gradient: 'from-cyan-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    category: 'Analytics',
    features: [
      'Real-time dashboards',
      'Exporteer naar PDF/Excel',
      'Automatische rapportages'
    ]
  }
};

// Default UI data for unknown modules
const DEFAULT_UI_DATA = {
  icon: Puzzle,
  gradient: 'from-emerald-500 to-teal-600',
  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  category: 'Module',
  features: ['Volledige functionaliteit', 'Professionele ondersteuning', 'Regelmatige updates']
};

// Get UI data for a module based on slug
const getModuleUI = (slug) => {
  return MODULE_UI_DATA[slug] || MODULE_UI_DATA[slug?.replace('-', '_')] || DEFAULT_UI_DATA;
};

export default function ModulesOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('trial');
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

  // Auto-open order dialog if ?order=true is in URL (only once)
  useEffect(() => {
    const shouldOpenOrder = searchParams.get('order') === 'true';
    if (shouldOpenOrder && addons.length > 0 && !loading && !orderDialogOpen) {
      setOrderDialogOpen(true);
      // Remove the query param to prevent re-opening
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [addons.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes] = await Promise.all([
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/addons').catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data || {});
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (addonId) => {
    setSelectedModules(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleStartOrder = (addonId = null) => {
    if (addonId && !selectedModules.includes(addonId)) {
      setSelectedModules([...selectedModules, addonId]);
    }
    if (selectedModules.length === 0 && addons.length > 0 && !addonId) {
      // Pre-select first addon
      setSelectedModules([addons[0].id]);
    }
    setOrderDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return `SRD ${new Intl.NumberFormat('nl-NL', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const getTotalPrice = () => {
    return selectedModules.reduce((total, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      return total + (addon?.price || 0);
    }, 0);
  };

  const getSelectedAddonNames = () => {
    return selectedModules.map(addonId => {
      const addon = addons.find(a => a.id === addonId);
      return addon?.name || '';
    }).filter(Boolean);
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
    
    if (orderForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    if (selectedModules.length === 0) {
      toast.error('Selecteer minimaal één module');
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
        addon_ids: selectedModules,
        message: paymentMethod === 'trial' 
          ? '3 dagen gratis proefperiode via modules-overzicht'
          : `Bestelling via modules-overzicht - ${paymentMethod}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success(paymentMethod === 'trial' 
          ? 'Account aangemaakt! U heeft 3 dagen gratis toegang.'
          : 'Account aangemaakt! Uw bestelling wordt verwerkt.');
        
        setOrderDialogOpen(false);
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '', password_confirm: '' });
        setSelectedModules([]);
        
        // Handle Mope payment
        if (paymentMethod === 'mope' && response.data.order?.id) {
          try {
            const paymentRes = await axios.post(`${API_URL}/public/orders/${response.data.order.id}/pay`, null, {
              params: { redirect_url: window.location.origin + '/app/dashboard' }
            });
            if (paymentRes.data?.payment_url) {
              window.location.href = paymentRes.data.payment_url;
              return;
            }
          } catch (payErr) {
            console.error('Payment creation error:', payErr);
            toast.error('Kon Mope betaling niet starten. Probeer later opnieuw.');
          }
        }
        
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section - Modern Gradient */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Modulair & Flexibel Platform
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Krachtige Modules voor{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Uw Bedrijf
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Kies alleen de modules die u nodig heeft. Van HRM tot vastgoedbeheer, 
              van autohandel tot AI-chatbot – bouw uw perfecte bedrijfsoplossing.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => handleStartOrder()}
                className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                data-testid="start-trial-btn"
              >
                <Gift className="w-5 h-5 mr-2" />
                Start Gratis Proefperiode
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/prijzen')}
                className="h-14 px-8 border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-full transition-all"
                data-testid="view-prices-btn"
              >
                Bekijk Prijzen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <span>3 dagen gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-teal-600" />
                </div>
                <span>Geen creditcard nodig</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <span>Direct starten</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid - Modern Cards from Backend */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Alle Modules
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ontdek onze krachtige modules en kies wat bij uw bedrijf past
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addons.map((addon, index) => {
              const moduleUI = getModuleUI(addon.slug);
              const IconComponent = moduleUI.icon;
              const isSelected = selectedModules.includes(addon.id);
              const isPopular = index === 0;
              
              return (
                <div
                  key={addon.id}
                  data-testid={`module-card-${addon.slug}`}
                  className={`group relative cursor-pointer transition-all duration-500 ${
                    isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
                  }`}
                  onClick={() => toggleModule(addon.id)}
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${moduleUI.gradient} rounded-3xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${isSelected ? 'opacity-40' : ''}`}></div>
                  
                  {/* Card */}
                  <div className={`relative bg-white rounded-3xl overflow-hidden border ${isSelected ? 'border-emerald-400' : 'border-slate-200'} shadow-xl`}>
                    {/* Header with gradient background */}
                    <div className={`relative h-32 bg-gradient-to-br ${moduleUI.gradient} p-6`}>
                      {/* Pattern overlay */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                      </div>
                      
                      {/* Icon */}
                      <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 shadow-lg">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Populair
                          </Badge>
                        </div>
                      )}
                      
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-4 left-4">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                            <Check className="w-5 h-5 text-emerald-600" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 pt-4">
                      {/* Category */}
                      <Badge variant="secondary" className="mb-3 bg-emerald-50 text-emerald-700 border-emerald-200">
                        {moduleUI.category}
                      </Badge>
                      
                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {addon.name}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                        {addon.description}
                      </p>
                      
                      {/* Price Box */}
                      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-4 mb-4 border border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900">
                            {formatCurrency(addon.price)}
                          </span>
                          <span className="text-slate-500 text-sm">/maand</span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">Inclusief alle features</p>
                      </div>
                      
                      {/* Features */}
                      <ul className="space-y-2 mb-6">
                        {moduleUI.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button 
                          variant="outline"
                          className="flex-1 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/prijzen');
                          }}
                          data-testid={`details-btn-${addon.slug}`}
                        >
                          Details
                        </Button>
                        <Button 
                          className={`flex-1 ${isSelected 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : `bg-gradient-to-r ${moduleUI.gradient} hover:opacity-90`
                          } text-white shadow-lg`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartOrder(addon.id);
                          }}
                          data-testid={`order-btn-${addon.slug}`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Gekozen
                            </>
                          ) : (
                            'Probeer Gratis'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-emerald-300 text-sm mb-8">
            <TrendingUp className="w-4 h-4" />
            <span>Meer dan 500+ bedrijven gebruiken onze modules</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Probeer 3 dagen gratis en ontdek hoe onze modules uw bedrijf kunnen transformeren.
            Geen creditcard nodig, geen verplichtingen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => handleStartOrder()}
              className="h-14 px-8 bg-white text-emerald-900 hover:bg-slate-100 rounded-full shadow-xl"
            >
              <Gift className="w-5 h-5 mr-2" />
              Start Gratis Proefperiode
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/prijzen')}
              className="h-14 px-8 border-2 border-white/20 text-white hover:bg-white/10 rounded-full"
            >
              Bekijk Alle Prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Order Dialog with Payment Options */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              Account Aanmaken & Bestellen
            </DialogTitle>
            <DialogDescription>
              Maak een account aan en kies uw betaalmethode
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleOrderSubmit} className="space-y-6 mt-4">
            {/* Module Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Selecteer Modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {addons.map((addon) => {
                  const moduleUI = getModuleUI(addon.slug);
                  const IconComponent = moduleUI.icon;
                  const isSelected = selectedModules.includes(addon.id);
                  
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleModule(addon.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                      />
                      <div className={`w-8 h-8 ${moduleUI.iconBg} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{addon.name}</span>
                    </div>
                  );
                })}
              </div>
              {selectedModules.length === 0 && (
                <p className="text-sm text-amber-600">Selecteer minimaal één module</p>
              )}
              {selectedModules.length > 0 && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700">Totaal per maand:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(getTotalPrice())}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Account Gegevens
              </Label>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Volledige Naam *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="Uw naam"
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="uw@email.com"
                      value={orderForm.email}
                      onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoonnummer</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      placeholder="+597 xxx xxxx"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company_name">Bedrijfsnaam *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="company_name"
                      placeholder="Uw bedrijf"
                      value={orderForm.company_name}
                      onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 karakters"
                      value={orderForm.password}
                      onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password_confirm">Bevestig Wachtwoord *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password_confirm"
                      type="password"
                      placeholder="Herhaal wachtwoord"
                      value={orderForm.password_confirm}
                      onChange={(e) => setOrderForm({...orderForm, password_confirm: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Betaalmethode
              </Label>
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'trial' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setPaymentMethod('trial')}
                >
                  <RadioGroupItem value="trial" id="trial" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="trial" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <Gift className="w-5 h-5 text-emerald-600" />
                      3 Dagen Gratis Proberen
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">Aanbevolen</Badge>
                    </Label>
                    <p className="text-sm text-slate-500 mt-1">
                      Probeer alle functies gratis. Na 3 dagen kiest u een betaalmethode.
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'mope' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setPaymentMethod('mope')}
                >
                  <RadioGroupItem value="mope" id="mope" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mope" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <CreditCard className="w-5 h-5 text-teal-500" />
                      Betalen met Mope
                    </Label>
                    <p className="text-sm text-slate-500 mt-1">
                      Direct betalen via Mope. Uw account wordt direct geactiveerd.
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setPaymentMethod('bank')}
                >
                  <RadioGroupItem value="bank" id="bank" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <Building2 className="w-5 h-5 text-slate-600" />
                      Bankoverschrijving
                    </Label>
                    <p className="text-sm text-slate-500 mt-1">
                      U ontvangt een factuur per e-mail. Na betaling wordt uw account geactiveerd.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setOrderDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={submitting || selectedModules.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'trial' ? 'Start Gratis Proefperiode' : 'Bestelling Plaatsen'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
