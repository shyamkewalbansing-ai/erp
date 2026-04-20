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
      <p className="text-lg sm:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{timeStr}</p>
      <p className="hidden sm:block text-sm text-white/80 capitalize">{dateStr}</p>
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
        .then(res => { setCompany(res.data); setIsLoggedIn(true); navigate('/vastgoed/admin'); })
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
        // Persist employee session for admin RBAC if PIN was an employee PIN
        if (data.employee_id) {
          localStorage.setItem('kiosk_employee_session', JSON.stringify({
            employee_id: data.employee_id,
            employee_name: data.employee_name,
            role: data.role,
            company_id: data.company_id,
          }));
        } else {
          localStorage.removeItem('kiosk_employee_session');
        }
        navigate(`/vastgoed/admin`);
      }}
    />
  );
}

// ============ PIN LANDING SCREEN — direct keypad op /vastgoed ============
function PinLandingScreen({ onSuccess, onPassword, onRegister, onSuperadmin }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verifyPin = async (pinCode) => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/auth/pin`, { pin: pinCode });
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      onSuccess(res.data);
    } catch {
      setError('Ongeldige PIN code');
      setPin(['', '', '', '']);
    } finally { setLoading(false); }
  };

  const handleKey = (key) => {
    if (loading) return;
    setError('');
    if (key === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (pin[i]) { const np = [...pin]; np[i] = ''; setPin(np); return; }
      }
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!pin[i]) {
        const np = [...pin]; np[i] = key; setPin(np);
        if (i === 3) verifyPin(np.join(''));
        return;
      }
    }
  };

  return (
    <div className="h-screen bg-orange-500 flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-orange-600/20 backdrop-blur-sm border-b border-white/20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Appartement Kiosk</h1>
            <p className="text-[11px] sm:text-xs text-white/80 font-medium">Beheer & Kiosk toegang</p>
          </div>
        </div>
        <KioskClock />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md p-6 sm:p-10" data-testid="landing-pin-card">
          <div className="text-center mb-5 sm:mb-7">
            <div className="w-16 h-16 rounded-2xl bg-[#FF5C00] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
              <Lock className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">PIN Code</h2>
            <p className="text-sm text-slate-400 mt-1">Beheerder of medewerker PIN</p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="landing-pin-error">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            {pin.map((digit, i) => (
              <div
                key={i}
                data-testid={`landing-pin-input-${i}`}
                className={`text-center font-bold rounded-xl border-2 transition-all w-14 h-16 sm:w-16 sm:h-18 text-2xl flex items-center justify-center ${
                  error ? 'border-red-400 bg-red-50 text-red-600'
                    : digit ? 'border-[#FF5C00] bg-orange-50 text-[#FF5C00]'
                    : 'border-slate-200 bg-[#F9FAFB] text-slate-300'
                }`}
              >
                {digit ? '●' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[320px] mx-auto">
            {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map((k) => (
              k === '_e' ? <div key="e" /> : (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKey(k)}
                  disabled={loading}
                  data-testid={`landing-keypad-${k}`}
                  className={`h-14 sm:h-16 text-xl sm:text-2xl font-bold rounded-xl transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center ${
                    k === 'DEL'
                      ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                      : 'bg-[#F4F5F7] text-slate-800 hover:bg-orange-50 hover:text-orange-600 border border-slate-200'
                  }`}
                >
                  {k === 'DEL' ? <Delete className="w-5 h-5" /> : k}
                </button>
              )
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mt-5 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Verifiëren...</span>
            </div>
          )}

          {/* Bottom links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 flex-wrap text-xs font-medium">
            <button onClick={onPassword} data-testid="landing-password-btn" className="flex items-center gap-1 text-slate-500 hover:text-orange-500 transition">
              <KeyRound className="w-3.5 h-3.5" /> Wachtwoord
            </button>
            <span className="text-slate-200">•</span>
            <button onClick={onRegister} data-testid="landing-register-btn" className="flex items-center gap-1 text-slate-500 hover:text-orange-500 transition">
              <UserPlus className="w-3.5 h-3.5" /> Nieuw account
            </button>
            <span className="text-slate-200">•</span>
            <button onClick={onSuperadmin} data-testid="landing-superadmin-btn" className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition">
              <Shield className="w-3.5 h-3.5" /> Superadmin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KioskLoginScreen({ onSuccess }) {
  const navigate = useNavigate();
  const [view, setView] = useState('main'); // main, password, register, register_confirm, superadmin
  const [bankDetails, setBankDetails] = useState(null);
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
    // Step 1: just validate basic fields and show confirmation with bank details
    if (!name || !email || !password) {
      setError('Vul alle verplichte velden in');
      return;
    }
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.get(`${API}/public/subscription/bank-details`);
      setBankDetails(res.data || {});
    } catch { setBankDetails({}); }
    setLoading(false);
    setView('register_confirm');
  };

  const handleConfirmRegister = async () => {
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
      setView('register');
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

  // ============ MAIN KIOSK SCREEN — DIRECT PIN KEYPAD ============
  if (view === 'main') {
    return <PinLandingScreen onSuccess={onSuccess} onPassword={() => { resetForm(); setView('password'); }} onRegister={() => { resetForm(); setView('register'); }} onSuperadmin={() => { resetForm(); setView('superadmin'); }} />;
  }

  // ============ PASSWORD LOGIN ============
  if (view === 'password') {
    return (
      <div className="h-screen bg-orange-500 flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-orange-600/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Appartement Kiosk</h1>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium">Huurbetalingen Suriname</p>
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
      <div className="h-screen bg-orange-500 flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-orange-600/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Appartement Kiosk</h1>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium">Huurbetalingen Suriname</p>
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

  // ============ REGISTER CONFIRM (bank info) ============
  if (view === 'register_confirm') {
    return (
      <div className="min-h-screen bg-orange-500 flex flex-col" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-orange-600/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Bevestig Registratie</h2>
              <p className="text-xs sm:text-sm text-orange-100">Stap 2 van 2</p>
            </div>
          </div>
          <button
            onClick={() => { setError(''); setView('register'); }}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
            title="Terug"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Bijna klaar, {name}!</h3>
            <p className="text-sm text-slate-500 mb-5">
              U krijgt een <strong>14-daagse proefperiode</strong>. Om uw account actief te houden, maak binnen die periode het volgende bedrag over:
            </p>

            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-white mb-5 shadow-lg">
              <p className="text-sm text-orange-100">Maandelijks abonnement Pro</p>
              <p className="text-4xl font-extrabold tracking-tight mt-1">SRD 3.000,00</p>
              <p className="text-xs text-orange-100 mt-2">per maand via bankoverschrijving</p>
            </div>

            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 mb-5">
              <h4 className="font-bold text-slate-900 text-sm mb-3">Bankgegevens</h4>
              {(bankDetails && (bankDetails.bank_name || bankDetails.account_number)) ? (
                <div className="space-y-2 text-sm">
                  {bankDetails.bank_name && <div className="flex justify-between"><span className="text-slate-500">Bank:</span><span className="font-semibold text-slate-900">{bankDetails.bank_name}</span></div>}
                  {bankDetails.account_holder && <div className="flex justify-between"><span className="text-slate-500">Ten name van:</span><span className="font-semibold text-slate-900">{bankDetails.account_holder}</span></div>}
                  {bankDetails.account_number && <div className="flex justify-between"><span className="text-slate-500">Rekening:</span><span className="font-mono font-semibold text-slate-900">{bankDetails.account_number}</span></div>}
                  {bankDetails.swift && <div className="flex justify-between"><span className="text-slate-500">SWIFT:</span><span className="font-mono font-semibold text-slate-900">{bankDetails.swift}</span></div>}
                  {bankDetails.reference_hint && <div className="pt-2 border-t border-slate-200 mt-2"><p className="text-xs text-slate-500">Omschrijving:</p><p className="text-xs text-slate-700 mt-1">{bankDetails.reference_hint}</p></div>}
                </div>
              ) : (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  ⚠️ Bankgegevens zijn nog niet ingesteld door de superadmin. Neem contact op na registratie.
                </p>
              )}
              <p className="text-xs text-slate-500 mt-3 border-t border-slate-200 pt-3">
                Vermeld bij overschrijving uw bedrijfsnaam: <strong>{name}</strong> zodat wij uw betaling kunnen koppelen.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-800">
              <p className="font-semibold mb-1">Belangrijk:</p>
              <ul className="list-disc ml-5 space-y-0.5">
                <li>14 dagen proef: u kunt meteen inloggen en alles testen</li>
                <li>Na betaling wordt uw account op 'Actief' gezet door de beheerder</li>
                <li>Zonder betaling krijgt u na 14 dagen waarschuwingen, maar blijft inloggen mogelijk</li>
              </ul>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setView('register')}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                data-testid="register-back-btn"
              >
                Terug
              </button>
              <button
                onClick={handleConfirmRegister}
                disabled={loading}
                data-testid="register-confirm-btn"
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition shadow-lg disabled:opacity-50"
              >
                {loading ? 'Bezig...' : 'Account aanmaken & 14 dagen proef starten'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ============ SUPERADMIN ============
  if (view === 'superadmin') {
    return (
      <div className="h-screen bg-orange-500 flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-orange-600/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Appartement Kiosk</h1>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium">Huurbetalingen Suriname</p>
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
