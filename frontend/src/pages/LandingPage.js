import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLandingSections, getLandingSettings, getPublicAddons, createPublicOrder, formatCurrency } from '../lib/api';
import api from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
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
  Shield, 
  Zap, 
  Package, 
  Headphones,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  FileText,
  Lock
} from 'lucide-react';

// Icon mapping for features
const iconMap = {
  Shield: Shield,
  Zap: Zap,
  Package: Package,
  HeadphonesIcon: Headphones,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal states for terms/privacy
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [activeModalContent, setActiveModalContent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsRes, settingsRes, addonsRes, menuRes] = await Promise.all([
        getLandingSections(),
        getLandingSettings(),
        getPublicAddons(),
        api.get('/public/cms/menu').catch(() => ({ data: { items: [] } }))
      ]);
      
      setSections(sectionsRes.data || []);
      setSettings(settingsRes.data);
      setAddons(addonsRes.data || []);
      
      // Load menu items from CMS
      const items = menuRes.data?.items?.filter(item => item.is_visible) || [];
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading landing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSection = (type) => sections.find(s => s.section_type === type);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (selectedAddons.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }
    
    setSubmitting(true);
    try {
      await createPublicOrder({
        ...orderForm,
        addon_ids: selectedAddons
      });
      toast.success('Uw bestelling is ontvangen! Wij nemen zo snel mogelijk contact met u op.');
      setOrderDialogOpen(false);
      setOrderForm({ name: '', email: '', phone: '', company_name: '', message: '' });
      setSelectedAddons([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const heroSection = getSection('hero');
  const featuresSection = getSection('features');
  const pricingSection = getSection('pricing');
  const aboutSection = getSection('about');
  const termsSection = getSection('terms');
  const privacySection = getSection('privacy');
  const contactSection = getSection('contact');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>

            {/* Desktop Navigation - from CMS */}
            <div className="hidden md:flex items-center gap-8">
              {menuItems.length > 0 ? (
                menuItems.filter(item => item.link !== '/').map((item, index) => (
                  <a 
                    key={index}
                    href={item.link.startsWith('#') ? item.link : `#${item.link.replace('/', '')}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                ))
              ) : (
                <>
                  <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                  <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prijzen</a>
                  <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Over Ons</a>
                  <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
                </>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Inloggen
              </Button>
              <Button onClick={() => navigate('/register')}>
                Gratis Starten
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Prijzen</a>
              <a href="#about" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Over Ons</a>
              <a href="#contact" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full" onClick={() => navigate('/register')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      {heroSection && (
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Nu beschikbaar in Suriname
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  {heroSection.title}
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  {heroSection.subtitle}
                </p>
                {heroSection.content && (
                  <p className="text-muted-foreground">
                    {heroSection.content}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="h-14 px-8 text-lg" onClick={() => navigate('/register')}>
                    {heroSection.button_text || 'Start Nu'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => setOrderDialogOpen(true)}>
                    Direct Bestellen
                  </Button>
                </div>
              </div>
              {heroSection.image_url && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
                  <img 
                    src={heroSection.image_url}
                    alt="Hero"
                    className="relative rounded-3xl shadow-2xl w-full max-w-lg mx-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {featuresSection && (
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {featuresSection.title}
              </h2>
              {featuresSection.subtitle && (
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {featuresSection.subtitle}
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuresSection.metadata?.features?.map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || Package;
                return (
                  <Card key={index} className="bg-background border-border/50 hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section - Add-ons */}
      {pricingSection && (
        <section id="pricing" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {pricingSection.title}
              </h2>
              {pricingSection.subtitle && (
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {pricingSection.subtitle}
                </p>
              )}
              {pricingSection.content && (
                <p className="text-muted-foreground mt-2">{pricingSection.content}</p>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
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
                      onClick={() => {
                        setSelectedAddons([addon.id]);
                        setOrderDialogOpen(true);
                      }}
                    >
                      Nu Bestellen
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" variant="outline" onClick={() => setOrderDialogOpen(true)}>
                <Package className="w-5 h-5 mr-2" />
                Meerdere Modules Bestellen
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {aboutSection && (
        <section id="about" className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {aboutSection.title}
              </h2>
              {aboutSection.subtitle && (
                <p className="text-xl text-muted-foreground">
                  {aboutSection.subtitle}
                </p>
              )}
            </div>
            {aboutSection.content && (
              <div className="prose prose-lg max-w-none text-muted-foreground">
                {aboutSection.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contact Section */}
      {contactSection && (
        <section id="contact" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {contactSection.title}
                </h2>
                {contactSection.subtitle && (
                  <p className="text-xl text-muted-foreground mb-8">
                    {contactSection.subtitle}
                  </p>
                )}
                {contactSection.content && (
                  <p className="text-muted-foreground mb-8">{contactSection.content}</p>
                )}
                
                <div className="space-y-4">
                  {settings?.company_email && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <a href={`mailto:${settings.company_email}`} className="text-foreground font-medium hover:text-primary">
                          {settings.company_email}
                        </a>
                      </div>
                    </div>
                  )}
                  {settings?.company_phone && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Telefoon</p>
                        <a href={`tel:${settings.company_phone}`} className="text-foreground font-medium hover:text-primary">
                          {settings.company_phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {settings?.company_address && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Adres</p>
                        <p className="text-foreground font-medium">{settings.company_address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Order Form */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Direct Bestellen</CardTitle>
                  <CardDescription>Vul het formulier in en wij nemen contact met u op</CardDescription>
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
                    
                    <div className="space-y-2">
                      <Label>Selecteer Module(s) *</Label>
                      <div className="grid gap-2">
                        {addons.map((addon) => (
                          <div 
                            key={addon.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              selectedAddons.includes(addon.id) 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => toggleAddonSelection(addon.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={selectedAddons.includes(addon.id)}
                                onCheckedChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium">{addon.name}</span>
                            </div>
                            <span className="text-primary font-semibold">{formatCurrency(addon.price)}/mnd</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Bericht (optioneel)</Label>
                      <Textarea 
                        value={orderForm.message}
                        onChange={(e) => setOrderForm({...orderForm, message: e.target.value})}
                        placeholder="Heeft u nog vragen of opmerkingen?"
                        rows={3}
                      />
                    </div>

                    {selectedAddons.length > 0 && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Totaal per maand:</span>
                          <span className="text-2xl font-bold text-primary">{formatCurrency(getTotalPrice())}</span>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-12" disabled={submitting || selectedAddons.length === 0}>
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
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto mb-4"
              />
              <p className="text-muted-foreground max-w-md">
                {settings?.footer_text || "Modulaire bedrijfssoftware voor ondernemers in Suriname. Kies de modules die passen bij uw bedrijfsvoering."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground">Prijzen</a></li>
                <li><a href="#about" className="text-muted-foreground hover:text-foreground">Over Ons</a></li>
                <li><a href="#contact" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => {
                      setActiveModalContent(termsSection);
                      setTermsModalOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    Algemene Voorwaarden
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      setActiveModalContent(privacySection);
                      setPrivacyModalOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Lock className="w-4 h-4" />
                    Privacybeleid
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bestelling Plaatsen</DialogTitle>
            <DialogDescription>
              Selecteer de modules die u wilt bestellen en vul uw gegevens in
            </DialogDescription>
          </DialogHeader>
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
            
            <div className="space-y-2">
              <Label>Selecteer Module(s) *</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {addons.map((addon) => (
                  <div 
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddons.includes(addon.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleAddonSelection(addon.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedAddons.includes(addon.id)}
                        onCheckedChange={() => toggleAddonSelection(addon.id)}
                      />
                      <div>
                        <span className="font-medium">{addon.name}</span>
                        {addon.description && (
                          <p className="text-xs text-muted-foreground">{addon.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-primary font-semibold whitespace-nowrap">{formatCurrency(addon.price)}/mnd</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bericht (optioneel)</Label>
              <Textarea 
                value={orderForm.message}
                onChange={(e) => setOrderForm({...orderForm, message: e.target.value})}
                placeholder="Heeft u nog vragen of opmerkingen?"
                rows={3}
              />
            </div>

            {selectedAddons.length > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Totaal per maand:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(getTotalPrice())}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting || selectedAddons.length === 0}>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModalContent?.title || "Algemene Voorwaarden"}</DialogTitle>
            {activeModalContent?.subtitle && (
              <DialogDescription>{activeModalContent.subtitle}</DialogDescription>
            )}
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            {activeModalContent?.content?.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return <h3 key={index} className="font-semibold mt-4">{paragraph.replace(/\*\*/g, '')}</h3>;
              }
              if (paragraph.includes('**')) {
                const parts = paragraph.split('**');
                return (
                  <p key={index}>
                    {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                  </p>
                );
              }
              return <p key={index}>{paragraph}</p>;
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setTermsModalOpen(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Modal */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModalContent?.title || "Privacybeleid"}</DialogTitle>
            {activeModalContent?.subtitle && (
              <DialogDescription>{activeModalContent.subtitle}</DialogDescription>
            )}
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            {activeModalContent?.content?.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return <h3 key={index} className="font-semibold mt-4">{paragraph.replace(/\*\*/g, '')}</h3>;
              }
              if (paragraph.includes('**')) {
                const parts = paragraph.split('**');
                return (
                  <p key={index}>
                    {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                  </p>
                );
              }
              return <p key={index}>{paragraph}</p>;
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setPrivacyModalOpen(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
