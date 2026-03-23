import { Building2, ArrowRight, Banknote, Droplets, Receipt, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WelcomeScreen({ onStart, companyName, companyId }) {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex">
      {/* Left panel - dark blue */}
      <div className="w-1/3 bg-[#1e293b] text-white p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#f97316] flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{companyName || 'Appartement Kiosk'}</h1>
            <p className="text-sm text-[#94a3b8]">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-bold mb-4">Welkom</h2>
          <p className="text-[#94a3b8] text-lg mb-8">
            Betaal uw huur, servicekosten en meer via deze zelfbedieningskiosk.
          </p>
          <button
            onClick={onStart}
            data-testid="kiosk-start-btn"
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white py-5 px-8 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg"
          >
            Start
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Right panel - light */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-[#0f172a] mb-2">{companyName || 'Huurbetalingen'}</h3>
            <p className="text-[#64748b] text-lg">Snel, eenvoudig en veilig uw huur betalen</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wider">Beschikbare diensten</p>
            {[
              { icon: Banknote, label: 'Maandhuur', desc: 'Volledige of gedeeltelijke huur' },
              { icon: Droplets, label: 'Servicekosten', desc: 'Water, stroom & overige' },
              { icon: Receipt, label: 'Boetes & Achterstand', desc: 'Openstaande bedragen' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <div className="w-12 h-12 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-[#f97316]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0f172a]">{item.label}</p>
                  <p className="text-sm text-[#64748b]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
