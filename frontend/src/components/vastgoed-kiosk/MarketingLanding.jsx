import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, ArrowRight, Check, Building2, Receipt, Users, Wallet, Wifi,
  Shield, Zap, CreditCard, Download, Sparkles, Globe, ScanFace, Phone,
  Mail, MapPin, MessageCircle, Star, ChevronRight, Cpu
} from 'lucide-react';

// ======================================================================
// Design system — Archetype 4 (Swiss & High-Contrast) · Dark + Orange
// ======================================================================
const COLORS = {
  primary: '#FF5C00',
  primaryHover: '#E65300',
  bg: '#09090b',
  surface: '#121214',
  surfaceEl: '#1C1C1F',
};

// ================= Grain noise overlay ==============================
const GRAIN_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

function Noise({ opacity = 0.04, className = '' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 mix-blend-overlay ${className}`}
      style={{ backgroundImage: `url("${GRAIN_SVG}")`, opacity }}
    />
  );
}

// ================= Top Nav (sticky · glassmorphic) ==================
function TopNav({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'backdrop-blur-xl bg-[#09090b]/75 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            data-testid="nav-logo"
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#B33F00] flex items-center justify-center p-1.5 overflow-hidden shadow-[0_0_25px_-5px_rgba(255,92,0,0.5)] group-hover:shadow-[0_0_35px_-5px_rgba(255,92,0,0.7)] transition-shadow">
              <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div className="text-left leading-none">
              <p className="text-base sm:text-lg font-bold text-white tracking-tight">SuriRent</p>
              <p className="text-[9px] sm:text-[10px] text-[#FF5C00] font-bold tracking-[0.3em] uppercase mt-1">N.V.</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            <button onClick={() => scrollTo('features')} data-testid="nav-features" className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Functies</button>
            <button onClick={() => scrollTo('pricing')} data-testid="nav-pricing" className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Prijzen</button>
            <button onClick={() => scrollTo('contact')} data-testid="nav-contact" className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Contact</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              data-testid="nav-login-btn"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Inloggen
            </button>
            <button
              onClick={onRegister}
              data-testid="nav-register-btn"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#FF5C00] text-white text-sm font-semibold rounded-md hover:bg-[#E65300] transition-colors shadow-[0_0_25px_-5px_rgba(255,92,0,0.6)]"
            >
              Start gratis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              data-testid="nav-mobile-toggle"
              className="md:hidden ml-1 w-10 h-10 rounded-md border border-white/10 bg-white/5 flex items-center justify-center text-white"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden backdrop-blur-xl bg-[#09090b]/95 border-t border-white/10 shadow-lg">
            <div className="px-5 py-3 flex flex-col gap-1">
              <button onClick={() => scrollTo('features')} data-testid="nav-mobile-features" className="text-left py-3 px-2 rounded-md hover:bg-white/5 text-zinc-300 font-medium">Functies</button>
              <button onClick={() => scrollTo('pricing')} data-testid="nav-mobile-pricing" className="text-left py-3 px-2 rounded-md hover:bg-white/5 text-zinc-300 font-medium">Prijzen</button>
              <button onClick={() => scrollTo('contact')} data-testid="nav-mobile-contact" className="text-left py-3 px-2 rounded-md hover:bg-white/5 text-zinc-300 font-medium">Contact</button>
              <button onClick={onLogin} data-testid="nav-mobile-login" className="text-left py-3 px-2 rounded-md hover:bg-white/5 text-[#FF5C00] font-semibold border-t border-white/10 mt-1 pt-3">
                Inloggen →
              </button>
            </div>
          </div>
        )}
      </header>
      <div className="h-16 sm:h-20" />
    </>
  );
}

// ================= Hero ============================================
function Hero({ onLogin, onRegister }) {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex flex-col justify-center">
      {/* Radial orange glow top-right */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,92,0,0.22),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,92,0,0.08),transparent_50%)] pointer-events-none" />
      <Noise />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF5C00]/10 border border-[#FF5C00]/25 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF5C00]">Nieuw in Suriname</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.02] text-white mb-6">
              De complete{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600]">
                huurbeheer
              </span>{' '}
              oplossing voor vastgoed
            </h1>

            <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl">
              Automatiseer huurbetalingen, kwitanties, loonstroken en boekhouding. Met een selfservice Kiosk terminal en PWA app — speciaal gebouwd voor de Surinaamse markt.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onRegister}
                data-testid="hero-register-btn"
                className="group inline-flex items-center gap-2 px-7 py-4 bg-[#FF5C00] text-white font-semibold rounded-md hover:bg-[#E65300] transition-colors shadow-[0_0_40px_-10px_rgba(255,92,0,0.7)]"
              >
                Start gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                data-testid="hero-login-btn"
                className="inline-flex items-center gap-2 px-7 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-md hover:bg-white/10 hover:border-white/20 transition-colors"
              >
                Inloggen
              </button>
            </div>

            <div className="flex items-center gap-6 mt-10 text-xs text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#FF5C00]" /> Geen creditcard nodig
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#FF5C00]" /> Direct installeren
              </div>
            </div>
          </div>

          {/* Right visual — Kiosk Terminal mockup */}
          <div className="lg:col-span-5 relative">
            {/* Ambient orange glow behind */}
            <div className="absolute -inset-8 bg-gradient-to-br from-[#FF5C00]/30 via-transparent to-transparent blur-3xl" />

            <div className="relative bg-[#121214] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">KIOSK · A1</span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF5C00] to-[#B33F00] p-2 shadow-[0_0_25px_-5px_rgba(255,92,0,0.6)]">
                    <img src="/kiosk-icons/kiosk-512.png" alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Selfservice Terminal</p>
                    <p className="text-[11px] text-zinc-500">Appartement A1 · maart 2026</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#FF5C00]">Huur maart 2026</span>
                    <span className="text-sm font-bold text-white">SRD 5.000</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Betalingswijze</span>
                    <span className="text-xs font-semibold text-white">Contant</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                    <p className="text-[10px] uppercase text-zinc-500 font-semibold tracking-widest">Kwitantie</p>
                    <p className="font-mono text-xs text-white font-bold mt-1">KW2026-00127</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Betaling voltooid · QR beveiligd</span>
                </div>
              </div>
            </div>

            {/* Floating face-ID badge */}
            <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-[#1C1C1F] border border-[#FF5C00]/30 rounded-xl px-4 py-3 items-center gap-3 shadow-xl shadow-black/50 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-[#FF5C00]/15 border border-[#FF5C00]/30 flex items-center justify-center">
                <ScanFace className="w-5 h-5 text-[#FF5C00]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Face-ID</p>
                <p className="text-xs font-bold text-white">Veilige login</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ================= Stats strip =====================================
const STATS = [
  { value: '24/7', label: 'Kiosk beschikbaar' },
  { value: '3', label: 'Valutas ondersteund' },
  { value: '13+', label: 'Kernfuncties' },
  { value: '100%', label: 'Mobile-first' },
];

function StatsStrip() {
  return (
    <section className="relative -mt-12 mb-8 z-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="px-5 py-5 sm:py-6">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tighter">
                  {s.value.includes('/') || s.value.includes('+') || s.value.includes('%') ? (
                    <>
                      <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#FF8A3D] to-[#FF5C00]">
                        {s.value}
                      </span>
                    </>
                  ) : (
                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#FF8A3D] to-[#FF5C00]">{s.value}</span>
                  )}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-semibold uppercase tracking-[0.15em] mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ================= Features Bento Grid ==============================
const FEATURES = [
  { icon: Receipt, title: 'Huurbeheer & Kwitanties', desc: 'FIFO-toewijzing, automatische WhatsApp/SMS herinneringen, digitale kwitanties.', span: 'md:col-span-1' },
  // Kiosk Terminal — hero feature, 2x2
  { icon: ScanFace, title: 'Kiosk Terminal', desc: 'Selfservice terminal met PIN login en face-ID voor snelle huurbetaling door huurders. De kern van SuriRent.', span: 'md:col-span-2 md:row-span-2', featured: true },
  { icon: Wallet, title: 'Multi-valuta Boekhouding', desc: 'SRD, USD en EUR zij aan zij. Wisseltransacties met CME dagkoers.', span: 'md:col-span-1' },
  { icon: Users, title: 'Werknemers & Loonstroken', desc: 'Loonstroken, voorschotten en payroll kalender in één scherm.', span: 'md:col-span-1' },
  { icon: CreditCard, title: 'Bank & Kas', desc: 'Meerdere kassen, automatische saldi, volledige audit trail.', span: 'md:col-span-1' },
  { icon: Wifi, title: 'Internet', desc: 'Beheer internet plannen per huurder, Tenda router koppeling.', span: 'md:col-span-1' },
  { icon: Building2, title: 'Appartementen & Locaties', desc: 'Centraal beheer van panden, units en locaties met huurcontracten.', span: 'md:col-span-1' },
  { icon: Zap, title: 'Elektriciteit (Shelly)', desc: 'Smart breakers per appartement. Schakel stroom op afstand.', span: 'md:col-span-1' },
  { icon: Cpu, title: 'Payment Gateways', desc: 'SumUp, Mope en Uni5Pay volledig geïntegreerd.', span: 'md:col-span-1' },
  { icon: Shield, title: 'Beveiligde PDF Kwitanties', desc: 'AES-256 versleutelde PDFs, publieke QR-verificatie, watermerk en hash-vergelijking.', span: 'md:col-span-2' },
  { icon: Download, title: 'PWA App', desc: 'Installeer als native app op telefoon of tablet.', span: 'md:col-span-1' },
  { icon: Sparkles, title: 'AI-Assistent', desc: 'Stel vragen in het Nederlands — AI helpt je 24/7.', span: 'md:col-span-1' },
  { icon: Globe, title: 'Eigen Domein + SSL', desc: 'Host op je eigen domeinnaam met gepersonaliseerde branding.', span: 'md:col-span-1' },
];

function FeatureCard({ feature, idx }) {
  const Icon = feature.icon;
  const isFeatured = feature.featured;

  return (
    <div
      data-testid={`feature-${idx}`}
      className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 transition-all duration-300 hover:-translate-y-1 ${feature.span || ''} ${
        isFeatured
          ? 'bg-gradient-to-br from-[#1C1C1F] via-[#1C1C1F] to-[#FF5C00]/10 border border-[#FF5C00]/40 shadow-[0_0_40px_-10px_rgba(255,92,0,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,92,0,0.5)]'
          : 'bg-[#121214] border border-white/5 hover:bg-[#1C1C1F] hover:border-white/15'
      }`}
    >
      {isFeatured && (
        <>
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#FF5C00]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-[#FF5C00] text-white text-[9px] font-bold uppercase tracking-widest rounded-full shadow-lg">
            Flagship
          </div>
        </>
      )}

      <div
        className={`relative w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-5 ${
          isFeatured
            ? 'bg-gradient-to-br from-[#FF5C00] to-[#B33F00] shadow-[0_0_25px_-5px_rgba(255,92,0,0.6)]'
            : 'bg-white/5 border border-white/10 group-hover:bg-[#FF5C00]/15 group-hover:border-[#FF5C00]/40 transition-colors'
        }`}
      >
        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isFeatured ? 'text-white' : 'text-zinc-300 group-hover:text-[#FF5C00] transition-colors'}`} />
      </div>

      <h3 className={`relative font-semibold tracking-tight mb-2 ${isFeatured ? 'text-xl md:text-2xl text-white' : 'text-base md:text-lg text-white'}`}>
        {feature.title}
      </h3>
      <p className={`relative leading-relaxed ${isFeatured ? 'text-sm md:text-base text-zinc-300' : 'text-sm text-zinc-500'}`}>
        {feature.desc}
      </p>

      {isFeatured && (
        <div className="relative mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5C00]">
          Meer informatie <ArrowRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32 bg-[#09090b]">
      <Noise opacity={0.03} />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl mb-14 md:mb-20">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Functies</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-white mb-5">
            Alles in één systeem, <br />
            <span className="text-zinc-500">van kiosk tot kwitantie.</span>
          </h2>
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
            SuriRent bundelt 13+ kernfuncties in één mobiele app. Geen losse tools meer — alles verbonden en in het Nederlands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-[minmax(180px,auto)]">
          {FEATURES.map((f, idx) => (
            <FeatureCard key={f.title} feature={f} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ================= Pricing =========================================
const STARTER = ['Tot 15 huurders', 'Alle kernfuncties', 'WhatsApp & SMS notificaties', 'Beveiligde PDF kwitanties', 'PWA mobile app', 'SRD/USD/EUR boekhouding', 'Email support'];
const PRO = ['Onbeperkt huurders', 'Alles uit Starter', 'Kiosk terminal (face-ID + PIN)', 'Shelly elektriciteit integratie', 'Payment gateways (SumUp/Mope/Uni5Pay)', 'AI-Assistent onbeperkt', 'Eigen domein + SSL', 'Prioritaire WhatsApp support'];

function PricingCard({ name, price, desc, features, cta, onCta, featured, testid }) {
  return (
    <div
      data-testid={testid}
      className={`relative rounded-2xl p-7 md:p-9 transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-br from-[#1C1C1F] to-[#0D0604] border border-[#FF5C00]/40 shadow-[0_0_60px_-10px_rgba(255,92,0,0.4)]'
          : 'bg-[#121214] border border-white/10 hover:border-white/20'
      }`}
    >
      {featured && (
        <>
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#FF5C00]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-[#FF5C00] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-[0_0_20px_-2px_rgba(255,92,0,0.6)]">
            <Star className="w-3 h-3 fill-current" /> Aanbevolen
          </div>
        </>
      )}

      <h3 className="relative text-xl md:text-2xl font-semibold tracking-tight text-white">{name}</h3>
      <p className="relative text-sm text-zinc-500 mt-1.5">{desc}</p>

      <div className="relative mt-6 mb-7 flex items-baseline gap-1.5">
        <span className="text-xs font-semibold text-zinc-500">SRD</span>
        <span className="text-5xl md:text-6xl font-bold tracking-tighter text-white">{price.toLocaleString('nl-NL')}</span>
        <span className="text-sm text-zinc-500">/maand</span>
      </div>

      <button
        onClick={onCta}
        data-testid={`${testid}-cta`}
        className={`relative w-full py-3.5 rounded-md font-semibold text-sm transition-colors ${
          featured
            ? 'bg-[#FF5C00] text-white hover:bg-[#E65300] shadow-[0_0_30px_-5px_rgba(255,92,0,0.6)]'
            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {cta}
      </button>

      <div className="relative mt-7 pt-7 border-t border-white/5 space-y-3.5">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2.5 text-sm">
            <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${featured ? 'bg-[#FF5C00]/20' : 'bg-white/5'}`}>
              <Check className={`w-3 h-3 ${featured ? 'text-[#FF5C00]' : 'text-zinc-400'}`} />
            </div>
            <span className="text-zinc-300">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection({ onRegister }) {
  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-[#09090b] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,92,0,0.08),transparent_60%)] pointer-events-none" />
      <Noise opacity={0.03} />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Prijzen</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-white mb-5">
            Eén prijs, <span className="text-zinc-500">geen verrassingen.</span>
          </h2>
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
            Maandelijks opzegbaar. Geen setup-kosten. Geen verborgen fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <PricingCard
            name="Starter"
            price={3000}
            desc="Voor kleinere vastgoedbeheerders die willen starten."
            features={STARTER}
            cta="Start met Starter"
            onCta={onRegister}
            testid="pricing-starter"
          />
          <PricingCard
            name="Professional"
            price={5000}
            desc="Voor groeiende bedrijven met Kiosk terminal en integraties."
            features={PRO}
            cta="Start met Professional"
            onCta={onRegister}
            featured
            testid="pricing-professional"
          />
        </div>

        <p className="text-center text-sm text-zinc-500 mt-10">
          Vragen over een maatwerk pakket?{' '}
          <a href="#contact" className="text-[#FF5C00] font-semibold hover:underline">
            Neem contact op
          </a>
        </p>
      </div>
    </section>
  );
}

// ================= CTA Banner ======================================
function CTASection({ onRegister }) {
  return (
    <section className="relative py-20 md:py-28 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121214] to-[#1a0a03] border border-[#FF5C00]/25 p-10 sm:p-16 lg:p-20 text-center">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FF5C00]/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF5C00]/15 rounded-full blur-3xl" />
          <Noise opacity={0.04} />

          <div className="relative max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Klaar om te starten?</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-white mb-6">
              Automatiseer je vastgoedbeheer <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF8A3D] to-[#FF5C00]">
                vanaf vandaag.
              </span>
            </h2>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto">
              Installeer SuriRent nu en bespaar uren per week op administratie. Gratis proefperiode, geen creditcard vereist.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onRegister}
                data-testid="cta-register-btn"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-[#FF5C00] text-white font-semibold rounded-md hover:bg-[#E65300] transition-colors shadow-[0_0_40px_-10px_rgba(255,92,0,0.7)]"
              >
                Start gratis
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://wa.me/5978815993"
                target="_blank"
                rel="noreferrer"
                data-testid="cta-whatsapp-btn"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-md hover:bg-white/10 hover:border-white/20 transition-colors"
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

// ================= Footer ==========================================
function Footer({ onLogin }) {
  return (
    <footer id="contact" className="relative bg-[#09090b] border-t border-white/10 pt-20 pb-10">
      <Noise opacity={0.02} />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#B33F00] p-1.5 shadow-[0_0_25px_-5px_rgba(255,92,0,0.5)]">
                <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-bold text-white tracking-tight">SuriRent</p>
                <p className="text-[10px] text-[#FF5C00] font-bold tracking-[0.3em] uppercase">N.V.</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
              Complete huurbeheer oplossing voor Surinaamse vastgoedbedrijven. Van Kiosk terminal tot loonstrook, in één app.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5C00] mb-5">Contact</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <a href="tel:+5978815993" data-testid="footer-phone" className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors group">
                  <Phone className="w-4 h-4 text-[#FF5C00] group-hover:scale-110 transition-transform" /> +597 881 5993
                </a>
              </li>
              <li>
                <a href="mailto:info@surirent.sr" data-testid="footer-email" className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors group">
                  <Mail className="w-4 h-4 text-[#FF5C00] group-hover:scale-110 transition-transform" /> info@surirent.sr
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-zinc-400">
                <MapPin className="w-4 h-4 text-[#FF5C00]" /> Paramaribo, Suriname
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5C00] mb-5">Toegang</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <button onClick={onLogin} data-testid="footer-login-btn" className="text-zinc-400 hover:text-white transition-colors">
                  Inloggen / PIN
                </button>
              </li>
              <li>
                <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Prijzen</a>
              </li>
              <li>
                <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Functies</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} SuriRent N.V. Alle rechten voorbehouden.</p>
          <p className="text-xs text-zinc-600">
            Gemaakt in <span className="text-[#FF5C00] font-semibold">Suriname</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ================= Main ============================================
export default function MarketingLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.backgroundColor = COLORS.bg;
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const goLogin = () => navigate('/vastgoed/login');
  const goRegister = () => navigate('/vastgoed/login?register=1');

  return (
    <div
      className="min-h-screen bg-[#09090b] text-white antialiased selection:bg-[#FF5C00]/30 selection:text-white"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <TopNav onLogin={goLogin} onRegister={goRegister} />
      <Hero onLogin={goLogin} onRegister={goRegister} />
      <StatsStrip />
      <FeaturesSection />
      <PricingSection onRegister={goRegister} />
      <CTASection onRegister={goRegister} />
      <Footer onLogin={goLogin} />
    </div>
  );
}
