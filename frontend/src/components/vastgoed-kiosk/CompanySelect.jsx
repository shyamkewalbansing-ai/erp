import { useState, useEffect, useRef } from 'react';
import { Building2, LogIn, UserPlus, ArrowRight, X, Eye, EyeOff, Loader2, Home, Users, CreditCard, Lock, Delete } from 'lucide-react';
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

  // Check if already logged in - redirect to kiosk
  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setCompany(res.data);
        setIsLoggedIn(true);
        // Direct redirect to kiosk page
        navigate(`/vastgoed/${res.data.company_id}`);
      }).catch(() => {
        localStorage.removeItem('kiosk_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('kiosk_token');
    // Clear all PIN verification sessions
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
    });
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

  // If logged in, show loading spinner while redirecting (no intermediate page)
  if (isLoggedIn && company) {
    return (
      <div className="kiosk-fullscreen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Laden...</p>
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
            Appartement<br />
            <span className="text-orange-500">Kiosk</span>
          </h2>
          <p className="text-base lg:text-xl text-slate-500 mb-6 lg:mb-10 leading-relaxed max-w-md hidden lg:block">
            Beheer uw appartementen en ontvang huurbetalingen vanuit één platform.
          </p>
        </div>
      </div>

      {/* Right Panel - Full Auth Form */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
        <KioskAuthForm 
          onSuccess={(data) => {
            setCompany(data);
            setIsLoggedIn(true);
            // Direct navigate to kiosk page after login
            navigate(`/vastgoed/${data.company_id}`);
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

// Virtual Keyboard Component - FULL WIDTH in form area
function VirtualKeyboard({ onKeyPress, onBackspace, onEnter }) {
  const row1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row3 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@'];
  const row4 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '_'];

  return (
    <div className="bg-slate-100 rounded-xl p-4 mt-4 w-full">
      {/* Numbers row */}
      <div className="flex gap-1.5 justify-center mb-2">
        {row1.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="flex-1 h-12 bg-white rounded-lg text-lg font-bold text-slate-700 hover:bg-slate-50 active:bg-orange-100 transition shadow-sm"
          >
            {key}
          </button>
        ))}
      </div>
      
      {/* Row 2 - QWERTY */}
      <div className="flex gap-1.5 justify-center mb-2">
        {row2.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key.toLowerCase())}
            className="flex-1 h-12 bg-white rounded-lg text-lg font-bold text-slate-700 hover:bg-slate-50 active:bg-orange-100 transition shadow-sm"
          >
            {key}
          </button>
        ))}
      </div>
      
      {/* Row 3 */}
      <div className="flex gap-1.5 justify-center mb-2">
        {row3.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key === '@' ? '@' : key.toLowerCase())}
            className="flex-1 h-12 bg-white rounded-lg text-lg font-bold text-slate-700 hover:bg-slate-50 active:bg-orange-100 transition shadow-sm"
          >
            {key}
          </button>
        ))}
      </div>
      
      {/* Row 4 */}
      <div className="flex gap-1.5 justify-center mb-2">
        {row4.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key.toLowerCase())}
            className="flex-1 h-12 bg-white rounded-lg text-lg font-bold text-slate-700 hover:bg-slate-50 active:bg-orange-100 transition shadow-sm"
          >
            {key}
          </button>
        ))}
      </div>
      
      {/* Bottom row - Space, Backspace, Enter */}
      <div className="flex gap-1.5 justify-center">
        <button
          type="button"
          onClick={onBackspace}
          className="w-24 h-12 bg-red-100 rounded-lg text-base font-bold text-red-600 hover:bg-red-200 active:bg-red-300 transition shadow-sm"
        >
          ⌫ Wis
        </button>
        <button
          type="button"
          onClick={() => onKeyPress(' ')}
          className="flex-1 h-12 bg-white rounded-lg text-base font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-200 transition shadow-sm"
        >
          SPATIE
        </button>
        <button
          type="button"
          onClick={onEnter}
          className="w-24 h-12 bg-orange-500 rounded-lg text-base font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition shadow-sm"
        >
          OK ✓
        </button>
      </div>
    </div>
  );
}

// Full Auth Form - Centered, Clean design with inline keyboard
function KioskAuthForm({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', or 'pin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState('email');
  const [showKeyboard, setShowKeyboard] = useState(() => {
    return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  });
  // PIN state
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleKeyPress = (key) => {
    switch(activeField) {
      case 'email':
        setEmail(prev => prev + key);
        break;
      case 'password':
        setPassword(prev => prev + key);
        break;
      case 'name':
        setName(prev => prev + key);
        break;
      case 'telefoon':
        setTelefoon(prev => prev + key);
        break;
      default:
        break;
    }
  };

  const handleBackspace = () => {
    switch(activeField) {
      case 'email':
        setEmail(prev => prev.slice(0, -1));
        break;
      case 'password':
        setPassword(prev => prev.slice(0, -1));
        break;
      case 'name':
        setName(prev => prev.slice(0, -1));
        break;
      case 'telefoon':
        setTelefoon(prev => prev.slice(0, -1));
        break;
      default:
        break;
    }
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
      } else if (mode === 'register') {
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
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', '));
      } else {
        setError(mode === 'login' ? 'Inloggen mislukt' : 'Registratie mislukt');
      }
    } finally {
      setLoading(false);
    }
  };

  // PIN handlers
  const handlePinChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
    if (value && index === 3 && newPin.every(d => d !== '')) {
      verifyPinLogin(newPin.join(''));
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinKeypad = (value) => {
    if (value === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (pin[i]) {
          const newPin = [...pin];
          newPin[i] = '';
          setPin(newPin);
          pinRefs[i].current?.focus();
          break;
        }
      }
    } else {
      for (let i = 0; i < 4; i++) {
        if (!pin[i]) {
          handlePinChange(i, value);
          break;
        }
      }
    }
  };

  const verifyPinLogin = async (pinCode) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/pin`, { pin: pinCode });
      localStorage.setItem('kiosk_token', res.data.token);
      // Mark PIN as verified so kiosk page won't ask again
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      onSuccess(res.data);
    } catch (err) {
      setError('Ongeldige PIN code. Probeer opnieuw.');
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // PIN login screen
  if (mode === 'pin') {
    return (
      <div className="flex-1 flex flex-col overflow-auto" data-testid="kiosk-auth-form">
        <div className="w-full max-w-md mx-auto px-4 lg:px-6 flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Inloggen met PIN</h2>
            <p className="text-slate-500 text-sm mt-1">Voer uw 4-cijferige PIN code in</p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center text-sm" data-testid="auth-error-message">
              {error}
            </div>
          )}

          {/* PIN Input */}
          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={pinRefs[index]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                data-testid={`pin-input-${index}`}
                className={`w-14 h-16 lg:w-16 lg:h-20 text-center text-2xl lg:text-3xl font-bold rounded-xl border-2 transition-all outline-none ${
                  error 
                    ? 'border-red-500 bg-red-50' 
                    : digit 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-slate-200 bg-slate-50 focus:border-orange-500'
                }`}
                disabled={loading}
              />
            ))}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-6">
            {['1','2','3','4','5','6','7','8','9','_empty','0','DEL'].map((key) => (
              key === '_empty' ? (
                <div key={key} className="h-14" />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePinKeypad(key)}
                  disabled={loading}
                  data-testid={`pin-key-${key}`}
                  className={`h-14 text-xl font-bold rounded-xl transition active:scale-95 disabled:opacity-50 ${
                    key === 'DEL' 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center' 
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
                </button>
              )
            ))}
          </div>

          {loading && (
            <p className="text-center text-slate-500 animate-pulse mb-4">PIN verifiëren...</p>
          )}

          {/* Switch to password login */}
          <p className="text-center text-slate-500 text-sm">
            <button 
              onClick={() => { setMode('login'); setError(''); setPin(['','','','']); }}
              className="text-orange-500 font-semibold hover:underline"
              data-testid="switch-to-password-login"
            >
              Inloggen met wachtwoord
            </button>
          </p>
          <p className="text-center text-slate-500 mt-2 text-sm">
            Nog geen account?{' '}
            <button 
              onClick={() => { setMode('register'); setError(''); setPin(['','','','']); setActiveField('name'); }}
              className="text-orange-500 font-semibold hover:underline"
              data-testid="switch-to-register"
            >
              Registreer hier
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto" data-testid="kiosk-auth-form">
      {/* Form area - vertically centered when no keyboard, shifts up when keyboard open */}
      <div className={`w-full max-w-lg mx-auto px-4 lg:px-6 transition-all duration-300 ease-in-out ${
        showKeyboard ? 'pt-3' : 'flex-1 flex flex-col justify-center'
      }`}>
        {/* Logo + Title */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'Inloggen' : 'Account Aanmaken'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'login' ? 'Log in op uw account' : 'Maak een nieuw account aan'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center text-sm" data-testid="auth-error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name field - only for register */}
          {mode === 'register' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-sm">Bedrijfsnaam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setActiveField('name')}
                data-testid="register-name-input"
                className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-slate-900 focus:outline-none ${
                  activeField === 'name' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
                }`}
                placeholder="Uw Vastgoed B.V."
              />
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-slate-700 font-medium mb-1 text-sm">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setActiveField('email')}
              data-testid="auth-email-input"
              className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-slate-900 focus:outline-none ${
                activeField === 'email' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
              }`}
              placeholder="uw@email.com"
            />
          </div>

          {/* Telefoon field - only for register */}
          {mode === 'register' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-sm">Telefoon (optioneel)</label>
              <input
                type="tel"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                onFocus={() => setActiveField('telefoon')}
                data-testid="register-phone-input"
                className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-slate-900 focus:outline-none ${
                  activeField === 'telefoon' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
                }`}
                placeholder="+597 123 4567"
              />
            </div>
          )}

          {/* Password field */}
          <div>
            <label className="block text-slate-700 font-medium mb-1 text-sm">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setActiveField('password')}
                data-testid="auth-password-input"
                className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-slate-900 focus:outline-none pr-10 ${
                  activeField === 'password' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                data-testid="toggle-password-visibility"
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
            data-testid="auth-submit-button"
            className="w-full py-3 px-4 rounded-lg text-base font-bold flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white transition shadow-lg shadow-orange-500/30"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'login' ? (
              'Inloggen'
            ) : (
              'Registreren'
            )}
          </button>
        </form>

        {/* Toggle mode link */}
        <p className="text-center text-slate-500 mt-3 text-sm">
          {mode === 'login' ? (
            <>
              Nog geen account?{' '}
              <button 
                onClick={() => { setMode('register'); setError(''); setActiveField('name'); }}
                className="text-orange-500 font-semibold hover:underline"
                data-testid="switch-to-register"
              >
                Registreer hier
              </button>
            </>
          ) : (
            <>
              Al een account?{' '}
              <button 
                onClick={() => { setMode('login'); setError(''); setActiveField('email'); }}
                className="text-orange-500 font-semibold hover:underline"
                data-testid="switch-to-login"
              >
                Log hier in
              </button>
            </>
          )}
        </p>

        {/* PIN login link - only for login mode */}
        {mode === 'login' && (
          <div className="mt-2 text-center">
            <button 
              onClick={() => { setMode('pin'); setError(''); setPin(['','','','']); }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-orange-500 transition"
              data-testid="switch-to-pin-login"
            >
              <Lock className="w-3.5 h-3.5" />
              Inloggen met PIN code
            </button>
          </div>
        )}

        {/* Keyboard Toggle */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowKeyboard(!showKeyboard)}
            data-testid="toggle-virtual-keyboard"
            className={`text-sm font-medium inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
              showKeyboard 
                ? 'bg-orange-100 text-orange-600' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            {showKeyboard ? 'Toetsenbord verbergen' : 'Schermtoetsenbord (touchscreen)'}
          </button>
        </div>
      </div>

      {/* Virtual Keyboard - FULL WIDTH of right panel, outside max-w-lg */}
      {showKeyboard && (
        <div className="px-4 lg:px-6 pb-3" data-testid="virtual-keyboard-container">
          <VirtualKeyboard 
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onEnter={handleSubmit}
          />
        </div>
      )}
    </div>
  );
}
