import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLandingSections, getLandingSettings, getPublicAddons, createPublicOrder, createPaymentForOrder, formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Loader2, ArrowLeft, Package, ChevronRight, Check, Eye, EyeOff, CreditCard, User } from 'lucide-react';

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Order form state
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    company_name: '',
    message: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsRes, settingsRes, addonsRes] = await Promise.all([
        getLandingSections(),
        getLandingSettings(),
        getPublicAddons()
      ]);
      const pricingSection = sectionsRes.data.find(s => s.section_type === 'pricing');
      setSection(pricingSection);
      setSettings(settingsRes.data);
      setAddons(addonsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getTotalPrice = () => {
    return addons
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + (a.price || 0), 0);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (selectedAddons.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }
    
    if (orderForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await createPublicOrder({
        ...orderForm,
        addon_ids: selectedAddons
      });
      
      const orderData = response.data;
      setOrderSuccess(orderData);
      
      toast.success('Uw account is aangemaakt! U kunt nu betalen of later inloggen.');
      setOrderForm({ name: '', email: '', phone: '', password: '', company_name: '', message: '' });
      setSelectedAddons([]);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (!orderSuccess) return;
    
    setSubmitting(true);
    try {
      const response = await createPaymentForOrder(orderSuccess.id, window.location.origin);
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error('Kon geen betaallink aanmaken. Neem contact op met de beheerder.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Betaling kon niet worden gestart. Probeer later opnieuw of neem contact op.');
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug
                </Button>
              </Link>
              <Button onClick={() => navigate('/register')}>
                Gratis Starten
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {section?.title || 'Onze Modules'}
          </h1>
          {section?.subtitle && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {section.subtitle}
            </p>
          )}
          {section?.content && (
            <p className="text-muted-foreground mt-2">{section.content}</p>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {addons.map((addon) => (
              <Card key={addon.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Package className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{addon.name}</CardTitle>
                  <CardDescription>{addon.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">{formatCurrency(addon.price)}</span>
                    <span className="text-muted-foreground">/maand</span>
                  </div>
                  <Button 
                    className="w-full" 
                    variant={selectedAddons.includes(addon.id) ? "default" : "outline"}
                    onClick={() => toggleAddonSelection(addon.id)}
                  >
                    {selectedAddons.includes(addon.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Geselecteerd
                      </>
                    ) : (
                      <>
                        Selecteren
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Form */}
          {orderSuccess ? (
            <Card className="max-w-2xl mx-auto border-2 border-green-500/30 bg-green-500/5">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-600">Account Aangemaakt!</CardTitle>
                <CardDescription>
                  Uw account is aangemaakt. U kunt nu direct betalen of later inloggen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background border">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="font-medium">{orderSuccess.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modules:</span>
                      <span className="font-medium">{orderSuccess.addon_names?.join(', ')}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Totaal:</span>
                      <span className="font-bold text-primary">{formatCurrency(orderSuccess.total_price)}/maand</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  <Button 
                    size="lg" 
                    className="w-full h-14"
                    onClick={handlePayNow}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-5 h-5 mr-2" />
                    )}
                    Nu Betalen met Mope
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    <User className="w-5 h-5 mr-2" />
                    Later Inloggen
                  </Button>
                </div>
                
                <p className="text-center text-sm text-muted-foreground">
                  Na betaling worden uw modules automatisch geactiveerd.
                </p>
              </CardContent>
            </Card>
          ) : (
          <Card className="max-w-2xl mx-auto border-2 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Bestelling & Account Aanmaken</CardTitle>
              <CardDescription>
                Selecteer de modules hierboven en maak direct uw account aan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
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
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
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
                </div>
                
                {/* Password field for account creation */}
                <div className="space-y-2">
                  <Label>Wachtwoord * (voor uw account)</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={orderForm.password}
                      onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                      placeholder="Minimaal 6 tekens"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Met dit wachtwoord kunt u later inloggen op uw account
                  </p>
                </div>

                {/* Selected modules summary */}
                {selectedAddons.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium mb-2">Geselecteerde modules:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {addons.filter(a => selectedAddons.includes(a.id)).map(addon => (
                        <span key={addon.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {addon.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                      <span className="font-medium">Totaal per maand:</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(getTotalPrice())}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Bericht (optioneel)</Label>
                  <Textarea 
                    value={orderForm.message}
                    onChange={(e) => setOrderForm({...orderForm, message: e.target.value})}
                    placeholder="Heeft u nog vragen of opmerkingen?"
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={submitting || selectedAddons.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verzenden...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Bestelling Versturen
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/voorwaarden" className="hover:text-foreground">Algemene Voorwaarden</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacybeleid</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
