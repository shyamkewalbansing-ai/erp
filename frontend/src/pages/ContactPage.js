import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLandingSections, getLandingSettings, getPublicAddons, createPublicOrder, formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Check } from 'lucide-react';

export default function ContactPage() {
  const [section, setSection] = useState(null);
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Order form state
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsRes, settingsRes, addonsRes] = await Promise.all([
        getLandingSections(),
        getLandingSettings(),
        getPublicAddons()
      ]);
      const contactSection = sectionsRes.data.find(s => s.section_type === 'contact');
      setSection(contactSection);
      setSettings(settingsRes.data);
      setAddons(addonsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getTotalPrice = () => {
    return addons
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + (a.price || 0), 0);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (selectedAddons.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }
    
    setSubmitting(true);
    try {
      await createPublicOrder({
        ...orderForm,
        addon_ids: selectedAddons
      });
      toast.success('Uw bestelling is ontvangen! Wij nemen zo snel mogelijk contact met u op.');
      setOrderForm({ name: '', email: '', phone: '', company_name: '', message: '' });
      setSelectedAddons([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {section?.title || 'Contact'}
          </h1>
          {section?.subtitle && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {section.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              {section?.content && (
                <p className="text-muted-foreground mb-8">{section.content}</p>
              )}
              
              <div className="space-y-6">
                {settings?.company_email && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <a href={`mailto:${settings.company_email}`} className="text-foreground font-medium hover:text-primary text-lg">
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
                      <a href={`tel:${settings.company_phone}`} className="text-foreground font-medium hover:text-primary text-lg">
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
                      <p className="text-foreground font-medium text-lg">{settings.company_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Form */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Direct Bestellen</CardTitle>
                <CardDescription>Vul het formulier in en wij nemen contact met u op</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Naam *</Label>
                      <Input 
                        required
                        value={orderForm.name}
                        onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                        placeholder="Uw volledige naam"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedrijfsnaam</Label>
                      <Input 
                        value={orderForm.company_name}
                        onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                        placeholder="Uw bedrijfsnaam"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail *</Label>
                      <Input 
                        type="email"
                        required
                        value={orderForm.email}
                        onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                        placeholder="uw@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefoon *</Label>
                      <Input 
                        required
                        value={orderForm.phone}
                        onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                        placeholder="+597 ..."
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Selecteer Module(s) *</Label>
                    <div className="grid gap-2">
                      {addons.map((addon) => (
                        <div 
                          key={addon.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            selectedAddons.includes(addon.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleAddonSelection(addon.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedAddons.includes(addon.id)}
                              onCheckedChange={() => toggleAddonSelection(addon.id)}
                            />
                            <span className="font-medium">{addon.name}</span>
                          </div>
                          <span className="text-primary font-semibold">{formatCurrency(addon.price)}/mnd</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bericht (optioneel)</Label>
                    <Textarea 
                      value={orderForm.message}
                      onChange={(e) => setOrderForm({...orderForm, message: e.target.value})}
                      placeholder="Heeft u nog vragen of opmerkingen?"
                      rows={3}
                    />
                  </div>

                  {selectedAddons.length > 0 && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Totaal per maand:</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(getTotalPrice())}</span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12" disabled={submitting || selectedAddons.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verzenden...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Bestelling Versturen
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/voorwaarden" className="hover:text-foreground">Algemene Voorwaarden</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacybeleid</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
