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
    navigate('/vastgoed');
  };

  return (
    <div className="kiosk-fullscreen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Panel - White with accent */}
      <div className="w-full lg:w-2/5 bg-white p-6 lg:p-12 flex flex-col relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[50vh] lg:min-h-0">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/5 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/10 rounded-full" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 lg:gap-4 mb-2">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Building2 className="w-6 h-6 lg:w-9 lg:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-slate-900">{companyName || 'Appartement Kiosk'}</h1>
              <p className="text-slate-500 text-sm lg:text-lg">{today}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10 py-6 lg:py-0">
          <h2 className="text-4xl lg:text-7xl font-bold text-slate-900 mb-4 lg:mb-6 leading-tight">
            Welkom
          </h2>
          <p className="text-lg lg:text-2xl text-slate-500 mb-6 lg:mb-12 leading-relaxed max-w-md">
            Beheer huurbetalingen, servicekosten en meer via deze zelfbedieningskiosk.
          </p>
          
          <button
            onClick={onStart}
            data-testid="kiosk-start-btn"
            className="w-full lg:w-auto py-4 lg:py-5 px-8 rounded-xl text-lg lg:text-xl font-bold flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition"
          >
            <span>Start</span>
            <ArrowRight className="w-6 h-6 lg:w-8 lg:h-8" />
          </button>
        </div>

        {/* Admin & Logout links */}
        <div className="relative z-10 flex items-center gap-3">
          <button 
            onClick={onAdmin}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 text-sm font-medium transition border border-slate-200 hover:border-orange-200"
          >
            <Settings className="w-4 h-4" />
            Beheerder
          </button>
          <button 
            onClick={handleLogout}
            data-testid="kiosk-welcome-logout"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-sm font-medium transition border border-slate-200 hover:border-red-200"
          >
            <LogIn className="w-4 h-4 rotate-180" />
            Uitloggen
          </button>
        </div>
      </div>

      {/* Right Panel - Light gray */}
      <div className="flex-1 bg-slate-50 p-6 lg:p-12 flex flex-col justify-center">
        <div className="max-w-xl mx-auto w-full">
          <h3 className="text-2xl lg:text-5xl font-bold text-slate-900 mb-2 lg:mb-3">
            {companyName || 'Huurbetalingen'}
          </h3>
          <p className="text-lg lg:text-2xl text-slate-500 mb-6 lg:mb-12">
            Snel, eenvoudig en veilig huurbetalingen ontvangen
          </p>

          <p className="text-xs lg:text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 lg:mb-6">
            Beschikbare diensten
          </p>

          <div className="space-y-3 lg:space-y-5">
            {[
              { icon: Banknote, label: 'Maandhuur', desc: 'Volledige of gedeeltelijke huur' },
              { icon: Droplets, label: 'Servicekosten', desc: 'Water, stroom & overige' },
              { icon: Receipt, label: 'Boetes & Achterstand', desc: 'Openstaande bedragen' },
            ].map((item) => (
              <div 
                key={item.label} 
                className="flex items-center gap-4 lg:gap-6 p-4 lg:p-6 bg-white rounded-xl lg:rounded-2xl border-2 border-slate-100 shadow-sm"
              >
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg lg:rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 lg:w-8 lg:h-8 text-orange-500" />
                </div>
                <div>
                  <p className="text-base lg:text-xl font-bold text-slate-900">{item.label}</p>
                  <p className="text-sm lg:text-lg text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
