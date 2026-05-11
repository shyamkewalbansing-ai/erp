import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, ArrowRight, Check, Building2, Receipt, Users, Wallet, Wifi,
  Shield, Zap, CreditCard, Download, Sparkles, Globe, ScanFace, Phone,
  Mail, MapPin, MessageCircle, Star, ChevronRight, Cpu, Play, Clock
} from 'lucide-react';

// =========================================================================
// VIDEO DEMO — vul hieronder je video URL in zodra je een screencast hebt.
// Ondersteunt YouTube (https://www.youtube.com/embed/VIDEO_ID), Vimeo embed,
// of directe MP4 URL (bv. https://mijn-cdn.com/demo.mp4).
// Laat leeg "" om een "Binnenkort beschikbaar" badge te tonen.
// =========================================================================
const DEMO_VIDEO_URL = ''; // voorbeeld: "https://www.youtube.com/embed/dQw4w9WgXcQ"
const DEMO_VIDEO_DURATION = '15 sec'; // toon-duur bij play-knop

// =========================================================================
// Design — Light Cream with Bold Orange accents
// Primary: #FF5C00 · Cream bg: #FFF7F0 · Warm surface: #FFFBF5
// =========================================================================

const GRAIN_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

function Noise({ opacity = 0.5, className = '' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 mix-blend-multiply ${className}`}
      style={{ backgroundImage: `url("${GRAIN_SVG}")`, opacity }}
    />
  );
}

// ================= Top Nav =========================================
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
            ? 'backdrop-blur-xl bg-[#FFF7F0]/85 border-b border-orange-200/60 shadow-[0_4px_30px_-10px_rgba(255,92,0,0.25)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            data-testid="nav-logo"
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600] flex items-center justify-center p-1.5 overflow-hidden shadow-[0_8px_20px_-5px_rgba(255,92,0,0.55)] group-hover:shadow-[0_10px_25px_-5px_rgba(255,92,0,0.7)] transition-shadow">
              <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div className="text-left leading-none">
              <p className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">SuriRent</p>
              <p className="text-[9px] sm:text-[10px] text-[#FF5C00] font-bold tracking-[0.3em] uppercase mt-1">N.V.</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button onClick={() => scrollTo('features')} data-testid="nav-features" className="px-4 py-2 text-slate-700 hover:text-[#FF5C00] transition-colors">Functies</button>
            <button onClick={() => scrollTo('pricing')} data-testid="nav-pricing" className="px-4 py-2 text-slate-700 hover:text-[#FF5C00] transition-colors">Prijzen</button>
            <button onClick={() => scrollTo('contact')} data-testid="nav-contact" className="px-4 py-2 text-slate-700 hover:text-[#FF5C00] transition-colors">Contact</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              data-testid="nav-login-btn"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-800 hover:text-[#FF5C00] transition-colors"
            >
              Inloggen
            </button>
            <button
              onClick={onRegister}
              data-testid="nav-register-btn"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#FF5C00] text-white text-sm font-bold rounded-xl hover:bg-[#E65300] transition-colors shadow-[0_8px_25px_-5px_rgba(255,92,0,0.55)]"
            >
              Start gratis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              data-testid="nav-mobile-toggle"
              className="md:hidden ml-1 w-10 h-10 rounded-xl border border-orange-200 bg-white/80 flex items-center justify-center text-slate-800"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden backdrop-blur-xl bg-[#FFF7F0]/95 border-t border-orange-200/60">
            <div className="px-5 py-3 flex flex-col gap-1">
              <button onClick={() => scrollTo('features')} data-testid="nav-mobile-features" className="text-left py-3 px-2 rounded-md hover:bg-orange-50 text-slate-800 font-semibold">Functies</button>
              <button onClick={() => scrollTo('pricing')} data-testid="nav-mobile-pricing" className="text-left py-3 px-2 rounded-md hover:bg-orange-50 text-slate-800 font-semibold">Prijzen</button>
              <button onClick={() => scrollTo('contact')} data-testid="nav-mobile-contact" className="text-left py-3 px-2 rounded-md hover:bg-orange-50 text-slate-800 font-semibold">Contact</button>
              <button onClick={onLogin} data-testid="nav-mobile-login" className="text-left py-3 px-2 rounded-md hover:bg-orange-50 text-[#FF5C00] font-bold border-t border-orange-200/60 mt-1 pt-3">
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
    <section className="relative overflow-hidden">
      {/* Warm cream base with giant orange radial mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF7F0] via-[#FFEAD3] to-[#FFD9B3]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,92,0,0.35),transparent_55%)]" />
      <div className="absolute -top-20 -right-40 w-[800px] h-[800px] bg-[#FF5C00]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 -left-32 w-[500px] h-[500px] bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Dotted pattern */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,92,0,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <Noise opacity={0.25} />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm border border-orange-300/60 rounded-full mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5C00]">Nieuw in Suriname</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.02] text-slate-900 mb-6">
              De complete{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600]">
                huurbeheer
              </span>{' '}
              oplossing voor vastgoed.
            </h1>

            <p className="text-base md:text-lg text-slate-700 leading-relaxed mb-10 max-w-xl">
              Automatiseer huurbetalingen, kwitanties, loonstroken en boekhouding. Met een selfservice Kiosk terminal en PWA app — speciaal gebouwd voor de Surinaamse markt.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onRegister}
                data-testid="hero-register-btn"
                className="group inline-flex items-center gap-2 px-7 py-4 bg-[#FF5C00] text-white font-bold rounded-xl hover:bg-[#E65300] transition-colors shadow-[0_12px_32px_-8px_rgba(255,92,0,0.6)]"
              >
                Start gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                data-testid="hero-login-btn"
                className="inline-flex items-center gap-2 px-7 py-4 bg-white/80 backdrop-blur-sm border border-orange-200 text-slate-900 font-bold rounded-xl hover:bg-white hover:border-[#FF5C00]/60 transition-colors shadow-sm"
              >
                Inloggen
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-10 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                Geen creditcard nodig
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                Direct installeren
              </div>
            </div>
          </div>

          {/* Right visual — Kiosk mockup with bold orange frame */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-10 bg-gradient-to-br from-[#FF5C00]/40 via-amber-400/30 to-transparent blur-3xl rounded-full" />

            <div className="relative bg-gradient-to-br from-[#FF6B1A] via-[#FF5C00] to-[#C74600] rounded-[2rem] p-5 shadow-[0_40px_80px_-20px_rgba(255,92,0,0.6)] transform lg:-rotate-1 hover:rotate-0 transition-transform duration-700">
              {/* Floating voltooid badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl px-3 py-2 shadow-xl flex items-center gap-1.5 transform rotate-6 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                <span className="text-[11px] font-black text-slate-900">Betaling voltooid</span>
              </div>

              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-inner">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#C74600] p-2 shadow-lg">
                    <img src="/kiosk-icons/kiosk-512.png" alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Selfservice Terminal</p>
                    <p className="text-[11px] text-slate-500">Appartement A1 · maart 2026</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-gradient-to-r from-[#FFF4EC] to-[#FFE6D3] border border-[#FF5C00]/30 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#C74600]">Huur maart 2026</span>
                    <span className="text-sm font-black text-slate-900">SRD 5.000</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Betalingswijze</span>
                    <span className="text-xs font-bold text-slate-900">Contant</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Kwitantie</p>
                    <p className="font-mono text-xs text-slate-900 font-black mt-0.5">KW2026-00127</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating face-ID badge */}
            <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-white rounded-xl px-4 py-3 items-center gap-3 shadow-xl border border-orange-200 transform -rotate-6">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF8A3D] to-[#FF5C00] flex items-center justify-center shadow">
                <ScanFace className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Face-ID</p>
                <p className="text-xs font-black text-slate-900">Veilige login</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ================= Stats strip (orange band) =======================
const STATS = [
  { value: '24/7', label: 'Kiosk beschikbaar' },
  { value: '3', label: 'Valutas' },
  { value: '13+', label: 'Kernfuncties' },
  { value: '100%', label: 'Mobile-first' },
];

function StatsStrip() {
  return (
    <section className="relative py-8 bg-gradient-to-r from-[#FF8A3D] via-[#FF5C00] to-[#E04E00] overflow-hidden">
      <Noise opacity={0.15} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`text-center md:text-left ${i !== 0 ? 'md:border-l md:border-white/25 md:pl-6' : ''}`}
            >
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter">{s.value}</p>
              <p className="text-[10px] sm:text-xs text-white/85 font-bold uppercase tracking-[0.2em] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ================= Video Demo Section ==============================
function VideoModal({ url, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isYoutube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  const isIframe = isYoutube || isVimeo;

  return (
    <div
      onClick={onClose}
      data-testid="video-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10"
      >
        <button
          onClick={onClose}
          data-testid="video-modal-close"
          className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-semibold"
        >
          <X className="w-5 h-5" /> Sluiten
        </button>
        {isIframe ? (
          <iframe
            src={`${url}${url.includes('?') ? '&' : '?'}autoplay=1`}
            title="SuriRent demo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <video src={url} autoPlay controls className="w-full h-full" />
        )}
      </div>
    </div>
  );
}

function VideoDemoSection() {
  const [open, setOpen] = useState(false);
  const hasVideo = Boolean(DEMO_VIDEO_URL);

  return (
    <section className="relative py-20 md:py-28 bg-[#FFFBF5] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,92,0,0.08),transparent_60%)] pointer-events-none" />
      <Noise opacity={0.15} />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Demo</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-5">
            Zie SuriRent <span className="text-slate-400">in actie.</span>
          </h2>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
            Bekijk in 15 seconden hoe een huurder betaalt aan de Kiosk terminal en hoe jij het beheert vanaf je telefoon.
          </p>
        </div>

        {/* Video poster with play button */}
        <div className="relative group max-w-4xl mx-auto">
          {/* Ambient glow */}
          <div className="absolute -inset-6 bg-gradient-to-br from-[#FF5C00]/30 via-amber-300/20 to-transparent blur-3xl rounded-full pointer-events-none" />

          <button
            onClick={() => hasVideo && setOpen(true)}
            disabled={!hasVideo}
            data-testid="video-play-btn"
            className="relative block w-full aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600] shadow-[0_30px_70px_-15px_rgba(255,92,0,0.55)] group-hover:shadow-[0_40px_90px_-15px_rgba(255,92,0,0.7)] transition-all group-hover:-translate-y-1 disabled:cursor-not-allowed"
          >
            <Noise opacity={0.12} />

            {/* Decorative mockup behind */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl opacity-95 transform -rotate-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#C74600] p-1.5 shadow-lg">
                    <img src="/kiosk-icons/kiosk-512.png" alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Selfservice Terminal</p>
                    <p className="text-[11px] text-slate-500">Appartement A1</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-[#FFF4EC] to-[#FFE6D3] border border-[#FF5C00]/30 rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#C74600]">Huur maart 2026</span>
                    <span className="text-sm font-black text-slate-900">SRD 5.000</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">Kwitantie</span>
                    <span className="font-mono text-[11px] font-black text-slate-900">KW2026-00127</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/50" />

            {/* Center play / coming-soon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              {hasVideo ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF5C00] ml-1" fill="#FF5C00" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-bold text-white tracking-wider">{DEMO_VIDEO_DURATION} · Bekijk demo</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-2xl">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF5C00] ml-1" fill="#FF5C00" />
                  </div>
                  <div className="mt-5 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full">
                    <span className="text-xs font-bold text-white tracking-wider">Binnenkort beschikbaar</span>
                  </div>
                </>
              )}
            </div>

            {/* Corner decoration */}
            <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="absolute bottom-5 right-5 px-3 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full z-10">
              <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">SuriRent · Kiosk Demo</span>
            </div>
          </button>
        </div>
      </div>

      {open && hasVideo && <VideoModal url={DEMO_VIDEO_URL} onClose={() => setOpen(false)} />}
    </section>
  );
}

// ================= Features Bento ==================================
const FEATURES = [
  { icon: Receipt, title: 'Huurbeheer & Kwitanties', desc: 'FIFO-toewijzing, automatische WhatsApp/SMS herinneringen, digitale kwitanties.', span: 'md:col-span-1' },
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

  if (isFeatured) {
    return (
      <div
        data-testid={`feature-${idx}`}
        className={`group relative overflow-hidden rounded-3xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 ${feature.span || ''} bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600] shadow-[0_25px_60px_-15px_rgba(255,92,0,0.6)] hover:shadow-[0_30px_70px_-15px_rgba(255,92,0,0.75)] min-h-[280px] flex flex-col`}
      >
        <Noise opacity={0.12} />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-5 right-5 px-3 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
          Flagship
        </div>

        <div className="relative w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center mb-6 shadow-xl">
          <Icon className="w-7 h-7 text-[#FF5C00]" strokeWidth={2.3} />
        </div>

        <h3 className="relative text-2xl md:text-3xl font-black tracking-tight text-white mb-3 leading-tight">
          {feature.title}
        </h3>
        <p className="relative text-white/90 leading-relaxed text-sm md:text-base max-w-md">
          {feature.desc}
        </p>

        <div className="relative mt-auto pt-6 flex items-center gap-2 text-sm font-black text-white">
          Meer informatie
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`feature-${idx}`}
      className={`group relative overflow-hidden rounded-2xl p-6 md:p-7 bg-white border border-orange-100 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF5C00]/40 hover:shadow-[0_20px_40px_-15px_rgba(255,92,0,0.25)] ${feature.span || ''}`}
    >
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 flex items-center justify-center mb-5 group-hover:from-[#FF8A3D] group-hover:to-[#FF5C00] group-hover:border-transparent transition-all">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-[#FF5C00] group-hover:text-white transition-colors" strokeWidth={2.2} />
      </div>

      <h3 className="font-bold tracking-tight mb-2 text-slate-900 text-base md:text-lg">{feature.title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32 bg-[#FFFBF5]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,92,0,0.06),transparent_50%)] pointer-events-none" />
      <Noise opacity={0.15} />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl mb-14 md:mb-20">
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Functies</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-5">
            Alles in één systeem, <br />
            <span className="text-slate-400">van kiosk tot kwitantie.</span>
          </h2>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
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
  if (featured) {
    return (
      <div
        data-testid={testid}
        className="relative rounded-3xl p-7 md:p-9 overflow-hidden bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600] shadow-[0_30px_70px_-15px_rgba(255,92,0,0.6)]"
      >
        <Noise opacity={0.1} />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#FF5C00] text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg mb-6">
          <Star className="w-3 h-3 fill-current" /> Meest gekozen
        </div>

        <h3 className="relative text-xl md:text-2xl font-black tracking-tight text-white">{name}</h3>
        <p className="relative text-sm text-white/85 mt-1.5">{desc}</p>

        <div className="relative mt-6 mb-7 flex items-baseline gap-1.5">
          <span className="text-xs font-black text-white/80">SRD</span>
          <span className="text-5xl md:text-6xl font-black tracking-tighter text-white">{price.toLocaleString('nl-NL')}</span>
          <span className="text-sm text-white/80">/maand</span>
        </div>

        <button
          onClick={onCta}
          data-testid={`${testid}-cta`}
          className="relative w-full py-3.5 rounded-xl font-black text-sm bg-white text-[#FF5C00] hover:bg-orange-50 transition-colors shadow-xl"
        >
          {cta}
        </button>

        <div className="relative mt-7 pt-7 border-t border-white/25 space-y-3.5">
          {features.map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-[#FF5C00]" strokeWidth={3} />
              </div>
              <span className="text-white font-medium">{f}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={testid}
      className="relative rounded-3xl p-7 md:p-9 bg-white border-2 border-orange-100 hover:border-[#FF5C00]/40 transition-colors shadow-[0_20px_40px_-20px_rgba(255,92,0,0.15)]"
    >
      <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">{name}</h3>
      <p className="text-sm text-slate-600 mt-1.5">{desc}</p>

      <div className="mt-6 mb-7 flex items-baseline gap-1.5">
        <span className="text-xs font-bold text-slate-400">SRD</span>
        <span className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">{price.toLocaleString('nl-NL')}</span>
        <span className="text-sm text-slate-500">/maand</span>
      </div>

      <button
        onClick={onCta}
        data-testid={`${testid}-cta`}
        className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#FF5C00] text-white hover:bg-[#E65300] transition-colors shadow-[0_12px_25px_-8px_rgba(255,92,0,0.55)]"
      >
        {cta}
      </button>

      <div className="mt-7 pt-7 border-t border-orange-100 space-y-3.5">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2.5 text-sm">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-[#FF5C00]" strokeWidth={3} />
            </div>
            <span className="text-slate-700">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection({ onRegister }) {
  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-[#FFF7F0] overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(255,92,0,0.15),transparent_60%)] pointer-events-none" />
      <Noise opacity={0.15} />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
          <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-[#FF5C00] mb-4">Prijzen</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-5">
            Eén prijs, <span className="text-slate-400">geen verrassingen.</span>
          </h2>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
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

        <p className="text-center text-sm text-slate-500 mt-10">
          Vragen over een maatwerk pakket?{' '}
          <a href="#contact" className="text-[#FF5C00] font-bold hover:underline">
            Neem contact op
          </a>
        </p>
      </div>
    </section>
  );
}

// ================= CTA Banner (full orange) ========================
function CTASection({ onRegister }) {
  return (
    <section className="relative py-20 md:py-28 bg-[#FFFBF5]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#C74600] p-10 sm:p-16 lg:p-20 text-center shadow-[0_40px_80px_-20px_rgba(255,92,0,0.5)]">
          <Noise opacity={0.12} />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl" />

          <div className="relative max-w-3xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/90 mb-4">Klaar om te starten?</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white mb-6">
              Automatiseer je vastgoedbeheer <br className="hidden sm:block" />
              vanaf vandaag.
            </h2>
            <p className="text-base md:text-lg text-white/90 leading-relaxed mb-10 max-w-xl mx-auto">
              Installeer SuriRent nu en bespaar uren per week op administratie. Gratis proefperiode, geen creditcard vereist.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onRegister}
                data-testid="cta-register-btn"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-[#FF5C00] font-black rounded-xl hover:bg-orange-50 transition-colors shadow-xl"
              >
                Start gratis
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://wa.me/5978815993"
                target="_blank"
                rel="noreferrer"
                data-testid="cta-whatsapp-btn"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 backdrop-blur border border-white/30 text-white font-bold rounded-xl hover:bg-white/25 transition-colors"
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
    <footer id="contact" className="relative bg-gradient-to-br from-[#FFF7F0] to-[#FFEAD3] border-t border-orange-200 pt-20 pb-10">
      <Noise opacity={0.15} />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#C74600] p-1.5 shadow-[0_8px_20px_-5px_rgba(255,92,0,0.55)]">
                <img src="/kiosk-icons/kiosk-512.png" alt="SuriRent" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 tracking-tight">SuriRent</p>
                <p className="text-[10px] text-[#FF5C00] font-bold tracking-[0.3em] uppercase">N.V.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed max-w-md">
              Complete huurbeheer oplossing voor Surinaamse vastgoedbedrijven. Van Kiosk terminal tot loonstrook, in één app.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#FF5C00] mb-5">Contact</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <a href="tel:+5978815993" data-testid="footer-phone" className="flex items-center gap-2.5 text-slate-700 hover:text-[#FF5C00] transition-colors group font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-[#FF5C00] flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                    <Phone className="w-3.5 h-3.5 text-white" />
                  </div>
                  +597 881 5993
                </a>
              </li>
              <li>
                <a href="mailto:info@surirent.sr" data-testid="footer-email" className="flex items-center gap-2.5 text-slate-700 hover:text-[#FF5C00] transition-colors group font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-[#FF5C00] flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  info@surirent.sr
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-slate-700 font-semibold">
                <div className="w-7 h-7 rounded-lg bg-[#FF5C00] flex items-center justify-center shadow">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
                Paramaribo, Suriname
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#FF5C00] mb-5">Toegang</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <button onClick={onLogin} data-testid="footer-login-btn" className="text-slate-700 hover:text-[#FF5C00] transition-colors font-semibold">
                  Inloggen / PIN
                </button>
              </li>
              <li>
                <a href="#pricing" className="text-slate-700 hover:text-[#FF5C00] transition-colors font-semibold">Prijzen</a>
              </li>
              <li>
                <a href="#features" className="text-slate-700 hover:text-[#FF5C00] transition-colors font-semibold">Functies</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600 font-semibold">© {new Date().getFullYear()} SuriRent N.V. Alle rechten voorbehouden.</p>
          <p className="text-xs text-slate-600 font-semibold">
            Gemaakt in <span className="text-[#FF5C00] font-black">Suriname</span>
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
    document.body.style.backgroundColor = '#FFF7F0';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const goLogin = () => navigate('/vastgoed/login', { replace: true });
  const goRegister = () => navigate('/vastgoed/login?register=1', { replace: true });

  return (
    <div
      className="min-h-screen bg-[#FFF7F0] text-slate-900 antialiased selection:bg-[#FF5C00] selection:text-white"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <TopNav onLogin={goLogin} onRegister={goRegister} />
      <Hero onLogin={goLogin} onRegister={goRegister} />
      <StatsStrip />
      <VideoDemoSection />
      <FeaturesSection />
      <PricingSection onRegister={goRegister} />
      <CTASection onRegister={goRegister} />
      <Footer onLogin={goLogin} />
    </div>
  );
}
