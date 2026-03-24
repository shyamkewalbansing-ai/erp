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
      {/* Rich background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large gradient overlay right */}
        <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        {/* Bottom left glow */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-orange-400/25 rounded-full blur-3xl" />
        {/* Top right circle */}
        <div className="absolute -top-20 -right-20 w-80 h-80 border-[3px] border-white/10 rounded-full" />
        <div className="absolute -top-10 -right-10 w-60 h-60 border-[3px] border-white/8 rounded-full" />
        {/* Middle decorative circles */}
        <div className="absolute top-[15%] left-[8%] w-44 h-44 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-[20%] left-[10%] w-28 h-28 bg-white/5 rounded-full" />
        {/* Bottom right shapes */}
        <div className="absolute bottom-[10%] right-[15%] w-36 h-36 border-[3px] border-white/8 rounded-full" />
        <div className="absolute bottom-[25%] right-[8%] w-20 h-20 bg-white/5 rounded-full" />
        {/* Diagonal lines for 3D depth */}
        <div className="absolute top-0 left-[30%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
        <div className="absolute top-0 left-[70%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent -rotate-6 origin-top" />
        {/* Floating dots */}
        <div className="absolute top-[40%] left-[5%] w-3 h-3 bg-white/15 rounded-full" />
        <div className="absolute top-[60%] left-[15%] w-2 h-2 bg-white/20 rounded-full" />
        <div className="absolute top-[30%] right-[25%] w-4 h-4 bg-white/10 rounded-full" />
        <div className="absolute bottom-[15%] left-[40%] w-3 h-3 bg-white/15 rounded-full" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">{companyName || 'Kiosk'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdmin} data-testid="admin-btn"
            className="px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-bold transition hover:bg-white/30 flex items-center gap-2 shadow-lg">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Beheerder</span>
          </button>
          <button onClick={handleLogout} data-testid="kiosk-welcome-logout"
            className="px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-bold transition hover:bg-white/30 flex items-center gap-2 shadow-lg">
            <LogIn className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Uit</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14 px-6 sm:px-10 lg:px-16 pb-10">
        {/* Left - Main card */}
        <div className="bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-10 sm:p-12 lg:p-14 w-full max-w-xl border border-white/50">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-3 leading-tight tracking-tight">
            Welkom
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mb-10">
            Betaal uw huur, servicekosten en meer
          </p>

          <button onClick={onStart} data-testid="kiosk-start-btn"
            className="w-full py-5 sm:py-6 px-8 rounded-2xl text-xl sm:text-2xl font-bold flex items-center justify-center gap-4 bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 transition active:scale-[0.98] mb-10">
            Start
            <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>

          <p className="text-sm text-slate-400 uppercase tracking-widest mb-5 font-semibold">Beschikbare diensten</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Banknote, label: 'Maandhuur' },
              { icon: Droplets, label: 'Servicekosten' },
              { icon: Receipt, label: 'Boetes' },
            ].map((item) => (
              <div key={item.label}
                className="bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-2xl p-5 flex flex-col items-center text-center border border-slate-100">
                <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-3 shadow-sm">
                  <item.icon className="w-7 h-7 text-orange-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Info panel */}
        <div className="hidden lg:flex flex-col items-start max-w-md">
          <h2 className="text-5xl xl:text-6xl font-extrabold text-white mb-5 leading-tight tracking-tight drop-shadow-lg">
            {companyName || 'Huurbetalingen'}
          </h2>
          <p className="text-xl text-white/80 mb-10 leading-relaxed">
            Snel, eenvoudig en veilig uw huurbetalingen verrichten via deze zelfbedieningskiosk.
          </p>
          <div className="space-y-4 w-full">
            {[
              { icon: Banknote, label: 'Maandhuur betalen' },
              { icon: Droplets, label: 'Servicekosten voldoen' },
              { icon: Receipt, label: 'Boetes afhandelen' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/15">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
