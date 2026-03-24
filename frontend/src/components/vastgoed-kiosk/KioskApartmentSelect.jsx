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
        setApartments(aptRes.data); setTenants(tenRes.data);
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
        <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-orange-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
        <div className="absolute bottom-[8%] left-[12%] w-40 h-40 border-[3px] border-white/10 rounded-full" />
        <div className="absolute bottom-[12%] left-[14%] w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute top-[50%] right-[5%] w-32 h-32 border-[3px] border-white/8 rounded-full" />
        <div className="absolute top-0 left-[35%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        <div className="absolute top-0 left-[75%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent -rotate-6 origin-top" />
        <div className="absolute top-[30%] left-[3%] w-3 h-3 bg-white/15 rounded-full" />
        <div className="absolute top-[65%] right-[18%] w-4 h-4 bg-white/10 rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5">
        <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
          <ArrowLeft className="w-5 h-5" /><span>Terug</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Kies uw appartement</h1>
        <div className="flex gap-1.5 bg-white/20 backdrop-blur-sm rounded-2xl p-1.5 border border-white/20 shadow-lg">
          <button onClick={() => { setMode('grid'); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              mode === 'grid' ? 'bg-white text-orange-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <Building2 className="w-4 h-4" /><span className="hidden sm:inline">Appartement</span>
          </button>
          <button onClick={() => { setMode('code'); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              mode === 'code' ? 'bg-white text-orange-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <Keyboard className="w-4 h-4" /><span className="hidden sm:inline">Code</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="relative z-10 mx-8 lg:mx-12 mb-4 p-4 bg-white/95 backdrop-blur-sm text-red-600 rounded-2xl text-center text-base font-semibold shadow-xl">
          {error}
        </div>
      )}

      <div className="relative z-10 flex-1 px-6 sm:px-10 lg:px-12 pb-8 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              return (
                <button key={apt.apartment_id} onClick={() => handleApartmentClick(apt)} disabled={!hasTenant}
                  data-testid={`apt-${apt.number}`}
                  className={`flex flex-col items-center justify-center p-6 sm:p-8 lg:p-10 rounded-[1.5rem] transition min-h-[160px] sm:min-h-[200px] ${
                    hasTenant
                      ? 'bg-white hover:scale-[1.03] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] cursor-pointer shadow-xl border border-white/50'
                      : 'bg-white/30 backdrop-blur-sm cursor-not-allowed opacity-50'
                  }`}>
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-1.5 text-slate-400 mb-3">
                        <User className="w-4 h-4" />
                        <span className="text-sm sm:text-base truncate max-w-[100px] sm:max-w-[140px]">{tenant.name}</span>
                      </div>
                      <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-green-100 text-green-600">Bezet</span>
                    </>
                  ) : (
                    <span className="text-sm text-white/50 mt-1">Leeg</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-8 sm:p-10 lg:p-12 w-full max-w-lg border border-white/50">
              <p className="text-lg text-slate-400 text-center mb-6">Voer uw huurderscode in</p>
              <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 border-2 border-slate-200 rounded-2xl p-5 sm:p-6 mb-6 text-center">
                <span className="text-3xl sm:text-4xl font-mono font-extrabold text-slate-900 tracking-[0.25em]">
                  {searchCode || '_ _ _ _ _'}
                </span>
              </div>
              <div className="space-y-2.5 mb-3">
                <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
                  {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((key) => (
                    <button key={key} onClick={() => handleKeypadPress(key)}
                      className="h-11 sm:h-13 text-sm sm:text-base font-bold rounded-xl transition active:scale-95 bg-gradient-to-b from-white to-slate-50 border border-slate-100 text-slate-700 hover:from-orange-50 hover:to-orange-100 hover:text-orange-600 hover:border-orange-200">
                      {key}
                    </button>
                  ))}
                  <button onClick={() => handleKeypadPress('DEL')}
                    className="h-11 sm:h-13 text-xs font-bold rounded-xl transition active:scale-95 bg-red-50 text-red-500 hover:bg-red-100 border border-red-100">
                    DEL
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {['1','2','3','4','5','6','7','8','9','0'].map((key) => (
                    <button key={key} onClick={() => handleKeypadPress(key)}
                      className="h-14 sm:h-16 text-xl sm:text-2xl font-bold rounded-xl transition active:scale-95 bg-gradient-to-b from-white to-slate-50 border border-slate-100 text-slate-900 hover:from-orange-50 hover:to-orange-100 hover:text-orange-600">
                      {key}
                    </button>
                  ))}
                  <button onClick={() => handleKeypadPress('OK')} data-testid="code-ok-btn"
                    className="h-14 sm:h-16 text-xl font-bold rounded-xl transition active:scale-95 bg-orange-500 text-white hover:bg-orange-600 col-span-2 shadow-lg shadow-orange-500/30">
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
