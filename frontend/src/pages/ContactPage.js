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
  Loader2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  User,
  Building,
  FileText,
  Headphones,
  Globe,
  Zap
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
      <section className="pt-24 pb-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-500/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-40 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30 px-4 py-2">
            <Headphones className="w-4 h-4 mr-2" />
            24/7 Ondersteuning
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Wij staan voor u{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              klaar
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Heeft u vragen over onze modules? Wilt u een demo? Of heeft u ondersteuning nodig?
            Ons team staat klaar om u te helpen.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { value: '< 24u', label: 'Reactietijd' },
              { value: '98%', label: 'Tevredenheid' },
              { value: '500+', label: 'Klanten' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Phone */}
            <a href="tel:+5978123456" className="group">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Bel ons</p>
                    <p className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      +597 8123456
                    </p>
                  </div>
                </div>
              </div>
            </a>

            {/* Email */}
            <a href="mailto:info@facturatie.sr" className="group">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">E-mail ons</p>
                    <p className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      info@facturatie.sr
                    </p>
                  </div>
                </div>
              </div>
            </a>

            {/* Location */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Bezoek ons</p>
                  <p className="text-lg font-bold text-slate-900">Paramaribo, Suriname</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            
            {/* Left Side - Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Office Hours Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Openingstijden</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-emerald-200">
                    <span className="text-slate-600">Maandag - Vrijdag</span>
                    <span className="font-semibold text-slate-900 bg-white px-3 py-1 rounded-full text-sm">
                      08:00 - 17:00
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-emerald-200">
                    <span className="text-slate-600">Zaterdag</span>
                    <span className="font-semibold text-slate-900 bg-white px-3 py-1 rounded-full text-sm">
                      09:00 - 13:00
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-600">Zondag</span>
                    <span className="font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                      Gesloten
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Snelle Links</h3>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/demo')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700">Bekijk Demo</p>
                      <p className="text-xs text-slate-500">Probeer alle modules</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  </button>

                  <button 
                    onClick={() => navigate('/faq')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700">FAQ</p>
                      <p className="text-xs text-slate-500">Veelgestelde vragen</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  </button>

                  <button 
                    onClick={() => navigate('/prijzen')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700">Prijzen</p>
                      <p className="text-xs text-slate-500">Bekijk onze tarieven</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-center">
                <Globe className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Suriname's #1 ERP Platform</h3>
                <p className="text-slate-400 text-sm">
                  Vertrouwd door honderden bedrijven in Suriname
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                {submitted ? (
                  <div className="p-12 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">
                      Bericht Verzonden!
                    </h3>
                    <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto">
                      Bedankt voor uw bericht. Wij nemen binnen 24 uur contact met u op.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        onClick={() => {
                          setSubmitted(false);
                          setForm({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
                        }}
                        variant="outline"
                        className="rounded-full px-6"
                      >
                        Nog een bericht
                      </Button>
                      <Button 
                        onClick={() => navigate('/')}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full px-6"
                      >
                        Terug naar Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Form Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8">
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Stuur ons een bericht
                      </h2>
                      <p className="text-emerald-100">
                        Vul het formulier in en wij reageren zo snel mogelijk
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                            Volledige Naam *
                          </Label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="name"
                              placeholder="Uw naam"
                              value={form.name}
                              onChange={(e) => setForm({...form, name: e.target.value})}
                              className="pl-12 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                            E-mailadres *
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="uw@email.com"
                              value={form.email}
                              onChange={(e) => setForm({...form, email: e.target.value})}
                              className="pl-12 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                            Telefoonnummer
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="phone"
                              placeholder="+597 xxx xxxx"
                              value={form.phone}
                              onChange={(e) => setForm({...form, phone: e.target.value})}
                              className="pl-12 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                            Bedrijfsnaam
                          </Label>
                          <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="company"
                              placeholder="Uw bedrijf"
                              value={form.company}
                              onChange={(e) => setForm({...form, company: e.target.value})}
                              className="pl-12 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium text-slate-700">
                          Onderwerp
                        </Label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            id="subject"
                            placeholder="Waar gaat uw vraag over?"
                            value={form.subject}
                            onChange={(e) => setForm({...form, subject: e.target.value})}
                            className="pl-12 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                          Bericht *
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Schrijf hier uw bericht..."
                          value={form.message}
                          onChange={(e) => setForm({...form, message: e.target.value})}
                          className="min-h-[160px] resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-lg shadow-emerald-200"
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

                      <p className="text-center text-sm text-slate-500">
                        Door te versturen gaat u akkoord met onze{' '}
                        <a href="#" className="text-emerald-600 hover:underline">voorwaarden</a>
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
