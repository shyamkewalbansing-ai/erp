import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function PublicLayout({ children, settings: propSettings }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(propSettings || null);
  const [menuItems, setMenuItems] = useState([]);
  const [footer, setFooter] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(!propSettings);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, menuRes, footerRes] = await Promise.all([
        propSettings ? Promise.resolve({ data: propSettings }) : api.get('/public/landing/settings'),
        api.get('/public/cms/menu'),
        api.get('/public/cms/footer')
      ]);
      
      if (!propSettings) setSettings(settingsRes.data);
      setMenuItems(menuRes.data?.items?.filter(item => item.is_visible) || []);
      setFooter(footerRes.data);
    } catch (error) {
      console.error('Error loading layout data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {menuItems.map((item, index) => (
                <Link 
                  key={index}
                  to={item.link} 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Inloggen
              </Button>
              <Button onClick={() => navigate('/register')}>
                Gratis Starten
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <div className="px-4 py-4 space-y-3">
              {menuItems.map((item, index) => (
                <Link 
                  key={index}
                  to={item.link} 
                  className="block text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Inloggen</Button>
                <Button className="w-full" onClick={() => navigate('/register')}>Gratis Starten</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer 
        className="border-t py-12"
        style={{ 
          backgroundColor: footer?.background_color || '#f8fafc',
          color: footer?.text_color || 'inherit'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto mb-4"
              />
              <p className="text-muted-foreground max-w-md">
                {settings?.footer_text || "Modulaire bedrijfssoftware voor ondernemers in Suriname."}
              </p>
            </div>
            
            {/* Dynamic Footer Columns */}
            {footer?.columns?.map((column, index) => (
              <div key={index}>
                <h4 className="font-semibold mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links?.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link to={link.url} className="text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>{footer?.copyright_text || `© ${new Date().getFullYear()} ${settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.`}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
