import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLandingSections, getLandingSettings, getPublicAddons, formatCurrency } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Package, 
  Headphones,
  Loader2,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  FileText,
  Lock,
  Users,
  Building2,
  Mail,
  Phone
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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setSections(sectionsRes.data);
      setSettings(settingsRes.data);
      setAddons(addonsRes.data);
    } catch (error) {
      console.error('Error loading landing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSection = (type) => sections.find(s => s.section_type === type);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const heroSection = getSection('hero');
  const featuresSection = getSection('features');

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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/prijzen" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prijzen</Link>
              <Link to="/over-ons" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Over Ons</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
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
              <Link to="/prijzen" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Prijzen</Link>
              <Link to="/over-ons" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Over Ons</Link>
              <Link to="/contact" className="block text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
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
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => navigate('/prijzen')}>
                    Bekijk Prijzen
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
        <section className="py-16 md:py-24 bg-muted/30">
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

      {/* Modules Preview Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Onze Modules
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Kies de modules die passen bij uw bedrijf
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {addons.slice(0, 3).map((addon) => (
              <Card key={addon.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{addon.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{addon.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-foreground">{formatCurrency(addon.price)}</span>
                    <span className="text-muted-foreground">/maand</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => navigate('/prijzen')}>
              Bekijk Alle Modules & Prijzen
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start vandaag nog met het stroomlijnen van uw bedrijfsprocessen. Geen verplichtingen, geen verborgen kosten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-lg" onClick={() => navigate('/register')}>
              Gratis Account Aanmaken
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => navigate('/contact')}>
              Neem Contact Op
            </Button>
          </div>
        </div>
      </section>

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
              {settings?.company_phone && (
                <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${settings.company_phone}`} className="hover:text-foreground">{settings.company_phone}</a>
                </div>
              )}
              {settings?.company_email && (
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${settings.company_email}`} className="hover:text-foreground">{settings.company_email}</a>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Pagina's</h4>
              <ul className="space-y-2">
                <li><Link to="/prijzen" className="text-muted-foreground hover:text-foreground">Prijzen</Link></li>
                <li><Link to="/over-ons" className="text-muted-foreground hover:text-foreground">Over Ons</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/voorwaarden" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Algemene Voorwaarden
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Privacybeleid
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
