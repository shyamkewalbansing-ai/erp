import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Loader2, 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  FileText,
  Shield,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module data with detailed information
const MODULES_DATA = [
  {
    id: 'hrm',
    slug: 'hrm',
    name: 'HRM Module',
    shortDescription: 'Complete Human Resource Management voor uw bedrijf',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    category: 'Personeel',
    popular: true,
    features: [
      'Personeelsbeheer met alle werknemergegevens',
      'Verlofaanvragen en goedkeuringsworkflow',
      'Aanwezigheidsregistratie met in/uitklokken',
      'Salarisbeheer en loonstrookgeneratie',
      'Contractbeheer met verloopmeldingen',
      'Wervings- en sollicitatiebeheer',
      'Documentenbeheer per werknemer',
      'Afdelingenbeheer',
      'Employee Self-Service Portal'
    ]
  },
  {
    id: 'vastgoed',
    slug: 'vastgoed-beheer',
    name: 'Vastgoed Beheer',
    shortDescription: 'Beheer uw huurwoningen en appartementen efficiënt',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    category: 'Vastgoed',
    popular: true,
    features: [
      'Huurders- en appartementenbeheer',
      'Automatische huurinning en facturatie',
      'Meterstanden beheer (EBS/SWM)',
      'Borg- en leningen administratie',
      'Onderhoudsverzoeken tracking',
      'Contractbeheer met sjablonen',
      'Huurders Self-Service Portal',
      'Kassabeheer voor contante betalingen',
      'PDF facturen en kwitanties'
    ]
  },
  {
    id: 'autodealer',
    slug: 'auto-dealer',
    name: 'Auto Dealer',
    shortDescription: 'Voertuigbeheer en verkoop voor autodealers',
    icon: Car,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    category: 'Verkoop',
    popular: false,
    isNew: true,
    features: [
      'Voertuigeninventaris beheer',
      'Multi-valuta ondersteuning (SRD, EUR, USD)',
      'Klantenbeheer (particulier & zakelijk)',
      'Verkoopregistratie en tracking',
      'Klant Self-Service Portal',
      'Aankoopgeschiedenis per klant',
      'Voertuigstatus tracking',
      'Dashboard met verkoop statistieken'
    ]
  },
  {
    id: 'ai-chatbot',
    slug: 'ai-chatbot',
    name: 'AI Chatbot',
    shortDescription: 'Intelligente assistent powered by GPT',
    icon: MessageSquare,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    category: 'AI',
    popular: false,
    features: [
      'AI-powered klantenservice',
      'Automatische antwoorden op veelgestelde vragen',
      'Integratie met alle modules',
      'Meertalige ondersteuning',
      'Chat geschiedenis per sessie',
      'Slimme suggesties',
      'Publieke chat widget voor website',
      '24/7 beschikbaarheid'
    ]
  },
  {
    id: 'cms',
    slug: 'website-cms',
    name: 'Website CMS',
    shortDescription: 'Beheer uw publieke website met gemak',
    icon: Globe,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    category: 'Marketing',
    popular: false,
    features: [
      'Drag & drop pagina builder',
      'Menu en navigatie beheer',
      'Footer aanpassing',
      'Afbeeldingen uploaden',
      'SEO optimalisatie',
      'Template systeem',
      'Live preview',
      'Responsive design'
    ]
  },
  {
    id: 'workspace',
    slug: 'multi-tenant',
    name: 'Multi-Tenant Workspace',
    shortDescription: 'Eigen workspace met branding en gebruikersbeheer',
    icon: Shield,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500/10',
    iconColor: 'text-slate-500',
    category: 'Platform',
    popular: false,
    features: [
      'Eigen subdomain (bedrijf.facturatie.sr)',
      'Custom domain ondersteuning',
      'Eigen branding (logo, kleuren)',
      'Gebruikersbeheer per workspace',
      'Data isolatie per klant',
      'Backup & restore functionaliteit',
      'SSL beveiliging',
      'Rollenbeheer'
    ]
  }
];

export default function ModulesOverviewPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, menuRes] = await Promise.all([
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/cms/menu').catch(() => ({ data: { items: [] } }))
      ]);
      
      setSettings(settingsRes.data || {});
      setMenuItems(menuRes.data?.items?.filter(item => item.is_visible) || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Home</Link>
              {menuItems.filter(item => item.link !== '/').map((item, index) => (
                <Link 
                  key={index}
                  to={item.link}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/modules-overzicht" className="text-sm text-primary font-semibold">Modules</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>Inloggen</Button>
              <Button onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90">
                Gratis Starten
              </Button>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b">
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              {menuItems.filter(item => item.link !== '/').map((item, index) => (
                <Link key={index} to={item.link} className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link to="/modules-overzicht" className="block py-2 text-primary font-semibold" onClick={() => setMobileMenuOpen(false)}>Modules</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full" onClick={() => navigate('/register')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Modulair & Flexibel
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Krachtige Modules voor <br />
            <span className="text-primary">Elk Bedrijf</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Kies alleen de modules die u nodig heeft. Van personeelsbeheer tot vastgoedbeheer, 
            wij hebben de perfecte oplossing voor uw onderneming.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90">
              Start Gratis Proefperiode
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/modules')}>
              Bekijk Prijzen
            </Button>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES_DATA.map((module) => {
              const IconComponent = module.icon;
              return (
                <Card 
                  key={module.id}
                  className="group relative overflow-hidden border-slate-200 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                  data-testid={`module-card-${module.id}`}
                >
                  <CardContent className="p-6">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      {module.popular && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-0">
                          Populair
                        </Badge>
                      )}
                      {module.isNew && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                          Nieuw
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-slate-500 border-slate-300">
                        {module.category}
                      </Badge>
                    </div>

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${module.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`w-7 h-7 ${module.iconColor}`} />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
                    <p className="text-slate-600 mb-4">{module.shortDescription}</p>

                    {/* Features Preview */}
                    <ul className="space-y-2 mb-6">
                      {module.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {module.features.length > 3 && (
                        <li className="text-sm text-primary font-medium">
                          +{module.features.length - 3} meer functies
                        </li>
                      )}
                    </ul>

                    {/* CTA */}
                    <Link to={`/modules/${module.slug}`}>
                      <Button 
                        className="w-full group-hover:bg-primary group-hover:text-white transition-colors"
                        variant="outline"
                        data-testid={`module-btn-${module.id}`}
                      >
                        Meer Informatie
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>

                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`} />
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Waarom Kiezen voor Ons Platform?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Onze modulaire aanpak geeft u de flexibiliteit om te groeien op uw eigen tempo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Betaal Wat U Gebruikt</h3>
              <p className="text-slate-600">
                Geen verplichte pakketten. Kies alleen de modules die u echt nodig heeft.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Veilig & Betrouwbaar</h3>
              <p className="text-slate-600">
                Uw data is veilig met SSL encryptie en dagelijkse backups.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Lokaal Aangepast</h3>
              <p className="text-slate-600">
                Speciaal ontwikkeld voor de Surinaamse markt met lokale tarieven en valuta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Klaar om te Beginnen?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Start vandaag nog met een gratis proefperiode van 3 dagen. Geen creditcard nodig.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-primary hover:bg-white/90"
            >
              Start Gratis Proefperiode
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/modules')}
              className="border-white text-white hover:bg-white/10"
            >
              Bekijk Alle Prijzen
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-slate-400 text-sm">
                De complete ERP-oplossing voor Surinaamse ondernemingen.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Modules</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {MODULES_DATA.slice(0, 4).map(module => (
                  <li key={module.id}>
                    <Link to={`/modules/${module.slug}`} className="hover:text-white transition-colors">
                      {module.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/modules" className="hover:text-white transition-colors">Prijzen</Link></li>
                <li><Link to="/over-ons" className="hover:text-white transition-colors">Over Ons</Link></li>
                <li><Link to="/voorwaarden" className="hover:text-white transition-colors">Voorwaarden</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>info@facturatie.sr</li>
                <li>+597 123 4567</li>
                <li>Paramaribo, Suriname</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
