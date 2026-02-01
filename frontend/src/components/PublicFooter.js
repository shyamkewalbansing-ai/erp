import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  Car,
  MessageSquare,
  Globe,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';

const FOOTER_LINKS = {
  modules: [
    { label: 'Vastgoed Beheer', path: '/modules/vastgoed-beheer', icon: Building2 },
    { label: 'HRM Module', path: '/modules/hrm', icon: Users },
    { label: 'Auto Dealer', path: '/modules/auto-dealer', icon: Car },
    { label: 'AI Chatbot', path: '/modules/ai-chatbot', icon: MessageSquare },
    { label: 'Website CMS', path: '/modules/website-cms', icon: Globe },
    { label: 'Rapportage', path: '/modules/rapportage', icon: BarChart3 },
  ],
  navigatie: [
    { label: 'Home', path: '/' },
    { label: 'Modules', path: '/modules-overzicht' },
    { label: 'Prijzen', path: '/prijzen' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
    { label: 'Demo', path: '/demo' },
  ],
  support: [
    { label: 'Inloggen', path: '/login' },
    { label: 'Aanmelden', path: '/prijzen' },
    { label: 'Documentatie', path: '/faq' },
    { label: 'Contact Support', path: '/contact' },
  ],
  juridisch: [
    { label: 'Algemene Voorwaarden', path: '/voorwaarden' },
    { label: 'Privacybeleid', path: '/privacy' },
    { label: 'Cookie Beleid', path: '/cookies' },
  ],
};

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

export default function PublicFooter({ logoUrl, companyName }) {
  const defaultLogo = "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden" data-testid="public-footer">
      {/* Top Wave/Divider */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
      
      {/* Newsletter Section */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">Blijf op de hoogte</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Start vandaag nog met onze modules
                </h3>
                <p className="text-slate-400">
                  Probeer 3 dagen gratis, geen creditcard nodig
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/demo">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 h-12 rounded-full shadow-lg shadow-emerald-500/25">
                    Probeer Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/prijzen">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-6 h-12 rounded-full">
                    Bekijk Prijzen
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
            
            {/* Logo & Contact Info - Takes 2 columns */}
            <div className="col-span-2">
              <Link to="/" className="inline-block mb-6">
                <img 
                  src={logoUrl || defaultLogo}
                  alt={companyName || "Facturatie N.V."}
                  className="h-10 w-auto brightness-0 invert"
                />
              </Link>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Complete ERP-oplossingen voor Surinaamse bedrijven. 
                Van vastgoedbeheer tot HRM en autohandel - alles in één modern platform.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <a href="tel:+5978123456" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group">
                  <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm">+597 8123456</span>
                </a>
                <a href="mailto:info@facturatie.sr" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group">
                  <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-sm">info@facturatie.sr</span>
                </a>
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Paramaribo, Suriname</span>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div>
              <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Modules</h3>
              <ul className="space-y-3">
                {FOOTER_LINKS.modules.slice(0, 5).map((link) => (
                  <li key={link.path}>
                    <Link 
                      to={link.path} 
                      className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Navigatie</h3>
              <ul className="space-y-3">
                {FOOTER_LINKS.navigatie.map((link) => (
                  <li key={link.path}>
                    <Link 
                      to={link.path} 
                      className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Support</h3>
              <ul className="space-y-3">
                {FOOTER_LINKS.support.map((link) => (
                  <li key={link.path}>
                    <Link 
                      to={link.path} 
                      className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Juridisch</h3>
              <ul className="space-y-3">
                {FOOTER_LINKS.juridisch.map((link) => (
                  <li key={link.path}>
                    <Link 
                      to={link.path} 
                      className="text-slate-400 hover:text-emerald-400 text-sm transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-slate-500 text-sm text-center md:text-left">
              © {currentYear} {companyName || "Facturatie N.V."}. Alle rechten voorbehouden.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Made in Suriname */}
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>in Suriname</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
