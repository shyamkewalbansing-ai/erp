import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  FileText, 
  Shield, 
  Scale, 
  Users, 
  CheckCircle,
  CreditCard,
  Laptop,
  AlertCircle,
  Lock,
  Gavel,
  ArrowRight,
  Mail,
  Phone,
  Sparkles
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function VoorwaardenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const sections = [
    {
      icon: FileText,
      title: 'Definities',
      items: [
        { label: 'Facturatie N.V.', desc: 'De besloten vennootschap gevestigd te Paramaribo, Suriname' },
        { label: 'Klant', desc: 'De natuurlijke persoon of rechtspersoon die een overeenkomst aangaat' },
        { label: 'Diensten', desc: 'Alle SaaS-oplossingen waaronder facturatie, boekhouding, HRM-systemen' },
        { label: 'Overeenkomst', desc: 'De overeenkomst tussen Facturatie N.V. en de Klant' },
      ]
    },
    {
      icon: Scale,
      title: 'Toepasselijkheid',
      items: [
        { label: 'Algemene geldigheid', desc: 'Deze voorwaarden zijn van toepassing op alle aanbiedingen en overeenkomsten' },
        { label: 'Schriftelijke afwijking', desc: 'Afwijkingen zijn alleen geldig indien schriftelijk overeengekomen' },
        { label: 'Eigen voorwaarden', desc: 'Eventuele inkoop- of andere voorwaarden van de Klant worden afgewezen' },
      ]
    },
    {
      icon: CreditCard,
      title: 'Abonnementen en Betaling',
      items: [
        { label: 'Looptijd', desc: 'Abonnementen worden aangegaan voor de aangegeven periode' },
        { label: 'Betalingstermijn', desc: 'Betaling binnen 14 dagen na factuurdatum, tenzij anders overeengekomen' },
        { label: 'Verzuim', desc: 'Bij niet-tijdige betaling kan toegang worden opgeschort' },
        { label: 'Valuta', desc: 'Prijzen in Surinaamse Dollars (SRD), exclusief BTW tenzij anders vermeld' },
      ]
    },
    {
      icon: Laptop,
      title: 'Gebruik van de Diensten',
      items: [
        { label: 'Gebruiksrecht', desc: 'Niet-exclusief, niet-overdraagbaar recht om de diensten te gebruiken' },
        { label: 'Rechtmatig gebruik', desc: 'Het is niet toegestaan de diensten voor onrechtmatige doeleinden te gebruiken' },
        { label: 'Inloggegevens', desc: 'De Klant is verantwoordelijk voor het geheimhouden van zijn gegevens' },
        { label: 'Accountactiviteit', desc: 'De Klant is verantwoordelijk voor alle activiteiten onder zijn account' },
      ]
    },
    {
      icon: AlertCircle,
      title: 'Aansprakelijkheid',
      items: [
        { label: 'Inspanningsverplichting', desc: 'Wij spannen ons in voor optimale dienstverlening zonder garantie op foutloze werking' },
        { label: 'Beperking', desc: 'Aansprakelijkheid beperkt tot bedrag betaald in 12 maanden voorafgaand aan schade' },
        { label: 'Uitsluiting', desc: 'Niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst' },
      ]
    },
    {
      icon: Lock,
      title: 'Privacy en Gegevensverwerking',
      items: [
        { label: 'Wetgeving', desc: 'Verwerking conform geldende Surinaamse privacywetgeving' },
        { label: 'Toestemming', desc: 'Klant geeft toestemming voor verwerking ten behoeve van dienstverlening' },
        { label: 'Meer informatie', desc: 'Zie ons uitgebreide Privacybeleid voor details' },
      ],
      link: { text: 'Bekijk Privacybeleid', url: '/privacy' }
    },
    {
      icon: Users,
      title: 'Beëindiging',
      items: [
        { label: 'Opzegging', desc: 'De Klant kan te allen tijde opzeggen via account of per e-mail' },
        { label: 'Einde abonnement', desc: 'Bij opzegging eindigt het abonnement aan het einde van de lopende periode' },
        { label: 'Directe beëindiging', desc: 'Wij kunnen direct beëindigen bij schending van deze voorwaarden' },
      ]
    },
    {
      icon: Gavel,
      title: 'Toepasselijk Recht',
      items: [
        { label: 'Rechtsstelsel', desc: 'Op deze voorwaarden is Surinaams recht van toepassing' },
        { label: 'Geschillen', desc: 'Geschillen worden voorgelegd aan de bevoegde rechter te Paramaribo' },
      ]
    },
  ];

  const highlights = [
    { icon: Shield, title: 'Veilig & Betrouwbaar', description: '99.9% uptime garantie', color: 'emerald' },
    { icon: Scale, title: 'Transparant', description: 'Duidelijke voorwaarden', color: 'teal' },
    { icon: Users, title: 'Klantvriendelijk', description: 'Flexibel opzegbaar', color: 'cyan' },
  ];

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
        <div className="absolute top-40 right-40 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30 px-4 py-2">
            <FileText className="w-4 h-4 mr-2" />
            Juridisch Document
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Algemene{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Voorwaarden
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-6">
            Transparante afspraken voor een prettige en eerlijke samenwerking. 
            Wij geloven in duidelijkheid en respect.
          </p>

          <p className="text-sm text-slate-400">
            Laatst bijgewerkt: 1 februari 2026
          </p>
        </div>
      </section>

      {/* Highlights Bar */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="grid md:grid-cols-3 gap-6">
              {highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-xl flex items-center justify-center shadow-lg`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Header */}
                <div 
                  className="p-6 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setActiveSection(activeSection === index ? -1 : index)}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <section.icon className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-xl font-bold text-slate-900">
                      {section.title}
                    </h2>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-transform ${activeSection === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className={`transition-all duration-300 ${activeSection === index ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    {section.items && (
                      <div className="grid gap-3 mt-2">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-900">{item.label}</span>
                              <span className="text-slate-500"> - {item.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.link && (
                      <Link 
                        to={section.link.url}
                        className="mt-4 inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {section.link.text}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30">
                <Mail className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Vragen over onze voorwaarden?
              </h3>
              <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                Ons team staat klaar om u te helpen met al uw vragen.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="mailto:info@facturatie.sr">
                  <Button size="lg" className="h-14 px-8 bg-white text-emerald-700 hover:bg-emerald-50 rounded-full shadow-xl">
                    <Mail className="w-5 h-5 mr-2" />
                    info@facturatie.sr
                  </Button>
                </a>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-14 px-8 border-white/30 text-white hover:bg-white/10 rounded-full"
                  onClick={() => navigate('/contact')}
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Opnemen
                </Button>
              </div>
            </div>
          </div>

          {/* Related Links */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <Link to="/privacy" className="group">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                    <Lock className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Privacybeleid</h4>
                    <p className="text-sm text-slate-500">Hoe wij uw gegevens beschermen</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
            
            <Link to="/faq" className="group">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                    <Sparkles className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">FAQ</h4>
                    <p className="text-sm text-slate-500">Veelgestelde vragen</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
