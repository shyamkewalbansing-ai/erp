import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, ArrowRight, Mail, Phone, MapPin, Check, Star, ChevronDown, ChevronUp, Menu, X, FileText, Lock } from 'lucide-react';
import api from '../lib/api';

// Section Components - same styling as LandingPage
const HeroSection = ({ section }) => (
  <section 
    className="relative py-16 md:py-24 overflow-hidden"
    style={{ 
      backgroundColor: section.background_color || 'transparent',
      color: section.text_color || 'inherit'
    }}
  >
    {section.image_url ? (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {section.title}
            </h1>
            {section.subtitle && (
              <p className="text-xl text-muted-foreground max-w-lg">
                {section.subtitle}
              </p>
            )}
            {section.content && (
              <p className="text-muted-foreground">{section.content}</p>
            )}
            {section.button_text && (
              <Button size="lg" className="h-14 px-8 text-lg" asChild>
                <Link to={section.button_link || '#'}>
                  {section.button_text}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
            <img 
              src={section.image_url}
              alt={section.title}
              className="relative rounded-3xl shadow-2xl w-full max-w-lg mx-auto"
            />
          </div>
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
    )}
    {!section.image_url && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className={`space-y-8 ${section.layout === 'center' ? 'text-center max-w-4xl mx-auto' : ''}`}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {section.title}
          </h1>
          {section.subtitle && (
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              {section.subtitle}
            </p>
          )}
          {section.content && (
            <p className="text-muted-foreground">{section.content}</p>
          )}
          {section.button_text && (
            <Button size="lg" className="h-14 px-8 text-lg" asChild>
              <Link to={section.button_link || '#'}>
                {section.button_text}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    )}
  </section>
);

const TextSection = ({ section }) => (
  <section 
    className="py-16 md:py-24"
    style={{ 
      backgroundColor: section.background_color || 'transparent',
      color: section.text_color || 'inherit'
    }}
  >
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={section.layout === 'center' ? 'text-center' : ''}>
        {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>}
        {section.subtitle && <p className="text-xl text-muted-foreground mb-8">{section.subtitle}</p>}
        {section.content && (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            {section.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4">{paragraph}</p>
            ))}
          </div>
        )}
        {section.button_text && (
          <Button className="mt-8" asChild>
            <Link to={section.button_link || '#'}>{section.button_text}</Link>
          </Button>
        )}
      </div>
    </div>
  </section>
);

const FeaturesSection = ({ section }) => (
  <section 
    className="py-16 md:py-24 bg-muted/30"
    style={{ backgroundColor: section.background_color || undefined }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {section.title && (
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {section.items?.map((item, index) => (
          <div key={index} className="bg-background border border-border/50 rounded-xl p-6 hover:shadow-lg transition-shadow">
            {item.icon && <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-2xl">{item.icon}</div>}
            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
            <p className="text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = ({ section }) => (
  <section 
    className="py-16 md:py-24"
    style={{ 
      backgroundColor: section.background_color || '#0caf60',
      color: section.text_color || 'white'
    }}
  >
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>
      {section.subtitle && <p className="text-xl opacity-90 mb-8">{section.subtitle}</p>}
      {section.button_text && (
        <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" asChild>
          <Link to={section.button_link || '#'}>
            {section.button_text}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      )}
    </div>
  </section>
);

const ContactSection = ({ section, settings }) => (
  <section className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>}
          {section.subtitle && <p className="text-xl text-muted-foreground mb-8">{section.subtitle}</p>}
          
          <div className="space-y-4">
            {settings?.company_email && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <a href={`mailto:${settings.company_email}`} className="font-medium hover:text-primary">
                    {settings.company_email}
                  </a>
                </div>
              </div>
            )}
            {settings?.company_phone && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefoon</p>
                  <a href={`tel:${settings.company_phone}`} className="font-medium hover:text-primary">
                    {settings.company_phone}
                  </a>
                </div>
              </div>
            )}
            {settings?.company_address && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adres</p>
                  <p className="font-medium">{settings.company_address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {section.content && (
          <div className="prose prose-lg max-w-none">
            {section.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </div>
    </div>
  </section>
);

const TestimonialsSection = ({ section }) => (
  <section className="py-16 md:py-24 bg-muted/30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {section.title && (
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {section.items?.map((item, index) => (
          <div key={index} className="bg-background border rounded-xl p-6">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < (item.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
            <p className="text-lg mb-4 italic">"{item.content || item.text}"</p>
            <div className="flex items-center gap-3">
              {item.avatar && <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full" />}
              <div>
                <p className="font-semibold">{item.name}</p>
                {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FAQSection = ({ section }) => {
  const [openIndex, setOpenIndex] = useState(null);
  
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
          </div>
        )}
        <div className="space-y-4">
          {section.items?.map((item, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50"
              >
                <span className="font-medium">{item.question}</span>
                {openIndex === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openIndex === index && (
                <div className="p-4 pt-0 text-muted-foreground">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const GallerySection = ({ section }) => (
  <section className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {section.items?.map((item, index) => (
          <div key={index} className="aspect-square rounded-lg overflow-hidden">
            <img src={item.image_url || item.url} alt={item.title || ''} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ImageTextSection = ({ section }) => (
  <section className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`grid lg:grid-cols-2 gap-12 items-center`}>
        <div className={section.layout === 'image-right' ? 'order-1' : 'order-2 lg:order-1'}>
          {section.title && <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>}
          {section.subtitle && <p className="text-xl text-muted-foreground mb-4">{section.subtitle}</p>}
          {section.content && (
            <div className="prose prose-lg text-muted-foreground">
              {section.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          {section.button_text && (
            <Button className="mt-6" asChild>
              <Link to={section.button_link || '#'}>{section.button_text}</Link>
            </Button>
          )}
        </div>
        <div className={section.layout === 'image-right' ? 'order-2' : 'order-1 lg:order-2'}>
          {section.image_url && (
            <img src={section.image_url} alt={section.title || ''} className="rounded-2xl shadow-xl w-full" />
          )}
        </div>
      </div>
    </div>
  </section>
);

// Section Renderer
const renderSection = (section, index, settings) => {
  if (section.is_visible === false) return null;
  
  const key = section.id || index;
  
  switch (section.type) {
    case 'hero': return <HeroSection key={key} section={section} />;
    case 'text': return <TextSection key={key} section={section} />;
    case 'features': return <FeaturesSection key={key} section={section} />;
    case 'cta': return <CTASection key={key} section={section} />;
    case 'contact': return <ContactSection key={key} section={section} settings={settings} />;
    case 'testimonials': return <TestimonialsSection key={key} section={section} />;
    case 'faq': return <FAQSection key={key} section={section} />;
    case 'gallery': return <GallerySection key={key} section={section} />;
    case 'image_text': return <ImageTextSection key={key} section={section} />;
    default: return <TextSection key={key} section={section} />;
  }
};

export default function DynamicPage() {
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
        api.get('/public/landing/settings'),
        api.get('/public/cms/menu').catch(() => ({ data: { items: [] } }))
      ]);
      
      setPage(pageRes.data);
      setSettings(settingsRes.data);
      const items = menuRes.data?.items?.filter(item => item.is_visible) || [];
      setMenuItems(items);
    } catch (err) {
      setError('Pagina niet gevonden');
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

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation - same as LandingPage */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                  alt="Logo"
                  className="h-8 w-auto"
                />
              </Link>
              <Button variant="ghost" onClick={() => navigate('/login')}>Inloggen</Button>
            </div>
          </div>
        </nav>
        
        <div className="pt-32 pb-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Pagina niet gevonden</h1>
          <p className="text-muted-foreground mb-8">De pagina die u zoekt bestaat niet.</p>
          <Button asChild><Link to="/">Terug naar Home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - EXACT same as LandingPage */}
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

            {/* Desktop Navigation - All from CMS */}
            <div className="hidden md:flex items-center gap-8">
              {menuItems.map((item, index) => (
                <Link 
                  key={index}
                  to={item.link === '/' ? '/' : `/pagina${item.link}`}
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
                  to={item.link === '/' ? '/' : `/pagina${item.link}`}
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
        {page.sections?.map((section, index) => renderSection(section, index, settings))}
      </main>

      {/* Footer - EXACT same as LandingPage */}
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
                {settings?.footer_text || "Modulaire bedrijfssoftware voor ondernemers in Suriname. Kies de modules die passen bij uw bedrijfsvoering."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Links</h4>
              <ul className="space-y-2">
                {menuItems.slice(0, 4).map((item, index) => (
                  <li key={index}>
                    <Link 
                      to={item.link === '/' ? '/' : `/pagina${item.link}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Juridisch</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/voorwaarden" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Algemene Voorwaarden
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Privacybeleid
                  </Link>
                </li>
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
