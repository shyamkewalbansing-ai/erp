import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Building2, Keyboard } from 'lucide-react';
import axios from 'axios';

// Local API - use REACT_APP_BACKEND_URL
const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function ApartmentSelect({ onBack, onSelect, companyId }) {
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
      <div className="bg-white rounded-3xl shadow-2xl min-h-[700px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1e293b] text-white p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start sm:gap-6 flex-wrap">
          <button onClick={onBack} className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition" data-testid="apt-select-back-btn">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Terug</span>
          </button>
          <h2 className="text-base sm:text-2xl font-bold">Kies uw appartement</h2>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('grid'); setError(''); }}
            className={`kiosk-tab flex-1 sm:flex-none justify-center ${mode === 'grid' ? 'kiosk-tab-active' : ''}`}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Appartement</span>
            <span className="sm:hidden">Appt.</span>
          </button>
          <button
            onClick={() => { setMode('code'); setError(''); }}
            className={`kiosk-tab flex-1 sm:flex-none justify-center ${mode === 'code' ? 'kiosk-tab-active' : ''}`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Huurderscode</span>
            <span className="sm:hidden">Code</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-[#fee2e2] border border-[#fca5a5] text-[#dc2626] rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {mode === 'grid' ? (
          <div className="grid grid-cols-4 gap-4">
            {apartments.map((apt) => {
              const hasTenant = tenants.some(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              return (
                <button
                  key={apt.apartment_id}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  className={`kiosk-apt-card ${hasTenant ? 'kiosk-apt-card-active' : 'kiosk-apt-card-disabled'}`}
                >
                  <span className="text-2xl font-bold">{apt.number}</span>
                  <span className="text-sm text-[#64748b]">{hasTenant ? tenant?.name : 'Leegstaand'}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${hasTenant ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}>
                    {hasTenant ? 'Bewoond' : 'Leeg'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <p className="text-[#64748b] text-center mb-6">Voer uw huurderscode of appartementnummer in</p>
            
            {/* Display */}
            <div className="bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl p-6 mb-6 text-center">
              <span className="text-4xl font-mono font-bold text-[#0f172a] tracking-widest">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['A', 'B', 'C', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad-btn ${
                    key === 'OK' ? 'bg-[#f97316] text-white hover:bg-[#ea580c]' :
                    key === 'DEL' ? 'bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]' :
                    'bg-white text-[#0f172a] hover:bg-[#f1f5f9]'
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
