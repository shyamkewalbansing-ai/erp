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
  Calculator,
  Headphones,
  Scissors,
  Zap,
  CreditCard,
  Globe
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Module icons mapping
const MODULE_ICONS = {
  'hrm': Users,
  'vastgoed_beheer': Building2,
  'autodealer': Car,
  'boekhouding': Calculator,
  'pompstation': Fuel,
  'beautyspa': Scissors,
  'ai-chatbot': MessageSquare,
  'chatbot': MessageSquare,
  'default': Package
};

const getModuleIcon = (slug) => MODULE_ICONS[slug] || MODULE_ICONS['default'];

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModules, setSelectedModules] = useState([]);
  const [isYearly, setIsYearly] = useState(false);
  
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
      const filteredModules = (addonsRes.data || [])
        .filter(m => m.is_active && !m.slug?.includes('test'))
        .sort((a, b) => (a.price || 0) - (b.price || 0));
      setModules(filteredModules);
      
      // Auto-select free modules
      const freeModuleIds = filteredModules.filter(m => m.is_free || m.price === 0).map(m => m.id);
      setSelectedModules(freeModuleIds);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    const module = modules.find(m => m.id === moduleId);
    if (module?.is_free || module?.price === 0) return;
    
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getTotalPrice = () => {
    const monthly = modules
      .filter(m => selectedModules.includes(m.id))
      .reduce((sum, m) => sum + (m.price || 0), 0);
    return isYearly ? monthly * 10 : monthly; // 2 maanden korting bij jaarlijks
  };

  const getSelectedCount = () => selectedModules.length;

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
        addon_ids: selectedModules,
        message: `Modules: ${selectedModules.length}, Billing: ${isYearly ? 'Jaarlijks' : 'Maandelijks'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        toast.success('Account aangemaakt! U wordt doorgestuurd...');
        setOrderDialogOpen(false);
        setTimeout(() => { window.location.href = '/app/dashboard'; }, 1000);
      }
    } catch (error) {
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
          <p className="text-white/70">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Transparante Prijzen
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            Eenvoudige Prijsstelling
          </h1>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Betaal alleen voor wat u nodig heeft. Geen verborgen kosten, geen lange contracten. Start met 3 dagen gratis.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-slate-800/50 backdrop-blur rounded-full p-1 border border-slate-700">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maandelijks
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              Jaarlijks
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                Gratis
              </span>
            </button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 mt-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              3 dagen gratis proberen
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Geen creditcard nodig
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Direct opzegbaar
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Selection Bar */}
      <div className="sticky top-16 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium">
                {getSelectedCount()} module{getSelectedCount() !== 1 ? 's' : ''} geselecteerd
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-white/70 text-sm">Totaal: </span>
                <span className="text-xl font-bold text-white">
                  SRD {getTotalPrice().toLocaleString('nl-NL')}
                </span>
                <span className="text-white/70 text-sm">/{isYearly ? 'jaar' : 'maand'}</span>
              </div>
              <Button
                onClick={() => setOrderDialogOpen(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-medium"
              >
                Nu Bestellen
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-emerald-200">
              <Package className="w-3 h-3 mr-1" />
              Onze modules
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Flexibele Modules voor uw Bedrijf
            </h2>
            <p className="text-slate-500">
              Selecteer de modules die u nodig heeft en betaal alleen voor wat u gebruikt
            </p>
          </div>

          {/* Modules Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((module) => {
              const IconComponent = getModuleIcon(module.slug);
              const isSelected = selectedModules.includes(module.id);
              const isFree = module.is_free || module.price === 0;
              const price = isYearly ? (module.price || 0) * 10 : (module.price || 0);
              
              return (
                <div
                  key={module.id}
                  onClick={() => !isFree && toggleModule(module.id)}
                  className={`relative bg-white rounded-2xl p-6 transition-all duration-200 ${
                    isFree ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected 
                      ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10' 
                      : 'border border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  {/* Selection Circle */}
                  <div className="absolute top-5 left-5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Free Badge */}
                  {isFree && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        GRATIS
                      </Badge>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-2 ${
                    isSelected 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{module.name}</h3>
                  <p className="text-slate-500 text-sm mb-5 line-clamp-2">
                    {module.description?.split('.')[0] || 'Complete module voor uw bedrijf'}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-900">
                      {isFree ? '0' : price.toLocaleString('nl-NL')}
                    </span>
                    <span className="text-slate-400 text-sm ml-1">SRD</span>
                    <div className="text-slate-400 text-xs">per {isYearly ? 'jaar' : 'maand'}</div>
                  </div>

                  {/* Button */}
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full ${
                      isSelected 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    disabled={isFree}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Geselecteerd
                      </>
                    ) : isFree ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Inbegrepen
                      </>
                    ) : (
                      <>
                        Selecteer Module
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <p className="text-slate-500 mb-4">
              U heeft {getSelectedCount()} module{getSelectedCount() !== 1 ? 's' : ''} geselecteerd
            </p>
            <Button
              onClick={() => setOrderDialogOpen(true)}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
            >
              <Check className="w-4 h-4 mr-2" />
              Doorgaan naar Bestellen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gradient-to-br from-slate-900 to-emerald-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Waarom kiezen voor ons?</h2>
            <p className="text-slate-400">Alles wat u nodig heeft voor uw bedrijf, in één platform</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Veilig & Betrouwbaar', desc: 'Uw data is veilig opgeslagen' },
              { icon: Zap, title: 'Snel & Modern', desc: 'Gebouwd met de nieuwste technologie' },
              { icon: Globe, title: 'Schaalbaar', desc: 'Groeit mee met uw bedrijf' },
              { icon: Gift, title: '3 Dagen Gratis', desc: 'Probeer zonder verplichtingen' },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Klaar om te starten?</h2>
          <p className="text-slate-500 mb-6">Probeer eerst de demo of neem contact met ons op</p>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/demo')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Bekijk Demo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/contact')}
            >
              Contact Opnemen
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <DialogTitle className="text-xl font-bold mb-1">Account Aanmaken</DialogTitle>
            <DialogDescription className="text-white/80">
              {getSelectedCount()} module{getSelectedCount() !== 1 ? 's' : ''} • SRD {getTotalPrice().toLocaleString('nl-NL')}/{isYearly ? 'jaar' : 'maand'}
            </DialogDescription>
          </div>
          
          <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Naam *</Label>
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
                <Label className="text-slate-700">Bedrijfsnaam *</Label>
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
              <Label className="text-slate-700">E-mailadres *</Label>
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
              <Label className="text-slate-700">Telefoon</Label>
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
                <Label className="text-slate-700">Wachtwoord *</Label>
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
                <Label className="text-slate-700">Bevestig *</Label>
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

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-medium text-emerald-800 mb-2">Geselecteerde modules:</p>
              <div className="flex flex-wrap gap-1.5">
                {modules.filter(m => selectedModules.includes(m.id)).map((module) => (
                  <Badge key={module.id} className="bg-white text-emerald-700 text-xs">
                    {module.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Even geduld...
                </>
              ) : (
                <>
                  Account Aanmaken
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            <p className="text-center text-xs text-slate-500">
              Door te registreren gaat u akkoord met onze voorwaarden.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
