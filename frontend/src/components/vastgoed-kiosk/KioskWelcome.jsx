import { Building2, ArrowRight, Banknote, Droplets, Receipt, Settings } from 'lucide-react';

export default function KioskWelcome({ onStart, companyName, companyId }) {
  const today = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="kiosk-fullscreen flex">
      {/* Left Panel - Dark */}
      <div className="w-2/5 kiosk-bg-gradient p-12 flex flex-col text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/20 rounded-full" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-2xl">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{companyName || 'Appartement Kiosk'}</h1>
              <p className="text-white/60 text-lg">{today}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h2 className="text-7xl font-bold mb-6 leading-tight">
            Welkom
          </h2>
          <p className="text-2xl text-white/70 mb-12 leading-relaxed max-w-md">
            Betaal uw huur, servicekosten en meer via deze zelfbedieningskiosk.
          </p>
          
          <button
            onClick={onStart}
            data-testid="kiosk-start-btn"
            className="kiosk-btn-xl bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/30"
          >
            <span>Start</span>
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>

        {/* Admin link */}
        <div className="relative z-10">
          <a 
            href={`/vastgoed/admin`}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm"
          >
            <Settings className="w-4 h-4" />
            Beheerder
          </a>
        </div>
      </div>

      {/* Right Panel - Light */}
      <div className="flex-1 bg-slate-50 p-12 flex flex-col justify-center">
        <div className="max-w-xl mx-auto">
          <h3 className="text-5xl font-bold text-slate-900 mb-3">
            {companyName || 'Huurbetalingen'}
          </h3>
          <p className="text-2xl text-slate-500 mb-12">
            Snel, eenvoudig en veilig uw huur betalen
          </p>

          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
            Beschikbare diensten
          </p>

          <div className="space-y-5">
            {[
              { icon: Banknote, label: 'Maandhuur', desc: 'Volledige of gedeeltelijke huur' },
              { icon: Droplets, label: 'Servicekosten', desc: 'Water, stroom & overige' },
              { icon: Receipt, label: 'Boetes & Achterstand', desc: 'Openstaande bedragen' },
            ].map((item) => (
              <div 
                key={item.label} 
                className="flex items-center gap-6 p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{item.label}</p>
                  <p className="text-lg text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
