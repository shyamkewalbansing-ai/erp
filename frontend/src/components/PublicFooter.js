import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  navigatie: [
    { label: 'Home', path: '/' },
    { label: 'Prijzen', path: '/prijzen' },
    { label: 'Modules', path: '/modules-overzicht' },
    { label: 'Over Ons', path: '/over-ons' },
  ],
  juridisch: [
    { label: 'Algemene Voorwaarden', path: '/voorwaarden' },
    { label: 'Privacybeleid', path: '/privacy' },
  ],
};

export default function PublicFooter({ logoUrl, companyName }) {
  const defaultLogo = "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white" data-testid="public-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img 
                src={logoUrl || defaultLogo}
                alt={companyName || "Facturatie N.V."}
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-slate-400 text-sm max-w-md">
              {companyName || "Facturatie N.V."} biedt complete ERP-oplossingen voor Surinaamse bedrijven. 
              Van vastgoedbeheer tot HRM en autohandel - alles in één platform.
            </p>
            <div className="mt-4 flex gap-4">
              <a href="mailto:info@facturatie.sr" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                info@facturatie.sr
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Navigatie</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.navigatie.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-slate-400 hover:text-emerald-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/login" 
                  className="text-slate-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Aanmelden
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Juridisch</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.juridisch.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-slate-400 hover:text-emerald-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {currentYear} {companyName || "Facturatie N.V."}. Alle rechten voorbehouden.
          </p>
          <p className="text-slate-500 text-sm">
            Made with ❤️ in Suriname
          </p>
        </div>
      </div>
    </footer>
  );
}
