import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
  Puzzle
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
      return monthlyPrice * 12;
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
    
    // Validation
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
        // Store token for auto-login
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
        
        // Reset form
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '', password_confirm: '' });
        setSelectedAddons([]);
        
        // Redirect based on payment method
        if (paymentMethod === 'mope' && response.data.order?.id) {
          // Create Mope payment
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
        
        // For trial and bank transfer, go to dashboard
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            <span className="text-emerald-500">Eenvoudige</span> prijsstelling
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Kies de extensies die het beste aansluiten bij uw bedrijfsbehoeften
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${!isYearly ? 'text-emerald-600' : 'text-gray-500'}`}>Maandelijks</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm font-medium ${isYearly ? 'text-emerald-600' : 'text-gray-500'}`}>
              Jaarlijks
              <Badge className="ml-2 bg-emerald-100 text-emerald-700">2 maanden gratis</Badge>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Selected Count & Total */}
          {selectedAddons.length > 0 && (
            <div className="mb-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">
                  {selectedAddons.length} module{selectedAddons.length > 1 ? 's' : ''} geselecteerd
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(getTotalPrice())}
                  <span className="text-sm font-normal text-gray-600">/{isYearly ? 'jaar' : 'maand'}</span>
                </span>
                <Button 
                  onClick={handleOrder}
                  className="bg-emerald-500 hover:bg-emerald-600"
                  data-testid="order-selected-btn"
                >
                  Nu Bestellen
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Addon Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon, index) => {
              const isSelected = selectedAddons.includes(addon.id);
              const isPopular = index === 0;
              
              return (
                <Card 
                  key={addon.id} 
                  className={`relative overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''
                  } ${isPopular ? 'border-emerald-500' : ''}`}
                  onClick={() => toggleAddonSelection(addon.id)}
                  data-testid={`addon-card-${addon.id}`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                      Populair
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                          {addon.icon_url ? (
                            <img src={addon.icon_url} alt={addon.name} className="w-8 h-8" />
                          ) : (
                            <Package className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{addon.name}</CardTitle>
                          <CardDescription>{addon.category || 'Module'}</CardDescription>
                        </div>
                      </div>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">{formatCurrency(getPrice(addon))}</span>
                      <span className="text-gray-500">/{isYearly ? 'jaar' : 'maand'}</span>
                    </div>
                    
                    {addon.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{addon.description}</p>
                    )}
                    
                    {/* Features List */}
                    <ul className="space-y-2 mb-6">
                      {(addon.features || ['Volledige toegang', 'Updates inbegrepen', 'Support']).slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${isSelected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) {
                          toggleAddonSelection(addon.id);
                        }
                        handleOrder();
                      }}
                      data-testid={`order-btn-${addon.id}`}
                    >
                      {isSelected ? 'Geselecteerd' : 'Nu Bestellen'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
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
            <DialogTitle className="text-2xl">Account Aanmaken & Bestellen</DialogTitle>
            <DialogDescription>
              Maak een account aan en kies uw betaalmethode om te starten
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleOrderSubmit} className="space-y-6 mt-4">
            {/* Selected Modules Summary */}
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-emerald-600" />
                Geselecteerde Modules
              </h4>
              <div className="space-y-1">
                {getSelectedAddonNames().map((name, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-between">
                <span className="font-medium">Totaal per {isYearly ? 'jaar' : 'maand'}:</span>
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(getTotalPrice())}</span>
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
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                {/* 3 Days Free Trial */}
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'trial' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
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
                    <p className="text-sm text-gray-500 mt-1">
                      Probeer alle functies gratis. Na 3 dagen kiest u een betaalmethode.
                    </p>
                  </div>
                </div>

                {/* Mope Payment */}
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'mope' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('mope')}
                >
                  <RadioGroupItem value="mope" id="mope" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mope" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      Betalen met Mope
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Direct betalen via Mope. Uw account wordt direct geactiveerd.
                    </p>
                  </div>
                </div>

                {/* Bank Transfer */}
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('bank')}
                >
                  <RadioGroupItem value="bank" id="bank" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      Bankoverschrijving
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
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
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
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
