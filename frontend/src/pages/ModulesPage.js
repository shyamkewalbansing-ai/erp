import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Puzzle, 
  RefreshCw, 
  CreditCard, 
  Building2, 
  Gift,
  Check,
  ArrowRight,
  User,
  Mail,
  Lock,
  Phone,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import api, { getPublicAddons, formatCurrency } from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ModulesPage() {
  const navigate = useNavigate();
  const [addons, setAddons] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selection state
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

  const loadData = async () => {
    try {
      const [addonsRes, settingsRes] = await Promise.all([
        getPublicAddons(),
        api.get('/public/landing/settings').catch(() => ({ data: {} }))
      ]);
      
      setAddons(addonsRes.data || []);
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    return selectedAddons.reduce((sum, id) => {
      const addon = addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
  };

  const getSelectedAddonNames = () => {
    return selectedAddons.map(id => {
      const addon = addons.find(a => a.id === id);
      return addon?.name || '';
    }).filter(Boolean);
  };

  const handleOrder = () => {
    if (selectedAddons.length === 0) {
      toast.warning('Selecteer minimaal één module');
      return;
    }
    setOrderDialogOpen(true);
  };

  const resetSelection = () => {
    setSelectedAddons([]);
  };

  const handleSubmitOrder = async (e) => {
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
        ...orderForm,
        selected_addons: selectedAddons,
        payment_method: paymentMethod,
        total_amount: calculateTotal(),
        is_trial: paymentMethod === 'trial'
      };
      
      const response = await api.post('/public/orders', orderData);
      
      if (response.data.success) {
        toast.success(
          paymentMethod === 'trial' 
            ? 'Account aangemaakt! U heeft 3 dagen gratis toegang.' 
            : 'Bestelling ontvangen! U ontvangt een e-mail met betalingsinstructies.'
        );
        setOrderDialogOpen(false);
        
        // Redirect based on payment method
        if (paymentMethod === 'mope' && response.data.payment_url) {
          window.location.href = response.data.payment_url;
        } else {
          navigate('/login');
        }
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Onze Modules</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u nodig heeft.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Modules Grid */}
            <div className="lg:col-span-2">
              {/* Base Package Card */}
              <Card className="mb-6 border-2 border-primary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xl">→</span>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Basispakket</h2>
                        <p className="text-gray-500">
                          {selectedAddons.length > 0 
                            ? `${selectedAddons.length} module${selectedAddons.length > 1 ? 's' : ''} geselecteerd`
                            : `+${addons.length} Premium Add-on`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
                      <p className="text-gray-500">/Maand</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Addon Cards Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map((addon) => (
                  <Card 
                    key={addon.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedAddons.includes(addon.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => toggleAddon(addon.id)}
                    data-testid={`addon-card-${addon.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          {addon.icon_url ? (
                            <img src={addon.icon_url} alt={addon.name} className="w-8 h-8" />
                          ) : (
                            <Puzzle className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <Checkbox 
                          checked={selectedAddons.includes(addon.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {addon.category || 'STATISTIEKEN'}
                      </Badge>
                      
                      <h3 className="font-bold text-lg mb-2">{addon.name}</h3>
                      
                      {addon.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{addon.description}</p>
                      )}
                      
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(addon.price)}
                        <span className="text-sm font-normal text-gray-500">/Maand</span>
                      </p>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/modules/${addon.slug || addon.id}`);
                        }}
                      >
                        Details weergeven
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Uw Selectie</h3>
                  
                  {selectedAddons.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Geen modules geselecteerd
                    </p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {getSelectedAddonNames().map((name, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary" />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Totaal per maand:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    size="lg"
                    onClick={handleOrder}
                    disabled={selectedAddons.length === 0}
                    data-testid="order-btn"
                  >
                    Koop nu
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  {selectedAddons.length > 0 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-2 text-gray-500"
                      onClick={resetSelection}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Selectie resetten
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Account Aanmaken & Bestellen</DialogTitle>
            <DialogDescription>
              Maak een account aan en kies uw betaalmethode om te starten
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitOrder} className="space-y-6 mt-4">
            {/* Selected Modules Summary */}
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-primary" />
                Geselecteerde Modules
              </h4>
              <div className="space-y-1">
                {getSelectedAddonNames().map((name, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20 flex justify-between">
                <span className="font-medium">Totaal per maand:</span>
                <span className="font-bold text-primary text-lg">{formatCurrency(calculateTotal())}</span>
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
                    paymentMethod === 'trial' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('trial')}
                >
                  <RadioGroupItem value="trial" id="trial" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="trial" className="flex items-center gap-2 cursor-pointer font-semibold">
                      <Gift className="w-5 h-5 text-primary" />
                      3 Dagen Gratis Proberen
                      <Badge className="bg-primary/10 text-primary border-0">Aanbevolen</Badge>
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Probeer alle functies gratis. Na 3 dagen kiest u een betaalmethode.
                    </p>
                  </div>
                </div>

                {/* Mope Payment */}
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'mope' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
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
                    paymentMethod === 'bank' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
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
                className="flex-1 bg-primary hover:bg-primary/90"
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
