import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Phone, FileText, Shield, Scale, Users, CheckCircle } from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function VoorwaardenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const sections = [
    {
      title: 'Artikel 1 - Definities',
      content: `In deze algemene voorwaarden wordt verstaan onder:

• Facturatie N.V.: de besloten vennootschap Facturatie N.V., gevestigd te Paramaribo, Suriname.
• Klant: de natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met Facturatie N.V.
• Diensten: alle diensten die Facturatie N.V. aanbiedt, waaronder maar niet beperkt tot facturatiesoftware, boekhoudmodules, HRM-systemen en andere SaaS-oplossingen.
• Overeenkomst: de overeenkomst tussen Facturatie N.V. en de Klant.`
    },
    {
      title: 'Artikel 2 - Toepasselijkheid',
      content: `• Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, offertes, overeenkomsten en leveringen van diensten door Facturatie N.V.

• Afwijkingen van deze voorwaarden zijn alleen geldig indien schriftelijk overeengekomen.

• De toepasselijkheid van eventuele inkoop- of andere voorwaarden van de Klant wordt uitdrukkelijk van de hand gewezen.`
    },
    {
      title: 'Artikel 3 - Abonnementen en Betaling',
      content: `• Abonnementen worden aangegaan voor de periode zoals aangegeven bij het afsluiten van het abonnement.

• Betaling dient te geschieden binnen 14 dagen na factuurdatum, tenzij anders overeengekomen.

• Bij niet-tijdige betaling is de Klant van rechtswege in verzuim en is Facturatie N.V. gerechtigd de toegang tot de diensten op te schorten.

• Alle genoemde prijzen zijn in Surinaamse Dollars (SRD) en exclusief BTW, tenzij anders vermeld.`
    },
    {
      title: 'Artikel 4 - Gebruik van de Diensten',
      content: `• De Klant verkrijgt een niet-exclusief, niet-overdraagbaar recht om de diensten te gebruiken.

• Het is de Klant niet toegestaan de diensten te gebruiken voor onrechtmatige doeleinden.

• De Klant is verantwoordelijk voor het geheimhouden van zijn inloggegevens.

• De Klant is volledig verantwoordelijk voor alle activiteiten die onder zijn account plaatsvinden.`
    },
    {
      title: 'Artikel 5 - Aansprakelijkheid',
      content: `• Facturatie N.V. spant zich in om de diensten zo goed mogelijk te leveren, maar geeft geen garantie dat de diensten te allen tijde zonder onderbrekingen of fouten zullen functioneren.

• De totale aansprakelijkheid van Facturatie N.V. is beperkt tot het bedrag dat de Klant in de 12 maanden voorafgaand aan de schadeveroorzakende gebeurtenis heeft betaald.

• Facturatie N.V. is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.`
    },
    {
      title: 'Artikel 6 - Privacy en Gegevensverwerking',
      content: `• Facturatie N.V. verwerkt persoonsgegevens in overeenstemming met de geldende Surinaamse privacywetgeving.

• De Klant geeft toestemming voor het verwerken van de door hem verstrekte gegevens ten behoeve van de dienstverlening.

• Voor meer informatie verwijzen wij naar ons Privacybeleid.`
    },
    {
      title: 'Artikel 7 - Beëindiging',
      content: `• De Klant kan zijn abonnement te allen tijde opzeggen via zijn account of per e-mail.

• Bij opzegging eindigt het abonnement aan het einde van de lopende abonnementsperiode.

• Facturatie N.V. is gerechtigd de overeenkomst met onmiddellijke ingang te beëindigen indien de Klant in strijd handelt met deze voorwaarden.`
    },
    {
      title: 'Artikel 8 - Toepasselijk Recht',
      content: `• Op deze algemene voorwaarden en alle overeenkomsten is Surinaams recht van toepassing.

• Geschillen zullen worden voorgelegd aan de bevoegde rechter te Paramaribo.`
    }
  ];

  const highlights = [
    { icon: Shield, title: 'Veilig & Betrouwbaar', description: '99.9% uptime garantie' },
    { icon: Scale, title: 'Transparant', description: 'Duidelijke voorwaarden' },
    { icon: Users, title: 'Klantvriendelijk', description: 'Flexibel opzegbaar' }
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
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Home</Link>
              <Link to="/prijzen" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Prijzen</Link>
              <Link to="/over-ons" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Over Ons</Link>
              <Link to="/voorwaarden" className="text-sm font-medium text-emerald-600">Voorwaarden</Link>
              <Link to="/privacy" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Privacy</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>Inloggen</Button>
              <Button onClick={() => navigate('/prijzen')} className="bg-emerald-500 hover:bg-emerald-600">Gratis Starten</Button>
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
              <Link to="/prijzen" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Prijzen</Link>
              <Link to="/voorwaarden" className="block py-2 text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Voorwaarden</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full bg-emerald-500" onClick={() => navigate('/prijzen')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Algemene <span className="text-emerald-500">Voorwaarden</span>
            </h1>
            <p className="text-xl text-gray-600">
              Transparante afspraken voor een prettige samenwerking
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
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-emerald-600" />
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
          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                <div className="text-gray-600 whitespace-pre-line leading-relaxed pl-11">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Vragen over onze voorwaarden?</h3>
            <p className="text-emerald-100 mb-6">Ons team staat klaar om u te helpen</p>
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
