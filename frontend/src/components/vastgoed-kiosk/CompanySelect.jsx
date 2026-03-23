import { useState, useEffect } from 'react';
import { Building2, LogIn, UserPlus, ArrowRight, Shield, BarChart3, Users, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Local API - use REACT_APP_BACKEND_URL
const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskLanding() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] py-4 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0f172a]">Appartement Kiosk</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-[#64748b]">Welkom, {company?.name}</span>
                <button
                  onClick={() => navigate(`/vastgoed/${company?.company_id}`)}
                  className="kiosk-btn-primary h-12 text-base px-6"
                >
                  Open Kiosk
                </button>
                <button
                  onClick={() => navigate('/vastgoed/admin')}
                  className="kiosk-tab kiosk-tab-active"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-[#64748b] hover:text-[#0f172a]"
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="kiosk-tab kiosk-tab-active"
                >
                  <LogIn className="w-4 h-4" />
                  Inloggen
                </button>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="kiosk-btn-primary h-12 text-base px-6"
                >
                  <UserPlus className="w-4 h-4" />
                  Registreren
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="flex gap-12">
          {/* Left */}
          <div className="flex-1">
            <span className="inline-block bg-[#f97316]/10 text-[#f97316] text-sm font-semibold px-4 py-2 rounded-full mb-6">
              SaaS Platform voor Vastgoedbeheer
            </span>
            <h1 className="text-5xl font-bold text-[#0f172a] mb-6 leading-tight">
              Huur Betalings<br /><span className="text-[#f97316]">Kiosk</span>
            </h1>
            <p className="text-xl text-[#64748b] mb-8">
              Zelfbedieningskiosk voor uw huurders. Beheer meerdere panden, huurders en betalingen vanuit één platform.
            </p>
            <div className="flex gap-4">
              {isLoggedIn ? (
                <button
                  onClick={() => navigate(`/vastgoed/${company?.company_id}`)}
                  className="kiosk-btn-primary"
                >
                  Open Kiosk
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="kiosk-btn-primary"
                  >
                    Gratis starten
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="kiosk-btn-secondary h-16 px-8 text-lg"
                  >
                    Inloggen
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="w-96 bg-white rounded-2xl shadow-xl p-8 border border-[#e2e8f0]">
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">Uw eigen kiosk</h3>
            <p className="text-[#64748b] mb-6">Elk bedrijf krijgt een unieke kiosk-URL voor hun huurders</p>
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-[#e2e8f0]">
              <p className="text-sm text-[#64748b] mb-2">Uw kiosk URL</p>
              <code className="text-[#f97316] font-mono text-sm">
                {isLoggedIn ? `/vastgoed/${company?.company_id}` : '/vastgoed/uw-bedrijf-id'}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Building2, label: 'Multi-Pand Beheer', desc: 'Beheer al uw gebouwen vanuit één dashboard' },
            { icon: Users, label: 'Huurder Kiosk', desc: 'Zelfbediening voor huur en servicekosten' },
            { icon: BarChart3, label: 'Realtime Overzicht', desc: 'Direct inzicht in betalingen en achterstand' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-6 border border-[#e2e8f0] hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-[#f97316]" />
              </div>
              <h4 className="font-semibold text-[#0f172a] mb-2">{item.label}</h4>
              <p className="text-sm text-[#64748b]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
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
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal 
          onClose={() => setShowRegisterModal(false)} 
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
      )}
    </div>
  );
}

// Login Modal Component
function LoginModal({ onClose, onSuccess, onRegister }) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#0f172a]">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-[#f97316] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Inloggen</h2>
          <p className="text-[#64748b]">Log in op uw Kiosk account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316]"
              placeholder="uw@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316] pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Inloggen'}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Nog geen account?{' '}
          <button onClick={onRegister} className="text-[#f97316] font-semibold hover:underline">
            Registreer hier
          </button>
        </p>
      </div>
    </div>
  );
}

// Register Modal Component
function RegisterModal({ onClose, onSuccess, onLogin }) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#0f172a]">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-[#f97316] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Registreren</h2>
          <p className="text-[#64748b]">Maak een nieuw Kiosk account aan</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Bedrijfsnaam *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316]"
              placeholder="Uw Vastgoed B.V."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">E-mailadres *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316]"
              placeholder="uw@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Telefoonnummer</label>
            <input
              type="tel"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316]"
              placeholder="+597 123 4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Wachtwoord *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#f97316] pr-12"
                placeholder="Min. 6 karakters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registreren'}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Al een account?{' '}
          <button onClick={onLogin} className="text-[#f97316] font-semibold hover:underline">
            Log hier in
          </button>
        </p>
      </div>
    </div>
  );
}
