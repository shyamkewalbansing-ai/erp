import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, ArrowRight, Mail, Phone, MapPin, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
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
          <Button size="lg" asChild>
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
          <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />
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
            <div className="prose prose-lg" dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />
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
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {section.items?.map((item, index) => (
          <div key={index} className="p-6 rounded-2xl bg-card border hover:shadow-lg transition-shadow">
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
          <div key={index} className="p-6 rounded-2xl bg-white shadow-lg">
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
            <div key={index} className="border rounded-lg overflow-hidden">
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
            <div className="prose" dangerouslySetInnerHTML={{ __html: section.content }} />
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
              <Link to={item.button_link || '/prijzen'}>{item.button_text || 'Kies Plan'}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CustomHTMLSection = ({ section }) => (
  <section 
    className="py-16 lg:py-24"
    style={{ backgroundColor: section.background_color || 'transparent' }}
  >
    <div className="container mx-auto px-4">
      <div dangerouslySetInnerHTML={{ __html: section.content || '' }} />
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
    case 'custom_html':
      return <CustomHTMLSection key={key} section={section} />;
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
            <h3 className="text-xl font-bold mb-4">{settings?.company_name || 'Facturatie N.V.'}</h3>
            <p className="opacity-80 text-sm">{settings?.footer_text}</p>
            {footer.show_social_links && settings?.social_links && (
              <div className="flex gap-3 mt-4">
                {/* Social links here */}
              </div>
            )}
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

// Main CMS Page Component
export default function CMSPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [footer, setFooter] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pageSlug = slug || 'home';
      
      const [pageRes, settingsRes, footerRes, menuRes] = await Promise.all([
        api.get(`/api/public/cms/page/${pageSlug}`).catch(() => null),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              {settings?.company_name || 'Facturatie N.V.'}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {menu?.items?.map((item, index) => (
                <Link key={index} to={item.link} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button asChild>
              <Link to="/login">Inloggen</Link>
            </Button>
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center">
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {page.show_header !== false && (
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              {settings?.company_name || 'Facturatie N.V.'}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {menu?.items?.map((item, index) => (
                <Link key={index} to={item.link} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button asChild>
              <Link to="/login">Inloggen</Link>
            </Button>
          </div>
        </header>
      )}
      
      {/* Page Content */}
      <main className="flex-1">
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
