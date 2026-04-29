import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, ArrowRight, Check, Building2, Receipt, Users, Wallet, Wifi,
  Shield, Zap, CreditCard, Download, Sparkles, Globe, ScanFace, Phone,
  Mail, MapPin, MessageCircle, Star, ChevronRight
} from 'lucide-react';

const FEATURES = [
  {
    icon: Receipt,
    title: 'Huurbeheer & Kwitanties',
    desc: 'FIFO-toewijzing per maand, automatische WhatsApp/SMS herinneringen, digitale kwitanties.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: ScanFace,
    title: 'Kiosk Terminal',
    desc: 'Self-service terminal met PIN login en face-ID voor snelle huurbetaling door huurders.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Wallet,
    title: 'Multi-valuta Boekhouding',
    desc: 'Verwerk SRD, USD en EUR zij aan zij. Wisseltransacties met actuele CME dagkoers.',
    color: 'from-orange-600 to-rose-500',
  },
  {
    icon: Users,
    title: 'Werknemers & Loonstroken',
    desc: 'Loonstroken (NL: Loonstroken), voorschotten (Voorschot) en payroll kalender in één scherm.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: CreditCard,
    title: 'Bank & Kas Management',
    desc: 'Meerdere kassen en bankrekeningen, automatische saldi, volledige audit trail.',
    color: 'from-amber-600 to-orange-600',
  },
  {
    icon: Wifi,
    title: 'Internet Abonnementen',
    desc: 'Beheer internet plannen per huurder, Tenda router koppeling en apparatenoverzicht.',
    color: 'from-orange-500 to-orange-700',
  },
  {
    icon: Building2,
    title: 'Appartementen & Locaties',
    desc: 'Centraal beheer van panden, units en locaties met huurcontracten per unit.',
    color: 'from-orange-600 to-amber-600',
  },
  {
    icon: Zap,
    title: 'Elektriciteit (Shelly)',
    desc: 'Shelly smart breakers koppelen per appartement. Schakel stroom op afstand.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: CreditCard,
    title: 'Payment Gateways',
    desc: 'SumUp, Mope en Uni5Pay geïntegreerd voor online en terminal betalingen.',
    color: 'from-orange-500 to-rose-600',
  },
  {
    icon: Shield,
    title: 'Beveiligde PDF Kwitanties',
    desc: 'AES-256 versleutelde PDFs, publieke QR-verificatie, watermerk en hash-vergelijking.',
    color: 'from-orange-700 to-amber-700',
  },
  {
    icon: Download,
    title: 'PWA App',
    desc: 'Installeer de app op je telefoon of tablet — werkt zelfs zonder internet.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: Sparkles,
    title: 'AI-Assistent',
    desc: 'Stel vragen in het Nederlands. AI helpt met boekhouding, rapportages en snelle antwoorden.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Globe,
    title: 'Eigen Domein',
    desc: 'Host je kiosk op je eigen domeinnaam met SSL en gepersonaliseerde branding.',
    color: 'from-orange-600 to-orange-700',
  },
];

const STATS = [
  { value: '24/7', label: 'Kiosk beschikbaar' },
  { value: '3', label: 'Valutas ondersteund' },
  { value: '13+', label: 'Kernfuncties' },
  { value: '100%', label: 'Mobile-first' },
];

const STARTER_FEATURES = [
  'Tot 15 huurders',
  'Alle kernfuncties',
  'WhatsApp & SMS notificaties',
  'Beveiligde PDF kwitanties',
  'PWA mobile app',
  'SRD/USD/EUR boekhouding',
  'Email support',
];

const PRO_FEATURES = [
  'Onbeperkt huurders',
  'Alles uit Starter',
  'Kiosk terminal (face-ID + PIN)',
  'Shelly elektriciteit integratie',
  'Payment gateways (SumUp/Mope/Uni5Pay)',
  'AI-Assistent onbeperkt',
  'Eigen domein + SSL',
  'Prioritaire WhatsApp support',
];

function TopNav({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all ${
          scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 group"
            data-testid="nav-logo"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/30 overflow-hidden p-1.5 group-hover:scale-105 transition-transform">
              <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <p className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">SuriRent</p>
              <p className="text-[10px] text-orange-600 font-bold tracking-widest uppercase -mt-0.5">N.V.</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollTo('features')} className="hover:text-orange-600 transition" data-testid="nav-features">Functies</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-orange-600 transition" data-testid="nav-pricing">Prijzen</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-orange-600 transition" data-testid="nav-contact">Contact</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              data-testid="nav-login-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-700 hover:text-orange-600 transition"
            >
              Inloggen
            </button>
            <button
              onClick={onRegister}
              data-testid="nav-register-btn"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:shadow-orange-500/40 transition active:scale-95"
            >
              Start gratis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden ml-1 w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700"
              data-testid="nav-mobile-toggle"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="px-5 py-3 flex flex-col gap-1">
              <button onClick={() => scrollTo('features')} className="text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 font-semibold text-slate-700" data-testid="nav-mobile-features">Functies</button>
              <button onClick={() => scrollTo('pricing')} className="text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 font-semibold text-slate-700" data-testid="nav-mobile-pricing">Prijzen</button>
              <button onClick={() => scrollTo('contact')} className="text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 font-semibold text-slate-700" data-testid="nav-mobile-contact">Contact</button>
              <button onClick={onLogin} className="text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 font-semibold text-orange-600 border-t border-slate-100 mt-1 pt-3" data-testid="nav-mobile-login">Inloggen →</button>
            </div>
          </div>
        )}
      </header>
      <div className="h-16 sm:h-20" />
    </>
  );
}

function Hero({ onLogin, onRegister }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/40 via-white to-white">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-16 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full mb-6 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Nieuw in Suriname
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              De complete{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-orange-600">huurbeheer</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-200/60 -z-0" />
              </span>{' '}
              oplossing voor vastgoed
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
              Automatiseer huurbetalingen, kwitanties, loonstroken en boekhouding — met een selfservice Kiosk terminal en PWA app. Speciaal gebouwd voor de Surinaamse markt.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onRegister}
                data-testid="hero-register-btn"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-500/40 hover:bg-orange-600 hover:shadow-orange-500/50 transition active:scale-95"
              >
                Start nu <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onLogin}
                data-testid="hero-login-btn"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-800 font-bold rounded-xl hover:border-orange-400 hover:text-orange-600 transition active:scale-95"
              >
                Inloggen
              </button>
            </div>
            <div className="flex items-center gap-5 mt-8 text-xs text-slate-500 font-semibold">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" /> Geen creditcard nodig
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" /> Direct installeren
              </div>
            </div>
          </div>

          {/* Visual — stylized kiosk mockup */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl shadow-orange-500/30 transform lg:rotate-1">
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2 transform -rotate-6">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-slate-900">Betaling voltooid</span>
              </div>
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center p-2 overflow-hidden">
                    <img src="/kiosk-icons/kiosk-512.png" alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Kiosk Terminal</p>
                    <p className="text-xs text-slate-500">Appartement A1 · Selfservice</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">Huur maart 2026</span>
                    <span className="text-sm font-black text-emerald-700">SRD 5.000</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Betalingswijze</span>
                    <span className="text-xs font-bold text-slate-900">Contant</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-[10px] uppercase text-orange-700 font-bold tracking-wider">Kwitantie</p>
                    <p className="font-mono text-xs text-slate-900 font-bold">KW2026-00127</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-3 shadow-xl items-center gap-3 transform -rotate-3">
              <ScanFace className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Face-ID</p>
                <p className="text-xs font-black text-slate-900">Veilige login</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-12 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-sm">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-black text-orange-600">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10 sm:mb-16">
          <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-3">Functies</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Alles in één systeem
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Van huurbetaling tot loonstrook, van elektriciteit tot AI-assistent. SuriRent bundelt 13+ kernfuncties in één mobiele app.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100 transition-all"
                data-testid={`feature-${idx}`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1.5 leading-snug">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ name, price, desc, features, cta, onCta, featured, testid }) {
  return (
    <div
      className={`relative rounded-3xl p-6 sm:p-8 border-2 transition-all ${
        featured
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600 text-white shadow-2xl shadow-orange-500/40 lg:scale-[1.03]'
          : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-xl'
      }`}
      data-testid={testid}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1">
          <Star className="w-3 h-3" /> Meest gekozen
        </div>
      )}
      <h3 className={`text-xl font-black tracking-tight ${featured ? 'text-white' : 'text-slate-900'}`}>{name}</h3>
      <p className={`text-sm mt-1 ${featured ? 'text-white/80' : 'text-slate-500'}`}>{desc}</p>
      <div className="mt-5 mb-6 flex items-baseline gap-1">
        <span className={`text-xs font-bold ${featured ? 'text-white/70' : 'text-slate-400'}`}>SRD</span>
        <span className={`text-4xl sm:text-5xl font-black tracking-tight ${featured ? 'text-white' : 'text-slate-900'}`}>
          {price.toLocaleString('nl-NL')}
        </span>
        <span className={`text-sm font-semibold ${featured ? 'text-white/70' : 'text-slate-400'}`}>/maand</span>
      </div>
      <button
        onClick={onCta}
        data-testid={`${testid}-cta`}
        className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 ${
          featured
            ? 'bg-white text-orange-600 hover:bg-orange-50 shadow-lg'
            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/30'
        }`}
      >
        {cta}
      </button>
      <ul className={`mt-6 space-y-3 ${featured ? 'text-white' : 'text-slate-700'}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${featured ? 'text-white' : 'text-emerald-500'}`} />
            <span className={featured ? 'text-white/95' : 'text-slate-700'}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingSection({ onRegister }) {
  return (
    <section id="pricing" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
          <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-3">Prijzen</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Eén prijs, geen verrassingen
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Maandelijks opzegbaar. Geen setup-kosten. Geen verborgen fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-7 max-w-4xl mx-auto">
          <PricingCard
            name="Starter"
            price={3000}
            desc="Voor kleinere vastgoedbeheerders die willen starten."
            features={STARTER_FEATURES}
            cta="Start met Starter"
            onCta={onRegister}
            testid="pricing-starter"
          />
          <PricingCard
            name="Professional"
            price={5000}
            desc="Voor groeiende bedrijven met Kiosk terminal en integraties."
            features={PRO_FEATURES}
            cta="Start met Professional"
            onCta={onRegister}
            featured
            testid="pricing-professional"
          />
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Vragen over een maatwerk pakket? <a href="#contact" className="text-orange-600 font-bold hover:underline">Neem contact op</a>
        </p>
      </div>
    </section>
  );
}

function CTASection({ onRegister }) {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-8 sm:p-14 lg:p-20">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-5">
              Klaar om je vastgoedbeheer te automatiseren?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
              Installeer SuriRent vandaag nog en bespaar uren per week op administratie. Gratis proefperiode — geen creditcard vereist.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onRegister}
                data-testid="cta-register-btn"
                className="inline-flex items-center gap-2 px-7 py-4 bg-orange-500 text-white font-black rounded-xl shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition active:scale-95"
              >
                Start nu gratis <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="https://wa.me/5978815993"
                target="_blank"
                rel="noreferrer"
                data-testid="cta-whatsapp-btn"
                className="inline-flex items-center gap-2 px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp ons
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onLogin }) {
  return (
    <footer id="contact" className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="grid md:grid-cols-4 gap-8 sm:gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center p-1.5 overflow-hidden">
                <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-black text-white text-lg tracking-tight">SuriRent</p>
                <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase -mt-0.5">N.V.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Complete huurbeheer oplossing voor Surinaamse vastgoedbedrijven. Van Kiosk terminal tot loonstrook.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+5978815993" data-testid="footer-phone" className="flex items-center gap-2 hover:text-orange-400 transition">
                  <Phone className="w-4 h-4 text-orange-400" /> +597 881 5993
                </a>
              </li>
              <li>
                <a href="mailto:info@surirent.sr" data-testid="footer-email" className="flex items-center gap-2 hover:text-orange-400 transition">
                  <Mail className="w-4 h-4 text-orange-400" /> info@surirent.sr
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" /> Paramaribo, Suriname
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Toegang</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={onLogin} data-testid="footer-login-btn" className="hover:text-orange-400 transition">
                  Inloggen / PIN
                </button>
              </li>
              <li>
                <a href="#pricing" className="hover:text-orange-400 transition">Prijzen</a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-400 transition">Functies</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} SuriRent N.V. Alle rechten voorbehouden.</p>
          <p className="text-xs text-slate-500">Gemaakt in <span className="text-orange-400 font-bold">Suriname</span></p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLanding() {
  const navigate = useNavigate();

  // Ensure body scroll is restored (kiosk landing freezes it)
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, []);

  const goLogin = () => navigate('/vastgoed/login');
  const goRegister = () => navigate('/vastgoed/login?register=1');

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <TopNav onLogin={goLogin} onRegister={goRegister} />
      <Hero onLogin={goLogin} onRegister={goRegister} />
      <FeaturesSection />
      <PricingSection onRegister={goRegister} />
      <CTASection onRegister={goRegister} />
      <Footer onLogin={goLogin} />
    </div>
  );
}
