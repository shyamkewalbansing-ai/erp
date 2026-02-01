import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Clock, 
  MessageSquare,
  Building2,
  Loader2,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export default function ContactPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsRes = await api.get('/public/landing/settings').catch(() => ({ data: {} }));
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.message) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    setSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmitting(false);
    setSubmitted(true);
    toast.success('Bericht verzonden! Wij nemen zo snel mogelijk contact met u op.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30">
            <MessageSquare className="w-4 h-4 mr-2" />
            Neem Contact Op
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Wij staan voor u klaar
          </h1>
          
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Heeft u vragen over onze modules? Wilt u een demo? Of heeft u ondersteuning nodig?
            Neem gerust contact met ons op.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Contact Info Cards */}
            <div className="space-y-6">
              {/* Phone */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Telefoon</h3>
                <p className="text-slate-600 mb-3">Bel ons voor directe ondersteuning</p>
                <a href="tel:+5978123456" className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-2">
                  +597 8123456
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Email */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">E-mail</h3>
                <p className="text-slate-600 mb-3">Stuur ons een bericht</p>
                <a href="mailto:info@facturatie.sr" className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-2">
                  info@facturatie.sr
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Address */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-green-500 rounded-xl flex items-center justify-center mb-4">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Adres</h3>
                <p className="text-slate-600 mb-3">Bezoek ons kantoor</p>
                <p className="text-slate-700">
                  Paramaribo<br />
                  Suriname
                </p>
              </div>

              {/* Office Hours */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Openingstijden</h3>
                <p className="text-slate-600 mb-3">Wanneer zijn wij bereikbaar</p>
                <div className="space-y-1 text-slate-700 text-sm">
                  <p><span className="font-medium">Ma - Vr:</span> 08:00 - 17:00</p>
                  <p><span className="font-medium">Za:</span> 09:00 - 13:00</p>
                  <p><span className="font-medium">Zo:</span> Gesloten</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">
                      Bericht Verzonden!
                    </h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      Bedankt voor uw bericht. Wij nemen binnen 24 uur contact met u op.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        onClick={() => setSubmitted(false)}
                        variant="outline"
                        className="rounded-full"
                      >
                        Nog een bericht sturen
                      </Button>
                      <Button 
                        onClick={() => navigate('/')}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                      >
                        Terug naar Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Stuur ons een bericht
                      </h2>
                      <p className="text-slate-600">
                        Vul het formulier in en wij reageren zo snel mogelijk
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Volledige Naam *</Label>
                          <Input
                            id="name"
                            placeholder="Uw naam"
                            value={form.name}
                            onChange={(e) => setForm({...form, name: e.target.value})}
                            className="h-12"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mailadres *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="uw@email.com"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            className="h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefoonnummer</Label>
                          <Input
                            id="phone"
                            placeholder="+597 xxx xxxx"
                            value={form.phone}
                            onChange={(e) => setForm({...form, phone: e.target.value})}
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Bedrijfsnaam</Label>
                          <Input
                            id="company"
                            placeholder="Uw bedrijf"
                            value={form.company}
                            onChange={(e) => setForm({...form, company: e.target.value})}
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Onderwerp</Label>
                        <Input
                          id="subject"
                          placeholder="Waar gaat uw vraag over?"
                          value={form.subject}
                          onChange={(e) => setForm({...form, subject: e.target.value})}
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Bericht *</Label>
                        <Textarea
                          id="message"
                          placeholder="Schrijf hier uw bericht..."
                          value={form.message}
                          onChange={(e) => setForm({...form, message: e.target.value})}
                          className="min-h-[150px] resize-none"
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-14 text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-full"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Verzenden...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Bericht Versturen
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Liever direct uitproberen?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Probeer onze demo account om alle modules te ervaren
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8"
              onClick={() => navigate('/demo')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Bekijk Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-slate-200"
              onClick={() => navigate('/prijzen')}
            >
              Bekijk Prijzen
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
