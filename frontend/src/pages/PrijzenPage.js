import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowRight, 
  Check, 
  Loader2,
  Phone,
  Package,
  Star,
  Sparkles,
  CreditCard,
  Building2,
  Gift,
  User,
  Mail,
  Lock,
  Building,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle,
  Puzzle,
  Users,
  Car,
  MessageSquare,
  Globe,
  BarChart3,
  Scissors,
  Fuel
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
  'ai-chatbot': MessageSquare,
  'cms': Globe,
  'rapportage': BarChart3,
  'beauty': Scissors,
  'chatbot': MessageSquare,
  'pompstation': Fuel
};

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
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

  // Handle pre-selected addons from URL
  useEffect(() => {
    const preSelectedAddon = searchParams.get('addon');
    const preSelectedAddons = searchParams.get('addons');
    
    if (preSelectedAddon && addons.length > 0) {
      const addon = addons.find(a => a.id === preSelectedAddon || a.slug === preSelectedAddon);
      if (addon && !selectedAddons.includes(addon.id)) {
        setSelectedAddons([addon.id]);
      }
    }
    
    if (preSelectedAddons && addons.length > 0) {
      const addonIds = preSelectedAddons.split(',');
      const validIds = addonIds.filter(id => addons.some(a => a.id === id || a.slug === id));
      if (validIds.length > 0) {
        setSelectedAddons(validIds);
      }
    }
  }, [searchParams, addons]);

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes] = await Promise.all([
        axios.get(`${API_URL}/public/landing/settings`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/public/addons`).catch(() => ({ data: [] }))
      ]);
      
      setSettings(settingsRes.data);
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `SRD ${new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const getPrice = (addon) => {
    const monthlyPrice = addon.price || 0;
    if (isYearly) {
      return monthlyPrice * 10; // 2 maanden gratis
    }
    return monthlyPrice;
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getTotalPrice = () => {
    const total = addons
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + getPrice(a), 0);
    return total;
  };

  const handleOrder = () => {
    if (selectedAddons.length === 0) {
      toast.warning('Selecteer minimaal één module');
      return;
    }
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
    
    if (orderForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
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
        addon_ids: selectedAddons,
        message: `Betaalmethode: ${paymentMethod === 'trial' ? '3 dagen gratis' : paymentMethod === 'mope' ? 'Mope' : 'Bankoverschrijving'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success(
          paymentMethod === 'trial' 
            ? 'Account aangemaakt! U heeft 3 dagen gratis toegang.' 
            : 'Bestelling ontvangen! U ontvangt een e-mail met betalingsinstructies.'
        );
        setOrderDialogOpen(false);
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '', password_confirm: '' });
        setSelectedAddons([]);
        
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

  // Gradient colors for cards
  const cardGradients = [
    'from-emerald-500 to-teal-600',
    'from-teal-500 to-emerald-600',
    'from-emerald-600 to-green-500',
    'from-green-500 to-teal-600',
    'from-teal-600 to-cyan-500',
    'from-cyan-500 to-emerald-600',
  ];

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

      {/* Hero Section - FAQ Style */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30">
            <CreditCard className="w-4 h-4 mr-2" />
            Transparante Prijzen
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Eenvoudige Prijsstelling
          </h1>
          
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Betaal alleen voor wat u nodig heeft. Geen verborgen kosten, geen lange contracten.
            Start met 3 dagen gratis.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <span className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-white text-emerald-700' : 'text-white/70'}`}>
              Maandelijks
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isYearly ? 'bg-white text-emerald-700' : 'text-white/70'}`}>
              Jaarlijks
              <Badge className="bg-amber-400 text-amber-900 border-0 text-xs">-17%</Badge>
            </span>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-8 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Gift className="w-4 h-4 text-emerald-600" />
              </div>
              <span>3 dagen gratis proberen</span>
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
              <span>Direct annuleren mogelijk</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Summary Bar */}
      {selectedAddons.length > 0 && (
        <div className="sticky top-16 z-40 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="font-medium">
                  {selectedAddons.length} module{selectedAddons.length > 1 ? 's' : ''} geselecteerd
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-white">
                  <span className="text-sm opacity-80">Totaal:</span>
                  <span className="text-2xl font-bold ml-2">{formatCurrency(getTotalPrice())}</span>
                  <span className="text-sm opacity-80">/{isYearly ? 'jaar' : 'maand'}</span>
                </div>
                <Button 
                  onClick={handleOrder}
                  className="bg-white text-emerald-600 hover:bg-slate-100 shadow-lg"
                  data-testid="order-selected-btn"
                >
                  Nu Bestellen
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon, index) => {
              const isSelected = selectedAddons.includes(addon.id);
              const isPopular = index === 0;
              const gradient = cardGradients[index % cardGradients.length];
              const IconComponent = MODULE_ICONS[addon.slug] || Package;
              
              return (
                <div
                  key={addon.id}
                  data-testid={`addon-card-${addon.id}`}
                  className={`group relative cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                    isSelected ? 'scale-[1.02]' : ''
                  }`}
                  onClick={() => toggleAddonSelection(addon.id)}
                >
                  {/* Card */}
                  <div className={`relative bg-white rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl ${
                    isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-100'
                  }`}>
                    {/* Header with gradient */}
                    <div className={`relative h-32 bg-gradient-to-br ${gradient} p-5`}>
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      </div>
                      
                      {/* Icon */}
                      <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* Popular Badge */}
                      {isPopular && (
                        <Badge className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white border-white/30">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Populair
                        </Badge>
                      )}
                      
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {addon.name}
                      </h3>
                      
                      {addon.description && (
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[40px]">
                          {addon.description}
                        </p>
                      )}
                      
                      {/* Price */}
                      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-4 mb-4 border border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900">{formatCurrency(getPrice(addon))}</span>
                          <span className="text-slate-500 text-sm">/{isYearly ? 'jaar' : 'maand'}</span>
                        </div>
                        {isYearly && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">Bespaar 2 maanden!</p>
                        )}
                      </div>
                      
                      {/* Features */}
                      <ul className="space-y-2 mb-5">
                        {(addon.features || ['Volledige toegang', 'Updates inbegrepen', 'Support', 'Data export']).slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Button */}
                      <Button 
                        className={`w-full h-11 font-semibold ${
                          isSelected 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : `bg-gradient-to-r ${gradient} text-white hover:opacity-90`
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelected) toggleAddonSelection(addon.id);
                          handleOrder();
                        }}
                        data-testid={`order-btn-${addon.id}`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Gekozen
                          </>
                        ) : (
                          'Selecteren'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Waarom kiezen voor ons?
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Alles wat u nodig heeft voor uw bedrijf, in één platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Veilig & Betrouwbaar', desc: 'Uw data is veilig opgeslagen', color: 'from-emerald-400 to-teal-500' },
              { icon: Zap, title: 'Snel & Modern', desc: 'Gebouwd met nieuwste technologie', color: 'from-teal-400 to-cyan-500' },
              { icon: TrendingUp, title: 'Schaalbaar', desc: 'Groeit mee met uw bedrijf', color: 'from-cyan-400 to-blue-500' },
              { icon: Gift, title: '3 Dagen Gratis', desc: 'Probeer zonder verplichtingen', color: 'from-amber-400 to-orange-500' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
                <div className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center`}>
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
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Klaar om te starten?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Probeer eerst de demo of neem contact met ons op
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8"
              onClick={() => navigate('/demo')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Bekijk Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-slate-200"
              onClick={() => navigate('/contact')}
            >
              Contact Opnemen
            </Button>
          </div>
        </div>
      </section>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
            <DialogTitle className="text-xl font-bold text-white mb-1">
              Bestelling Afronden
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {selectedAddons.length} module{selectedAddons.length > 1 ? 's' : ''} - Totaal: {formatCurrency(getTotalPrice())}/{isYearly ? 'jaar' : 'maand'}
            </DialogDescription>
          </div>

          <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Naam *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="Uw naam"
                    value={orderForm.name}
                    onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-sm font-medium">Bedrijf *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="company_name"
                    placeholder="Bedrijfsnaam"
                    value={orderForm.company_name}
                    onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="uw@email.com"
                    value={orderForm.email}
                    onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefoon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="+597 xxx xxxx"
                    value={orderForm.phone}
                    onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Wachtwoord *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 karakters"
                    value={orderForm.password}
                    onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm" className="text-sm font-medium">Bevestig *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password_confirm"
                    type="password"
                    placeholder="Herhaal wachtwoord"
                    value={orderForm.password_confirm}
                    onChange={(e) => setOrderForm({...orderForm, password_confirm: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Betaalmethode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'trial', label: '3 Dagen Gratis', icon: Gift, desc: 'Geen betaling' },
                  { id: 'mope', label: 'Mope', icon: CreditCard, desc: 'Online betalen' },
                  { id: 'bank', label: 'Bank', icon: Building2, desc: 'Overschrijving' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <method.icon className={`w-5 h-5 mx-auto mb-1 ${
                      paymentMethod === method.id ? 'text-emerald-600' : 'text-slate-400'
                    }`} />
                    <p className={`text-xs font-medium ${
                      paymentMethod === method.id ? 'text-emerald-700' : 'text-slate-600'
                    }`}>{method.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {paymentMethod === 'trial' ? 'Start Gratis Proefperiode' : 'Bestelling Plaatsen'}
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
