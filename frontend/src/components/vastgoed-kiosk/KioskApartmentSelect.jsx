import { useState, useEffect } from 'react';
import { Building2, User, MapPin, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskApartmentSelect({ onSelect, companyId, onAdmin, onLock, kioskEmployee, onEmployeeLogin }) {
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null); // null = show location picker
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptRes, tenRes, locRes] = await Promise.all([
          axios.get(`${API}/public/${companyId}/apartments`),
          axios.get(`${API}/public/${companyId}/tenants`),
          axios.get(`${API}/public/${companyId}/locations`)
        ]);
        setApartments(aptRes.data); setTenants(tenRes.data); setLocations(locRes.data || []);
      } catch { setError('Kon gegevens niet laden'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [companyId]);

  // Auto-skip picker if only 1 location and no unassigned apts
  useEffect(() => {
    if (selectedLocationId !== null || loading) return;
    const unassigned = apartments.filter(a => !a.location_id).length;
    if (locations.length === 1 && unassigned === 0) {
      setSelectedLocationId(locations[0].location_id);
    }
  }, [loading, locations, apartments, selectedLocationId]);

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

  const roleLabel = kioskEmployee ? ({beheerder:'Beheerder',boekhouder:'Boekhouder',kiosk_medewerker:'Kiosk Medewerker'}[kioskEmployee.role] || kioskEmployee.role) : '';

  // Determine whether to show location picker
  const hasLocations = locations.length > 0;
  const unassignedCount = apartments.filter(a => !a.location_id).length;
  const showLocationPicker = hasLocations && selectedLocationId === null;

  // Filter apartments by selected location
  const visibleApartments = showLocationPicker
    ? []
    : selectedLocationId === '__none__'
      ? apartments.filter(a => !a.location_id)
      : selectedLocationId
        ? apartments.filter(a => a.location_id === selectedLocationId)
        : apartments;

  const headerButtons = (
    <div className="flex items-center gap-1.5 md:hidden">
      {onLock && (
        <button onClick={onLock} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="kiosk-lock-btn">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span className="text-xs sm:text-sm">Uit</span>
        </button>
      )}
      {kioskEmployee && (
        <button onClick={() => onEmployeeLogin && onEmployeeLogin(null)} className="flex items-center gap-1.5 font-bold transition hover:opacity-90 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-green-500 text-white" data-testid="kiosk-employee-badge" title="Klik om uit te loggen">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{kioskEmployee.name.split(' ')[0]}</span>
        </button>
      )}
      {onAdmin && kioskEmployee?.role !== 'kiosk_medewerker' && (
        <button onClick={onAdmin} className="flex items-center gap-1.5 text-orange-600 font-bold transition hover:opacity-90 bg-white rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="kiosk-admin-btn">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="text-xs sm:text-sm">Beheerder</span>
        </button>
      )}
    </div>
  );

  // === LOCATION PICKER VIEW ===
  if (showLocationPicker) {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 px-1 sm:px-2 py-2 sm:py-0" style={{ minHeight: '7vh' }}>
          {headerButtons}
          <span className="text-sm sm:text-base font-semibold text-white">
            Kies een locatie
            {kioskEmployee && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{kioskEmployee.name} · {roleLabel}</span>}
          </span>
          <div className="w-16" />
        </div>

        <div className="flex-1 min-h-0 overflow-auto pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-1 sm:px-2 max-w-5xl mx-auto pt-2">
            {locations.map(loc => {
              const count = apartments.filter(a => a.location_id === loc.location_id).length;
              return (
                <button key={loc.location_id} onClick={() => setSelectedLocationId(loc.location_id)}
                  data-testid={`location-${loc.name}`}
                  className="bg-white/90 backdrop-blur-sm flex flex-col items-center text-center rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-white"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '2px solid transparent' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                    <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600" />
                  </div>
                  <span className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">{loc.name}</span>
                  {loc.address && <span className="text-xs text-slate-500 mb-2">{loc.address}</span>}
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 rounded-full px-3 py-1">{count} {count === 1 ? 'appartement' : 'appartementen'}</span>
                </button>
              );
            })}
            {unassignedCount > 0 && (
              <button onClick={() => setSelectedLocationId('__none__')}
                data-testid="location-unassigned"
                className="bg-white/80 backdrop-blur-sm flex flex-col items-center text-center rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-white border-2 border-dashed border-white/40"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" />
                </div>
                <span className="text-lg sm:text-xl font-extrabold text-slate-700 mb-1">Overige</span>
                <span className="text-xs text-slate-500 mb-2">Zonder locatie</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-50 rounded-full px-3 py-1">{unassignedCount} {unassignedCount === 1 ? 'appartement' : 'appartementen'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === APARTMENT GRID VIEW ===
  const currentLocation = selectedLocationId === '__none__'
    ? { name: 'Overige' }
    : locations.find(l => l.location_id === selectedLocationId);

  return (
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 sm:px-2 py-2 sm:py-0" style={{ minHeight: '7vh' }}>
        <div className="flex items-center gap-2">
          {hasLocations && locations.length + (unassignedCount > 0 ? 1 : 0) > 1 && (
            <button onClick={() => setSelectedLocationId(null)}
              data-testid="back-to-locations"
              className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Locaties</span>
            </button>
          )}
          {headerButtons}
        </div>
        <span className="text-sm sm:text-base font-semibold text-white">
          {currentLocation ? `${currentLocation.name} · Kies uw appartement` : 'Kies uw appartement'}
          {kioskEmployee && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{kioskEmployee.name} · {roleLabel}</span>}
        </span>
        <div className="w-16" />
      </div>

      {error && (
        <div className="bg-white/95 text-red-600 rounded-lg text-center text-sm font-semibold mx-1 mb-2 py-2 px-3">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 px-1 sm:px-2">
          {[...visibleApartments].sort((a, b) => {
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
    </div>
  );
}
