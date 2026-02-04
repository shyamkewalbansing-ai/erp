import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';
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
  RefreshCw,
  Play,
  Star,
  CheckCircle,
  ChevronRight,
  ShoppingCart,
  User,
  Mail,
  Phone,
  Building,
  Gift,
  CreditCard,
  Scissors,
  Heart,
  Smile,
  Package,
  Ticket,
  Fuel,
  Gauge,
  Truck,
  AlertTriangle,
  ClipboardList,
  Puzzle
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Icon mapping for dynamic icons from database
const ICON_MAP = {
  'Users': Users,
  'Building2': Building2,
  'Car': Car,
  'MessageSquare': MessageSquare,
  'Globe': Globe,
  'Shield': Shield,
  'Sparkles': Sparkles,
  'Clock': Clock,
  'UserCheck': UserCheck,
  'FileText': FileText,
  'Calendar': Calendar,
  'DollarSign': DollarSign,
  'Home': Home,
  'Wrench': Wrench,
  'Receipt': Receipt,
  'BarChart3': BarChart3,
  'Settings': Settings,
  'Zap': Zap,
  'Bot': Bot,
  'Languages': Languages,
  'Layout': Layout,
  'Image': Image,
  'Search': Search,
  'Palette': Palette,
  'Lock': Lock,
  'Database': Database,
  'RefreshCw': RefreshCw,
  'Play': Play,
  'Star': Star,
  'CheckCircle': CheckCircle,
  'ShoppingCart': ShoppingCart,
  'User': User,
  'Mail': Mail,
  'Phone': Phone,
  'Building': Building,
  'Gift': Gift,
  'CreditCard': CreditCard,
  'Scissors': Scissors,
  'Heart': Heart,
  'Smile': Smile,
  'Package': Package,
  'Ticket': Ticket,
  'Fuel': Fuel,
  'Gauge': Gauge,
  'Truck': Truck,
  'AlertTriangle': AlertTriangle,
  'ClipboardList': ClipboardList,
  'Puzzle': Puzzle
};

// Helper to get icon component by name
const getIconComponent = (iconName) => {
  if (typeof iconName === 'function') return iconName; // Already a component
  return ICON_MAP[iconName] || Puzzle; // Default to Puzzle if not found
};

// Detailed module information with feature sections
const MODULES_DETAIL = {
  'hrm': {
    id: 'hrm',
    name: 'HRM Module',
    title: 'Human Resource Management',
    subtitle: 'Beheer uw personeel efficiënt en professioneel',
    description: 'De HRM module biedt een complete oplossing voor personeelsbeheer, van werving tot salarisadministratie. Geoptimaliseerd voor de Surinaamse markt met lokale wet- en regelgeving.',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    lightGradient: 'from-blue-50 to-indigo-50',
    accentColor: 'blue',
    category: 'Personeel',
    price: 'SRD 2.500',
    priceAmount: 2500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80',
    highlights: ['Verlofbeheer', 'Aanwezigheid', 'Loonstroken', 'Werving'],
    sections: [
      {
        title: 'Personeelsbeheer',
        description: 'Houd alle werknemergegevens op één centrale plek bij.',
        icon: UserCheck,
        features: ['Volledige werknemerprofielen met foto', 'Contactgegevens en noodcontacten', 'Bankgegevens voor salarisuitbetaling', 'Documenten per werknemer opslaan', 'Werkhistorie en notities'],
        image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80'
      },
      {
        title: 'Verlofbeheer',
        description: 'Automatische verlofaanvragen en goedkeuringsworkflow.',
        icon: Calendar,
        features: ['Online verlofaanvragen indienen', 'Automatische notificaties naar managers', 'Verlofsaldo automatisch bijgewerkt', 'Verschillende verloftypes ondersteunen', 'Jaaroverzicht per werknemer'],
        image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'
      },
      {
        title: 'Aanwezigheid',
        description: 'Track werktijden met digitaal in- en uitklokken.',
        icon: Clock,
        features: ['Digitaal in- en uitklokken', 'Automatische urenberekening', 'Overwerk tracking', 'Maandelijkse aanwezigheidsrapporten', 'Integratie met salarisbeheer'],
        image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80'
      },
      {
        title: 'Salarisbeheer',
        description: 'Complete salarisadministratie met loonstrookgeneratie.',
        icon: DollarSign,
        features: ['Maandelijkse loonberekening', 'Automatische loonstrookgeneratie (PDF)', 'Toeslagen en inhoudingen beheren', 'Bulksalarissen verwerken', 'Salarishistorie per werknemer'],
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80'
      }
    ]
  },
  'vastgoed-beheer': {
    id: 'vastgoed_beheer',
    name: 'Vastgoed Beheer',
    title: 'Vastgoed Management Systeem',
    subtitle: 'De complete oplossing voor vastgoedbeheerders',
    description: 'Beheer uw huurwoningen, appartementen en commercieel vastgoed met gemak. Geïntegreerde facturatie, meterstanden en huurdersbeheer speciaal voor Suriname.',
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-600',
    lightGradient: 'from-emerald-50 to-teal-50',
    accentColor: 'emerald',
    category: 'Vastgoed',
    price: 'SRD 3.000',
    priceAmount: 3000,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    highlights: ['Huurdersbeheer', 'Facturatie', 'Meterstanden', 'Onderhoud'],
    sections: [
      {
        title: 'Huurdersbeheer',
        description: 'Alle informatie over uw huurders op één plek.',
        icon: Users,
        features: ['Volledige huurdersprofielen', 'Huurcontracten digitaal opslaan', 'Betalingshistorie per huurder', 'Communicatielogboek', 'Automatische herinneringen'],
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'
      },
      {
        title: 'Appartementenbeheer',
        description: 'Overzicht van al uw panden en units.',
        icon: Home,
        features: ['Onbeperkt panden toevoegen', 'Units per pand beheren', 'Huurprijzen per unit', 'Bezettingsgraad inzicht', 'Foto\'s en documenten per unit'],
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
      },
      {
        title: 'Meterstanden (EBS/SWM)',
        description: 'Registreer en beheer meterstanden voor nutsvoorzieningen.',
        icon: BarChart3,
        features: ['Maandelijkse meterstanden invoeren', 'Automatische verbruiksberekening', 'EBS en SWM ondersteuning', 'Historische grafieken', 'Doorberekening aan huurders'],
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
      },
      {
        title: 'Onderhoud',
        description: 'Track en beheer onderhoudsverzoeken.',
        icon: Wrench,
        features: ['Onderhoudsverzoeken ontvangen', 'Status tracking', 'Toewijzen aan aannemers', 'Kosten registreren', 'Huurder notificaties'],
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'
      }
    ]
  },
  'auto-dealer': {
    id: 'autodealer',
    name: 'Auto Dealer',
    title: 'Auto Dealer Management',
    subtitle: 'Complete oplossing voor autohandel in Suriname',
    description: 'Beheer uw autohandel met voorraad, verkoop, inkoop en klantenbeheer. Ondersteunt meerdere valuta (SRD, EUR, USD) voor import en export.',
    icon: Car,
    gradient: 'from-orange-500 to-red-600',
    lightGradient: 'from-orange-50 to-red-50',
    accentColor: 'orange',
    category: 'Automotive',
    price: 'SRD 3.500',
    priceAmount: 3500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=80',
    highlights: ['Voertuigbeheer', 'Multi-valuta', 'Verkoop', 'Klanten Portal'],
    sections: [
      {
        title: 'Voertuigbeheer',
        description: 'Complete voorraadadministratie voor uw voertuigen.',
        icon: Car,
        features: ['Voertuigen met alle specificaties', 'Foto\'s en documenten', 'Inkoop- en verkoopprijzen', 'Status tracking', 'VIN/chassisnummer registratie'],
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'
      },
      {
        title: 'Multi-Valuta Ondersteuning',
        description: 'Werk met SRD, EUR en USD tegelijkertijd.',
        icon: DollarSign,
        features: ['Prijzen in meerdere valuta', 'Automatische wisselkoersen', 'Facturen in gewenste valuta', 'Import/export administratie', 'Valuta conversie rapporten'],
        image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=80'
      },
      {
        title: 'Verkoop & Inkoop',
        description: 'Beheer het volledige verkoopproces.',
        icon: Receipt,
        features: ['Verkoopregistratie', 'Inkoopregistratie', 'Winstmarge berekening', 'Betalingsregelingen', 'Automatische facturatie'],
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80'
      },
      {
        title: 'Klanten Portal',
        description: 'Selfservice portal voor uw klanten.',
        icon: Users,
        features: ['Klanten kunnen inloggen', 'Eigen aankopen bekijken', 'Betalingsoverzicht', 'Documenten downloaden', 'Contact met dealer'],
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
      }
    ]
  },
  'ai-chatbot': {
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    title: 'GPT-4 Powered Chatbot',
    subtitle: 'Intelligente klantenservice die 24/7 beschikbaar is',
    description: 'Geef uw klanten directe antwoorden met onze AI-chatbot. Aangedreven door GPT-4, meertalig en volledig aanpasbaar aan uw bedrijf.',
    icon: MessageSquare,
    gradient: 'from-purple-500 to-pink-600',
    lightGradient: 'from-purple-50 to-pink-50',
    accentColor: 'purple',
    category: 'AI & Automatisering',
    price: 'SRD 1.500',
    priceAmount: 1500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    highlights: ['GPT-4', 'Meertalig', '24/7 Online', 'Aanpasbaar'],
    sections: [
      {
        title: 'GPT-4 Integratie',
        description: 'Meest geavanceerde AI-technologie.',
        icon: Bot,
        features: ['Natuurlijke gesprekken', 'Context-bewuste antwoorden', 'Leert van uw bedrijfsinfo', 'Complexe vragen beantwoorden', 'Continue verbeteringen'],
        image: 'https://images.unsplash.com/photo-1676299081847-5f5a7f0e3d11?w=800&q=80'
      },
      {
        title: 'Meertalig',
        description: 'Communiceer in de taal van uw klant.',
        icon: Languages,
        features: ['Nederlands', 'Engels', 'Sranantongo', 'Automatische taaldetectie', 'Naadloze vertaling'],
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80'
      },
      {
        title: '24/7 Beschikbaarheid',
        description: 'Altijd online, geen wachttijden.',
        icon: Clock,
        features: ['Dag en nacht bereikbaar', 'Geen wachttijden', 'Onbeperkt gesprekken', 'Instant antwoorden', 'Escalatie naar mens mogelijk'],
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80'
      },
      {
        title: 'Aanpasbaarheid',
        description: 'Stem de chatbot af op uw bedrijf.',
        icon: Settings,
        features: ['Eigen welkomstbericht', 'FAQ importeren', 'Bedrijfsinfo trainen', 'Antwoordstijl aanpassen', 'Branding personaliseren'],
        image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80'
      }
    ]
  },
  'website-cms': {
    id: 'cms',
    name: 'Website CMS',
    title: 'Website Content Management',
    subtitle: 'Beheer uw website zonder technische kennis',
    description: 'Maak en beheer professionele webpagina\'s met onze intuïtieve CMS. Drag & drop interface, SEO tools en volledige controle over uw online aanwezigheid.',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    lightGradient: 'from-cyan-50 to-blue-50',
    accentColor: 'cyan',
    category: 'Website',
    price: 'SRD 2.000',
    priceAmount: 2000,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&q=80',
    highlights: ['Drag & Drop', 'SEO Tools', 'Templates', 'Media'],
    sections: [
      {
        title: 'Pagina Builder',
        description: 'Bouw pagina\'s met drag & drop.',
        icon: Layout,
        features: ['Visuele editor', 'Voorgedefinieerde secties', 'Responsive preview', 'One-click publiceren', 'Versiegeschiedenis'],
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'
      },
      {
        title: 'Media Bibliotheek',
        description: 'Beheer al uw afbeeldingen en bestanden.',
        icon: Image,
        features: ['Onbeperkt uploaden', 'Automatische optimalisatie', 'Mappen structuur', 'Zoeken en filteren', 'Alt-tekst voor SEO'],
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'
      },
      {
        title: 'SEO Optimalisatie',
        description: 'Word beter gevonden in Google.',
        icon: Search,
        features: ['Meta titels en beschrijvingen', 'URL structuur aanpassen', 'Sitemap generatie', 'Social media previews', 'Analytics integratie'],
        image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80'
      },
      {
        title: 'Thema & Design',
        description: 'Pas het uiterlijk aan uw merk aan.',
        icon: Palette,
        features: ['Kleuren aanpassen', 'Logo uploaden', 'Lettertypen kiezen', 'Header en footer beheer', 'Eigen CSS mogelijk'],
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80'
      }
    ]
  },
  'rapportage': {
    id: 'rapportage',
    name: 'Rapportage',
    title: 'Business Intelligence & Rapportage',
    subtitle: 'Inzichten die uw bedrijf vooruit helpen',
    description: 'Krijg diepgaande inzichten in uw bedrijfsprestaties met real-time dashboards, automatische rapporten en data visualisaties.',
    icon: BarChart3,
    gradient: 'from-teal-500 to-emerald-600',
    lightGradient: 'from-teal-50 to-emerald-50',
    accentColor: 'teal',
    category: 'Analytics',
    price: 'SRD 1.500',
    priceAmount: 1500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    highlights: ['Dashboards', 'PDF Export', 'Grafieken', 'Automatisch'],
    sections: [
      {
        title: 'Real-time Dashboards',
        description: 'Bekijk uw KPI\'s in één oogopslag.',
        icon: BarChart3,
        features: ['Aanpasbare widgets', 'Real-time data', 'Meerdere dashboards', 'Drag & drop layout', 'Delen met team'],
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
      },
      {
        title: 'Automatische Rapporten',
        description: 'Ontvang rapporten op vaste momenten.',
        icon: RefreshCw,
        features: ['Dagelijkse, wekelijkse, maandelijkse rapporten', 'Email notificaties', 'PDF bijlagen', 'Custom rapportages', 'Historische vergelijkingen'],
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80'
      },
      {
        title: 'Data Export',
        description: 'Exporteer data in elk formaat.',
        icon: FileText,
        features: ['Export naar PDF', 'Export naar Excel', 'CSV downloads', 'API toegang', 'Scheduled exports'],
        image: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&q=80'
      },
      {
        title: 'Visualisaties',
        description: 'Begrijp data met mooie grafieken.',
        icon: Sparkles,
        features: ['Lijn- en staafgrafieken', 'Taartdiagrammen', 'Trend analyses', 'Vergelijkingen', 'Interactieve grafieken'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
      }
    ]
  },
  'beauty-spa': {
    id: 'beauty',
    name: 'Beauty Spa',
    title: 'Beauty Spa Management Systeem',
    subtitle: 'Complete oplossing voor schoonheidssalons en spa\'s in Suriname',
    description: 'Beheer uw spa met klantprofielen, afspraken, behandelingen, voorraad en kassasysteem. Speciaal ontwikkeld voor de Surinaamse markt met lokale betaalmethoden en Surinaamse specialiteiten.',
    icon: Scissors,
    gradient: 'from-pink-500 to-rose-600',
    lightGradient: 'from-pink-50 to-rose-50',
    accentColor: 'pink',
    category: 'Beauty & Wellness',
    price: 'SRD 2.500',
    priceAmount: 2500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&q=80',
    highlights: ['CRM', 'Afspraken', 'POS', 'Wachtrij'],
    sections: [
      {
        title: 'Klantenbeheer (CRM)',
        description: 'Houd alle klantinformatie bij inclusief behandelgeschiedenis.',
        icon: Heart,
        features: ['Klantprofielen met huidtype en allergieën', 'Behandelgeschiedenis per klant', 'Loyaliteitspunten systeem', 'Lidmaatschappen (Bronze, Silver, Gold, Platinum)', 'Automatische herinneringen'],
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'
      },
      {
        title: 'Afspraak- & Roosterbeheer',
        description: 'Online afspraken maken en personeel inroosteren.',
        icon: Calendar,
        features: ['Online afspraken boeken', 'Personeel roosters', 'Automatische herinneringen', 'Walk-in wachtrij beheer', 'No-show registratie'],
        image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80'
      },
      {
        title: 'Behandelingen & Pakketten',
        description: 'Catalogus met alle spa diensten.',
        icon: Sparkles,
        features: ['Behandelingscatalogus', 'Combinatiepakketten', 'Surinaamse specialiteiten (kruiden, aloë)', 'Duur en prijs per behandeling', 'Producten per behandeling'],
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'
      },
      {
        title: 'Kassasysteem (POS)',
        description: 'Afrekenen met Surinaamse betaalmethoden.',
        icon: ShoppingCart,
        features: ['Contant en PIN', 'Telesur Pay QR', 'Finabank QR', 'Hakrinbank QR', 'Vouchers en cadeaubonnen'],
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
      },
      {
        title: 'Voorraad & Producten',
        description: 'Beheer spa producten met automatische waarschuwingen.',
        icon: Package,
        features: ['Productcatalogus', 'Batchnummers en vervaldatums', 'Lage voorraad waarschuwingen', 'Inkoopbeheer', 'Verkoop tracking'],
        image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'
      },
      {
        title: 'Personeelsbeheer',
        description: 'Beheer medewerkers, roosters en commissies.',
        icon: Users,
        features: ['Medewerkersprofielen', 'Specialisaties per medewerker', 'Commissie per behandeling', 'Prestatie tracking', 'Certificaten bijhouden'],
        image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&q=80'
      },
      {
        title: 'Online Booking Portal',
        description: 'Laat klanten zelf online afspraken boeken via uw eigen portaal.',
        icon: Calendar,
        features: ['Publieke boekingswebsite', 'Klanten kiezen behandeling en tijdstip', 'Automatische beschikbaarheid controle', 'Direct bevestiging na boeking', 'Annuleren en wijzigen mogelijk'],
        image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&q=80',
        hasDemo: true
      }
    ],
    hasBookingPortal: true
  },
  'multi-tenant': {
    id: 'multi-tenant',
    name: 'Multi-Tenant Workspace',
    title: 'Eigen Workspace Platform',
    subtitle: 'Volledige controle over uw bedrijfsomgeving',
    description: 'Krijg uw eigen afgeschermde workspace met custom branding, eigen domein en gebruikersbeheer. Perfect voor bedrijven die hun eigen identiteit willen behouden.',
    icon: Shield,
    gradient: 'from-slate-600 to-slate-800',
    lightGradient: 'from-slate-50 to-gray-50',
    accentColor: 'slate',
    category: 'Platform',
    price: 'Inclusief',
    priceAmount: 0,
    priceNote: 'bij abonnement',
    heroImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    highlights: ['Custom Domain', 'Branding', 'Gebruikers', 'Beveiliging'],
    sections: [
      {
        title: 'Eigen Domein',
        description: 'Uw bedrijf, uw domein.',
        icon: Globe,
        features: ['Gratis subdomain', 'Custom domain ondersteuning', 'SSL certificaat inclusief', 'DNS configuratie hulp', 'Automatische SSL vernieuwing'],
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80'
      },
      {
        title: 'Custom Branding',
        description: 'Pas het platform aan uw huisstijl aan.',
        icon: Palette,
        features: ['Eigen logo uploaden', 'Primaire kleuren aanpassen', 'Favicon personaliseren', 'Portaal naam wijzigen', 'Email templates aanpassen'],
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80'
      },
      {
        title: 'Gebruikersbeheer',
        description: 'Beheer wie toegang heeft tot wat.',
        icon: Users,
        features: ['Onbeperkt gebruikers toevoegen', 'Rollen en rechten toewijzen', 'Uitnodigingen per email', 'Activiteitenlog', 'Tweefactorauthenticatie'],
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80'
      },
      {
        title: 'Data Beveiliging',
        description: 'Uw data is veilig en afgeschermd.',
        icon: Lock,
        features: ['Volledige data isolatie', 'Encryptie in transit en rust', 'Dagelijkse automatische backups', 'GDPR compliant', 'Audit logging'],
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80'
      }
    ]
  },
  'pompstation': {
    id: 'pompstation',
    name: 'Pompstation',
    title: 'Tankstation Management Systeem',
    subtitle: 'Complete oplossing voor tankstations in Suriname',
    description: 'Beheer uw tankstation met brandstoftanks, pompen, POS/kassa, winkelvoorraad, personeel en veiligheidscompliance. Speciaal ontwikkeld voor de Surinaamse markt.',
    icon: Fuel,
    gradient: 'from-orange-500 to-amber-600',
    lightGradient: 'from-orange-50 to-amber-50',
    accentColor: 'orange',
    category: 'Retail & Energie',
    price: 'SRD 2.500',
    priceAmount: 2500,
    priceNote: 'per maand',
    heroImage: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=1200&q=80',
    highlights: ['Tankbeheer', 'POS/Kassa', 'Winkel', 'Veiligheid'],
    sections: [
      {
        title: 'Brandstoftank Beheer',
        description: 'Monitor en beheer al uw brandstoftanks in real-time.',
        icon: Gauge,
        features: ['Tank capaciteit en vulniveau monitoring', 'Automatische waarschuwingen bij lage voorraad', 'Lekkage detectie systeem', 'Historische verbruiksgrafieken', 'Multi-brandstof ondersteuning (Benzine, Diesel, LPG)'],
        image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=80'
      },
      {
        title: 'Leveringen & Inkoop',
        description: 'Registreer brandstof leveringen en beheer leveranciers.',
        icon: Truck,
        features: ['Leveringsregistratie met bonnen', 'Leveranciersbeheer', 'Inkoopprijzen per levering', 'Automatische voorraad update', 'Leveringshistorie en rapporten'],
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
      },
      {
        title: 'POS/Kassa Systeem',
        description: 'Verkoop brandstof en winkelproducten met één systeem.',
        icon: ShoppingCart,
        features: ['Brandstof verkoop per pomp', 'Winkelproducten verkoop', 'Multi-valuta (SRD, EUR, USD)', 'Contant en PIN betalingen', 'Dagelijkse kasafsluiting'],
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
      },
      {
        title: 'Winkel Voorraad',
        description: 'Beheer uw shop-voorraad met automatische waarschuwingen.',
        icon: Package,
        features: ['Productcatalogus beheer', 'Voorraad tracking', 'Lage voorraad alerts', 'Barcode scanning', 'Marge berekening'],
        image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'
      },
      {
        title: 'Diensten & Personeel',
        description: 'Plan diensten en beheer uw personeel.',
        icon: Users,
        features: ['Dienstrooster planning', 'Inklokken per dienst', 'Prestatie tracking', 'Commissie berekening', 'Verlofbeheer'],
        image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80'
      },
      {
        title: 'Veiligheid & Compliance',
        description: 'Voldoe aan alle veiligheidsvoorschriften.',
        icon: AlertTriangle,
        features: ['Veiligheidsinspecties checklist', 'Incident registratie', 'Certificaat tracking (brandveiligheid)', 'Noodprocedures documentatie', 'Audit trail voor compliance'],
        image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&q=80'
      },
      {
        title: 'Rapportages & Analytics',
        description: 'Inzicht in uw bedrijfsprestaties met AI-aangedreven rapporten.',
        icon: BarChart3,
        features: ['Dagelijkse omzetrapportages', 'Brandstof verbruik analyse', 'Winstmarge per product', 'Trend voorspellingen', 'Export naar PDF/Excel'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
      }
    ]
  },
  'boekhouding': {
    id: 'boekhouding',
    name: 'Boekhouding',
    title: 'Complete Boekhoudoplossing',
    subtitle: 'Gratis boekhouding module voor Surinaamse bedrijven',
    description: 'Een complete boekhoudoplossing speciaal ontwikkeld voor Surinaamse bedrijven. Met ondersteuning voor SRD, USD en EUR, Surinaamse BTW-tarieven (0%, 10%, 25%), en een standaard Surinaams rekeningschema.',
    icon: Receipt,
    gradient: 'from-emerald-500 to-green-600',
    lightGradient: 'from-emerald-50 to-green-50',
    accentColor: 'emerald',
    category: 'Financieel',
    price: 'GRATIS',
    priceAmount: 0,
    priceNote: 'voor alle klanten',
    heroImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
    highlights: ['Multi-valuta', 'BTW', 'Rapportages', 'Gratis'],
    sections: [
      {
        title: 'Grootboek',
        description: 'Volledig rekeningschema met journaalboekingen.',
        icon: FileText,
        features: ['Surinaams standaard rekeningschema (44 rekeningen)', 'Journaalposten met automatische balanscontrole', 'Activa, Passiva, Eigen Vermogen, Opbrengsten, Kosten', 'Automatische saldo-updates', 'Multi-valuta saldi (SRD, USD, EUR)'],
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80'
      },
      {
        title: 'Debiteuren & Crediteuren',
        description: 'Beheer uw klanten en leveranciers.',
        icon: Users,
        features: ['Klanten beheer met betalingstermijnen', 'Leveranciers beheer', 'Openstaande posten per valuta', 'Automatische ouderdomsanalyse', 'BTW-nummer registratie'],
        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'
      },
      {
        title: 'Facturatie',
        description: 'Professionele facturen met automatische BTW-berekening.',
        icon: Receipt,
        features: ['Verkoopfacturen in SRD, USD of EUR', 'Automatische BTW-berekening (0%, 10%, 25%)', 'Automatische factuurnummering (VF2026-00001)', 'Inkoopfacturen registratie', 'Betalingen registreren', 'Korting per regel'],
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80'
      },
      {
        title: 'Bank & Kas',
        description: 'Beheer uw bankrekeningen en kas.',
        icon: CreditCard,
        features: ['Meerdere bankrekeningen per valuta', 'Kas administratie', 'Transacties registreren (inkomst/uitgave)', 'Automatische saldo-updates', 'Koppelingen met facturen'],
        image: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&q=80'
      },
      {
        title: 'BTW Beheer',
        description: 'Surinaamse BTW-administratie en aangifte.',
        icon: DollarSign,
        features: ['BTW-tarieven: 0%, 10%, 25%', 'Automatische BTW per factuur', 'BTW-aangifte overzicht per periode', 'Voorbelasting berekening', 'Te betalen BTW automatisch'],
        image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80'
      },
      {
        title: 'Rapportages',
        description: 'Financiële overzichten en analyses.',
        icon: BarChart3,
        features: ['Balans (Activa vs Passiva + EV)', 'Winst & Verliesrekening', 'BTW-aangifte rapport', 'Openstaande debiteuren (ouderdomsanalyse)', 'Openstaande crediteuren', 'Multi-valuta rapportages'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
      },
      {
        title: 'Multi-Currency',
        description: 'Werken in SRD, USD en EUR.',
        icon: Globe,
        features: ['Vrije keuze van valuta overal', 'Wisselkoersen beheer', 'Automatische conversie voor rapportages', 'Saldi per valuta', 'Factureren in elke valuta'],
        image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=80'
      }
    ]
  }
};

// Helper function to get slug variants for lookups
const getSlugVariants = (s) => {
  if (!s) return [];
  const variants = [s];
  // Convert autodealer -> auto-dealer
  if (s === 'autodealer') variants.push('auto-dealer');
  // Convert aichatbot -> ai-chatbot
  if (s === 'aichatbot') variants.push('ai-chatbot');
  // Convert with hyphens
  if (s.includes('-')) variants.push(s.replace(/-/g, '_'));
  // Convert with underscores
  if (s.includes('_')) variants.push(s.replace(/_/g, '-'));
  return variants;
};

export default function ModuleDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addons, setAddons] = useState([]);
  const [dynamicModule, setDynamicModule] = useState(null);
  
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

  // Check if we have hardcoded module detail, otherwise load from API
  // Try multiple slug formats (hyphen, underscore, and no separator)
  const slugVariants = getSlugVariants(slug);
  const hardcodedModule = slugVariants.reduce((found, s) => found || MODULES_DETAIL[s], null);

  useEffect(() => {
    loadData();
    window.scrollTo(0, 0);
  }, [slug]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      
      const dataPromise = Promise.all([
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/addons').catch(() => ({ data: [] }))
      ]);
      
      const [settingsRes, addonsRes] = await Promise.race([dataPromise, timeoutPromise]);
      
      setSettings(settingsRes?.data || {});
      setAddons(addonsRes?.data || []);
      
      // If no hardcoded module, try to load from API
      // Use the same slug variants check as above
      const slugVariantsCheck = getSlugVariants(slug);
      const hasHardcoded = slugVariantsCheck.some(s => MODULES_DETAIL[s]);
      if (!hasHardcoded) {
        try {
          const addonRes = await api.get(`/addons/${slug}`);
          if (addonRes.data) {
            // Convert API addon to module format
            const addon = addonRes.data;
            
            // Dynamic gradient based on category
            const gradientMap = {
              'financieel': { gradient: 'from-emerald-500 to-green-600', light: 'from-emerald-50 to-green-50', accent: 'emerald' },
              'hrm': { gradient: 'from-blue-500 to-indigo-600', light: 'from-blue-50 to-indigo-50', accent: 'blue' },
              'vastgoed': { gradient: 'from-purple-500 to-violet-600', light: 'from-purple-50 to-violet-50', accent: 'purple' },
              'automotive': { gradient: 'from-orange-500 to-red-600', light: 'from-orange-50 to-red-50', accent: 'orange' },
              'beauty': { gradient: 'from-pink-500 to-rose-600', light: 'from-pink-50 to-rose-50', accent: 'pink' },
              'default': { gradient: 'from-slate-500 to-gray-600', light: 'from-slate-50 to-gray-50', accent: 'slate' }
            };
            
            const style = gradientMap[addon.category?.toLowerCase()] || gradientMap['default'];
            
            // Build sections from features if available
            let sections = [];
            if (addon.features && addon.features.length > 0) {
              sections = addon.features.map((f, idx) => ({
                title: f.title || `Feature ${idx + 1}`,
                description: f.description || '',
                icon: f.icon || 'Check',
                features: f.features || [],
                image: f.image || `https://images.unsplash.com/photo-155143467${idx}8-e076c223a692?w=800&q=80`
              }));
            }
            
            setDynamicModule({
              id: addon.slug,
              name: addon.name,
              title: addon.name,
              subtitle: addon.description || `Professionele ${addon.name} module voor uw bedrijf`,
              description: addon.description || `De ${addon.name} module biedt een complete oplossing voor uw bedrijfsvoering.`,
              icon: addon.icon_name || 'Puzzle',
              gradient: style.gradient,
              lightGradient: style.light,
              accentColor: style.accent,
              category: addon.category || 'Module',
              price: addon.price === 0 ? 'GRATIS' : `SRD ${addon.price?.toLocaleString('nl-NL') || '0'}`,
              priceAmount: addon.price || 0,
              priceNote: addon.price === 0 ? 'voor alle klanten' : 'per maand',
              heroImage: addon.hero_image_url || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
              highlights: addon.highlights || ['Professioneel', 'Gebruiksvriendelijk', 'Multi-valuta', 'Snel'],
              sections: sections.length > 0 ? sections : [
                {
                  title: 'Overzicht',
                  description: addon.description || 'Complete oplossing voor uw bedrijf',
                  icon: 'LayoutDashboard',
                  features: addon.highlights || ['Professioneel', 'Gebruiksvriendelijk'],
                  image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80'
                }
              ]
            });
          }
        } catch (addonErr) {
          console.error('Error loading addon:', addonErr);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setSettings({});
      setAddons([]);
    } finally {
      setLoading(false);
    }
  };

  // Use hardcoded module if available, otherwise use dynamic module from API
  const module = hardcodedModule || dynamicModule;

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
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
      // Find the addon ID that matches this module
      const matchingAddon = addons.find(a => 
        a.slug === module.id || 
        a.slug === slug || 
        a.slug?.replace('_', '-') === slug ||
        a.slug?.replace('-', '_') === module.id
      );
      
      const addonIds = matchingAddon ? [matchingAddon.id] : [];
      
      const orderData = {
        name: orderForm.name,
        email: orderForm.email,
        phone: orderForm.phone || '',
        password: orderForm.password,
        company_name: orderForm.company_name,
        addon_ids: addonIds,
        message: `Module: ${module.name} - Betaalmethode: ${paymentMethod === 'trial' ? '3 dagen gratis' : paymentMethod === 'mope' ? 'Mope' : 'Bankoverschrijving'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
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
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '', password_confirm: '' });
        
        if (paymentMethod === 'mope' && response.data.order?.id) {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-slate-900">Module niet gevonden</h1>
          <Button onClick={() => navigate('/modules-overzicht')} className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Modules
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(module.icon);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-500/20 rounded-full blur-xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="text-white/70 hover:text-white hover:bg-white/10 mb-8"
            onClick={() => navigate('/modules-overzicht')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Alle Modules
          </Button>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-white/10 text-emerald-300 border-emerald-400/30 px-3 py-1">
                  {module.category}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-xl`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">{module.title}</h1>
                </div>
              </div>

              <p className="text-xl text-slate-300 mb-6">{module.subtitle}</p>
              <p className="text-slate-400 mb-8 max-w-xl">{module.description}</p>

              {/* Highlights */}
              <div className="flex flex-wrap gap-2 mb-8">
                {module.highlights.map((highlight, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-full border border-white/20">
                    {highlight}
                  </span>
                ))}
              </div>

              {/* Price and CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                  <span className="text-3xl font-bold text-white">{module.price}</span>
                  <span className="text-white/70 ml-2">{module.priceNote}</span>
                </div>
                <Button 
                  size="lg" 
                  onClick={() => setOrderDialogOpen(true)}
                  className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-xl shadow-emerald-500/25"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Nu Bestellen
                </Button>
              </div>
            </div>

            {/* Right - Hero Image */}
            <div className="relative hidden lg:block">
              <div className={`absolute -inset-4 bg-gradient-to-r ${module.gradient} rounded-3xl blur-2xl opacity-30`}></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img 
                  src={module.heroImage} 
                  alt={module.name}
                  className="w-full h-80 object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${module.gradient} opacity-20`}></div>
              </div>
            </div>
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
            className={`py-20 ${index % 2 === 0 ? 'bg-white' : `bg-gradient-to-br ${module.lightGradient}`}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className={`grid lg:grid-cols-2 gap-12 items-center ${isReversed ? '' : ''}`}>
                {/* Content */}
                <div className={isReversed ? 'lg:order-2' : ''}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                    <SectionIcon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">{section.title}</h2>
                  <p className="text-lg text-slate-600 mb-8">{section.description}</p>
                  
                  <ul className="space-y-4">
                    {section.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3 group">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${module.gradient} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md`}>
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Image */}
                <div className={isReversed ? 'lg:order-1' : ''}>
                  <div className="relative group">
                    <div className={`absolute -inset-4 bg-gradient-to-r ${module.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-all duration-500`}></div>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                      <img 
                        src={section.image} 
                        alt={section.title}
                        className="w-full h-72 object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${module.gradient} opacity-10`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`w-20 h-20 mx-auto mb-8 bg-gradient-to-br ${module.gradient} rounded-2xl flex items-center justify-center shadow-xl`}>
            <IconComponent className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Klaar om {module.name} te gebruiken?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
            Start vandaag nog met een gratis proefperiode van 3 dagen. Geen creditcard nodig.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => setOrderDialogOpen(true)}
              className="h-14 px-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-xl shadow-emerald-500/25"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Nu Bestellen
            </Button>
            {module.hasBookingPortal && (
              <Button 
                size="lg" 
                onClick={() => navigate('/booking/spa/demo-spa')}
                className="h-14 px-10 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-full shadow-xl shadow-pink-500/25"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Bekijk Online Booking Demo
              </Button>
            )}
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/modules-overzicht')}
              className="h-14 px-10 border-white/20 text-white hover:bg-white/10 rounded-full"
            >
              Bekijk Andere Modules
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${module.gradient} p-6 text-white`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {module.name} Bestellen
                </DialogTitle>
                <DialogDescription className="text-white/80">
                  {module.price} {module.priceNote}
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Naam *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="Uw naam"
                    value={orderForm.name}
                    onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-sm font-medium">Bedrijf *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="company_name"
                    placeholder="Bedrijfsnaam"
                    value={orderForm.company_name}
                    onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="uw@email.com"
                    value={orderForm.email}
                    onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefoon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="+597 xxx xxxx"
                    value={orderForm.phone}
                    onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Wachtwoord *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 karakters"
                    value={orderForm.password}
                    onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm" className="text-sm font-medium">Bevestig *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password_confirm"
                    type="password"
                    placeholder="Herhaal wachtwoord"
                    value={orderForm.password_confirm}
                    onChange={(e) => setOrderForm({...orderForm, password_confirm: e.target.value})}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Betaalmethode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'trial', label: '3 Dagen Gratis', icon: Gift, desc: 'Geen betaling' },
                  { id: 'mope', label: 'Mope', icon: CreditCard, desc: 'Online betalen' },
                  { id: 'bank', label: 'Bank', icon: Building2, desc: 'Overschrijving' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <method.icon className={`w-5 h-5 mx-auto mb-1 ${
                      paymentMethod === method.id ? 'text-emerald-600' : 'text-slate-400'
                    }`} />
                    <p className={`text-xs font-medium ${
                      paymentMethod === method.id ? 'text-emerald-700' : 'text-slate-600'
                    }`}>{method.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className={`w-full h-12 bg-gradient-to-r ${module.gradient} hover:opacity-90`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {paymentMethod === 'trial' ? 'Start Gratis Proefperiode' : 'Bestelling Plaatsen'}
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
