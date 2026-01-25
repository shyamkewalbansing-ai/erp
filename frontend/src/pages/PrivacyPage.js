import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLandingSections, getLandingSettings } from '../lib/api';
import { Button } from '../components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const [section, setSection] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsRes, settingsRes] = await Promise.all([
        getLandingSections(),
        getLandingSettings()
      ]);
      const privacySection = sectionsRes.data.find(s => s.section_type === 'privacy');
      setSection(privacySection);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error:', error);
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={settings?.logo_url || "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"}
                alt={settings?.company_name || "Facturatie N.V."}
                className="h-8 w-auto"
              />
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {section ? (
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-4">{section.title}</h1>
            {section.subtitle && (
              <p className="text-xl text-muted-foreground mb-8">{section.subtitle}</p>
            )}
            {section.content && (
              <div className="text-foreground/80 space-y-4">
                {section.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return <h3 key={index} className="font-semibold text-foreground mt-6 mb-2">{paragraph.replace(/\*\*/g, '')}</h3>;
                  }
                  if (paragraph.includes('**')) {
                    const parts = paragraph.split('**');
                    return (
                      <p key={index}>
                        {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                      </p>
                    );
                  }
                  return <p key={index}>{paragraph}</p>;
                })}
              </div>
            )}
          </article>
        ) : (
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacybeleid</h1>
            <p className="text-muted-foreground">Deze pagina is nog niet geconfigureerd.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>
  );
}
