import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Keyboard, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskApartmentSelect({ onBack, onSelect, companyId }) {
  const [mode, setMode] = useState('grid');
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptRes, tenRes] = await Promise.all([
          axios.get(`${API}/public/${companyId}/apartments`),
          axios.get(`${API}/public/${companyId}/tenants`)
        ]);
        setApartments(aptRes.data);
        setTenants(tenRes.data);
      } catch { setError('Kon gegevens niet laden'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [companyId]);

  const handleApartmentClick = (apt) => {
    const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
    if (!tenant) { setError('Geen actieve huurder gevonden'); setTimeout(() => setError(''), 3000); return; }
    setError(''); onSelect(tenant);
  };

  const handleCodeSearch = async () => {
    if (!searchCode.trim()) return;
    setError('');
    try {
      const res = await axios.get(`${API}/public/${companyId}/tenants/lookup/${searchCode.trim()}`);
      onSelect(res.data);
    } catch { setError('Huurder niet gevonden.'); setTimeout(() => setError(''), 3000); }
  };

  const handleKeypadPress = (val) => {
    if (val === 'DEL') setSearchCode(prev => prev.slice(0, -1));
    else if (val === 'OK') handleCodeSearch();
    else setSearchCode(prev => prev + val);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-orange-600/30 rounded-l-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Kies uw appartement</h1>
        {/* Mode Toggle */}
        <div className="flex gap-1 bg-white/20 backdrop-blur-sm rounded-xl p-1">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Appt.</span>
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'code' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/80 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="relative z-10 mx-6 sm:mx-8 mb-4 p-3 bg-white/90 backdrop-blur-sm text-red-600 rounded-2xl text-center text-sm font-medium shadow-lg">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 sm:px-8 pb-6 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              return (
                <button
                  key={apt.apartment_id}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  data-testid={`apt-${apt.number}`}
                  className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl transition min-h-[130px] sm:min-h-[160px] shadow-lg ${
                    hasTenant 
                      ? 'bg-white hover:scale-[1.02] hover:shadow-xl cursor-pointer' 
                      : 'bg-white/40 backdrop-blur-sm cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-1 text-slate-400 mb-2">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[120px]">{tenant.name}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">Bezet</span>
                    </>
                  ) : (
                    <span className="text-xs text-white/60 mt-1">Leeg</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Code entry */
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
              <p className="text-slate-400 text-center text-sm mb-4">Voer uw huurderscode in</p>
              
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-5 text-center">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-[0.2em]">
                  {searchCode || '_ _ _ _ _'}
                </span>
              </div>

              {/* Letter keypad */}
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-9 gap-1.5">
                  {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((key) => (
                    <button key={key} onClick={() => handleKeypadPress(key)}
                      className="h-10 sm:h-11 text-sm font-bold rounded-lg transition active:scale-95 bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                      {key}
                    </button>
                  ))}
                  <button onClick={() => handleKeypadPress('DEL')}
                    className="h-10 sm:h-11 text-xs font-bold rounded-lg transition active:scale-95 bg-red-50 text-red-500 hover:bg-red-100">
                    DEL
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {['1','2','3','4','5','6','7','8','9','0'].map((key) => (
                    <button key={key} onClick={() => handleKeypadPress(key)}
                      className="h-12 sm:h-14 text-lg font-bold rounded-lg transition active:scale-95 bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600">
                      {key}
                    </button>
                  ))}
                  <button onClick={() => handleKeypadPress('OK')} data-testid="code-ok-btn"
                    className="h-12 sm:h-14 text-lg font-bold rounded-lg transition active:scale-95 bg-orange-500 text-white hover:bg-orange-600 col-span-2">
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
