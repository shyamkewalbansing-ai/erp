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
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* Header - Light */}
      <div className="bg-white border-b border-slate-200 p-4 lg:p-6 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-base lg:text-lg font-medium">
          <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="hidden sm:inline">Terug</span>
        </button>
        
        <h1 className="text-xl lg:text-3xl font-bold text-slate-900">Kies uw appartement</h1>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`flex items-center gap-1 lg:gap-2 px-3 lg:px-5 py-2 lg:py-3 rounded-lg lg:rounded-xl font-semibold text-sm lg:text-base transition ${
              mode === 'grid' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Appartement</span>
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`flex items-center gap-1 lg:gap-2 px-3 lg:px-5 py-2 lg:py-3 rounded-lg lg:rounded-xl font-semibold text-sm lg:text-base transition ${
              mode === 'code' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Huurderscode</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 lg:mx-8 mt-4 p-4 lg:p-6 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl lg:rounded-2xl text-center text-base lg:text-xl font-medium">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 lg:p-8 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              
              return (
                <button
                  key={apt.apartment_id}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  className={`flex flex-col items-center justify-center p-4 lg:p-8 rounded-xl lg:rounded-2xl border-2 lg:border-3 transition min-h-[120px] lg:min-h-[200px] ${
                    hasTenant 
                      ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-lg cursor-pointer' 
                      : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl lg:text-4xl font-bold text-slate-900 mb-1 lg:mb-2">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-1 lg:gap-2 text-slate-500 mb-2 lg:mb-3">
                        <User className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="text-sm lg:text-lg truncate max-w-[100px] lg:max-w-none">{tenant.name}</span>
                      </div>
                      <span className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold bg-green-100 text-green-600">
                        Bewoond
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 text-sm lg:text-lg mb-2 lg:mb-3">Leegstaand</span>
                      <span className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold bg-slate-200 text-slate-500">
                        Leeg
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <p className="text-slate-500 text-center text-base lg:text-xl mb-6 lg:mb-8">
              Voer uw huurderscode of appartementnummer in
            </p>
            
            {/* Display */}
            <div className="bg-white border-2 lg:border-3 border-slate-200 rounded-xl lg:rounded-2xl p-4 lg:p-8 mb-6 lg:mb-8 text-center shadow-sm">
              <span className="text-3xl lg:text-5xl font-mono font-bold text-slate-900 tracking-[0.2em] lg:tracking-[0.3em]">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>

            {/* Keypad - Letters + Numbers */}
            <div className="space-y-3">
              {/* Letter rows */}
              <div className="grid grid-cols-9 gap-1.5 lg:gap-2">
                {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="h-11 lg:h-14 text-base lg:text-lg font-bold rounded-lg transition active:scale-95 bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadPress('DEL')}
                  className="h-11 lg:h-14 text-base lg:text-lg font-bold rounded-lg transition active:scale-95 bg-red-100 text-red-600 hover:bg-red-200"
                >
                  DEL
                </button>
              </div>
              {/* Number row + OK */}
              <div className="grid grid-cols-6 gap-1.5 lg:gap-2">
                {['1','2','3','4','5','6','7','8','9','0'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="h-12 lg:h-16 text-xl lg:text-2xl font-bold rounded-lg transition active:scale-95 bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadPress('OK')}
                  className="h-12 lg:h-16 text-xl lg:text-2xl font-bold rounded-lg transition active:scale-95 bg-orange-500 text-white hover:bg-orange-600 col-span-2"
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
