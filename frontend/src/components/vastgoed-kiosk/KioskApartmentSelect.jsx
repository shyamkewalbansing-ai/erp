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
      <div className="h-full bg-orange-500 flex items-center justify-center">
        <div className="border-4 border-white/30 border-t-white rounded-full animate-spin" style={{ width: '5vh', height: '5vh' }} />
      </div>
    );
  }

  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="apt-back-btn">
          <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
          <span className="kiosk-body">Terug</span>
        </button>
        <span className="kiosk-subtitle text-white">Kies uw appartement</span>
        <div className="flex bg-white/20 rounded-lg" style={{ padding: '0.4vh' }}>
          <button onClick={() => { setMode('grid'); setError(''); }} data-testid="mode-grid"
            className={`flex items-center gap-1 rounded-md transition kiosk-small font-bold ${mode === 'grid' ? 'bg-white text-orange-600' : 'text-white bg-white/10 hover:bg-white/20'}`}
            style={{ padding: '0.6vh 1vw' }}>
            <Building2 style={{ width: '1.6vh', height: '1.6vh' }} />
            <span>Appartement</span>
          </button>
          <button onClick={() => { setMode('code'); setError(''); }} data-testid="mode-code"
            className={`flex items-center gap-1 rounded-md transition kiosk-small font-bold ${mode === 'code' ? 'bg-white text-orange-600' : 'text-white bg-white/10 hover:bg-white/20'}`}
            style={{ padding: '0.6vh 1vw' }}>
            <Keyboard style={{ width: '1.6vh', height: '1.6vh' }} />
            <span>Code</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-white/95 text-red-600 rounded-lg text-center kiosk-body font-semibold" style={{ margin: '0 0.5vw 1vh', padding: '1vh 1vw' }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ paddingBottom: '1.5vh' }}>
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 h-full" style={{ gap: 'clamp(6px, 0.8vw, 14px)', padding: '0 0.5vw' }}>
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              return (
                <button key={apt.apartment_id} onClick={() => handleApartmentClick(apt)} disabled={!hasTenant}
                  data-testid={`apt-${apt.number}`}
                  className={`kiosk-card flex flex-col items-center justify-center text-center transition ${
                    hasTenant ? 'hover:bg-slate-50 cursor-pointer active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(4px, 0.5vw, 12px)' }}>
                  <span className="kiosk-amount-md text-slate-900" style={{ marginBottom: '0.5vh' }}>{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-1 text-slate-400" style={{ marginBottom: '0.8vh' }}>
                        <User style={{ width: '1.5vh', height: '1.5vh' }} />
                        <span className="kiosk-small truncate" style={{ maxWidth: '10vw' }}>{tenant.name}</span>
                      </div>
                      <span className="kiosk-small font-bold text-green-600 bg-green-50 rounded" style={{ padding: '0.3vh 0.8vw' }}>Bezet</span>
                    </>
                  ) : (
                    <span className="kiosk-small text-slate-300">Leeg</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ padding: '0 0.5vw' }}>
            <div className="kiosk-card" style={{ width: 'clamp(300px, 35vw, 520px)', padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2vw, 40px)' }}>
              <p className="kiosk-body text-slate-400 text-center" style={{ marginBottom: '2vh' }}>Voer uw huurderscode in</p>
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg text-center" style={{ padding: 'clamp(10px, 2vh, 24px)', marginBottom: '2vh' }}>
                <span className="font-mono font-extrabold text-slate-900" style={{ fontSize: 'clamp(20px, 3vh, 40px)', letterSpacing: '0.2em' }}>
                  {searchCode || '_ _ _ _ _'}
                </span>
              </div>
              {/* Letter keys */}
              <div className="grid grid-cols-9" style={{ gap: 'clamp(2px, 0.3vw, 6px)', marginBottom: '1vh' }}>
                {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((key) => (
                  <button key={key} onClick={() => handleKeypadPress(key)}
                    className="bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-orange-600 border border-slate-100 rounded font-bold transition active:scale-95 flex items-center justify-center"
                    style={{ height: 'clamp(28px, 4vh, 44px)', fontSize: 'clamp(10px, 1.4vh, 16px)' }}>
                    {key}
                  </button>
                ))}
                <button onClick={() => handleKeypadPress('DEL')}
                  className="bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 rounded font-bold transition active:scale-95 flex items-center justify-center kiosk-small">
                  DEL
                </button>
              </div>
              {/* Number keys */}
              <div className="grid grid-cols-6" style={{ gap: 'clamp(3px, 0.4vw, 8px)' }}>
                {['1','2','3','4','5','6','7','8','9','0'].map((key) => (
                  <button key={key} onClick={() => handleKeypadPress(key)}
                    className="bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100 rounded-lg font-bold transition active:scale-95 flex items-center justify-center"
                    style={{ height: 'clamp(36px, 5vh, 52px)', fontSize: 'clamp(14px, 2vh, 24px)' }}>
                    {key}
                  </button>
                ))}
                <button onClick={() => handleKeypadPress('OK')} data-testid="code-ok-btn"
                  className="col-span-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg font-bold transition active:scale-95 flex items-center justify-center"
                  style={{ height: 'clamp(36px, 5vh, 52px)', fontSize: 'clamp(14px, 2vh, 24px)' }}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
