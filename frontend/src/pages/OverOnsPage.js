import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Menu,
  X,
  Phone,
  Users,
  Target,
  Award,
  Heart,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const ChatWidget = lazy(() => import('../components/ChatWidget'));

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function OverOnsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/public/landing/settings`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const values = [
    {
      icon: Heart,
      title: 'Klantgericht',
      description: 'Wij luisteren naar onze klanten en bouwen oplossingen die echte problemen oplossen.'
    },
    {
      icon: Shield,
      title: 'Betrouwbaar',
      description: 'Uw gegevens zijn veilig bij ons. Wij garanderen 99.9% uptime en SSL-encryptie.'
    },
    {
      icon: Zap,
      title: 'Innovatief',
      description: 'Wij blijven voorop lopen met de nieuwste technologieën en beste praktijken.'
    },
    {
      icon: Globe,
      title: 'Lokaal',
      description: 'Speciaal ontwikkeld voor Surinaamse bedrijven met lokale ondersteuning.'
    }
  ];

  const stats = [
    { number: '500+', label: 'Tevreden Klanten' },
    { number: '10K+', label: 'Facturen Verstuurd' },
    { number: '99.9%', label: 'Uptime' },
    { number: '24/7', label: 'Ondersteuning' }
  ];

  const team = [
    { name: 'Kewal Bansing', role: 'Oprichter & CEO', description: 'Visie en strategie' },
    { name: 'Support Team', role: 'Klantenservice', description: 'Altijd klaar om te helpen' },
    { name: 'Dev Team', role: 'Ontwikkeling', description: 'Bouwen aan de toekomst' }
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
              <Link to="/over-ons" className="text-sm font-medium text-emerald-600">Over Ons</Link>
              <Link to="/voorwaarden" className="text-sm font-medium text-gray-700 hover:text-emerald-600">Voorwaarden</Link>
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
              <Link to="/over-ons" className="block py-2 text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Over Ons</Link>
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full bg-emerald-500" onClick={() => navigate('/prijzen')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Over <span className="text-emerald-500">Facturatie N.V.</span>
            </h1>
            <p className="text-xl text-gray-600">
              Wij zijn het toonaangevende Surinaamse platform voor digitale facturatie en bedrijfsadministratie. 
              Ons doel is om Surinaamse ondernemers te helpen groeien met moderne, gebruiksvriendelijke software.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-emerald-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-emerald-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Onze Missie
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Wij geloven dat elke ondernemer in Suriname toegang moet hebben tot professionele bedrijfssoftware. 
                Daarom hebben wij Facturatie.sr ontwikkeld – een alles-in-één platform dat speciaal is ontworpen 
                voor de Surinaamse markt.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Van kleine eenmanszaken tot grote bedrijven, wij bieden oplossingen die meegroeien met uw onderneming. 
                Met lokale support, prijzen in SRD en functies die zijn afgestemd op Surinaamse regelgeving.
              </p>
              <ul className="space-y-3">
                {['Facturatie in SRD', 'Lokale belastingregels', '24/7 Surinaamse support', 'Geen buitenlandse servers'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl p-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Onze Visie</h3>
                    <p className="text-sm text-gray-500">2025 en verder</p>
                  </div>
                </div>
                <p className="text-gray-600">
                  &quot;Elke Surinaamse ondernemer verdient toegang tot wereldklasse bedrijfssoftware, 
                  zonder de complexiteit en kosten van internationale oplossingen.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Onze Kernwaarden</h2>
            <p className="text-xl text-gray-600">Waar wij voor staan</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ons Team</h2>
            <p className="text-xl text-gray-600">De mensen achter Facturatie.sr</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-8">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-emerald-600 font-medium mb-2">{member.role}</p>
                  <p className="text-gray-500 text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-500 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Sluit u aan bij 500+ Surinaamse bedrijven die al gebruik maken van Facturatie.sr
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/prijzen')} className="h-14 px-8 text-lg">
            Bekijk Prijzen <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
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
