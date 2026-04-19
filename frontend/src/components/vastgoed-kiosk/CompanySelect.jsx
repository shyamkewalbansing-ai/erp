import { useState, useEffect, useRef } from 'react';
import { Building2, LogIn, UserPlus, X, Eye, EyeOff, Loader2, Lock, Delete, Shield, KeyRound, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

// Live clock component for kiosk feel
function KioskClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { document.title = 'Vastgoed Kiosk'; }, []);
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const dateStr = time.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="text-right" data-testid="kiosk-clock">
      <p className="text-2xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{timeStr}</p>
      <p className="text-sm text-slate-400 capitalize">{dateStr}</p>
    </div>
  );
}

export default function KioskLanding() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = ''; };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { setCompany(res.data); setIsLoggedIn(true); navigate(`/vastgoed/${res.data.company_id}`); })
        .catch(() => localStorage.removeItem('kiosk_token'))
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn && company) {
    return (
      <div className="h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <KioskLoginScreen
      onSuccess={(data) => {
        setCompany(data);
        setIsLoggedIn(true);
        navigate(`/vastgoed/${data.company_id}`);
      }}
    />
  );
}

function KioskLoginScreen({ onSuccess }) {
  const navigate = useNavigate();
  const [view, setView] = useState('main'); // main, password, register, superadmin
  const [showPinModal, setShowPinModal] = useState(false);

  // Shared form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      onSuccess(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Inloggen mislukt');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/register`, { name, email, password, telefoon: telefoon || null });
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      onSuccess(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', '));
      else setError('Registratie mislukt');
    } finally { setLoading(false); }
  };

  const handleSuperadminLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/superadmin/login`, { email, password });
      localStorage.setItem('superadmin_token', res.data.token);
      navigate('/vastgoed/superadmin');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Inloggen mislukt');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEmail(''); setPassword(''); setName(''); setTelefoon('');
    setError(''); setShowPassword(false);
  };

  // ============ MAIN KIOSK SCREEN ============
  if (view === 'main') {
    return (
      <div className="h-screen bg-[#F4F5F7] flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Appartement Kiosk</h1>
              <p className="text-xs text-slate-400 font-medium">Huurbetalingen Suriname</p>
            </div>
          </div>
          <KioskClock />
        </div>

        {/* Main Content - Centered Card */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 w-full max-w-2xl p-10 md:p-14" data-testid="kiosk-login-card">
            {/* Welcome */}
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">
                Welkom
              </h2>
              <p className="text-lg text-slate-400 font-medium">Kies een inlogmethode</p>
            </div>

            {/* Login Method Buttons */}
            <div className="space-y-4 mb-8">
              {/* PIN Login - Primary */}
              <button
                onClick={() => setShowPinModal(true)}
                data-testid="kiosk-pin-login-btn"
                className="w-full h-20 md:h-24 bg-[#FF5C00] hover:bg-[#E05200] text-white rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-4 text-xl md:text-2xl font-semibold transition-all active:scale-[0.97]"
              >
                <Lock className="w-7 h-7 md:w-8 md:h-8" />
                Inloggen met PIN code
              </button>

              {/* Password button */}
              <button
                onClick={() => { resetForm(); setView('password'); }}
                data-testid="kiosk-password-login-btn"
                className="h-20 w-full bg-white text-slate-800 border-2 border-slate-200 hover:border-[#FF5C00] hover:bg-orange-50 rounded-2xl flex items-center justify-center gap-3 text-lg md:text-xl font-semibold transition-all active:scale-[0.97]"
              >
                <KeyRound className="w-6 h-6 md:w-7 md:h-7 text-[#FF5C00]" />
                Wachtwoord
              </button>
            </div>

            {/* Bottom Links */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                onClick={() => { resetForm(); setView('register'); }}
                data-testid="switch-to-register"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-[#FF5C00] transition"
              >
                <UserPlus className="w-4 h-4" />
                Nieuw account
              </button>
              <button
                onClick={() => { resetForm(); setView('superadmin'); }}
                data-testid="switch-to-superadmin"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-red-500 transition"
              >
                <Shield className="w-3.5 h-3.5" />
                Superadmin
              </button>
            </div>
          </div>
        </div>

        {/* PIN Modal */}
        {showPinModal && (
          <PinModal
            onSuccess={onSuccess}
            onClose={() => setShowPinModal(false)}
          />
        )}
      </div>
    );
  }

  // ============ PASSWORD LOGIN ============
  if (view === 'password') {
    return (
      <div className="h-screen bg-[#F4F5F7] flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Appartement Kiosk</h1>
              <p className="text-xs text-slate-400 font-medium">Huurbetalingen Suriname</p>
            </div>
          </div>
          <KioskClock />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 w-full max-w-xl p-10 md:p-14" data-testid="kiosk-auth-form">
            <button
              onClick={() => setView('main')}
              data-testid="back-to-main"
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 mb-6 transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Terug
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FF5C00] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <KeyRound className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Inloggen</h2>
              <p className="text-base text-slate-400 mt-1">Log in met uw e-mail en wachtwoord</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="auth-error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">E-mailadres</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  data-testid="auth-email-input"
                  className="w-full h-14 text-lg px-5 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                  placeholder="uw@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Wachtwoord</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    data-testid="auth-password-input"
                    className="w-full h-14 text-lg px-5 pr-12 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                    placeholder="Wachtwoord"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="toggle-password-visibility"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-button"
                className="w-full h-16 bg-[#FF5C00] hover:bg-[#E05200] text-white rounded-xl text-xl font-semibold transition-all active:scale-[0.97] shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Inloggen'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-5">
              Nog geen account?{' '}
              <button
                onClick={() => { resetForm(); setView('register'); }}
                data-testid="switch-to-register"
                className="text-[#FF5C00] font-semibold hover:underline"
              >
                Registreer hier
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ REGISTER ============
  if (view === 'register') {
    return (
      <div className="h-screen bg-[#F4F5F7] flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Appartement Kiosk</h1>
              <p className="text-xs text-slate-400 font-medium">Huurbetalingen Suriname</p>
            </div>
          </div>
          <KioskClock />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 w-full max-w-xl p-10 md:p-14" data-testid="kiosk-auth-form">
            <button
              onClick={() => setView('main')}
              data-testid="back-to-main"
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 mb-6 transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Terug
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FF5C00] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <UserPlus className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Account Aanmaken</h2>
              <p className="text-base text-slate-400 mt-1">Registreer uw vastgoedbedrijf</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="auth-error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bedrijfsnaam</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  data-testid="register-name-input"
                  className="w-full h-14 text-lg px-5 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                  placeholder="Uw Vastgoed B.V."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">E-mailadres</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  data-testid="auth-email-input"
                  className="w-full h-14 text-lg px-5 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                  placeholder="uw@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Telefoon (optioneel)</label>
                <input
                  type="tel"
                  value={telefoon}
                  onChange={e => setTelefoon(e.target.value)}
                  data-testid="register-phone-input"
                  className="w-full h-14 text-lg px-5 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                  placeholder="+597 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Wachtwoord</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    data-testid="auth-password-input"
                    className="w-full h-14 text-lg px-5 pr-12 rounded-xl border-2 border-slate-200 focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 bg-[#F9FAFB] outline-none transition"
                    placeholder="Minimaal 6 tekens"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-button"
                className="w-full h-16 bg-[#FF5C00] hover:bg-[#E05200] text-white rounded-xl text-xl font-semibold transition-all active:scale-[0.97] shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Registreren'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-5">
              Al een account?{' '}
              <button
                onClick={() => { resetForm(); setView('password'); }}
                data-testid="switch-to-login"
                className="text-[#FF5C00] font-semibold hover:underline"
              >
                Log hier in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ SUPERADMIN ============
  if (view === 'superadmin') {
    return (
      <div className="h-screen bg-[#F4F5F7] flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Appartement Kiosk</h1>
              <p className="text-xs text-slate-400 font-medium">Huurbetalingen Suriname</p>
            </div>
          </div>
          <KioskClock />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 w-full max-w-xl p-10 md:p-14" data-testid="superadmin-auth-form">
            <button
              onClick={() => setView('main')}
              data-testid="switch-back-from-superadmin"
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 mb-6 transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Terug
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/20">
                <Shield className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Super Admin</h2>
              <p className="text-base text-slate-400 mt-1">Platform beheer login</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="superadmin-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSuperadminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  data-testid="superadmin-email"
                  className="w-full h-14 text-lg px-5 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-[#F9FAFB] outline-none transition"
                  placeholder="admin@facturatie.sr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Wachtwoord</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    data-testid="superadmin-password"
                    className="w-full h-14 text-lg px-5 pr-12 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-[#F9FAFB] outline-none transition"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="superadmin-login-btn"
                className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-semibold transition-all active:scale-[0.97] shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Inloggen als Admin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============ PIN MODAL (Popup) ============
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    pinRefs[0].current?.focus();
  }, []);

  const verifyPin = async (pinCode) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/pin`, { pin: pinCode });
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      onSuccess(res.data);
    } catch {
      setError('Ongeldige PIN code');
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
    } finally { setLoading(false); }
  };

  const handleKeypad = (value) => {
    if (loading) return;
    setError('');
    if (value === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (pin[i]) {
          const newPin = [...pin];
          newPin[i] = '';
          setPin(newPin);
          return;
        }
      }
    } else {
      for (let i = 0; i < 4; i++) {
        if (!pin[i]) {
          const newPin = [...pin];
          newPin[i] = value;
          setPin(newPin);
          if (i === 3) {
            verifyPin(newPin.join(''));
          }
          return;
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="pin-modal-overlay">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10 relative animate-in"
        style={{ fontFamily: 'Outfit, sans-serif', animation: 'scaleIn 0.2s ease-out' }}
        data-testid="pin-modal"
      >
        <style>{`@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>

        {/* Close button */}
        <button
          onClick={onClose}
          data-testid="pin-modal-close"
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5C00] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">PIN Code</h3>
          <p className="text-sm text-slate-400 mt-1">Voer uw 4-cijferige code in</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="auth-error-message">
            {error}
          </div>
        )}

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-8">
          {pin.map((digit, i) => (
            <div
              key={i}
              data-testid={`pin-input-${i}`}
              className={`w-16 h-16 md:w-18 md:h-18 rounded-xl border-2 flex items-center justify-center text-3xl font-black transition-all ${
                error ? 'border-red-400 bg-red-50 text-red-600'
                  : digit ? 'border-[#FF5C00] bg-orange-50 text-[#FF5C00]'
                  : 'border-slate-200 bg-[#F9FAFB] text-slate-300'
              }`}
            >
              {digit || '\u2022'}
            </div>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
          {['1','2','3','4','5','6','7','8','9','','0','DEL'].map((key) => (
            key === '' ? <div key="empty" /> : (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypad(key)}
                disabled={loading}
                data-testid={`pin-key-${key}`}
                className={`h-16 md:h-20 text-2xl md:text-3xl font-bold rounded-xl transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center ${
                  key === 'DEL'
                    ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                    : 'bg-[#F4F5F7] text-slate-800 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {key === 'DEL' ? <Delete className="w-6 h-6" /> : key}
              </button>
            )
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-6 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Verifi&euml;ren...</span>
          </div>
        )}
      </div>
    </div>
  );
}
