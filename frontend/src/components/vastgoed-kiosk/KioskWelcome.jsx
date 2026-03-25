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
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
        <div className="flex items-center gap-2 text-white">
          <Building2 style={{ width: '3vh', height: '3vh' }} />
          <span className="kiosk-subtitle">{companyName || 'Kiosk'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdmin} data-testid="admin-btn"
            className="flex items-center gap-1 text-white/80 hover:text-white transition rounded-lg"
            style={{ padding: '0.8vh 1.2vw', background: 'rgba(255,255,255,0.15)' }}>
            <Settings style={{ width: '2vh', height: '2vh' }} />
            <span className="kiosk-small hidden sm:inline">Beheerder</span>
          </button>
          <button onClick={handleLogout} data-testid="kiosk-welcome-logout"
            className="flex items-center gap-1 text-white/80 hover:text-white transition rounded-lg"
            style={{ padding: '0.8vh 1.2vw', background: 'rgba(255,255,255,0.15)' }}>
            <LogIn style={{ width: '2vh', height: '2vh' }} className="rotate-180" />
            <span className="kiosk-small hidden sm:inline">Uit</span>
          </button>
        </div>
      </div>

      {/* Content - white card fills screen */}
      <div className="flex-1 flex gap-[1vw] min-h-0" style={{ paddingBottom: '1.5vh' }}>
        <div className="kiosk-card flex-1 flex flex-col items-center justify-center text-center" style={{ padding: 'clamp(16px, 3vh, 48px) clamp(16px, 3vw, 64px)' }}>
          <h1 className="kiosk-amount-lg text-slate-900" style={{ fontSize: 'clamp(28px, 5vh, 64px)', marginBottom: '1vh' }}>
            Welkom
          </h1>
          <p className="kiosk-body text-slate-400" style={{ marginBottom: '4vh' }}>
            Betaal uw huur, servicekosten en meer
          </p>

          <button onClick={onStart} data-testid="kiosk-start-btn"
            className="bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-3 rounded-lg transition active:scale-[0.98]"
            style={{ padding: 'clamp(12px, 2.5vh, 32px) clamp(32px, 5vw, 80px)', marginBottom: '4vh' }}>
            <span className="kiosk-btn-text" style={{ fontSize: 'clamp(16px, 2.5vh, 28px)' }}>Start</span>
            <ArrowRight style={{ width: '3vh', height: '3vh' }} />
          </button>

          <p className="kiosk-small text-slate-400 uppercase tracking-widest font-semibold" style={{ marginBottom: '2vh' }}>Beschikbare diensten</p>
          <div className="flex gap-[2vw] justify-center">
            {[
              { icon: Banknote, label: 'Maandhuur' },
              { icon: Droplets, label: 'Servicekosten' },
              { icon: Receipt, label: 'Boetes' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg flex flex-col items-center text-center" style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(12px, 2vw, 32px)' }}>
                <div className="rounded-lg bg-orange-100 flex items-center justify-center" style={{ width: '5vh', height: '5vh', marginBottom: '1vh' }}>
                  <item.icon style={{ width: '2.5vh', height: '2.5vh' }} className="text-orange-500" />
                </div>
                <p className="kiosk-small font-bold text-slate-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
