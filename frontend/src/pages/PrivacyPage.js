import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Phone, Lock, Shield, Eye, Database, UserCheck, Cookie } from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const sections = [
    {
      icon: Eye,
      title: '1. Inleiding',
      content: `Facturatie N.V. ("wij", "ons" of "onze") respecteert uw privacy en zet zich in voor de bescherming van uw persoonsgegevens. Dit privacybeleid informeert u over hoe wij omgaan met uw persoonsgegevens wanneer u onze website bezoekt en onze diensten gebruikt.

Wij verwerken persoonsgegevens in overeenstemming met de geldende Surinaamse wetgeving inzake gegevensbescherming.`
    },
    {
      icon: Database,
      title: '2. Welke gegevens verzamelen wij?',
      content: `Wij kunnen de volgende categorieën persoonsgegevens verzamelen:

• Identiteitsgegevens: naam, bedrijfsnaam, functietitel
• Contactgegevens: e-mailadres, telefoonnummer, adres
• Accountgegevens: gebruikersnaam, wachtwoord (versleuteld)
• Financiële gegevens: factuurgegevens, betalingshistorie
• Technische gegevens: IP-adres, browsertype, tijdzone, besturingssysteem
• Gebruiksgegevens: informatie over hoe u onze diensten gebruikt`
    },
    {
      icon: UserCheck,
      title: '3. Hoe gebruiken wij uw gegevens?',
      content: `Wij gebruiken uw persoonsgegevens voor de volgende doeleinden:

• Het leveren en verbeteren van onze diensten
• Het verwerken van uw betalingen
• Het communiceren met u over uw account en onze diensten
• Het versturen van belangrijke updates en mededelingen
• Het analyseren van het gebruik van onze diensten om deze te verbeteren
• Het voldoen aan wettelijke verplichtingen
• Het beschermen van onze rechten en eigendommen`
    },
    {
      icon: Shield,
      title: '4. Hoe beschermen wij uw gegevens?',
      content: `Wij nemen de beveiliging van uw gegevens serieus en hebben passende technische en organisatorische maatregelen getroffen om uw gegevens te beschermen:

• SSL/TLS-encryptie voor alle dataoverdracht
• Versleutelde opslag van wachtwoorden
• Regelmatige beveiligingsaudits
• Beperkte toegang tot persoonsgegevens
• Firewalls en beveiligde servers`
    },
    {
      icon: Eye,
      title: '5. Met wie delen wij uw gegevens?',
      content: `Wij verkopen uw persoonsgegevens niet aan derden. Wij kunnen uw gegevens delen met:

• Dienstverleners die ons helpen bij het leveren van onze diensten (bijv. hosting, betalingsverwerking)
• Overheidsinstanties wanneer wij daartoe wettelijk verplicht zijn
• Professionele adviseurs zoals advocaten en accountants

Al onze dienstverleners zijn contractueel verplicht om uw gegevens vertrouwelijk te behandelen.`
    },
    {
      icon: Database,
      title: '6. Hoe lang bewaren wij uw gegevens?',
      content: `Wij bewaren uw persoonsgegevens zo lang als nodig is voor de doeleinden waarvoor ze zijn verzameld:

• Accountgegevens: zolang uw account actief is, plus 2 jaar na beëindiging
• Financiële gegevens: minimaal 7 jaar conform Surinaamse belastingwetgeving
• Technische loggegevens: maximaal 12 maanden`
    },
    {
      icon: UserCheck,
      title: '7. Uw rechten',
      content: `U heeft de volgende rechten met betrekking tot uw persoonsgegevens:

• Recht op inzage: u kunt een kopie van uw gegevens opvragen
• Recht op rectificatie: u kunt onjuiste gegevens laten corrigeren
• Recht op verwijdering: u kunt verzoeken om verwijdering van uw gegevens
• Recht op beperking: u kunt de verwerking van uw gegevens laten beperken
• Recht op overdraagbaarheid: u kunt uw gegevens in een gangbaar formaat ontvangen

Om deze rechten uit te oefenen, kunt u contact met ons opnemen via de onderstaande contactgegevens.`
    },
    {
      icon: Cookie,
      title: '8. Cookies',
      content: `Onze website maakt gebruik van cookies en vergelijkbare technologieën om uw ervaring te verbeteren. Cookies zijn kleine tekstbestanden die op uw apparaat worden opgeslagen.

Wij gebruiken:
• Essentiële cookies: nodig voor het functioneren van de website
• Analytische cookies: om te begrijpen hoe bezoekers onze website gebruiken
• Functionele cookies: om uw voorkeuren te onthouden

U kunt cookies beheren via uw browserinstellingen.`
    },
    {
      icon: Eye,
      title: '9. Wijzigingen in dit beleid',
      content: `Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen worden op deze pagina gepubliceerd met een bijgewerkte "laatst gewijzigd" datum. Wij raden u aan dit beleid regelmatig te raadplegen.`
    },
    {
      icon: Phone,
      title: '10. Contact',
      content: `Als u vragen heeft over dit privacybeleid of onze gegevensverwerkingspraktijken, kunt u contact met ons opnemen:

Facturatie N.V.
E-mail: privacy@facturatie.sr
Telefoon: +597 893-4982
Adres: Paramaribo, Suriname`
    }
  ];

  const highlights = [
    { icon: Lock, title: 'SSL Encryptie', description: '256-bit beveiliging' },
    { icon: Shield, title: 'GDPR Compliant', description: 'Privacy by design' },
    { icon: Database, title: 'Lokale Opslag', description: 'Servers in Suriname' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Privacy<span className="text-blue-500">beleid</span>
            </h1>
            <p className="text-xl text-gray-600">
              Uw privacy is onze prioriteit. Lees hoe wij uw gegevens beschermen.
            </p>
            <p className="text-sm text-gray-500 mt-4">Laatst bijgewerkt: 26 januari 2026</p>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {highlights.map((item, index) => (
              <Card key={index} className="border-0 shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  {section.title}
                </h2>
                <div className="text-gray-600 whitespace-pre-line leading-relaxed pl-13 ml-13">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Vragen over uw privacy?</h3>
            <p className="text-blue-100 mb-6">Neem gerust contact met ons op</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg">
                <Phone className="w-4 h-4 mr-2" />
                +597 893-4982
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/over-ons')}>
                Neem Contact Op
              </Button>
            </div>
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
                Facturatie.sr is hét Surinaamse platform voor digitale facturatie en bedrijfsadministratie.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                <li><Link to="/prijzen" className="text-gray-400 hover:text-white">Prijzen</Link></li>
                <li><Link to="/over-ons" className="text-gray-400 hover:text-white">Over Ons</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li><Link to="/voorwaarden" className="text-gray-400 hover:text-white">Algemene Voorwaarden</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacybeleid</Link></li>
              </ul>
              <p className="text-gray-400 flex items-center gap-2 mt-6">
                <Phone className="w-4 h-4" /> +597 893-4982
              </p>
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
    </div>
  );
}
