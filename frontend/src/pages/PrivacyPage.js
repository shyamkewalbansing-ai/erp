import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Lock, 
  Shield, 
  Eye, 
  Database, 
  UserCheck, 
  Cookie,
  Server,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  FileText,
  Sparkles
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const sections = [
    {
      icon: Eye,
      title: 'Inleiding',
      content: `Facturatie N.V. ("wij", "ons" of "onze") respecteert uw privacy en zet zich in voor de bescherming van uw persoonsgegevens. Dit privacybeleid informeert u over hoe wij omgaan met uw persoonsgegevens wanneer u onze website bezoekt en onze diensten gebruikt.

Wij verwerken persoonsgegevens in overeenstemming met de geldende Surinaamse wetgeving inzake gegevensbescherming.`
    },
    {
      icon: Database,
      title: 'Welke gegevens verzamelen wij?',
      items: [
        { label: 'Identiteitsgegevens', desc: 'naam, bedrijfsnaam, functietitel' },
        { label: 'Contactgegevens', desc: 'e-mailadres, telefoonnummer, adres' },
        { label: 'Accountgegevens', desc: 'gebruikersnaam, wachtwoord (versleuteld)' },
        { label: 'Financiële gegevens', desc: 'factuurgegevens, betalingshistorie' },
        { label: 'Technische gegevens', desc: 'IP-adres, browsertype, tijdzone' },
        { label: 'Gebruiksgegevens', desc: 'hoe u onze diensten gebruikt' },
      ]
    },
    {
      icon: UserCheck,
      title: 'Hoe gebruiken wij uw gegevens?',
      items: [
        { label: 'Dienstverlening', desc: 'Het leveren en verbeteren van onze diensten' },
        { label: 'Betalingen', desc: 'Het verwerken van uw betalingen' },
        { label: 'Communicatie', desc: 'Updates over uw account en diensten' },
        { label: 'Analyse', desc: 'Gebruik analyseren om te verbeteren' },
        { label: 'Compliance', desc: 'Voldoen aan wettelijke verplichtingen' },
      ]
    },
    {
      icon: Shield,
      title: 'Hoe beschermen wij uw gegevens?',
      items: [
        { label: 'SSL/TLS-encryptie', desc: 'Voor alle dataoverdracht' },
        { label: 'Versleutelde wachtwoorden', desc: 'Veilige opslag met hashing' },
        { label: 'Beveiligingsaudits', desc: 'Regelmatige controles' },
        { label: 'Toegangsbeperking', desc: 'Alleen geautoriseerd personeel' },
        { label: 'Firewalls', desc: 'Beveiligde servers' },
      ]
    },
    {
      icon: Eye,
      title: 'Met wie delen wij uw gegevens?',
      content: `Wij verkopen uw persoonsgegevens niet aan derden. Wij kunnen uw gegevens delen met:

• Dienstverleners die ons helpen bij het leveren van onze diensten (bijv. hosting, betalingsverwerking)
• Overheidsinstanties wanneer wij daartoe wettelijk verplicht zijn
• Professionele adviseurs zoals advocaten en accountants

Al onze dienstverleners zijn contractueel verplicht om uw gegevens vertrouwelijk te behandelen.`
    },
    {
      icon: Database,
      title: 'Hoe lang bewaren wij uw gegevens?',
      items: [
        { label: 'Accountgegevens', desc: 'Zolang account actief is + 2 jaar na beëindiging' },
        { label: 'Financiële gegevens', desc: 'Minimaal 7 jaar (belastingwetgeving)' },
        { label: 'Technische logs', desc: 'Maximaal 12 maanden' },
      ]
    },
    {
      icon: UserCheck,
      title: 'Uw rechten',
      items: [
        { label: 'Recht op inzage', desc: 'U kunt een kopie van uw gegevens opvragen' },
        { label: 'Recht op rectificatie', desc: 'U kunt onjuiste gegevens laten corrigeren' },
        { label: 'Recht op verwijdering', desc: 'U kunt verzoeken om verwijdering' },
        { label: 'Recht op beperking', desc: 'U kunt verwerking laten beperken' },
        { label: 'Recht op overdraagbaarheid', desc: 'Gegevens in gangbaar formaat ontvangen' },
      ]
    },
    {
      icon: Cookie,
      title: 'Cookies',
      items: [
        { label: 'Essentiële cookies', desc: 'Nodig voor website functionaliteit' },
        { label: 'Analytische cookies', desc: 'Begrijpen hoe bezoekers de website gebruiken' },
        { label: 'Functionele cookies', desc: 'Om uw voorkeuren te onthouden' },
      ],
      extra: 'U kunt cookies beheren via uw browserinstellingen.'
    },
  ];

  const highlights = [
    { icon: Lock, title: 'SSL Encryptie', description: '256-bit beveiliging', color: 'emerald' },
    { icon: Shield, title: 'Privacy by Design', description: 'Ingebouwde bescherming', color: 'teal' },
    { icon: Server, title: 'Lokale Servers', description: 'Data in Suriname', color: 'cyan' },
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
            <Lock className="w-4 h-4 mr-2" />
            Uw Privacy Beschermd
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Privacy
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              beleid
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-6">
            Uw privacy is onze prioriteit. Wij zijn transparant over hoe wij uw gegevens verzamelen, gebruiken en beschermen.
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
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      {index + 1}. {section.title}
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
                    {section.content && (
                      <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                        {section.content}
                      </p>
                    )}
                    
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

                    {section.extra && (
                      <p className="mt-4 text-sm text-slate-500 italic">
                        {section.extra}
                      </p>
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
                Vragen over uw privacy?
              </h3>
              <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                Neem gerust contact met ons op. Wij helpen u graag met al uw vragen.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="mailto:privacy@facturatie.sr">
                  <Button size="lg" className="h-14 px-8 bg-white text-emerald-700 hover:bg-emerald-50 rounded-full shadow-xl">
                    <Mail className="w-5 h-5 mr-2" />
                    privacy@facturatie.sr
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
            <Link to="/voorwaarden" className="group">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                    <FileText className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Algemene Voorwaarden</h4>
                    <p className="text-sm text-slate-500">Bekijk onze gebruiksvoorwaarden</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
            
            <Link to="/contact" className="group">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                    <Phone className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Contact</h4>
                    <p className="text-sm text-slate-500">Neem contact met ons op</p>
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
