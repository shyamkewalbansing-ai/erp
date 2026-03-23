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
      <div className="kiosk-fullscreen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="kiosk-fullscreen bg-slate-50 flex flex-col">
      {/* Header - Light */}
      <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-lg font-medium">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        
        <h1 className="text-3xl font-bold text-slate-900">Kies uw appartement</h1>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition ${
              mode === 'grid' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Appartement
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition ${
              mode === 'code' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            Huurderscode
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-8 mt-4 p-6 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl text-center text-xl font-medium">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-4 gap-6">
            {apartments.map((apt) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const hasTenant = !!tenant;
              
              return (
                <button
                  key={apt.apartment_id}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  className={`flex flex-col items-center justify-center p-8 rounded-2xl border-3 transition min-h-[200px] ${
                    hasTenant 
                      ? 'bg-white border-slate-200 hover:border-orange-500 hover:shadow-lg cursor-pointer' 
                      : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-4xl font-bold text-slate-900 mb-2">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <User className="w-5 h-5" />
                        <span className="text-lg">{tenant.name}</span>
                      </div>
                      <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-600">
                        Bewoond
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 text-lg mb-3">Leegstaand</span>
                      <span className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-200 text-slate-500">
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
            <p className="text-slate-500 text-center text-xl mb-8">
              Voer uw huurderscode of appartementnummer in
            </p>
            
            {/* Display */}
            <div className="bg-white border-3 border-slate-200 rounded-2xl p-8 mb-8 text-center shadow-sm">
              <span className="text-5xl font-mono font-bold text-slate-900 tracking-[0.3em]">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4">
              {['A', 'B', 'C', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`h-20 text-2xl font-bold rounded-xl transition active:scale-95 ${
                    key === 'OK' 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : key === 'DEL' 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
