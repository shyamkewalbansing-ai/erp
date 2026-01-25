import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, ArrowRight, Mail, Phone, MapPin, Check, Star, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import api from '../lib/api';

// Section Components
const HeroSection = ({ section, settings }) => (
  <section 
    className="relative py-20 lg:py-32 overflow-hidden"
    style={{ 
      backgroundColor: section.background_color || 'transparent',
      color: section.text_color || 'inherit'
    }}
  >
    {section.background_image_url && (
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${section.background_image_url})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>
    )}
    <div className="container mx-auto px-4 relative z-10">
      <div className={`max-w-4xl ${section.layout === 'center' ? 'mx-auto text-center' : section.layout === 'right' ? 'ml-auto text-right' : ''}`}>
        <h1 className="text-4xl lg:text-6xl font-bold mb-6">{section.title}</h1>
        {section.subtitle && (
          <p className="text-xl lg:text-2xl opacity-90 mb-8">{section.subtitle}</p>
        )}
        {section.content && (
          <p className="text-lg opacity-80 mb-8">{section.content}</p>
        )}
        {section.button_text && (
          <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
            <Link to={section.button_link || '#'}>
              {section.button_text}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  </section>
);

const TextSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ 
      backgroundColor: section.background_color || 'transparent',
      color: section.text_color || 'inherit'
    }}
  >
    <div className="container mx-auto px-4">
      <div className={`max-w-4xl ${section.layout === 'center' ? 'mx-auto text-center' : section.layout === 'right' ? 'ml-auto text-right' : ''}`}>
        {section.title && <h2 className="text-3xl lg:text-4xl font-bold mb-6">{section.title}</h2>}
        {section.subtitle && <p className="text-xl text-muted-foreground mb-6">{section.subtitle}</p>}
        {section.content && (
          <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />
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

const ImageTextSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      <div className={`grid lg:grid-cols-2 gap-12 items-center ${section.layout === 'image-right' ? '' : 'lg:flex-row-reverse'}`}>
        <div className={section.layout === 'image-right' ? 'order-1' : 'order-2 lg:order-1'}>
          {section.title && <h2 className="text-3xl lg:text-4xl font-bold mb-6">{section.title}</h2>}
          {section.subtitle && <p className="text-xl text-muted-foreground mb-4">{section.subtitle}</p>}
          {section.content && (
            <div className="prose prose-lg dark:prose-invert" dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />
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

const FeaturesSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {section.items?.map((item, index) => (
          <div key={index} className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-all hover:-translate-y-1">
            {item.icon && <div className="text-4xl mb-4">{item.icon}</div>}
            <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ 
      backgroundColor: section.background_color || '#3b82f6',
      color: section.text_color || 'white'
    }}
  >
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl lg:text-4xl font-bold mb-6">{section.title}</h2>
      {section.subtitle && <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">{section.subtitle}</p>}
      {section.button_text && (
        <Button size="lg" variant="secondary" asChild>
          <Link to={section.button_link || '#'}>
            {section.button_text}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      )}
    </div>
  </section>
);

const GallerySection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
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

const TestimonialsSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || '#f8fafc' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {section.items?.map((item, index) => (
          <div key={index} className="p-6 rounded-2xl bg-white shadow-lg dark:bg-card">
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
    <section 
      className="py-16 lg:py-24"
      style={{ backgroundColor: section.background_color || 'transparent' }}
    >
      <div className="container mx-auto px-4">
        {section.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
            {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-4">
          {section.items?.map((item, index) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-card">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50"
              >
                <span className="font-medium">{item.question}</span>
                {openIndex === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openIndex === index && (
                <div className="p-4 pt-0 text-muted-foreground">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ContactSection = ({ section, settings }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Mail className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">Email</h3>
              <p className="text-muted-foreground">{settings?.company_email || 'info@facturatie.sr'}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Phone className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">Telefoon</h3>
              <p className="text-muted-foreground">{settings?.company_phone || '+597 8934982'}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">Adres</h3>
              <p className="text-muted-foreground">{settings?.company_address || 'Paramaribo, Suriname'}</p>
            </div>
          </div>
        </div>
        <div>
          {section.content && (
            <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: section.content }} />
          )}
        </div>
      </div>
    </div>
  </section>
);

const PricingSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {section.items?.map((item, index) => (
          <div key={index} className={`p-8 rounded-2xl border-2 ${item.featured ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <h3 className="text-2xl font-bold mb-2">{item.name}</h3>
            <div className="text-4xl font-bold mb-4">
              {item.price}
              {item.period && <span className="text-lg font-normal text-muted-foreground">/{item.period}</span>}
            </div>
            <p className="text-muted-foreground mb-6">{item.description}</p>
            <ul className="space-y-3 mb-8">
              {item.features?.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={item.featured ? 'default' : 'outline'} asChild>
              <Link to={item.button_link || '/register'}>{item.button_text || 'Kies Plan'}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TeamSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      {section.title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && <p className="text-xl text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {section.items?.map((item, index) => (
          <div key={index} className="text-center">
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" />
            )}
            <h3 className="font-semibold text-lg">{item.name}</h3>
            {item.role && <p className="text-primary">{item.role}</p>}
            {item.description && <p className="text-muted-foreground mt-2">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Section Renderer
const renderSection = (section, index, settings) => {
  if (!section.is_visible) return null;
  
  const key = section.id || index;
  
  switch (section.type) {
    case 'hero':
      return <HeroSection key={key} section={section} settings={settings} />;
    case 'text':
      return <TextSection key={key} section={section} />;
    case 'image_text':
      return <ImageTextSection key={key} section={section} />;
    case 'features':
      return <FeaturesSection key={key} section={section} />;
    case 'cta':
      return <CTASection key={key} section={section} />;
    case 'gallery':
      return <GallerySection key={key} section={section} />;
    case 'testimonials':
      return <TestimonialsSection key={key} section={section} />;
    case 'faq':
      return <FAQSection key={key} section={section} />;
    case 'contact':
      return <ContactSection key={key} section={section} settings={settings} />;
    case 'pricing':
      return <PricingSection key={key} section={section} />;
    case 'team':
      return <TeamSection key={key} section={section} />;
    default:
      return <TextSection key={key} section={section} />;
  }
};

// Footer Component
const CMSFooter = ({ footer, settings }) => {
  if (!footer) return null;
  
  return (
    <footer 
      className="py-12"
      style={{ 
        backgroundColor: footer.background_color || '#1f2937',
        color: footer.text_color || '#ffffff'
      }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Company Info */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-bold mb-4 block">{settings?.company_name || 'Facturatie N.V.'}</Link>
            <p className="opacity-80 text-sm">{settings?.footer_text}</p>
          </div>
          
          {/* Footer Columns */}
          {footer.columns?.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.links?.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link to={link.url} className="opacity-80 hover:opacity-100 transition-opacity text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {footer.copyright_text && (
          <div className="border-t border-white/20 pt-8 text-center opacity-80 text-sm">
            {footer.copyright_text}
          </div>
        )}
      </div>
    </footer>
  );
};

// Main Public Page Component
export default function PublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [footer, setFooter] = useState(null);
  const [menu, setMenu] = useState(null);
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
      
      const pageSlug = slug || 'home';
      
      const [pageRes, settingsRes, footerRes, menuRes] = await Promise.all([
        api.get(`/public/cms/page/${pageSlug}`).catch(() => null),
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/cms/footer').catch(() => ({ data: {} })),
        api.get('/public/cms/menu').catch(() => ({ data: { items: [] } }))
      ]);
      
      if (pageRes?.data) {
        setPage(pageRes.data);
      } else {
        setError('Pagina niet gevonden');
      }
      
      setSettings(settingsRes?.data || {});
      setFooter(footerRes?.data || {});
      setMenu(menuRes?.data || { items: [] });
    } catch (err) {
      setError('Fout bij laden van pagina');
    } finally {
      setLoading(false);
    }
  };

  // Filter menu items to only show visible ones
  const visibleMenuItems = menu?.items?.filter(item => item.is_visible) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Header Component
  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.company_name || 'Logo'} className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-bold text-primary">{settings?.company_name || 'Facturatie N.V.'}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {visibleMenuItems.map((item, index) => (
              <Link 
                key={index} 
                to={item.link} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                target={item.open_in_new_tab ? '_blank' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Inloggen
            </Button>
            <Button onClick={() => navigate('/register')}>
              Registreren
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-3">
              {visibleMenuItems.map((item, index) => (
                <Link 
                  key={index} 
                  to={item.link} 
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                  Inloggen
                </Button>
                <Button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                  Registreren
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Pagina niet gevonden</h1>
            <p className="text-muted-foreground mb-8">De pagina die u zoekt bestaat niet of is niet gepubliceerd.</p>
            <Button asChild>
              <Link to="/">Terug naar Home</Link>
            </Button>
          </div>
        </div>
        <CMSFooter footer={footer} settings={settings} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      {page.show_header !== false && <Header />}
      
      {/* Page Content */}
      <main className={`flex-1 ${page.show_header !== false ? 'pt-16' : ''}`}>
        {page.sections?.map((section, index) => renderSection(section, index, settings))}
      </main>
      
      {/* Footer */}
      {page.show_footer !== false && (
        <CMSFooter footer={footer} settings={settings} />
      )}
      
      {/* Custom CSS */}
      {page.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
      )}
    </div>
  );
}
