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
      <div className="kiosk-fullscreen kiosk-bg-gradient flex items-center justify-center">
        <div className="kiosk-spinner" />
      </div>
    );
  }

  return (
    <div className="kiosk-fullscreen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="kiosk-header">
        <button onClick={onBack} className="kiosk-back-btn">
          <ArrowLeft className="w-6 h-6" />
          <span>Terug</span>
        </button>
        
        <h1 className="text-3xl font-bold text-white">Kies uw appartement</h1>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`kiosk-tab-btn ${mode === 'grid' ? 'kiosk-tab-active' : ''}`}
          >
            <Building2 className="w-5 h-5" />
            Appartement
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`kiosk-tab-btn ${mode === 'code' ? 'kiosk-tab-active' : ''}`}
          >
            <Keyboard className="w-5 h-5" />
            Huurderscode
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-8 mb-4 p-6 bg-red-500/20 border-2 border-red-500/50 text-red-300 rounded-2xl text-center text-xl font-medium">
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
                  className={`kiosk-apartment-card ${hasTenant ? 'kiosk-apartment-occupied' : 'kiosk-apartment-empty'}`}
                >
                  <span className="text-4xl font-bold mb-2">{apt.number}</span>
                  {hasTenant ? (
                    <>
                      <div className="flex items-center gap-2 text-slate-400 mb-3">
                        <User className="w-5 h-5" />
                        <span className="text-lg">{tenant.name}</span>
                      </div>
                      <span className="kiosk-badge-green">Bewoond</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 text-lg mb-3">Leegstaand</span>
                      <span className="kiosk-badge-gray">Leeg</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <p className="text-slate-400 text-center text-xl mb-8">
              Voer uw huurderscode of appartementnummer in
            </p>
            
            {/* Display */}
            <div className="bg-slate-800 border-4 border-slate-700 rounded-2xl p-8 mb-8 text-center">
              <span className="text-5xl font-mono font-bold text-white tracking-[0.3em]">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4">
              {['A', 'B', 'C', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad ${
                    key === 'OK' ? 'kiosk-keypad-ok' :
                    key === 'DEL' ? 'kiosk-keypad-del' :
                    'kiosk-keypad-default'
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
