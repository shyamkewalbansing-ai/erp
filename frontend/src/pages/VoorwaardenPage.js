import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Menu, X, Phone } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function VoorwaardenPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [content, setContent] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
    axios.get(`${API_URL}/public/pages/voorwaarden`).then(res => setContent(res.data)).catch(() => {});
  }, []);

  const defaultContent = {
    title: 'Algemene Voorwaarden',
    sections: [
      {
        title: 'Artikel 1 - Definities',
        content: `In deze algemene voorwaarden wordt verstaan onder:
        
1.1 Facturatie N.V.: de besloten vennootschap Facturatie N.V., gevestigd te Paramaribo, Suriname.
1.2 Klant: de natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met Facturatie N.V.
1.3 Diensten: alle diensten die Facturatie N.V. aanbiedt, waaronder maar niet beperkt tot facturatiesoftware, boekhoudmodules, HRM-systemen en andere SaaS-oplossingen.
1.4 Overeenkomst: de overeenkomst tussen Facturatie N.V. en de Klant.`
      },
      {
        title: 'Artikel 2 - Toepasselijkheid',
        content: `2.1 Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, offertes, overeenkomsten en leveringen van diensten door Facturatie N.V.
        
2.2 Afwijkingen van deze voorwaarden zijn alleen geldig indien schriftelijk overeengekomen.

2.3 De toepasselijkheid van eventuele inkoop- of andere voorwaarden van de Klant wordt uitdrukkelijk van de hand gewezen.`
      },
      {
        title: 'Artikel 3 - Abonnementen en Betaling',
        content: `3.1 Abonnementen worden aangegaan voor de periode zoals aangegeven bij het afsluiten van het abonnement.

3.2 Betaling dient te geschieden binnen 14 dagen na factuurdatum, tenzij anders overeengekomen.

3.3 Bij niet-tijdige betaling is de Klant van rechtswege in verzuim en is Facturatie N.V. gerechtigd de toegang tot de diensten op te schorten.

3.4 Alle genoemde prijzen zijn in Surinaamse Dollars (SRD) en exclusief BTW, tenzij anders vermeld.`
      },
      {
        title: 'Artikel 4 - Gebruik van de Diensten',
        content: `4.1 De Klant verkrijgt een niet-exclusief, niet-overdraagbaar recht om de diensten te gebruiken.

4.2 Het is de Klant niet toegestaan de diensten te gebruiken voor onrechtmatige doeleinden.

4.3 De Klant is verantwoordelijk voor het geheimhouden van zijn inloggegevens.

4.4 De Klant is volledig verantwoordelijk voor alle activiteiten die onder zijn account plaatsvinden.`
      },
      {
        title: 'Artikel 5 - Aansprakelijkheid',
        content: `5.1 Facturatie N.V. spant zich in om de diensten zo goed mogelijk te leveren, maar geeft geen garantie dat de diensten te allen tijde zonder onderbrekingen of fouten zullen functioneren.

5.2 De totale aansprakelijkheid van Facturatie N.V. is beperkt tot het bedrag dat de Klant in de 12 maanden voorafgaand aan de schadeveroorzakende gebeurtenis heeft betaald.

5.3 Facturatie N.V. is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.`
      },
      {
        title: 'Artikel 6 - Privacy en Gegevensverwerking',
        content: `6.1 Facturatie N.V. verwerkt persoonsgegevens in overeenstemming met de geldende Surinaamse privacywetgeving.

6.2 De Klant geeft toestemming voor het verwerken van de door hem verstrekte gegevens ten behoeve van de dienstverlening.

6.3 Voor meer informatie verwijzen wij naar ons Privacybeleid.`
      },
      {
        title: 'Artikel 7 - Beëindiging',
        content: `7.1 De Klant kan zijn abonnement te allen tijde opzeggen via zijn account of per e-mail.

7.2 Bij opzegging eindigt het abonnement aan het einde van de lopende abonnementsperiode.

7.3 Facturatie N.V. is gerechtigd de overeenkomst met onmiddellijke ingang te beëindigen indien de Klant in strijd handelt met deze voorwaarden.`
      },
      {
        title: 'Artikel 8 - Toepasselijk Recht',
        content: `8.1 Op deze algemene voorwaarden en alle overeenkomsten is Surinaams recht van toepassing.

8.2 Geschillen zullen worden voorgelegd aan de bevoegde rechter te Paramaribo.`
      }
    ],
    lastUpdated: '26 januari 2026'
  };

  const displayContent = content || defaultContent;

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
              <Link to="/over-ons" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Over Ons</Link>
              <Link to="/voorwaarden" className="block py-2 text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Voorwaarden</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full bg-emerald-500" onClick={() => navigate('/prijzen')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <div className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{displayContent.title}</h1>
          <p className="text-gray-500 mb-12">Laatst bijgewerkt: {displayContent.lastUpdated}</p>
          
          <div className="prose prose-lg max-w-none">
            {displayContent.sections.map((section, index) => (
              <div key={index} className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}
