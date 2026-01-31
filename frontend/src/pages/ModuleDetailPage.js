import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Clock,
  UserCheck,
  FileText,
  Calendar,
  DollarSign,
  Home,
  Wrench,
  Receipt,
  BarChart3,
  Settings,
  Zap,
  Bot,
  Languages,
  Layout,
  Image,
  Search,
  Palette,
  Lock,
  Database,
  RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Detailed module information with feature sections
const MODULES_DETAIL = {
  'hrm': {
    id: 'hrm',
    name: 'HRM Module',
    title: 'Human Resource Management',
    subtitle: 'Beheer uw personeel efficiënt en professioneel',
    description: 'De HRM module biedt een complete oplossing voor personeelsbeheer, van werving tot salarisadministratie. Geoptimaliseerd voor de Surinaamse markt met lokale wet- en regelgeving.',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    category: 'Personeel',
    price: 'SRD 2.500',
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80',
    sections: [
      {
        title: 'Personeelsbeheer',
        description: 'Houd alle werknemergegevens op één centrale plek bij.',
        icon: UserCheck,
        features: [
          'Volledige werknemerprofielen met foto',
          'Contactgegevens en noodcontacten',
          'Bankgegevens voor salarisuitbetaling',
          'Documenten per werknemer opslaan',
          'Werkhistorie en notities'
        ],
        image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80'
      },
      {
        title: 'Verlofbeheer',
        description: 'Automatische verlofaanvragen en goedkeuringsworkflow.',
        icon: Calendar,
        features: [
          'Online verlofaanvragen indienen',
          'Automatische notificaties naar managers',
          'Verlofsaldo automatisch bijgewerkt',
          'Verschillende verloftypes ondersteunen',
          'Jaaroverzicht per werknemer'
        ],
        image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'
      },
      {
        title: 'Aanwezigheid',
        description: 'Track werktijden met digitaal in- en uitklokken.',
        icon: Clock,
        features: [
          'Digitaal in- en uitklokken',
          'Automatische urenberekening',
          'Overwerk tracking',
          'Maandelijkse aanwezigheidsrapporten',
          'Integratie met salarisbeheer'
        ],
        image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80'
      },
      {
        title: 'Salarisbeheer',
        description: 'Complete salarisadministratie met loonstrookgeneratie.',
        icon: DollarSign,
        features: [
          'Maandelijkse loonberekening',
          'Automatische loonstrookgeneratie (PDF)',
          'Toeslagen en inhoudingen beheren',
          'Bulksalarissen verwerken',
          'Salarishistorie per werknemer'
        ],
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80'
      },
      {
        title: 'Werving & Selectie',
        description: 'Beheer vacatures en sollicitaties professioneel.',
        icon: FileText,
        features: [
          'Vacatures aanmaken en publiceren',
          'Online sollicitatieformulieren',
          'Sollicitatiestatus tracking',
          'CV en documenten opslaan',
          'Automatische afwijzingsmails'
        ],
        image: 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=800&q=80'
      }
    ]
  },
  'vastgoed-beheer': {
    id: 'vastgoed',
    name: 'Vastgoed Beheer',
    title: 'Vastgoed Management Systeem',
    subtitle: 'De complete oplossing voor vastgoedbeheerders',
    description: 'Beheer uw huurwoningen, appartementen en commercieel vastgoed met gemak. Geïntegreerde facturatie, meterstanden en huurdersbeheer speciaal voor Suriname.',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500',
    category: 'Vastgoed',
    price: 'SRD 3.000',
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    sections: [
      {
        title: 'Huurdersbeheer',
        description: 'Alle informatie over uw huurders op één plek.',
        icon: Users,
        features: [
          'Volledige huurdersprofielen',
          'Huurcontracten digitaal opslaan',
          'Betalingshistorie per huurder',
          'Communicatielogboek',
          'Automatische herinneringen'
        ],
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'
      },
      {
        title: 'Appartementenbeheer',
        description: 'Beheer al uw panden en appartementen overzichtelijk.',
        icon: Home,
        features: [
          'Onbeperkt aantal panden toevoegen',
          'Huurprijs en voorwaarden per eenheid',
          'Bezettingsgraad dashboard',
          'Foto\'s en documentatie',
          'Meerdere locaties ondersteuning'
        ],
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
      },
      {
        title: 'Meterstanden (EBS/SWM)',
        description: 'Automatische berekening van nutsvoorzieningen met Surinaamse tarieven.',
        icon: Zap,
        features: [
          'EBS (elektra) meterstanden registreren',
          'SWM (water) meterstanden registreren',
          'Automatische kostenberekening',
          'Surinaamse tarieven 2024 ingebouwd',
          'Huurder self-service portaal'
        ],
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
      },
      {
        title: 'Facturatie',
        description: 'Professionele facturen automatisch genereren.',
        icon: Receipt,
        features: [
          'Maandelijkse facturen automatisch',
          'PDF facturen met uw logo',
          'Betalingsherinneringen',
          'Openstaande saldi overzicht',
          'Kwitanties genereren'
        ],
        image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&q=80'
      },
      {
        title: 'Onderhoud',
        description: 'Track en beheer onderhoudsverzoeken efficiënt.',
        icon: Wrench,
        features: [
          'Onderhoudsverzoeken registreren',
          'Status tracking (open, in behandeling, afgerond)',
          'Kosten per onderhoud bijhouden',
          'Foto\'s toevoegen',
          'Geschiedenis per pand'
        ],
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'
      }
    ]
  },
  'auto-dealer': {
    id: 'autodealer',
    name: 'Auto Dealer Module',
    title: 'Autohandel Management',
    subtitle: 'Complete oplossing voor autodealers in Suriname',
    description: 'Beheer uw voertuigeninventaris, klanten en verkopen met multi-valuta ondersteuning. Inclusief klantportaal waar klanten hun aankopen kunnen bekijken.',
    icon: Car,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500',
    category: 'Verkoop',
    price: 'SRD 2.000',
    priceNote: 'per maand',
    isNew: true,
    heroImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=80',
    sections: [
      {
        title: 'Voertuigenbeheer',
        description: 'Complete inventaris van al uw voertuigen.',
        icon: Car,
        features: [
          'Alle voertuiggegevens registreren',
          'Foto\'s uploaden per voertuig',
          'Inkoop- en verkoopprijzen',
          'Status tracking (in stock, verkocht, gereserveerd)',
          'Kilometerstand en conditie'
        ],
        image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'
      },
      {
        title: 'Multi-Valuta',
        description: 'Werk met SRD, EUR en USD tegelijkertijd.',
        icon: DollarSign,
        features: [
          'Prijzen in SRD, EUR of USD',
          'Automatische valuta weergave',
          'Omzet per valuta rapportage',
          'Flexibele betalingsopties',
          'Valuta selector in dashboard'
        ],
        image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=80'
      },
      {
        title: 'Klantenbeheer',
        description: 'Houd uw klantrelaties professioneel bij.',
        icon: Users,
        features: [
          'Particuliere en zakelijke klanten',
          'Contactgegevens en voorkeuren',
          'Aankoophistorie per klant',
          'Notities en communicatielog',
          'Klant self-service portaal'
        ],
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
      },
      {
        title: 'Verkoopbeheer',
        description: 'Registreer en track al uw verkopen.',
        icon: BarChart3,
        features: [
          'Verkoop registratie met alle details',
          'Betalingsstatus tracking',
          'Aanbetaling en financiering opties',
          'Verkoopstatistieken dashboard',
          'Maandelijkse omzetrapportage'
        ],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
      },
      {
        title: 'Klant Portaal',
        description: 'Klanten kunnen hun aankopen online bekijken.',
        icon: Globe,
        features: [
          'Klanten registreren zichzelf',
          'Aankoophistorie bekijken',
          'Voertuigdetails inzien',
          'Ondersteuningsverzoeken indienen',
          'Documenten downloaden'
        ],
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
      }
    ]
  },
  'ai-chatbot': {
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    title: 'Intelligente AI Assistent',
    subtitle: 'Powered by GPT-4 technologie',
    description: 'Een slimme chatbot die uw klanten en medewerkers helpt met veelgestelde vragen. Geïntegreerd met alle modules voor relevante antwoorden.',
    icon: MessageSquare,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    category: 'AI',
    price: 'SRD 1.500',
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    sections: [
      {
        title: 'AI-Powered Antwoorden',
        description: 'Slimme antwoorden op basis van uw bedrijfsgegevens.',
        icon: Bot,
        features: [
          'GPT-4 technologie',
          'Contextbewuste antwoorden',
          'Leert van uw data',
          'Natuurlijke gesprekken',
          'Meerdere talen ondersteuning'
        ],
        image: 'https://images.unsplash.com/photo-1676299081847-824916de030a?w=800&q=80'
      },
      {
        title: 'Module Integratie',
        description: 'Direct toegang tot informatie uit alle modules.',
        icon: Zap,
        features: [
          'Huurdersgegevens opvragen',
          'Saldi en betalingen bekijken',
          'Voertuig informatie zoeken',
          'Personeelsgegevens raadplegen',
          'Realtime data'
        ],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
      },
      {
        title: 'Meertalig',
        description: 'Communiceer in meerdere talen.',
        icon: Languages,
        features: [
          'Nederlands volledig ondersteund',
          'Engels beschikbaar',
          'Sranang Tongo (basis)',
          'Automatische taaldetectie',
          'Consistente antwoorden'
        ],
        image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80'
      },
      {
        title: 'Website Widget',
        description: 'Plaats de chatbot op uw publieke website.',
        icon: Globe,
        features: [
          'Eenvoudig te integreren',
          'Aanpasbaar design',
          'Bezoekers helpen 24/7',
          'Lead generation',
          'Gesprek overdragen naar medewerker'
        ],
        image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&q=80'
      }
    ]
  },
  'website-cms': {
    id: 'cms',
    name: 'Website CMS',
    title: 'Content Management Systeem',
    subtitle: 'Bouw en beheer uw website zonder programmeerkennis',
    description: 'Een intuïtief CMS waarmee u uw bedrijfswebsite kunt bouwen en beheren. Inclusief templates, SEO tools en responsive design.',
    icon: Globe,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500',
    category: 'Marketing',
    price: 'SRD 1.000',
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&q=80',
    sections: [
      {
        title: 'Pagina Builder',
        description: 'Maak pagina\'s met drag & drop.',
        icon: Layout,
        features: [
          'Visuele editor',
          'Voorgedefinieerde secties',
          'Tekst, afbeeldingen, video\'s',
          'Responsive preview',
          'One-click publiceren'
        ],
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'
      },
      {
        title: 'Media Beheer',
        description: 'Upload en beheer al uw afbeeldingen.',
        icon: Image,
        features: [
          'Afbeeldingen uploaden',
          'Automatische optimalisatie',
          'Mediabibliotheek',
          'Alt-teksten voor SEO',
          'Meerdere formaten'
        ],
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'
      },
      {
        title: 'SEO Tools',
        description: 'Optimaliseer voor zoekmachines.',
        icon: Search,
        features: [
          'Meta titels en beschrijvingen',
          'URL structuur aanpassen',
          'Sitemap generatie',
          'Social media previews',
          'Analytics integratie'
        ],
        image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80'
      },
      {
        title: 'Thema & Design',
        description: 'Pas het uiterlijk aan uw merk aan.',
        icon: Palette,
        features: [
          'Kleuren aanpassen',
          'Logo uploaden',
          'Lettertypen kiezen',
          'Header en footer beheer',
          'Eigen CSS mogelijk'
        ],
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80'
      }
    ]
  },
  'multi-tenant': {
    id: 'workspace',
    name: 'Multi-Tenant Workspace',
    title: 'Eigen Workspace Platform',
    subtitle: 'Volledige controle over uw bedrijfsomgeving',
    description: 'Krijg uw eigen afgeschermde workspace met custom branding, eigen domein en gebruikersbeheer. Perfect voor bedrijven die hun eigen identiteit willen behouden.',
    icon: Shield,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500',
    category: 'Platform',
    price: 'Inclusief',
    priceNote: 'bij abonnement',
    heroImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    sections: [
      {
        title: 'Eigen Domein',
        description: 'Uw bedrijf, uw domein.',
        icon: Globe,
        features: [
          'Gratis subdomain (bedrijf.facturatie.sr)',
          'Custom domain ondersteuning',
          'SSL certificaat inclusief',
          'DNS configuratie hulp',
          'Automatische SSL vernieuwing'
        ],
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80'
      },
      {
        title: 'Custom Branding',
        description: 'Pas het platform aan uw huisstijl aan.',
        icon: Palette,
        features: [
          'Eigen logo uploaden',
          'Primaire kleuren aanpassen',
          'Favicon personaliseren',
          'Portaal naam wijzigen',
          'Email templates aanpassen'
        ],
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80'
      },
      {
        title: 'Gebruikersbeheer',
        description: 'Beheer wie toegang heeft tot wat.',
        icon: Users,
        features: [
          'Onbeperkt gebruikers toevoegen',
          'Rollen en rechten toewijzen',
          'Uitnodigingen per email',
          'Activiteitenlog',
          'Tweefactorauthenticatie'
        ],
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80'
      },
      {
        title: 'Data Beveiliging',
        description: 'Uw data is veilig en afgeschermd.',
        icon: Lock,
        features: [
          'Volledige data isolatie',
          'Encryptie in transit en rust',
          'Dagelijkse automatische backups',
          'GDPR compliant',
          'Audit logging'
        ],
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80'
      },
      {
        title: 'Backup & Restore',
        description: 'Altijd een veilige kopie van uw data.',
        icon: Database,
        features: [
          'Handmatige backups maken',
          'Automatische dagelijkse backups',
          'One-click restore',
          'Backup downloaden als JSON',
          '30 dagen historie'
        ],
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80'
      }
    ]
  }
};

export default function ModuleDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const module = MODULES_DETAIL[slug];

  useEffect(() => {
    loadData();
    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, [slug]);

  const loadData = async () => {
    try {
      const settingsRes = await api.get('/public/landing/settings').catch(() => ({ data: {} }));
      setSettings(settingsRes.data || {});
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

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Module niet gevonden</h1>
          <Button onClick={() => navigate('/modules-overzicht')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Modules
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = module.icon;

  return (
    <div className="min-h-screen bg-white">
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
              <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">Home</Link>
              <Link to="/modules-overzicht" className="text-sm text-slate-600 hover:text-slate-900">Modules</Link>
              <Link to="/modules" className="text-sm text-slate-600 hover:text-slate-900">Prijzen</Link>
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
              <Link to="/" className="block py-2">Home</Link>
              <Link to="/modules-overzicht" className="block py-2">Modules</Link>
              <Link to="/modules" className="block py-2">Prijzen</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full" onClick={() => navigate('/register')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={module.heroImage} 
            alt={module.name}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${module.color} opacity-90`} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <Button 
            variant="ghost" 
            className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
            onClick={() => navigate('/modules-overzicht')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Alle Modules
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-white/20 text-white border-0">
              {module.category}
            </Badge>
            {module.isNew && (
              <Badge className="bg-amber-400 text-amber-900 border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Nieuw
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">{module.title}</h1>
              <p className="text-xl text-white/80 mt-2">{module.subtitle}</p>
            </div>
          </div>

          <p className="text-lg text-white/90 max-w-2xl mb-8">
            {module.description}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <span className="text-4xl font-bold text-white">{module.price}</span>
              <span className="text-white/70 ml-2">{module.priceNote}</span>
            </div>
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              Start Gratis Proefperiode
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Sections */}
      {module.sections.map((section, index) => {
        const SectionIcon = section.icon;
        const isReversed = index % 2 === 1;

        return (
          <section 
            key={index} 
            className={`py-20 px-4 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
            data-testid={`section-${index}`}
          >
            <div className="max-w-7xl mx-auto">
              <div className={`grid md:grid-cols-2 gap-12 items-center ${isReversed ? 'md:flex-row-reverse' : ''}`}>
                {/* Content */}
                <div className={isReversed ? 'md:order-2' : ''}>
                  <div className={`w-14 h-14 rounded-2xl ${module.bgColor}/10 flex items-center justify-center mb-6`}>
                    <SectionIcon className={`w-7 h-7 ${module.bgColor.replace('bg-', 'text-')}`} />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">{section.title}</h2>
                  <p className="text-lg text-slate-600 mb-6">{section.description}</p>
                  
                  <ul className="space-y-3">
                    {section.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${module.bgColor}/20 flex items-center justify-center mt-0.5 flex-shrink-0`}>
                          <Check className={`w-3 h-3 ${module.bgColor.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Image */}
                <div className={isReversed ? 'md:order-1' : ''}>
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src={section.image} 
                      alt={section.title}
                      className="w-full h-80 object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${module.color} opacity-10`} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA Section */}
      <section className={`py-20 px-4 bg-gradient-to-br ${module.color} text-white`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Klaar om {module.name} te gebruiken?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Start vandaag nog met een gratis proefperiode van 3 dagen. Geen creditcard nodig.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              Start Gratis Proefperiode
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/modules-overzicht')}
              className="border-white text-white hover:bg-white/10"
            >
              Bekijk Andere Modules
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">
            © {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
