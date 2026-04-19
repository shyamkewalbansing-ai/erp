import { useState, useEffect } from 'react';
import { Building2, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskApartmentSelect({ onSelect, companyId, onAdmin, onLock, kioskEmployee, onEmployeeLogin }) {
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEmpLogin, setShowEmpLogin] = useState(false);
  const [empPin, setEmpPin] = useState('');
  const [empLoading, setEmpLoading] = useState(false);

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
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 sm:px-2 py-2 sm:py-0" style={{ minHeight: '7vh' }}>
        <div className="flex items-center gap-1.5 md:hidden">
          {onLock && (
            <button onClick={onLock} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="kiosk-lock-btn">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span className="text-xs sm:text-sm">Uit</span>
            </button>
          )}
          {/* Employee login button */}
          <button onClick={() => setShowEmpLogin(true)} className={`flex items-center gap-1.5 font-bold transition hover:opacity-90 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm ${kioskEmployee ? 'bg-green-500 text-white' : 'text-white bg-white/20 backdrop-blur-sm'}`} data-testid="kiosk-employee-btn">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{kioskEmployee ? kioskEmployee.name.split(' ')[0] : 'Medewerker'}</span>
          </button>
          {onAdmin && (
            <button onClick={onAdmin} className="flex items-center gap-1.5 text-orange-600 font-bold transition hover:opacity-90 bg-white rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="kiosk-admin-btn">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-xs sm:text-sm">Beheerder</span>
            </button>
          )}
        </div>
        <span className="text-sm sm:text-base font-semibold text-white">Kies uw appartement</span>
        <div className="w-16" />
      </div>

      {error && (
        <div className="bg-white/95 text-red-600 rounded-lg text-center text-sm font-semibold mx-1 mb-2 py-2 px-3">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 px-1 sm:px-2">
          {[...apartments].sort((a, b) => {
            const numA = a.number?.replace(/[^0-9]/g, '') || '';
            const numB = b.number?.replace(/[^0-9]/g, '') || '';
            const prefA = a.number?.replace(/[0-9]/g, '') || '';
            const prefB = b.number?.replace(/[0-9]/g, '') || '';
            if (prefA !== prefB) return prefA.localeCompare(prefB);
            return (parseInt(numA) || 0) - (parseInt(numB) || 0);
          }).map((apt) => {
            const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
            const hasTenant = !!tenant;
            return (
              <button key={apt.apartment_id} onClick={() => handleApartmentClick(apt)} disabled={!hasTenant}
                data-testid={`apt-${apt.number}`}
                className={`group bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-center transition-all duration-200 overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
                  hasTenant ? 'cursor-pointer hover:-translate-y-1 hover:bg-white/95' : 'opacity-35 cursor-not-allowed'
                }`}
                style={{
                  boxShadow: hasTenant ? '0 4px 20px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.03)',
                  border: '2px solid transparent',
                }}
                onMouseEnter={e => { if (hasTenant) e.currentTarget.style.borderColor = '#f97316'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}>
                <div className={`rounded-full flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mb-2 ${hasTenant ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-slate-50'}`}>
                  <Building2 className={`w-5 h-5 sm:w-6 sm:h-6 ${hasTenant ? 'text-orange-500' : 'text-slate-300'}`} />
                </div>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 mb-0.5">{apt.number}</span>
                {hasTenant ? (
                  <>
                    <div className="flex items-center gap-1 text-slate-400 mb-1">
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="text-xs sm:text-sm truncate text-slate-700 font-medium max-w-[80px] sm:max-w-[120px]">{tenant.name}</span>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 rounded-full px-2.5 py-0.5">Bezet</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-300 mt-0.5">Leeg</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee PIN Login Modal */}
      {showEmpLogin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowEmpLogin(false); setEmpPin(''); setError(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Medewerker Login</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Voer uw 4-cijferige PIN in</p>
            {kioskEmployee && (
              <div className="mb-4 p-3 bg-green-50 rounded-xl text-center">
                <p className="text-sm text-green-700">Ingelogd als: <strong>{kioskEmployee.name}</strong></p>
                <p className="text-xs text-green-600">{({beheerder:'Beheerder',boekhouder:'Boekhouder',kiosk_medewerker:'Kiosk Medewerker'})[kioskEmployee.role] || kioskEmployee.role}</p>
                <button onClick={() => { onEmployeeLogin(null); setShowEmpLogin(false); }} className="mt-2 text-xs text-red-500 font-bold" data-testid="kiosk-employee-logout-btn">Uitloggen</button>
              </div>
            )}
            <div className="flex justify-center gap-3 mb-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${empPin.length > i ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200'}`}>
                  {empPin[i] ? '*' : ''}
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1','2','3','4','5','6','7','8','9','','0',''].map((key, i) => {
                if (key === '' && i === 9) return <div key={i} />;
                if (key === '' && i === 11) return (
                  <button key={i} onClick={() => setEmpPin(p => p.slice(0,-1))} className="h-12 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 active:scale-95" data-testid="emp-pin-del">DEL</button>
                );
                return (
                  <button key={i} disabled={empLoading} onClick={() => { if (empPin.length < 4) { const np = empPin + key; setEmpPin(np); if (np.length === 4) { setTimeout(() => { setEmpLoading(true); axios.post(`${API}/public/${companyId}/employee/login`, { pin: np }).then(r => { onEmployeeLogin(r.data); setShowEmpLogin(false); setEmpPin(''); setError(''); }).catch(() => { setError('Ongeldige PIN'); setEmpPin(''); }).finally(() => setEmpLoading(false)); }, 200); } } }}
                    data-testid={`emp-pin-key-${key}`}
                    className="h-12 rounded-xl bg-slate-50 text-slate-900 font-bold text-lg hover:bg-orange-50 border border-slate-100 active:scale-95">{key}</button>
                );
              })}
            </div>
            <button onClick={() => { setShowEmpLogin(false); setEmpPin(''); setError(''); }} className="w-full text-sm text-slate-500 py-2" data-testid="emp-pin-cancel">Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}
