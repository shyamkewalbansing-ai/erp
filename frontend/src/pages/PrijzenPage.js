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
  ChevronRight,
  Calculator,
  Headphones,
  Scissors,
  BarChart3,
  Globe,
  ShoppingCart
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
      // Filter out test addons and sort by price
      const filteredModules = (addonsRes.data || [])
        .filter(m => m.is_active && !m.slug?.includes('test'))
        .sort((a, b) => {
          if (a.is_free && !b.is_free) return -1;
          if (!a.is_free && b.is_free) return 1;
          return (a.price || 0) - (b.price || 0);
        });
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
    // Don't allow deselecting free modules
    if (module?.is_free || module?.price === 0) {
      return;
    }
    
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getTotalPrice = () => {
    return modules
      .filter(m => selectedModules.includes(m.id))
      .reduce((sum, m) => sum + (m.price || 0), 0);
  };

  const getSelectedCount = () => {
    return selectedModules.length;
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
        addon_ids: selectedModules,
        message: `Geselecteerde modules: ${selectedModules.length}`
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
    <div className="min-h-screen bg-slate-50">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Sticky Selection Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-medium">
                {getSelectedCount()} module{getSelectedCount() !== 1 ? 's' : ''} geselecteerd
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-white/70 text-sm">Totaal: </span>
                <span className="text-2xl font-bold text-white">
                  SRD {getTotalPrice().toLocaleString('nl-NL')}
                </span>
                <span className="text-white/70 text-sm">/maand</span>
              </div>
              <Button
                onClick={() => setOrderDialogOpen(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-6"
              >
                Nu Bestellen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-36 pb-12 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px]"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Flexibele Modules voor{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              uw Bedrijf
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Selecteer de modules die u nodig heeft en betaal alleen voor wat u gebruikt
          </p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Free Modules */}
          {freeModules.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Gift className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-800">Gratis Inbegrepen</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {freeModules.map((module) => {
                  const IconComponent = getModuleIcon(module.slug);
                  const isSelected = selectedModules.includes(module.id);
                  
                  return (
                    <div
                      key={module.id}
                      className={`relative bg-white rounded-2xl p-6 transition-all duration-300 cursor-default
                        border-2 border-emerald-200 shadow-lg shadow-emerald-500/10`}
                    >
                      {/* Free Badge */}
                      <div className="absolute -top-3 -right-3">
                        <Badge className="bg-emerald-500 text-white font-semibold px-3 py-1 shadow-lg">
                          GRATIS
                        </Badge>
                      </div>
                      
                      {/* Selected indicator */}
                      <div className="absolute top-4 left-4">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 mt-4 shadow-lg shadow-emerald-500/30">
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{module.name}</h3>
                      <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                        {module.description?.split('.')[0] || 'Complete module voor uw bedrijf'}
                      </p>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-emerald-600">Gratis</span>
                      </div>
                      
                      {/* Button */}
                      <Button
                        disabled
                        className="w-full bg-emerald-500 text-white cursor-default"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Inbegrepen
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paid Modules */}
          {paidModules.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-800">Premium Modules</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paidModules.map((module, index) => {
                  const IconComponent = getModuleIcon(module.slug);
                  const isSelected = selectedModules.includes(module.id);
                  const isPopular = index === 0; // First paid module is popular
                  
                  return (
                    <div
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`relative bg-white rounded-2xl p-6 transition-all duration-300 cursor-pointer
                        ${isSelected 
                          ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/20 scale-[1.02]' 
                          : 'border-2 border-slate-200 hover:border-emerald-300 hover:shadow-lg'
                        }`}
                    >
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute -top-0 -right-0 overflow-hidden w-24 h-24">
                          <div className="absolute top-3 -right-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-10 py-1 rotate-45 shadow-lg">
                            POPULAIR
                          </div>
                        </div>
                      )}
                      
                      {/* Selection indicator */}
                      <div className="absolute top-4 left-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-slate-300 bg-white'
                          }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-4 transition-all
                        ${isSelected 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30' 
                          : 'bg-emerald-50'
                        }`}>
                        <IconComponent className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{module.name}</h3>
                      <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                        {module.description?.split('.')[0] || 'Complete module voor uw bedrijf'}
                      </p>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-slate-900">
                          {(module.price || 0).toLocaleString('nl-NL')}
                        </span>
                        <span className="text-slate-500 ml-1">SRD</span>
                        <div className="text-slate-400 text-sm">per maand</div>
                      </div>
                      
                      {/* Button */}
                      <Button
                        className={`w-full transition-all ${
                          isSelected 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Geselecteerd
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
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Waarom Facturatie.sr?</h2>
            <p className="text-slate-600">Alles wat u nodig heeft voor uw Surinaamse onderneming</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Globe, title: 'Multi-Valuta', desc: 'SRD, USD en EUR' },
              { icon: Shield, title: 'Veilig', desc: 'Bank-niveau encryptie' },
              { icon: Headphones, title: 'Lokale Support', desc: 'Surinaams team' },
              { icon: BarChart3, title: 'BTW Compliant', desc: 'Surinaamse tarieven' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                  <item.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-emerald-100 mb-8">
            Start vandaag nog met de gratis Boekhouding module
          </p>
          <Button
            onClick={() => setOrderDialogOpen(true)}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-10"
          >
            Account Aanmaken
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <PublicFooter settings={settings} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <DialogTitle className="text-2xl font-bold mb-2">
              Account Aanmaken
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {getSelectedCount()} module{getSelectedCount() !== 1 ? 's' : ''} • SRD {getTotalPrice().toLocaleString('nl-NL')}/maand
            </DialogDescription>
          </div>
          
          <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
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

            {/* Selected modules summary */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Geselecteerde modules:</p>
              <div className="flex flex-wrap gap-2">
                {modules.filter(m => selectedModules.includes(m.id)).map((module) => (
                  <Badge key={module.id} className="bg-white text-emerald-700 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    {module.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white py-6 text-lg font-semibold"
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
              Door te registreren gaat u akkoord met onze voorwaarden.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
