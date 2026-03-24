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
      } catch {
        setError('Kon gegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  const handleApartmentClick = (apt) => {
    const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
    if (!tenant) {
      setError('Geen actieve huurder gevonden voor dit appartement');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setError('');
    onSelect(tenant);
  };

  const handleCodeSearch = async () => {
    if (!searchCode.trim()) return;
    setError('');
    try {
      const res = await axios.get(`${API}/public/${companyId}/tenants/lookup/${searchCode.trim()}`);
      onSelect(res.data);
    } catch {
      setError('Huurder niet gevonden. Controleer uw code.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'DEL') {
      setSearchCode(prev => prev.slice(0, -1));
    } else if (val === 'OK') {
      handleCodeSearch();
    } else {
      setSearchCode(prev => prev + val);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Kies uw appartement</h1>
        
        {/* Mode Toggle */}
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition ${
              mode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Appartement</span>
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition ${
              mode === 'code' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              
              return (
                <button
                  key={apt.apartment_id}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  data-testid={`apt-${apt.number}`}
                  className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border transition min-h-[120px] sm:min-h-[150px] ${
                    hasTenant 
                      ? 'bg-white border-slate-100 hover:border-orange-300 hover:shadow-md shadow-sm cursor-pointer' 
                      : 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-1 text-slate-400 mb-2">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[120px]">{tenant.name}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                        Bezet
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-300 mt-1">Leeg</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto flex flex-col items-center">
            <p className="text-slate-400 text-center text-sm mb-6">
              Voer uw huurderscode of appartementnummer in
            </p>
            
            {/* Code display */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-center">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-[0.2em]">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>

            {/* Letter keypad */}
            <div className="w-full space-y-2 mb-3">
              <div className="grid grid-cols-9 gap-1.5">
                {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="h-10 sm:h-11 text-sm sm:text-base font-bold rounded-lg transition active:scale-95 bg-white border border-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadPress('DEL')}
                  className="h-10 sm:h-11 text-sm font-bold rounded-lg transition active:scale-95 bg-slate-100 text-red-500 hover:bg-red-50"
                >
                  DEL
                </button>
              </div>
              {/* Numbers + OK */}
              <div className="grid grid-cols-6 gap-1.5">
                {['1','2','3','4','5','6','7','8','9','0'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="h-12 sm:h-14 text-lg sm:text-xl font-bold rounded-lg transition active:scale-95 bg-white border border-slate-100 text-slate-900 hover:bg-orange-50 hover:text-orange-600"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadPress('OK')}
                  data-testid="code-ok-btn"
                  className="h-12 sm:h-14 text-lg font-bold rounded-lg transition active:scale-95 bg-orange-500 text-white hover:bg-orange-600 col-span-2"
                >
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
