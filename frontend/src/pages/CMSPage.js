import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, Menu, X, FileText, Lock } from 'lucide-react';
import api from '../lib/api';

export default function CMSPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pageRes, settingsRes, menuRes] = await Promise.all([
        api.get(`/public/cms/page/${slug}`),
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/cms/menu').catch(() => ({ data: { items: [] } }))
      ]);
      
      setPage(pageRes.data);
      setSettings(settingsRes.data || {});
      setMenuItems(menuRes.data?.items?.filter(item => item.is_visible) || []);
    } catch (err) {
      setError('Pagina niet gevonden');
    } finally {
      setLoading(false);
    }
  };

  // Render a section based on its type
  const renderSection = (section, index) => {
    if (section.is_visible === false) return null;

    switch (section.type) {
      case 'hero':
        return (
          <section key={index} className="py-16 md:py-24" style={{ backgroundColor: section.background_color || '#0caf60', color: section.text_color || '#ffffff' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{section.title}</h1>
              {section.subtitle && <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-3xl mx-auto">{section.subtitle}</p>}
              {section.content && <p className="text-lg opacity-80 mb-8">{section.content}</p>}
              {section.button_text && (
                <Button size="lg" variant="secondary" asChild>
                  <Link to={section.button_link || '/'}>{section.button_text}</Link>
                </Button>
              )}
            </div>
          </section>
        );

      case 'text':
        return (
          <section key={index} className="py-16 md:py-24" style={{ backgroundColor: section.background_color || 'transparent' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>}
              {section.subtitle && <p className="text-xl text-muted-foreground mb-6">{section.subtitle}</p>}
              {section.content && (
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  {section.content.split('\n').map((p, i) => p.trim() && <p key={i} className="mb-4">{p}</p>)}
                </div>
              )}
            </div>
          </section>
        );

      case 'features':
        return (
          <section key={index} className="py-16 md:py-24 bg-muted/30" style={{ backgroundColor: section.background_color }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {section.title && (
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
                  {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {section.items?.map((item, i) => (
                  <div key={i} className="bg-background border rounded-xl p-6">
                    {item.icon && <div className="text-3xl mb-4">{item.icon}</div>}
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section key={index} className="py-16 md:py-24" style={{ backgroundColor: section.background_color || '#0caf60', color: section.text_color || '#ffffff' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>
              {section.subtitle && <p className="text-xl opacity-90 mb-8">{section.subtitle}</p>}
              {section.button_text && (
                <Button size="lg" variant="secondary" asChild>
                  <Link to={section.button_link || '/'}>{section.button_text}</Link>
                </Button>
              )}
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key={index} className="py-16 md:py-24" style={{ backgroundColor: section.background_color || 'transparent' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">{section.title}</h2>}
              {section.subtitle && <p className="text-xl text-muted-foreground mb-8 text-center">{section.subtitle}</p>}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {settings?.company_email && (
                    <p><strong>Email:</strong> {settings.company_email}</p>
                  )}
                  {settings?.company_phone && (
                    <p><strong>Telefoon:</strong> {settings.company_phone}</p>
                  )}
                  {settings?.company_address && (
                    <p><strong>Adres:</strong> {settings.company_address}</p>
                  )}
                </div>
                {section.content && (
                  <div className="prose text-muted-foreground">
                    {section.content.split('\n').map((p, i) => p.trim() && <p key={i}>{p}</p>)}
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      case 'image_text':
        return (
          <section key={index} className="py-16 md:py-24" style={{ backgroundColor: section.background_color || 'transparent' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className={section.layout === 'image-right' ? 'order-1' : 'order-2 lg:order-1'}>
                  {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>}
                  {section.subtitle && <p className="text-xl text-muted-foreground mb-4">{section.subtitle}</p>}
                  {section.content && (
                    <div className="prose text-muted-foreground">
                      {section.content.split('\n').map((p, i) => p.trim() && <p key={i}>{p}</p>)}
                    </div>
                  )}
                </div>
                <div className={section.layout === 'image-right' ? 'order-2' : 'order-1 lg:order-2'}>
                  {section.image_url && <img src={section.image_url} alt={section.title || ''} className="rounded-2xl shadow-xl w-full" />}
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return (
          <section key={index} className="py-16 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {section.title && <h2 className="text-3xl font-bold mb-6">{section.title}</h2>}
              {section.content && <p className="text-muted-foreground">{section.content}</p>}
            </div>
          </section>
        );
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {menuItems.filter(item => item.link !== '/').map((item, index) => (
                <Link 
                  key={index}
                  to={item.link}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>Inloggen</Button>
              <Button onClick={() => navigate('/register')}>Gratis Starten</Button>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <div className="px-4 py-4 space-y-3">
              {menuItems.filter(item => item.link !== '/').map((item, index) => (
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

      {/* Page Content */}
      <main className="pt-16">
        {error || !page ? (
          <div className="py-32 text-center">
            <h1 className="text-4xl font-bold mb-4">Pagina niet gevonden</h1>
            <p className="text-muted-foreground mb-8">De pagina die u zoekt bestaat niet.</p>
            <Button asChild><Link to="/">Terug naar Home</Link></Button>
          </div>
        ) : (
          <>
            {page.sections?.length > 0 ? (
              page.sections.map((section, index) => renderSection(section, index))
            ) : (
              <div className="py-32 text-center">
                <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
                <p className="text-muted-foreground">Deze pagina heeft nog geen inhoud.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12">
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
            <div>
              <h4 className="font-semibold text-foreground mb-4">Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
                {menuItems.filter(item => item.link !== '/').slice(0, 3).map((item, index) => (
                  <li key={index}>
                    <Link to={item.link} className="text-muted-foreground hover:text-foreground">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li><Link to="/voorwaarden" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><FileText className="w-4 h-4" />Algemene Voorwaarden</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><Lock className="w-4 h-4" />Privacybeleid</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
