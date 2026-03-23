import { useState, useEffect } from 'react';
import { Building2, LogIn, UserPlus, ArrowRight, X, Eye, EyeOff, Loader2, Home, Users, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskLanding() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
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
      <div className="kiosk-fullscreen flex bg-slate-50">
        {/* Left Panel - Light with Orange accent */}
        <div className="w-2/5 bg-white p-12 flex flex-col relative overflow-hidden border-r border-slate-200">
          {/* Decorative elements */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/5 rounded-full" />
          <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/10 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Building2 className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Appartement Kiosk</h1>
                <p className="text-slate-500">Huurbetalingen Suriname</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative z-10">
            <p className="text-slate-500 text-xl mb-2">Welkom terug,</p>
            <h2 className="text-5xl font-bold text-slate-900 mb-8">{company.name}</h2>
            
            <div className="space-y-4">
              <button
                onClick={() => navigate(`/vastgoed/${company.company_id}`)}
                className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 w-full"
              >
                <CreditCard className="w-8 h-8" />
                <span>Open Kiosk</span>
              </button>
              
              <button
                onClick={() => navigate('/vastgoed/admin')}
                className="kiosk-btn-xl bg-slate-100 hover:bg-slate-200 text-slate-700 w-full"
              >
                <Home className="w-8 h-8" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>

          <div className="relative z-10">
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 text-lg"
            >
              Uitloggen
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-slate-50 p-12 flex flex-col justify-center items-center">
          <div className="text-center max-w-lg">
            <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center mx-auto mb-8 border-2 border-slate-200 shadow-sm">
              <Building2 className="w-16 h-16 text-orange-500" />
            </div>
            <h3 className="text-4xl font-bold text-slate-900 mb-4">Uw Kiosk URL</h3>
            <p className="text-slate-500 text-xl mb-8">Deel deze URL met uw huurders</p>
            
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
              <code className="text-orange-600 text-lg font-mono break-all">
                {window.location.origin}/vastgoed/{company.company_id}
              </code>
            </div>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/vastgoed/${company.company_id}`);
              }}
              className="mt-6 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-xl text-lg font-medium transition shadow-sm"
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
    <div className="kiosk-fullscreen flex bg-slate-50">
      {/* Left Panel - Light with accent */}
      <div className="w-2/5 bg-white p-12 flex flex-col relative overflow-hidden border-r border-slate-200">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/5 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/10 rounded-full" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Appartement Kiosk</h1>
              <p className="text-slate-500">Huurbetalingen Suriname</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h2 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Huur Betalings<br />
            <span className="text-orange-500">Kiosk</span>
          </h2>
          <p className="text-2xl text-slate-500 mb-12 leading-relaxed max-w-md">
            Zelfbedieningskiosk voor uw huurders. Beheer meerdere panden vanuit één platform.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 w-full"
            >
              <UserPlus className="w-8 h-8" />
              <span>Gratis Starten</span>
            </button>
            
            <button
              onClick={() => setShowLoginModal(true)}
              className="kiosk-btn-xl bg-slate-100 hover:bg-slate-200 text-slate-700 w-full"
            >
              <LogIn className="w-8 h-8" />
              <span>Inloggen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="flex-1 bg-slate-50 p-12 flex flex-col justify-center">
        <div className="max-w-xl mx-auto">
          <p className="text-orange-500 font-semibold text-lg uppercase tracking-widest mb-6">
            Waarom Appartement Kiosk?
          </p>

          <div className="space-y-6">
            {[
              { 
                icon: Building2, 
                title: 'Multi-Pand Beheer', 
                desc: 'Beheer al uw gebouwen en appartementen vanuit één centraal dashboard' 
              },
              { 
                icon: Users, 
                title: 'Zelfbediening Kiosk', 
                desc: 'Huurders kunnen zelf hun huur, servicekosten en boetes betalen' 
              },
              { 
                icon: CreditCard, 
                title: 'Directe Verwerking', 
                desc: 'Contante betalingen direct verwerkt met automatische kwitantie' 
              },
            ].map((item) => (
              <div 
                key={item.title} 
                className="flex items-start gap-6 p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-slate-500 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <KioskModal onClose={() => setShowLoginModal(false)}>
          <LoginForm 
            onSuccess={(data) => {
              setCompany(data);
              setIsLoggedIn(true);
              setShowLoginModal(false);
            }}
            onRegister={() => {
              setShowLoginModal(false);
              setShowRegisterModal(true);
            }}
          />
        </KioskModal>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <KioskModal onClose={() => setShowRegisterModal(false)}>
          <RegisterForm 
            onSuccess={(data) => {
              setCompany(data);
              setIsLoggedIn(true);
              setShowRegisterModal(false);
            }}
            onLogin={() => {
              setShowRegisterModal(false);
              setShowLoginModal(true);
            }}
          />
        </KioskModal>
      )}
    </div>
  );
}

// Kiosk Modal Wrapper - Light Mode
function KioskModal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg p-10 relative border border-slate-200 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-8 h-8" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Login Form - Light Mode
function LoginForm({ onSuccess, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('kiosk_token', res.data.token);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Inloggen</h2>
        <p className="text-slate-500 text-lg mt-2">Log in op uw Kiosk account</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-slate-700 font-medium mb-2 text-lg">E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition"
            placeholder="uw@email.com"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-2 text-lg">Wachtwoord</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition pr-14"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full kiosk-btn-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white mt-4"
        >
          {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : 'Inloggen'}
        </button>
      </form>

      <p className="text-center text-slate-500 mt-8 text-lg">
        Nog geen account?{' '}
        <button onClick={onRegister} className="text-orange-500 font-semibold hover:underline">
          Registreer hier
        </button>
      </p>
    </div>
  );
}

// Register Form - Light Mode
function RegisterForm({ onSuccess, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API}/auth/register`, { 
        name, 
        email, 
        password,
        telefoon: telefoon || null
      });
      localStorage.setItem('kiosk_token', res.data.token);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30">
          <UserPlus className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Registreren</h2>
        <p className="text-slate-500 text-lg mt-2">Maak een nieuw Kiosk account</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-slate-700 font-medium mb-2">Bedrijfsnaam *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition"
            placeholder="Uw Vastgoed B.V."
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-2">E-mailadres *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition"
            placeholder="uw@email.com"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-2">Telefoon</label>
          <input
            type="tel"
            value={telefoon}
            onChange={(e) => setTelefoon(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition"
            placeholder="+597 123 4567"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-medium mb-2">Wachtwoord *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg focus:outline-none focus:border-orange-500 transition pr-14"
              placeholder="Min. 6 karakters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full kiosk-btn-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white mt-4"
        >
          {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : 'Registreren'}
        </button>
      </form>

      <p className="text-center text-slate-500 mt-6 text-lg">
        Al een account?{' '}
        <button onClick={onLogin} className="text-orange-500 font-semibold hover:underline">
          Log hier in
        </button>
      </p>
    </div>
  );
}
