import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
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
  CheckCircle,
  CreditCard,
  Building2,
  Gift,
  User,
  Mail,
  Lock,
  Building,
  Puzzle,
  Zap,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

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

  const getSelectedAddonNames = () => {
    return addons
      .filter(a => selectedAddons.includes(a.id))
      .map(a => a.name);
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
    { gradient: 'from-emerald-500 to-teal-600', icon: 'bg-emerald-500', light: 'from-emerald-50 to-teal-50' },
    { gradient: 'from-blue-500 to-indigo-600', icon: 'bg-blue-500', light: 'from-blue-50 to-indigo-50' },
    { gradient: 'from-orange-500 to-red-600', icon: 'bg-orange-500', light: 'from-orange-50 to-red-50' },
    { gradient: 'from-purple-500 to-pink-600', icon: 'bg-purple-500', light: 'from-purple-50 to-pink-50' },
    { gradient: 'from-cyan-500 to-blue-600', icon: 'bg-cyan-500', light: 'from-cyan-50 to-blue-50' },
    { gradient: 'from-amber-500 to-orange-600', icon: 'bg-amber-500', light: 'from-amber-50 to-orange-50' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Transparante Prijzen
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Eenvoudige
            </span>{' '}
            Prijsstelling
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Betaal alleen voor wat u nodig heeft. Geen verborgen kosten, 
            geen lange contracten.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-2 bg-white rounded-full shadow-lg border border-slate-200">
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}>
              Maandelijks
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isYearly ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}>
              Jaarlijks
              {!isYearly && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">-17%</Badge>}
            </span>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>3 dagen gratis proberen</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Geen creditcard nodig</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addons.map((addon, index) => {
              const isSelected = selectedAddons.includes(addon.id);
              const isPopular = index === 0;
              const colors = cardGradients[index % cardGradients.length];
              
              return (
                <Card 
                  key={addon.id} 
                  className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white ${
                    isSelected ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''
                  }`}
                  onClick={() => toggleAddonSelection(addon.id)}
                  data-testid={`addon-card-${addon.id}`}
                >
                  {/* Top Gradient Bar */}
                  <div className={`h-2 bg-gradient-to-r ${colors.gradient}`}></div>
                  
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute top-6 right-6">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Populair
                      </Badge>
                    </div>
                  )}
                  
                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute top-6 left-6">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <CardContent className="p-8 pt-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${colors.icon} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      {addon.icon_url ? (
                        <img src={addon.icon_url} alt={addon.name} className="w-8 h-8" />
                      ) : (
                        <Package className="w-8 h-8 text-white" />
                      )}
                    </div>
                    
                    {/* Category */}
                    <Badge variant="secondary" className="mb-3 bg-slate-100 text-slate-600">
                      {addon.category || 'Module'}
                    </Badge>
                    
                    {/* Name */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {addon.name}
                    </h3>
                    
                    {/* Description */}
                    {addon.description && (
                      <p className="text-slate-600 mb-6 line-clamp-2">{addon.description}</p>
                    )}
                    
                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-slate-900">{formatCurrency(getPrice(addon))}</span>
                      <span className="text-slate-500 ml-1">/{isYearly ? 'jaar' : 'maand'}</span>
                      {isYearly && (
                        <p className="text-sm text-emerald-600 mt-1">
                          Bespaar 2 maanden!
                        </p>
                      )}
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {(addon.features || ['Volledige toegang', 'Updates inbegrepen', 'Support', 'Data export']).slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600">
                          <div className={`w-5 h-5 rounded-full ${colors.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Button */}
                    <Button 
                      className={`w-full h-12 text-base font-semibold ${
                        isSelected 
                          ? 'bg-emerald-500 hover:bg-emerald-600' 
                          : `bg-gradient-to-r ${colors.gradient} hover:opacity-90`
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) {
                          toggleAddonSelection(addon.id);
                        }
                        handleOrder();
                      }}
                      data-testid={`order-btn-${addon.id}`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Geselecteerd
                        </>
                      ) : (
                        'Nu Bestellen'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Waarom kiezen voor ons?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Alles wat u nodig heeft voor uw bedrijf, in één platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Veilig & Betrouwbaar', desc: 'Uw data is veilig opgeslagen' },
              { icon: Zap, title: 'Snel & Modern', desc: 'Gebouwd met de nieuwste technologie' },
              { icon: TrendingUp, title: 'Schaalbaar', desc: 'Groeit mee met uw bedrijf' },
              { icon: Gift, title: '3 Dagen Gratis', desc: 'Probeer zonder verplichtingen' },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
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
            {/* Selected Modules Summary */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-emerald-800">
                <Puzzle className="w-5 h-5" />
                Geselecteerde Modules
              </h4>
              <div className="space-y-2">
                {getSelectedAddonNames().map((name, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-emerald-700">
                    <Check className="w-4 h-4" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200 flex justify-between items-center">
                <span className="font-medium text-emerald-800">Totaal per {isYearly ? 'jaar' : 'maand'}:</span>
                <span className="font-bold text-emerald-600 text-xl">{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Account Gegevens
              </h4>
              
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
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Betaalmethode
              </h4>
              
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
                      <CreditCard className="w-5 h-5 text-blue-500" />
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
                disabled={submitting}
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
