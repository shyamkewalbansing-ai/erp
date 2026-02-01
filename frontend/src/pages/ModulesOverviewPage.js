import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      'Aangepaste rapportages',
      'Export naar PDF/Excel',
      'Trends en voorspellingen',
      'KPI monitoring'
    ]
  }
];

export default function ModulesOverviewPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Trial dialog state
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [trialForm, setTrialForm] = useState({
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
      const settingsRes = await api.get('/public/landing/settings').catch(() => ({ data: {} }));
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleStartTrial = () => {
    if (selectedModules.length === 0) {
      // Pre-select the most popular modules
      setSelectedModules(['hrm', 'vastgoed']);
    }
    setTrialDialogOpen(true);
  };

  const handleTrialSubmit = async (e) => {
    e.preventDefault();
    
    if (!trialForm.name || !trialForm.email || !trialForm.password || !trialForm.company_name) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    
    if (trialForm.password !== trialForm.password_confirm) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }
    
    if (trialForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    if (selectedModules.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }

    setSubmitting(true);
    
    try {
      // Map module slugs to actual addon IDs from backend
      const addonsRes = await api.get('/public/addons').catch(() => ({ data: [] }));
      const addons = addonsRes.data || [];
      
      const addonIds = selectedModules.map(modId => {
        const mod = MODULES_DATA.find(m => m.id === modId);
        const addon = addons.find(a => 
          a.slug?.toLowerCase().includes(mod?.slug?.toLowerCase()) ||
          a.name?.toLowerCase().includes(mod?.name?.toLowerCase().split(' ')[0])
        );
        return addon?.id;
      }).filter(Boolean);

      const orderData = {
        name: trialForm.name,
        email: trialForm.email,
        phone: trialForm.phone || '',
        password: trialForm.password,
        company_name: trialForm.company_name,
        addon_ids: addonIds.length > 0 ? addonIds : selectedModules,
        message: '3 dagen gratis proefperiode via modules-overzicht'
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success('Account aangemaakt! U heeft 3 dagen gratis toegang.');
        setTrialDialogOpen(false);
        
        setTimeout(() => {
          window.location.href = '/app/dashboard';
        }, 1000);
      }
    } catch (error) {
      console.error('Trial error:', error);
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
                onClick={handleStartTrial}
                className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              >
                <Gift className="w-5 h-5 mr-2" />
                Start Gratis Proefperiode
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/prijzen')}
                className="h-14 px-8 border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-full transition-all"
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
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span>Geen creditcard nodig</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <span>Direct starten</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid - Modern Cards */}
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
            {MODULES_DATA.map((module) => {
              const IconComponent = module.icon;
              const isSelected = selectedModules.includes(module.id);
              
              return (
                <Card 
                  key={module.id} 
                  className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white ${
                    isSelected ? 'ring-2 ring-emerald-500 shadow-emerald-500/20' : ''
                  }`}
                  onClick={() => toggleModule(module.id)}
                >
                  {/* Gradient Top Bar */}
                  <div className={`h-2 bg-gradient-to-r ${module.gradient}`}></div>
                  
                  {/* Popular Badge */}
                  {module.popular && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Populair
                      </Badge>
                    </div>
                  )}
                  
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 left-4">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <CardContent className="p-8">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${module.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Category */}
                    <Badge variant="secondary" className="mb-3 bg-slate-100 text-slate-600">
                      {module.category}
                    </Badge>
                    
                    {/* Title & Description */}
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-slate-600 mb-4 line-clamp-2">
                      {module.description}
                    </p>
                    
                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-2xl font-bold text-slate-900">{module.price}</span>
                      <span className="text-slate-500 text-sm">/maand</span>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      {module.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
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
                          navigate(`/modules/${module.slug}`);
                        }}
                      >
                        Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button 
                        className={`flex-1 ${isSelected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelected) {
                            toggleModule(module.id);
                          }
                          handleStartTrial();
                        }}
                      >
                        {isSelected ? 'Geselecteerd' : 'Probeer Gratis'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
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
              onClick={handleStartTrial}
              className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 rounded-full shadow-xl"
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

      {/* Trial Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Gift className="w-6 h-6 text-emerald-500" />
              Start Gratis Proefperiode
            </DialogTitle>
            <DialogDescription>
              Maak een account aan en probeer 3 dagen gratis alle geselecteerde modules
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTrialSubmit} className="space-y-6 mt-4">
            {/* Module Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Selecteer Modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULES_DATA.map((module) => {
                  const IconComponent = module.icon;
                  const isSelected = selectedModules.includes(module.id);
                  
                  return (
                    <div
                      key={module.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleModule(module.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                      />
                      <div className={`w-8 h-8 ${module.iconBg} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{module.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
              {selectedModules.length === 0 && (
                <p className="text-sm text-amber-600">Selecteer minimaal één module</p>
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
                      value={trialForm.name}
                      onChange={(e) => setTrialForm({...trialForm, name: e.target.value})}
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
                      value={trialForm.email}
                      onChange={(e) => setTrialForm({...trialForm, email: e.target.value})}
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
                      value={trialForm.phone}
                      onChange={(e) => setTrialForm({...trialForm, phone: e.target.value})}
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
                      value={trialForm.company_name}
                      onChange={(e) => setTrialForm({...trialForm, company_name: e.target.value})}
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
                      value={trialForm.password}
                      onChange={(e) => setTrialForm({...trialForm, password: e.target.value})}
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
                      value={trialForm.password_confirm}
                      onChange={(e) => setTrialForm({...trialForm, password_confirm: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trial Info */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-800">3 Dagen Gratis Proefperiode</h4>
                  <p className="text-sm text-emerald-600 mt-1">
                    U krijgt volledige toegang tot alle geselecteerde modules. 
                    Na 3 dagen kiest u een betaalmethode om door te gaan.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setTrialDialogOpen(false)}
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
                    Start Gratis
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
