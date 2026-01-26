import { useState, useEffect, memo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Headphones,
  Phone,
  Loader2,
  Menu,
  X,
  Building2,
  Users,
  BarChart3,
  CheckCircle,
  Briefcase,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  Sparkles
} from 'lucide-react';

// Lazy load ChatWidget
const ChatWidget = lazy(() => import('../components/ChatWidget'));

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Memoized components for performance
const FeatureCard = memo(({ icon: Icon, title, description }) => (
  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-gray-50">
    <CardContent className="p-8">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
        <Icon className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </CardContent>
  </Card>
));

FeatureCard.displayName = 'FeatureCard';

const IndustryCard = memo(({ icon: Icon, title, description }) => (
  <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors">
    <CardContent className="p-6">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </CardContent>
  </Card>
));

IndustryCard.displayName = 'IndustryCard';

export default function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
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
      console.error('Error loading landing page:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Features data
  const features = [
    {
      icon: Shield,
      title: 'SSL-encryptie',
      description: 'Alle gegevens worden veilig opgeslagen met SSL-encryptie en voldoen aan de geldende lokale privacyregels.'
    },
    {
      icon: TrendingUp,
      title: 'Gegarandeerde groei',
      description: 'Ons platform helpt u tijd te besparen, fouten te voorkomen en sneller betaald te krijgen.'
    },
    {
      icon: Headphones,
      title: '24/7 Ondersteuning',
      description: 'Ons team helpt je persoonlijk en vriendelijk. Gewoon duidelijke uitleg wanneer jij die nodig hebt.'
    }
  ];

  // Module features with images from addons
  const getModuleIcon = (slug) => {
    const icons = {
      'boekhouding': BarChart3,
      'hrm': Users,
      'projecten': Briefcase,
      'leads': Target,
      'crm': Target,
      'vastgoed_beheer': Building2,
      'verhuur': Building2
    };
    return icons[slug] || BarChart3;
  };

  // Industry solutions
  const industries = [
    { icon: Building2, title: 'Verhuur Beheer', description: 'Intuïtieve oplossing om al uw verhuuractiviteiten te stroomlijnen.' },
    { icon: Sparkles, title: 'Beauty & Spa', description: 'Stroomlijnt de spa-operaties met online boekingen en veilige betalingen.' },
    { icon: Settings, title: 'AutoDealer', description: 'Alles-in-één oplossing voor het beheren van auto\'s, voorraad en verkoop.' },
    { icon: Calendar, title: 'Hotel & Kamers', description: 'Complete oplossing die hoteloperaties vereenvoudigt.' }
  ];

  // Partner logos (using placeholder images)
  const partners = [
    { name: 'Bedrijf A', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+A' },
    { name: 'Bedrijf B', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+B' },
    { name: 'Bedrijf C', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+C' },
    { name: 'Bedrijf D', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+D' },
    { name: 'Bedrijf E', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+E' },
    { name: 'Bedrijf F', logo: 'https://via.placeholder.com/120x40/f3f4f6/9ca3af?text=Partner+F' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt="Facturatie N.V."
                className="h-8 w-auto"
              />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-emerald-600">Home</Link>
              <Link to="/prijzen" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Prijzen</Link>
              <Link to="/over-ons" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Over Ons</Link>
              <Link to="/voorwaarden" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Voorwaarden</Link>
              <Link to="/privacy" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Privacy</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-700">
                Inloggen
              </Button>
              <Button onClick={() => navigate('/prijzen')} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Gratis Starten
              </Button>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block text-emerald-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/prijzen" className="block text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Prijzen</Link>
              <Link to="/over-ons" className="block text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Over Ons</Link>
              <Link to="/voorwaarden" className="block text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Voorwaarden</Link>
              <Link to="/privacy" className="block text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Privacy</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => navigate('/prijzen')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Het Surinaamse SaaS‑platform met een volledig geïntegreerd{' '}
                <span className="text-emerald-500">ERP‑ en HRM‑systeem</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                Boekhouding, HRM, leads, projecten, sales & post-sale, verhuur en reserveringen – efficiënt, overzichtelijk en volledig geïntegreerd.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-emerald-500 hover:bg-emerald-600" onClick={() => navigate('/prijzen')}>
                  Ontvang het pakket
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setOrderDialogOpen(true)}>
                  Direct Bestellen
                </Button>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Facturatie ERP</h3>
                    <p className="text-sm text-gray-500">Dashboard Overview</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Omzet</p>
                    <p className="text-2xl font-bold text-emerald-600">SRD 125K</p>
                    <p className="text-xs text-emerald-500 mt-1">+12% deze maand</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Klanten</p>
                    <p className="text-2xl font-bold text-blue-600">248</p>
                    <p className="text-xs text-blue-500 mt-1">+8 deze week</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Projecten</p>
                    <p className="text-2xl font-bold text-purple-600">32</p>
                    <p className="text-xs text-purple-500 mt-1">4 actief</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Facturen</p>
                    <p className="text-2xl font-bold text-orange-600">156</p>
                    <p className="text-xs text-orange-500 mt-1">98% betaald</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 mb-8">
            Onze beste partners en meer dan <strong className="text-gray-700">500+ klanten</strong> in Suriname zijn tevreden over onze diensten
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {partners.map((partner, i) => (
              <div key={i} className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="h-10 w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section - From Database */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Onze Modules
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Kies de modules die het beste bij uw bedrijf passen
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addons.map((addon) => {
              const Icon = getModuleIcon(addon.slug);
              return (
                <Card key={addon.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Icon className="w-16 h-16 text-white/80" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{addon.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{addon.description || 'Beheer module voor uw bedrijf'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-emerald-600">{formatCurrency(addon.price)}<span className="text-sm text-gray-500 font-normal">/mnd</span></span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedAddons([addon.id]);
                        setOrderDialogOpen(true);
                      }}>
                        Bestellen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate('/prijzen')} className="bg-emerald-500 hover:bg-emerald-600">
              Bekijk alle prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Verhuur, Beauty, Auto & Hotel – compleet beheer in één platform
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Beheer moeiteloos jouw verhuuractiviteiten, beauty spa afspraken, autodealer processen en hotel- en kamerreserveringen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((industry, index) => (
              <IndustryCard key={index} {...industry} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-500 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Facturatie.sr – uw administratie eenvoudig geregeld
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Beheer facturering, boekhouding en voorraad in één systeem. Bespaar tijd, verhoog efficiëntie en voldoe moeiteloos aan fiscale verplichtingen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" onClick={() => navigate('/prijzen')}>
              Bekijk Prijzen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white text-white hover:bg-white/10" onClick={() => setOrderDialogOpen(true)}>
              Direct Bestellen
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt="Facturatie N.V."
                className="h-8 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-gray-400 max-w-md">
                Facturatie.sr is hét Surinaamse platform voor digitale facturatie en bedrijfsadministratie. Speciaal ontwikkeld voor Surinaamse bedrijven.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/prijzen" className="text-gray-400 hover:text-white transition-colors">Prijzen</Link></li>
                <li><Link to="/over-ons" className="text-gray-400 hover:text-white transition-colors">Over Ons</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Aanmelden</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li><Link to="/voorwaarden" className="text-gray-400 hover:text-white transition-colors">Algemene Voorwaarden</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacybeleid</Link></li>
              </ul>
              <div className="mt-6">
                <h4 className="font-semibold text-white mb-2">Contact</h4>
                <p className="text-gray-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> +597 893-4982
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-gray-500">
            <p>© {new Date().getFullYear()} Facturatie N.V. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>

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
              <Label>Wachtwoord * (voor uw account)</Label>
              <Input 
                type="password"
                required
                minLength={6}
                value={orderForm.password}
                onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                placeholder="Minimaal 6 tekens"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Selecteer Module(s) *</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {addons.map((addon) => (
                  <div 
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddons.includes(addon.id) 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-300'
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
                          <p className="text-xs text-gray-500">{addon.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-emerald-600 font-semibold whitespace-nowrap">{formatCurrency(addon.price)}/mnd</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedAddons.length > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Totaal per maand:</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(getTotalPrice())}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting || selectedAddons.length === 0} className="bg-emerald-500 hover:bg-emerald-600">
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
    </div>
  );
}
