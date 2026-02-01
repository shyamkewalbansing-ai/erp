import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { 
  Search,
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  ArrowRight,
  Check,
  HelpCircle,
  BookOpen,
  PlayCircle,
  FileText,
  Settings,
  Shield,
  Zap,
  Clock,
  CreditCard,
  Mail,
  Phone,
  ChevronRight,
  Sparkles,
  Star,
  Layout,
  Database,
  Users2,
  Calendar,
  Receipt,
  Home,
  Key,
  Wrench,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Lock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  ListFilter
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module data with detailed FAQ information
const MODULE_FAQ_DATA = {
  hrm: {
    name: 'HRM Module',
    icon: Users,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Complete Human Resource Management voor uw bedrijf',
    image: 'https://static.prod-images.emergentagent.com/jobs/3ec109f1-77d7-4f24-a83d-1791605b2728/images/fc3a6f7a9ded44ab9a2fee6d6e23c9bba1f549b78f124edd0f36b657e15319fb.png',
    features: [
      {
        title: 'Personeelsbeheer',
        icon: Users2,
        description: 'Beheer alle werknemergegevens op één centrale plek.',
        details: [
          'Persoonlijke gegevens en contactinformatie',
          'Contracten en arbeidsvoorwaarden',
          'Functie- en afdelingsindeling',
          'Document uploads (ID, diploma\'s, etc.)'
        ]
      },
      {
        title: 'Verlofbeheer',
        icon: Calendar,
        description: 'Digitaal verlof aanvragen en goedkeuren.',
        details: [
          'Werknemers kunnen verlof aanvragen via het portaal',
          'Managers ontvangen notificaties voor goedkeuring',
          'Automatische verlofregistratie',
          'Overzicht van verloftegoed'
        ]
      },
      {
        title: 'Aanwezigheid',
        icon: Clock,
        description: 'Registreer werktijden en aanwezigheid.',
        details: [
          'In- en uitklokken via het portaal',
          'Urenregistratie per dag/week/maand',
          'Overwerk tracking',
          'Rapporten voor loonadministratie'
        ]
      },
      {
        title: 'Employee Self-Service',
        icon: Layout,
        description: 'Werknemers hebben toegang tot hun eigen portaal.',
        details: [
          'Eigen gegevens inzien en bijwerken',
          'Loonstroken downloaden',
          'Verlofaanvragen indienen',
          'Werktijden registreren'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe voeg ik een nieuwe werknemer toe?',
        answer: 'Ga naar HRM > Medewerkers en klik op "Nieuwe Medewerker". Vul de verplichte velden in zoals naam, e-mail, functie en afdeling. De werknemer ontvangt automatisch een uitnodiging per e-mail.'
      },
      {
        question: 'Hoe werkt het verlofaanvraag systeem?',
        answer: 'Werknemers kunnen via hun Employee Portal verlof aanvragen. De aanvraag komt binnen bij de manager die deze kan goedkeuren of afwijzen. Bij goedkeuring wordt het verlof automatisch van het tegoed afgetrokken.'
      },
      {
        question: 'Kan ik rapporten exporteren?',
        answer: 'Ja, alle HRM data kan worden geëxporteerd naar Excel of PDF. Ga naar Rapportage en selecteer het gewenste rapport. Klik op de export knop om te downloaden.'
      },
      {
        question: 'Hoe stel ik verloftypes in?',
        answer: 'Ga naar Instellingen > HRM Instellingen. Hier kunt u verschillende verloftypes aanmaken zoals vakantie, ziekte, ouderschapsverlof, etc. met bijbehorende regels.'
      }
    ]
  },
  vastgoed: {
    name: 'Vastgoed Beheer',
    icon: Building2,
    color: 'teal',
    gradient: 'from-teal-500 to-emerald-600',
    description: 'Professioneel vastgoedbeheer voor verhuurders',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    features: [
      {
        title: 'Pandenbeheer',
        icon: Home,
        description: 'Beheer al uw panden en units.',
        details: [
          'Registratie van panden met adres en details',
          'Onderverdeling in units/appartementen',
          'Foto\'s en documentatie per pand',
          'Onderhoudsstatus bijhouden'
        ]
      },
      {
        title: 'Huurdersbeheer',
        icon: Key,
        description: 'Alle huurderinformatie op één plek.',
        details: [
          'Huurdergegevens en contactinfo',
          'Huurcontracten met start/einddatum',
          'Borgstorting registratie',
          'Communicatiegeschiedenis'
        ]
      },
      {
        title: 'Automatische Facturatie',
        icon: Receipt,
        description: 'Huur wordt automatisch gefactureerd.',
        details: [
          'Maandelijkse huurrekeningen',
          'Automatische herinneringen bij achterstallige betaling',
          'Verschillende betaalmethodes',
          'Factuuroverzichten per huurder'
        ]
      },
      {
        title: 'Huurders Portaal',
        icon: Layout,
        description: 'Huurders hebben toegang tot hun eigen portaal.',
        details: [
          'Facturen inzien en downloaden',
          'Onderhoudsmeldingen indienen',
          'Betalingsgeschiedenis bekijken',
          'Contactgegevens bijwerken'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe voeg ik een nieuw pand toe?',
        answer: 'Ga naar Vastgoed > Panden en klik op "Nieuw Pand". Vul het adres, type en andere details in. Daarna kunt u units toevoegen aan het pand.'
      },
      {
        question: 'Hoe koppel ik een huurder aan een unit?',
        answer: 'Ga naar de betreffende unit en klik op "Huurder Toewijzen". Selecteer een bestaande huurder of maak een nieuwe aan. Vul de contractgegevens in en de huurder ontvangt toegang tot het portaal.'
      },
      {
        question: 'Hoe werkt de automatische facturatie?',
        answer: 'Bij het aanmaken van een huurcontract stelt u de huurprijs en facturatiedatum in. Het systeem genereert automatisch elke maand een factuur en stuurt deze naar de huurder.'
      },
      {
        question: 'Kunnen huurders zelf onderhoudsmeldingen doen?',
        answer: 'Ja, via het Huurders Portaal kunnen huurders onderhoudsmeldingen indienen met foto\'s. U ontvangt een notificatie en kunt de melding opvolgen in het systeem.'
      }
    ]
  },
  autodealer: {
    name: 'Auto Dealer',
    icon: Car,
    color: 'green',
    gradient: 'from-emerald-600 to-green-500',
    description: 'Complete autohandel management',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
    features: [
      {
        title: 'Voertuigvoorraad',
        icon: Car,
        description: 'Beheer uw complete wagenpark.',
        details: [
          'Alle voertuiggegevens (merk, model, jaar, etc.)',
          'Foto\'s en specificaties',
          'Inkoop- en verkoopprijs',
          'Status: beschikbaar, verkocht, in onderhoud'
        ]
      },
      {
        title: 'Verkoop & Aankoop',
        icon: TrendingUp,
        description: 'Registreer alle transacties.',
        details: [
          'Verkoopregistratie met klantgegevens',
          'Aankoopregistratie van leveranciers',
          'Facturen en betalingen',
          'Winst/verlies per voertuig'
        ]
      },
      {
        title: 'Multi-Valuta',
        icon: CreditCard,
        description: 'Werken met meerdere valuta\'s.',
        details: [
          'SRD, EUR en USD ondersteuning',
          'Automatische wisselkoersberekening',
          'Prijzen tonen in gewenste valuta',
          'Rapporten per valuta'
        ]
      },
      {
        title: 'Klanten Portaal',
        icon: Users,
        description: 'Klanten kunnen hun aankopen inzien.',
        details: [
          'Overzicht van gekochte voertuigen',
          'Facturen en betalingshistorie',
          'Voertuigdocumenten downloaden',
          'Service afspraken plannen'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe voeg ik een nieuw voertuig toe?',
        answer: 'Ga naar Auto Dealer > Voertuigen en klik op "Nieuw Voertuig". Vul alle gegevens in inclusief merk, model, bouwjaar, kilometerstand en prijzen. Upload foto\'s voor een compleet overzicht.'
      },
      {
        question: 'Hoe registreer ik een verkoop?',
        answer: 'Selecteer het voertuig en klik op "Verkopen". Selecteer of maak een klant aan, vul de verkoopprijs en betaalcondities in. De factuur wordt automatisch aangemaakt.'
      },
      {
        question: 'Hoe werkt de multi-valuta functie?',
        answer: 'Bij Instellingen > Auto Dealer kunt u wisselkoersen instellen voor EUR en USD. Bij het invoeren van prijzen kunt u de valuta kiezen en het systeem rekent automatisch om.'
      },
      {
        question: 'Kunnen klanten hun aankoophistorie inzien?',
        answer: 'Ja, klanten krijgen toegang tot het Klanten Portaal waar ze hun gekochte voertuigen, facturen en documenten kunnen inzien en downloaden.'
      }
    ]
  },
  chatbot: {
    name: 'AI Chatbot',
    icon: MessageSquare,
    color: 'cyan',
    gradient: 'from-teal-600 to-cyan-500',
    description: 'Intelligente klantenservice automatisering',
    image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&q=80',
    features: [
      {
        title: 'AI Conversaties',
        icon: MessageSquare,
        description: 'GPT-4 aangedreven gesprekken.',
        details: [
          'Natuurlijke taalverwerking',
          'Contextbewuste antwoorden',
          'Meertalige ondersteuning',
          'Lerende AI die verbetert over tijd'
        ]
      },
      {
        title: '24/7 Beschikbaar',
        icon: Clock,
        description: 'Altijd beschikbaar voor uw klanten.',
        details: [
          'Geen wachttijden',
          'Instant antwoorden',
          'Weekenden en feestdagen',
          'Escalatie naar menselijke support'
        ]
      },
      {
        title: 'Aanpasbaar',
        icon: Settings,
        description: 'Pas de chatbot aan uw bedrijf aan.',
        details: [
          'Eigen welkomstbericht',
          'Bedrijfsspecifieke kennis',
          'Aangepaste antwoorden',
          'Branding en kleuren'
        ]
      },
      {
        title: 'Integraties',
        icon: Zap,
        description: 'Werkt samen met andere modules.',
        details: [
          'Koppeling met CRM',
          'Afspraak maken via chat',
          'FAQ automatisch beantwoorden',
          'Leads automatisch registreren'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe stel ik de chatbot in?',
        answer: 'Ga naar Instellingen > AI Chatbot. Hier kunt u het welkomstbericht aanpassen, veelgestelde vragen toevoegen en de chatbot trainen met bedrijfsspecifieke informatie.'
      },
      {
        question: 'Kan de chatbot doorverbinden naar een medewerker?',
        answer: 'Ja, u kunt instellen bij welke vragen of na hoeveel berichten de chatbot moet escaleren naar een menselijke medewerker. De medewerker krijgt dan een notificatie.'
      },
      {
        question: 'In welke talen werkt de chatbot?',
        answer: 'De chatbot ondersteunt Nederlands, Engels, Spaans en Portugees. De taal wordt automatisch gedetecteerd op basis van het bericht van de klant.'
      },
      {
        question: 'Hoe verbeter ik de antwoorden van de chatbot?',
        answer: 'Bij Chatbot > Trainingsdata kunt u voorbeeldgesprekken toevoegen, antwoorden corrigeren en feedback geven. De AI leert hiervan en verbetert automatisch.'
      }
    ]
  },
  cms: {
    name: 'CMS & Website',
    icon: Globe,
    color: 'emerald',
    gradient: 'from-green-500 to-emerald-600',
    description: 'Beheer uw website content',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    features: [
      {
        title: 'Pagina Builder',
        icon: Layout,
        description: 'Drag & drop pagina\'s bouwen.',
        details: [
          'Visuele editor zonder code',
          'Voorgedefinieerde blokken',
          'Responsive design',
          'Live preview'
        ]
      },
      {
        title: 'Menu Beheer',
        icon: ListFilter,
        description: 'Navigatie eenvoudig aanpassen.',
        details: [
          'Drag & drop menu items',
          'Submenu\'s en dropdowns',
          'Header en footer menu\'s',
          'Mobile menu configuratie'
        ]
      },
      {
        title: 'SEO Tools',
        icon: TrendingUp,
        description: 'Optimaliseer voor zoekmachines.',
        details: [
          'Meta titels en beschrijvingen',
          'URL structuur',
          'Sitemap generatie',
          'Social media preview'
        ]
      },
      {
        title: 'Media Bibliotheek',
        icon: Upload,
        description: 'Beheer al uw afbeeldingen.',
        details: [
          'Afbeeldingen uploaden',
          'Automatische optimalisatie',
          'Organiseren in mappen',
          'Zoeken en filteren'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe maak ik een nieuwe pagina?',
        answer: 'Ga naar CMS > Pagina\'s en klik op "Nieuwe Pagina". Kies een template of begin vanaf nul. Gebruik de drag & drop editor om content toe te voegen.'
      },
      {
        question: 'Hoe pas ik het menu aan?',
        answer: 'Ga naar CMS > Menu\'s. Sleep menu items naar de gewenste positie. U kunt submenu\'s maken door items onder andere items te slepen.'
      },
      {
        question: 'Hoe optimaliseer ik mijn pagina voor Google?',
        answer: 'Bij elke pagina kunt u SEO instellingen vinden. Vul de meta titel, beschrijving en zoekwoorden in. Het systeem geeft tips voor verbetering.'
      },
      {
        question: 'Kan ik eigen HTML/CSS toevoegen?',
        answer: 'Ja, in de pagina editor kunt u een "Custom Code" blok toevoegen waar u eigen HTML, CSS of JavaScript kunt invoegen.'
      }
    ]
  },
  rapportage: {
    name: 'Rapportage & Analytics',
    icon: BarChart3,
    color: 'teal',
    gradient: 'from-cyan-500 to-teal-600',
    description: 'Inzichten in uw bedrijfsprestaties',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    features: [
      {
        title: 'Dashboards',
        icon: PieChart,
        description: 'Real-time overzichten.',
        details: [
          'Omzet en kosten grafieken',
          'KPI meters',
          'Trends en vergelijkingen',
          'Aanpasbare widgets'
        ]
      },
      {
        title: 'Rapporten',
        icon: FileSpreadsheet,
        description: 'Gedetailleerde rapportages.',
        details: [
          'Financiële overzichten',
          'Klant analyses',
          'Product prestaties',
          'Periodieke vergelijkingen'
        ]
      },
      {
        title: 'Export',
        icon: Download,
        description: 'Data exporteren.',
        details: [
          'PDF rapporten',
          'Excel spreadsheets',
          'CSV downloads',
          'Automatische e-mail rapportages'
        ]
      },
      {
        title: 'Automatisering',
        icon: RefreshCw,
        description: 'Geplande rapportages.',
        details: [
          'Dagelijkse/wekelijkse/maandelijkse rapporten',
          'Automatische e-mail verzending',
          'Aangepaste ontvangers',
          'Rapport templates'
        ]
      }
    ],
    faqs: [
      {
        question: 'Hoe maak ik een aangepast rapport?',
        answer: 'Ga naar Rapportage > Rapporten en klik op "Nieuw Rapport". Kies de gewenste gegevensbron, filters en visualisatie. Sla op om later opnieuw te gebruiken.'
      },
      {
        question: 'Kan ik automatische rapporten instellen?',
        answer: 'Ja, bij elk rapport kunt u een schema instellen. Kies de frequentie (dagelijks, wekelijks, maandelijks) en voeg e-mailadressen toe voor automatische verzending.'
      },
      {
        question: 'Welke data kan ik analyseren?',
        answer: 'Alle data uit uw modules is beschikbaar: facturen, klanten, voorraad, personeel, etc. U kunt data ook combineren voor uitgebreide analyses.'
      },
      {
        question: 'Hoe vergelijk ik periodes?',
        answer: 'In de rapportage interface kunt u een datumbereik selecteren en vergelijken met een vorige periode. Het systeem toont automatisch de verandering in percentages.'
      }
    ]
  }
};

// General FAQs
const GENERAL_FAQS = [
  {
    category: 'Account & Toegang',
    icon: Lock,
    questions: [
      {
        question: 'Hoe maak ik een account aan?',
        answer: 'Klik op "Gratis Starten" op de homepage. Vul uw gegevens in en selecteer de gewenste modules. U ontvangt een bevestigingsmail met inloggegevens.'
      },
      {
        question: 'Hoe reset ik mijn wachtwoord?',
        answer: 'Klik op "Wachtwoord vergeten" op de inlogpagina. Vul uw e-mailadres in en u ontvangt een link om een nieuw wachtwoord in te stellen.'
      },
      {
        question: 'Kan ik meerdere gebruikers toevoegen?',
        answer: 'Ja, ga naar Instellingen > Gebruikers om teamleden uit te nodigen. U kunt verschillende rollen en rechten toewijzen per gebruiker.'
      },
      {
        question: 'Hoe schakel ik twee-factor authenticatie in?',
        answer: 'Ga naar uw Profiel > Beveiliging en klik op "2FA Inschakelen". Scan de QR-code met uw authenticator app en voer de code in ter bevestiging.'
      }
    ]
  },
  {
    category: 'Betalingen & Abonnementen',
    icon: CreditCard,
    questions: [
      {
        question: 'Welke betaalmethodes worden geaccepteerd?',
        answer: 'Wij accepteren Mope (online bankieren), bankoverschrijving en bieden een 3-dagen gratis proefperiode aan. Creditcard betalingen worden binnenkort toegevoegd.'
      },
      {
        question: 'Hoe wijzig ik mijn abonnement?',
        answer: 'Ga naar Instellingen > Abonnement. Hier kunt u modules toevoegen of verwijderen. Wijzigingen gaan in per de volgende facturatiedatum.'
      },
      {
        question: 'Kan ik mijn abonnement opzeggen?',
        answer: 'Ja, u kunt op elk moment opzeggen via Instellingen > Abonnement. Uw toegang blijft actief tot het einde van de huidige facturatieperiode.'
      },
      {
        question: 'Krijg ik een factuur voor mijn betaling?',
        answer: 'Ja, na elke betaling ontvangt u automatisch een factuur per e-mail. Alle facturen zijn ook te vinden onder Instellingen > Facturen.'
      }
    ]
  },
  {
    category: 'Data & Privacy',
    icon: Shield,
    questions: [
      {
        question: 'Hoe veilig is mijn data?',
        answer: 'Al uw data wordt versleuteld opgeslagen en verzonden via HTTPS. Wij maken dagelijks back-ups en voldoen aan de AVG/GDPR richtlijnen.'
      },
      {
        question: 'Kan ik mijn data exporteren?',
        answer: 'Ja, u kunt al uw data exporteren via Instellingen > Data Export. Kies het gewenste formaat (Excel, CSV, JSON) en download uw gegevens.'
      },
      {
        question: 'Wie heeft toegang tot mijn gegevens?',
        answer: 'Alleen u en uw teamleden met de juiste rechten hebben toegang. Onze medewerkers hebben alleen toegang voor technische ondersteuning na uw toestemming.'
      },
      {
        question: 'Wat gebeurt er met mijn data als ik stop?',
        answer: 'Na opzegging heeft u 30 dagen om uw data te exporteren. Daarna wordt alle data permanent verwijderd van onze servers.'
      }
    ]
  },
  {
    category: 'Ondersteuning',
    icon: HelpCircle,
    questions: [
      {
        question: 'Hoe neem ik contact op met support?',
        answer: 'U kunt ons bereiken via de chat op de website, per e-mail (support@facturatie.sr) of telefonisch tijdens kantooruren.'
      },
      {
        question: 'Bieden jullie training aan?',
        answer: 'Ja, wij bieden gratis online training aan voor alle modules. Ook is persoonlijke training op locatie beschikbaar tegen meerprijs.'
      },
      {
        question: 'Waar vind ik handleidingen?',
        answer: 'Alle documentatie is beschikbaar in het Help Center binnen de applicatie. Klik op het vraagteken icoon in de navigatie voor snelle hulp.'
      },
      {
        question: 'Hebben jullie een API voor integraties?',
        answer: 'Ja, wij bieden een REST API voor ontwikkelaars. Documentatie is beschikbaar via Instellingen > API & Integraties.'
      }
    ]
  }
];

export default function FaqPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModule, setActiveModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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

  const modules = Object.entries(MODULE_FAQ_DATA);

  // Filter FAQs based on search
  const filterFaqs = (faqs) => {
    if (!searchQuery) return faqs;
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Hoe kunnen we u helpen?
          </h1>
          
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Vind antwoorden op veelgestelde vragen, ontdek hoe onze modules werken, 
            en leer het maximale uit uw ERP systeem te halen.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Zoek in veelgestelde vragen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-full"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {modules.map(([key, module]) => {
              const IconComponent = module.icon;
              return (
                <Button
                  key={key}
                  variant={activeModule === key ? "default" : "outline"}
                  className={`rounded-full ${activeModule === key 
                    ? `bg-gradient-to-r ${module.gradient} text-white` 
                    : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  onClick={() => setActiveModule(activeModule === key ? null : key)}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {module.name}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Module Details */}
      {activeModule && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              const module = MODULE_FAQ_DATA[activeModule];
              const IconComponent = module.icon;
              
              return (
                <div className="space-y-12">
                  {/* Module Header */}
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${module.gradient} text-white text-sm mb-4`}>
                        <IconComponent className="w-4 h-4" />
                        {module.name}
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-4">
                        {module.description}
                      </h2>
                      <p className="text-lg text-slate-600">
                        Ontdek alle functies en mogelijkheden van de {module.name} module.
                        Hieronder vindt u uitgebreide uitleg en veelgestelde vragen.
                      </p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -inset-4 bg-gradient-to-r ${module.gradient} rounded-3xl blur-2xl opacity-20`}></div>
                      <img
                        src={module.image}
                        alt={module.name}
                        className="relative rounded-2xl shadow-2xl w-full h-64 object-cover"
                      />
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-emerald-500" />
                      Functionaliteiten
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {module.features.map((feature, index) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-2xl p-6 border border-slate-100"
                          >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-4`}>
                              <FeatureIcon className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">
                              {feature.title}
                            </h4>
                            <p className="text-slate-600 mb-4">
                              {feature.description}
                            </p>
                            <ul className="space-y-2">
                              {feature.details.map((detail, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Module FAQs */}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-emerald-500" />
                      Veelgestelde Vragen over {module.name}
                    </h3>
                    <Accordion type="single" collapsible className="space-y-4">
                      {filterFaqs(module.faqs).map((faq, index) => (
                        <AccordionItem
                          key={index}
                          value={`module-faq-${index}`}
                          className="bg-white rounded-xl border border-slate-200 px-6 overflow-hidden"
                        >
                          <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-emerald-600 py-5">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-slate-600 pb-5">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* General FAQs */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Algemene Vragen
            </h2>
            <p className="text-lg text-slate-600">
              Antwoorden op veelgestelde vragen over accounts, betalingen en meer
            </p>
          </div>

          <div className="space-y-8">
            {GENERAL_FAQS.map((category, catIndex) => {
              const CategoryIcon = category.icon;
              const filteredQuestions = filterFaqs(category.questions);
              
              if (filteredQuestions.length === 0) return null;
              
              return (
                <div key={catIndex} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <CategoryIcon className="w-5 h-5" />
                      {category.category}
                    </h3>
                  </div>
                  <Accordion type="single" collapsible className="px-2">
                    {filteredQuestions.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`general-${catIndex}-${index}`}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-emerald-600 px-4 py-4">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 px-4 pb-4">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Nog vragen?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Ons support team staat klaar om u te helpen
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8"
              onClick={() => navigate('/modules-overzicht?order=true')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Probeer Gratis
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-slate-200"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Opnemen
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
