import { Building2, ArrowRight, Banknote, Droplets, Receipt, Settings, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KioskWelcome({ onStart, onAdmin, companyName, companyId }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('kiosk_token');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
    });
    navigate('/vastgoed');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col relative overflow-hidden">
      {/* Decorative wave/shapes */}
      <div className="absolute top-0 right-0 w-[60%] h-full bg-orange-600/30 rounded-l-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-orange-400/20 rounded-tr-[100px] pointer-events-none" />

      {/* Top bar - subtle */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">{companyName || 'Kiosk'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAdmin}
            data-testid="admin-btn"
            className="px-4 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Beheerder</span>
          </button>
          <button 
            onClick={handleLogout}
            data-testid="kiosk-welcome-logout"
            className="px-4 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Uit</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 px-6 sm:px-10 pb-8">
        {/* Left - Main card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 leading-tight">
            Welkom
          </h1>
          <p className="text-base text-slate-400 mb-8">
            Betaal uw huur, servicekosten en meer
          </p>

          <button
            onClick={onStart}
            data-testid="kiosk-start-btn"
            className="w-full py-4 px-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98] mb-6"
          >
            Start
            <ArrowRight className="w-6 h-6" />
          </button>

          <p className="text-sm text-slate-400 mb-4">Beschikbare diensten</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Banknote, label: 'Huur' },
              { icon: Droplets, label: 'Service' },
              { icon: Receipt, label: 'Boetes' },
            ].map((item) => (
              <div 
                key={item.label} 
                className="bg-slate-50 rounded-xl p-3 flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
                  <item.icon className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-xs font-semibold text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Info panel */}
        <div className="hidden lg:flex flex-col items-start max-w-sm">
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            {companyName || 'Huurbetalingen'}
          </h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Snel, eenvoudig en veilig uw huurbetalingen verrichten via deze zelfbedieningskiosk.
          </p>
          <div className="space-y-3 w-full">
            {[
              { icon: Banknote, label: 'Maandhuur betalen' },
              { icon: Droplets, label: 'Servicekosten voldoen' },
              { icon: Receipt, label: 'Boetes afhandelen' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
