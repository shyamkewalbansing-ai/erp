import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X, Play } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Prijzen', path: '/prijzen' },
  { label: 'Modules', path: '/modules-overzicht' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

export default function PublicNav({ logoUrl, companyName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const defaultLogo = "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp";

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200" data-testid="public-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <img 
              src={logoUrl || defaultLogo}
              alt={companyName || "Facturatie N.V."}
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-emerald-600'
                    : 'text-slate-600 hover:text-emerald-600'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-slate-700"
              data-testid="nav-login-btn"
            >
              Inloggen
            </Button>
            <Button 
              onClick={() => navigate('/modules-overzicht?order=true')} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full px-6 shadow-lg shadow-emerald-500/25"
              data-testid="nav-register-btn"
            >
              Gratis Starten
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700"
            data-testid="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100" data-testid="nav-mobile-menu">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block py-2 px-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'text-emerald-600 bg-emerald-50 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                >
                  Inloggen
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                  onClick={() => { navigate('/modules-overzicht?order=true'); setMobileMenuOpen(false); }}
                >
                  Gratis Starten
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
