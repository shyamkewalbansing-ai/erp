import { useState, useEffect } from 'react';
import { Building2, LogIn, UserPlus, ArrowRight, X, Eye, EyeOff, Loader2, Home, Users, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskLanding() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Disable scroll for kiosk mode
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setCompany(res.data);
        setIsLoggedIn(true);
      }).catch(() => {
        localStorage.removeItem('kiosk_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('kiosk_token');
    setIsLoggedIn(false);
    setCompany(null);
  };

  if (loading) {
    return (
      <div className="kiosk-fullscreen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If logged in, show different screen
  if (isLoggedIn && company) {
    return (
      <div className="kiosk-fullscreen flex flex-col lg:flex-row bg-slate-50">
        {/* Left Panel - Light with Orange accent */}
        <div className="w-full lg:w-2/5 bg-white p-6 lg:p-12 flex flex-col relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[50vh] lg:min-h-0">
          {/* Decorative elements */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/5 rounded-full" />
          <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/10 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 lg:gap-4 mb-2">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Building2 className="w-6 h-6 lg:w-9 lg:h-9 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Appartement Kiosk</h1>
                <p className="text-slate-500 text-sm lg:text-base">Huurbetalingen Suriname</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative z-10 py-6 lg:py-0">
            <p className="text-slate-500 text-lg lg:text-xl mb-2">Welkom terug,</p>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 lg:mb-8">{company.name}</h2>
            
            <div className="space-y-3 lg:space-y-4">
              <button
                onClick={() => navigate(`/vastgoed/${company.company_id}`)}
                className="w-full py-4 lg:py-5 px-6 rounded-xl text-lg lg:text-xl font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition"
              >
                <CreditCard className="w-6 h-6 lg:w-8 lg:h-8" />
                <span>Open Kiosk</span>
              </button>
              
              <button
                onClick={() => navigate('/vastgoed/admin')}
                className="w-full py-4 lg:py-5 px-6 rounded-xl text-lg lg:text-xl font-bold flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Home className="w-6 h-6 lg:w-8 lg:h-8" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>

          <div className="relative z-10">
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 text-base lg:text-lg"
            >
              Uitloggen
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-slate-50 p-6 lg:p-12 flex flex-col justify-center items-center">
          <div className="text-center max-w-lg w-full">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl lg:rounded-3xl bg-white flex items-center justify-center mx-auto mb-6 lg:mb-8 border-2 border-slate-200 shadow-sm">
              <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-orange-500" />
            </div>
            <h3 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-3 lg:mb-4">Uw Kiosk URL</h3>
            <p className="text-slate-500 text-lg lg:text-xl mb-6 lg:mb-8">Deel deze URL met uw huurders</p>
            
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border-2 border-slate-200 shadow-sm">
              <code className="text-orange-600 text-sm lg:text-lg font-mono break-all">
                {window.location.origin}/vastgoed/{company.company_id}
              </code>
            </div>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/vastgoed/${company.company_id}`);
              }}
              className="mt-4 lg:mt-6 px-6 lg:px-8 py-3 lg:py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-xl text-base lg:text-lg font-medium transition shadow-sm"
            >
              Kopieer URL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show landing
  return (
    <div className="kiosk-fullscreen flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      {/* Left Panel - Light with accent */}
      <div className="w-full lg:w-2/5 bg-white p-6 lg:p-12 flex flex-col relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[35vh] lg:min-h-0">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/5 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/10 rounded-full" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 lg:gap-4 mb-2">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Building2 className="w-6 h-6 lg:w-9 lg:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Appartement Kiosk</h1>
              <p className="text-slate-500 text-sm lg:text-base">Huurbetalingen Suriname</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10 py-4 lg:py-0">
          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-3 lg:mb-6 leading-tight">
            Huur Betalings<br />
            <span className="text-orange-500">Kiosk</span>
          </h2>
          <p className="text-base lg:text-xl text-slate-500 mb-6 lg:mb-10 leading-relaxed max-w-md hidden lg:block">
            Zelfbedieningskiosk voor uw huurders. Beheer meerdere panden vanuit één platform.
          </p>
        </div>
      </div>

      {/* Right Panel - Full Auth Form */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
        <KioskAuthForm 
          onSuccess={(data) => {
            setCompany(data);
            setIsLoggedIn(true);
          }}
        />
      </div>
    </div>
  );
}

// Kiosk Modal Wrapper - Light Mode (keep for other uses)
function KioskModal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl w-full max-w-lg p-6 lg:p-10 relative border border-slate-200 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 lg:top-6 lg:right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-6 h-6 lg:w-8 lg:h-8" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Virtual Keyboard Component for Kiosk Mode - FULL SIZE
function VirtualKeyboard({ onKeyPress, onBackspace, onEnter, onClose }) {
  const row1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row3 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@'];
  const row4 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '_'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-slate-100 p-4 lg:p-6 rounded-t-3xl shadow-2xl">
        {/* Close button */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-500 font-medium">Schermtoetsenbord</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 rounded-lg text-slate-600 hover:bg-slate-300 font-medium"
          >
            Sluiten
          </button>
        </div>
        
        {/* Numbers row */}
        <div className="flex gap-1.5 lg:gap-2 justify-center mb-2">
          {row1.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key)}
              className="flex-1 max-w-16 h-12 lg:h-16 bg-white rounded-xl text-lg lg:text-2xl font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Row 2 - QWERTY */}
        <div className="flex gap-1.5 lg:gap-2 justify-center mb-2">
          {row2.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key.toLowerCase())}
              className="flex-1 max-w-16 h-12 lg:h-16 bg-white rounded-xl text-lg lg:text-2xl font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Row 3 */}
        <div className="flex gap-1.5 lg:gap-2 justify-center mb-2">
          {row3.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key.toLowerCase())}
              className="flex-1 max-w-16 h-12 lg:h-16 bg-white rounded-xl text-lg lg:text-2xl font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Row 4 */}
        <div className="flex gap-1.5 lg:gap-2 justify-center mb-2">
          {row4.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key.toLowerCase())}
              className="flex-1 max-w-16 h-12 lg:h-16 bg-white rounded-xl text-lg lg:text-2xl font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Bottom row - Space, Backspace, Enter */}
        <div className="flex gap-2 lg:gap-3 justify-center">
          <button
            type="button"
            onClick={onBackspace}
            className="w-24 lg:w-32 h-12 lg:h-16 bg-red-100 rounded-xl text-base lg:text-xl font-bold text-red-600 hover:bg-red-200 active:bg-red-300 transition shadow-sm flex items-center justify-center gap-2"
          >
            ⌫ Wis
          </button>
          <button
            type="button"
            onClick={() => onKeyPress(' ')}
            className="flex-1 max-w-md h-12 lg:h-16 bg-white rounded-xl text-base lg:text-xl font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
          >
            SPATIE
          </button>
          <button
            type="button"
            onClick={onEnter}
            className="w-24 lg:w-32 h-12 lg:h-16 bg-orange-500 rounded-xl text-base lg:text-xl font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition shadow-sm"
          >
            OK ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// Full Auth Form - Centered, Clean design
function KioskAuthForm({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleKeyPress = (key) => {
    if (activeField === 'email') setEmail(prev => prev + key);
    else if (activeField === 'password') setPassword(prev => prev + key);
    else if (activeField === 'name') setName(prev => prev + key);
    else if (activeField === 'telefoon') setTelefoon(prev => prev + key);
  };

  const handleBackspace = () => {
    if (activeField === 'email') setEmail(prev => prev.slice(0, -1));
    else if (activeField === 'password') setPassword(prev => prev.slice(0, -1));
    else if (activeField === 'name') setName(prev => prev.slice(0, -1));
    else if (activeField === 'telefoon') setTelefoon(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (mode === 'login') {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        localStorage.setItem('kiosk_token', res.data.token);
        onSuccess(res.data);
      } else {
        const res = await axios.post(`${API}/auth/register`, { 
          name, 
          email, 
          password,
          telefoon: telefoon || null
        });
        localStorage.setItem('kiosk_token', res.data.token);
        onSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || (mode === 'login' ? 'Inloggen mislukt' : 'Registratie mislukt'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {mode === 'login' ? 'Inloggen' : 'Account Aanmaken'}
          </h2>
          <p className="text-slate-500 mt-1">
            {mode === 'login' ? 'Log in op uw account' : 'Maak een nieuw account aan'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field - only for register */}
          {mode === 'register' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1.5 text-sm">Bedrijfsnaam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setActiveField('name')}
                required
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 text-lg focus:outline-none transition ${
                  activeField === 'name' ? 'border-orange-500' : 'border-slate-200'
                }`}
                placeholder="Uw Vastgoed B.V."
              />
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-slate-700 font-medium mb-1.5 text-sm">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setActiveField('email')}
              required
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 text-lg focus:outline-none transition ${
                activeField === 'email' ? 'border-orange-500' : 'border-slate-200'
              }`}
              placeholder="uw@email.com"
            />
          </div>

          {/* Telefoon field - only for register */}
          {mode === 'register' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1.5 text-sm">Telefoon (optioneel)</label>
              <input
                type="tel"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                onFocus={() => setActiveField('telefoon')}
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 text-lg focus:outline-none transition ${
                  activeField === 'telefoon' ? 'border-orange-500' : 'border-slate-200'
                }`}
                placeholder="+597 123 4567"
              />
            </div>
          )}

          {/* Password field */}
          <div>
            <label className="block text-slate-700 font-medium mb-1.5 text-sm">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setActiveField('password')}
                required
                minLength={mode === 'register' ? 6 : undefined}
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 text-lg focus:outline-none transition pr-12 ${
                  activeField === 'password' ? 'border-orange-500' : 'border-slate-200'
                }`}
                placeholder={mode === 'register' ? "Min. 6 karakters" : "••••••••"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot password link - only for login */}
          {mode === 'login' && (
            <div className="text-right">
              <button type="button" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                Wachtwoord vergeten?
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl text-lg font-bold flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white transition shadow-lg shadow-orange-500/30"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : mode === 'login' ? (
              'Inloggen'
            ) : (
              'Registreren'
            )}
          </button>
        </form>

        {/* Toggle mode link */}
        <p className="text-center text-slate-500 mt-6 text-sm">
          {mode === 'login' ? (
            <>
              Nog geen account?{' '}
              <button 
                onClick={() => { setMode('register'); setError(''); }}
                className="text-orange-500 font-semibold hover:underline"
              >
                Registreer hier
              </button>
            </>
          ) : (
            <>
              Al een account?{' '}
              <button 
                onClick={() => { setMode('login'); setError(''); }}
                className="text-orange-500 font-semibold hover:underline"
              >
                Log hier in
              </button>
            </>
          )}
        </p>

        {/* Virtual Keyboard Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowKeyboard(true)}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Schermtoetsenbord openen
          </button>
        </div>
      </div>

      {/* Virtual Keyboard - Full Screen Overlay */}
      {showKeyboard && (
        <VirtualKeyboard 
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={() => { setShowKeyboard(false); handleSubmit(); }}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </div>
  );
}
