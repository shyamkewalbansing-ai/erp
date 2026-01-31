import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
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
  Loader2,
  Phone,
  Package,
  Star,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
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
          
          {/* Toggle Switch */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Maandelijks</span>
            <Switch 
              checked={isYearly} 
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Jaarlijks
              <Badge className="ml-2 bg-emerald-100 text-emerald-700">Bespaar 20%</Badge>
            </span>
          </div>
        </div>
      </section>

      {/* Base Package */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Basispakket</h2>
                    <p className="text-gray-600">Inclusief kernfuncties en dashboard</p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-4xl font-bold text-emerald-600">GRATIS</div>
                  <p className="text-gray-500">voor altijd</p>
                </div>
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">Dashboard toegang</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">Basis rapportages</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">E-mail ondersteuning</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Add-ons Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Premium Add-ons</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
              <Card 
                key={addon.id} 
                className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedAddons.includes(addon.id) 
                    ? 'border-2 border-emerald-500 shadow-emerald-100' 
                    : 'border border-gray-200'
                }`}
                onClick={() => toggleAddonSelection(addon.id)}
              >
                {selectedAddons.includes(addon.id) && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl">{addon.name}</CardTitle>
                  {addon.description && (
                    <CardDescription className="text-sm line-clamp-2">{addon.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">{formatCurrency(getPrice(addon))}</span>
                    <span className="text-gray-500">/{isYearly ? 'Jaar' : 'Maand'}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-emerald-600 mt-1">
                      Bespaar {formatCurrency(addon.price * 12 * 0.2)} per jaar
                    </p>
                  )}
                  <Button 
                    className={`w-full mt-4 ${
                      selectedAddons.includes(addon.id) 
                        ? 'bg-emerald-500 hover:bg-emerald-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAddonSelection(addon.id);
                    }}
                  >
                    {selectedAddons.includes(addon.id) ? 'Geselecteerd' : 'Selecteren'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Order Summary */}
      {selectedAddons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">{selectedAddons.length}</span> module(s) geselecteerd
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(getTotalPrice())} <span className="text-sm text-gray-500 font-normal">/{isYearly ? 'jaar' : 'maand'}</span>
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-emerald-500 hover:bg-emerald-600 h-12 px-8"
              onClick={() => setOrderDialogOpen(true)}
            >
              Nu Bestellen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Account Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een account aan om uw geselecteerde modules te activeren
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOrderSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label>Wachtwoord *</Label>
              <Input 
                type="password"
                required
                minLength={6}
                value={orderForm.password}
                onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                placeholder="Minimaal 6 tekens"
              />
            </div>

            {selectedAddons.length > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-gray-600 mb-2">Geselecteerde modules:</p>
                <ul className="space-y-1">
                  {addons.filter(a => selectedAddons.includes(a.id)).map(addon => (
                    <li key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.name}</span>
                      <span className="font-medium">{formatCurrency(getPrice(addon))}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-emerald-200 mt-3 pt-3 flex justify-between font-bold">
                  <span>Totaal</span>
                  <span className="text-emerald-600">{formatCurrency(getTotalPrice())} /{isYearly ? 'jaar' : 'maand'}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting || selectedAddons.length === 0} className="bg-emerald-500 hover:bg-emerald-600">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Account Aanmaken'}
              </Button>
            </DialogFooter>
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
