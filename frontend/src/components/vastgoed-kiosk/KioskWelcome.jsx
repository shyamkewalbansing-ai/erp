import { Building2, ArrowRight, Banknote, Droplets, Receipt, Settings, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KioskWelcome({ onStart, onAdmin, companyName, companyId }) {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const handleLogout = () => {
    localStorage.removeItem('kiosk_token');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
    });
    navigate('/vastgoed');
  };

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Top bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">{companyName || 'Appartement Kiosk'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAdmin}
            data-testid="admin-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 text-sm font-medium transition"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Beheerder</span>
          </button>
          <button 
            onClick={handleLogout}
            data-testid="kiosk-welcome-logout"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 text-sm font-medium transition"
          >
            <LogIn className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Uit</span>
          </button>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <p className="text-sm text-slate-400 mb-2">{today}</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 text-center mb-2">
          Welkom bij {companyName || 'de Kiosk'}
        </h1>
        <p className="text-base sm:text-lg text-slate-400 text-center mb-10 max-w-md">
          Wat wilt u vandaag doen?
        </p>

        {/* Service cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
          {[
            { icon: Banknote, label: 'Maandhuur', desc: 'Huur betalen' },
            { icon: Droplets, label: 'Servicekosten', desc: 'Water & stroom' },
            { icon: Receipt, label: 'Boetes', desc: 'Openstaand' },
          ].map((item) => (
            <div 
              key={item.label} 
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md hover:border-orange-200 transition cursor-default"
            >
              <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
                <item.icon className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-base font-bold text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          data-testid="kiosk-start-btn"
          className="w-full max-w-md py-4 px-8 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition active:scale-[0.98]"
        >
          <span>Start betaling</span>
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
