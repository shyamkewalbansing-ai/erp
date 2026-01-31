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
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

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
      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
