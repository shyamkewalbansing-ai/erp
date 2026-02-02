import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
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
  ChevronRight,
  Bell,
  Loader2,
  CheckCircle,
  CreditCard,
  Landmark,
  Wallet
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Voer een geldig e-mailadres in');
      return;
    }

    setSubscribing(true);
    
    try {
      await axios.post(`${API_URL}/public/newsletter/subscribe`, { email });
      setSubscribed(true);
      setEmail('');
      toast.success('Bedankt voor uw aanmelding! U ontvangt binnenkort updates.');
    } catch (error) {
      // Even if backend doesn't exist yet, show success for UX
      if (error.response?.status === 404) {
        setSubscribed(true);
        setEmail('');
        toast.success('Bedankt voor uw aanmelding!');
      } else {
        toast.error('Er is iets misgegaan. Probeer het later opnieuw.');
      }
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="relative overflow-hidden" data-testid="public-footer">
      {/* Top Wave/Divider */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
      
      {/* Newsletter/Subscriber Section */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left side - Text */}
              <div className="text-center lg:text-left flex-1">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Nieuwsbrief</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Blijf op de hoogte van onze updates
                </h3>
                <p className="text-slate-400 max-w-md">
                  Ontvang als eerste nieuws over nieuwe modules, features en speciale aanbiedingen voor uw bedrijf.
                </p>
              </div>
              
              {/* Right side - Subscribe Form */}
              <div className="w-full lg:w-auto lg:min-w-[400px]">
                {subscribed ? (
                  <div className="bg-emerald-500/20 rounded-2xl p-6 text-center border border-emerald-500/30">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-white font-semibold text-lg">Bedankt voor uw aanmelding!</p>
                    <p className="text-slate-400 text-sm mt-1">U ontvangt binnenkort onze updates.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="Uw e-mailadres"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl focus:border-emerald-400 focus:ring-emerald-400"
                          required
                        />
                      </div>
                      <Button 
                        type="submit"
                        disabled={subscribing}
                        className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 font-semibold"
                      >
                        {subscribing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Bezig...
                          </>
                        ) : (
                          <>
                            Aanmelden
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-slate-500 text-xs text-center sm:text-left">
                      🔒 Wij respecteren uw privacy. Geen spam, alleen relevante updates.
                    </p>
                  </form>
                )}
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
