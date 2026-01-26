import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Menu, X, Phone } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [content, setContent] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
    axios.get(`${API_URL}/public/pages/privacy`).then(res => setContent(res.data)).catch(() => {});
  }, []);

  const defaultContent = {
    title: 'Privacybeleid',
    sections: [
      {
        title: '1. Inleiding',
        content: `Facturatie N.V. ("wij", "ons" of "onze") respecteert uw privacy en zet zich in voor de bescherming van uw persoonsgegevens. Dit privacybeleid informeert u over hoe wij omgaan met uw persoonsgegevens wanneer u onze website bezoekt en onze diensten gebruikt.

Wij verwerken persoonsgegevens in overeenstemming met de geldende Surinaamse wetgeving inzake gegevensbescherming.`
      },
      {
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
        title: '4. Hoe beschermen wij uw gegevens?',
        content: `Wij nemen de beveiliging van uw gegevens serieus en hebben passende technische en organisatorische maatregelen getroffen om uw gegevens te beschermen tegen verlies, misbruik of onbevoegde toegang:

• SSL/TLS-encryptie voor alle dataoverdracht
• Versleutelde opslag van wachtwoorden
• Regelmatige beveiligingsaudits
• Beperkte toegang tot persoonsgegevens
• Firewalls en beveiligde servers`
      },
      {
        title: '5. Met wie delen wij uw gegevens?',
        content: `Wij verkopen uw persoonsgegevens niet aan derden. Wij kunnen uw gegevens delen met:

• Dienstverleners die ons helpen bij het leveren van onze diensten (bijv. hosting, betalingsverwerking)
• Overheidsinstanties wanneer wij daartoe wettelijk verplicht zijn
• Professionele adviseurs zoals advocaten en accountants

Al onze dienstverleners zijn contractueel verplicht om uw gegevens vertrouwelijk te behandelen.`
      },
      {
        title: '6. Hoe lang bewaren wij uw gegevens?',
        content: `Wij bewaren uw persoonsgegevens zo lang als nodig is voor de doeleinden waarvoor ze zijn verzameld, of zo lang als wettelijk vereist is.

• Accountgegevens: zolang uw account actief is, plus 2 jaar na beëindiging
• Financiële gegevens: minimaal 7 jaar conform Surinaamse belastingwetgeving
• Technische loggegevens: maximaal 12 maanden`
      },
      {
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
        title: '8. Cookies',
        content: `Onze website maakt gebruik van cookies en vergelijkbare technologieën om uw ervaring te verbeteren. Cookies zijn kleine tekstbestanden die op uw apparaat worden opgeslagen.

Wij gebruiken:
• Essentiële cookies: nodig voor het functioneren van de website
• Analytische cookies: om te begrijpen hoe bezoekers onze website gebruiken
• Functionele cookies: om uw voorkeuren te onthouden

U kunt cookies beheren via uw browserinstellingen.`
      },
      {
        title: '9. Wijzigingen in dit beleid',
        content: `Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen worden op deze pagina gepubliceerd met een bijgewerkte "laatst gewijzigd" datum. Wij raden u aan dit beleid regelmatig te raadplegen.`
      },
      {
        title: '10. Contact',
        content: `Als u vragen heeft over dit privacybeleid of onze gegevensverwerkingspraktijken, kunt u contact met ons opnemen:

Facturatie N.V.
E-mail: privacy@facturatie.sr
Telefoon: +597 893-4982
Adres: Paramaribo, Suriname`
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
              <Link to="/voorwaarden" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Voorwaarden</Link>
              <Link to="/privacy" className="text-sm font-medium text-emerald-600">Privacy</Link>
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
              <Link to="/privacy" className="block py-2 text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Privacy</Link>
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
