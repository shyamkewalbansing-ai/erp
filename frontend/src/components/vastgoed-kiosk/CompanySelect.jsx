import { useState, useEffect } from 'react';
import { Building2, LogIn, UserPlus, ArrowRight, Shield, BarChart3, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// External KIOSK API URL
const API = 'https://kiosk-huur.preview.emergentagent.com/api';

export default function CompanySelect() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API}/companies/public`);
        setCompanies(res.data || []);
      } catch (err) {
        // If no public companies endpoint, just show empty
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleCompanySelect = (companyId) => {
    navigate(`/vastgoed/${companyId}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] py-4 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0f172a]">Appartement Kiosk</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://kiosk-huur.preview.emergentagent.com/admin/login"
              target="_blank"
              rel="noopener noreferrer"
              className="kiosk-tab kiosk-tab-active"
            >
              <LogIn className="w-4 h-4" />
              Inloggen
            </a>
            <a
              href="https://kiosk-huur.preview.emergentagent.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="kiosk-btn-primary h-12 text-base px-6"
            >
              <UserPlus className="w-4 h-4" />
              Registreren
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="flex gap-12">
          {/* Left */}
          <div className="flex-1">
            <span className="inline-block bg-[#f97316]/10 text-[#f97316] text-sm font-semibold px-4 py-2 rounded-full mb-6">
              SaaS Platform voor Vastgoedbeheer
            </span>
            <h1 className="text-5xl font-bold text-[#0f172a] mb-6 leading-tight">
              Huur Betalings<br /><span className="text-[#f97316]">Kiosk</span>
            </h1>
            <p className="text-xl text-[#64748b] mb-8">
              Zelfbedieningskiosk voor uw huurders. Beheer meerdere panden, huurders en betalingen vanuit één platform.
            </p>
            <div className="flex gap-4">
              <a
                href="https://kiosk-huur.preview.emergentagent.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="kiosk-btn-primary"
              >
                Gratis starten
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="https://kiosk-huur.preview.emergentagent.com/admin/login"
                target="_blank"
                rel="noopener noreferrer"
                className="kiosk-btn-secondary h-16 px-8 text-lg"
              >
                Inloggen
              </a>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-96 bg-white rounded-2xl shadow-xl p-8 border border-[#e2e8f0]">
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">Uw eigen kiosk</h3>
            <p className="text-[#64748b] mb-6">Elk bedrijf krijgt een unieke kiosk-URL voor hun huurders</p>
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-[#e2e8f0]">
              <p className="text-sm text-[#64748b] mb-2">Uw kiosk URL</p>
              <code className="text-[#f97316] font-mono text-sm">/vastgoed/uw-bedrijf-id</code>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Building2, label: 'Multi-Pand Beheer', desc: 'Beheer al uw gebouwen vanuit één dashboard' },
            { icon: Users, label: 'Huurder Kiosk', desc: 'Zelfbediening voor huur en servicekosten' },
            { icon: BarChart3, label: 'Realtime Overzicht', desc: 'Direct inzicht in betalingen en achterstand' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-6 border border-[#e2e8f0] hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-[#f97316]" />
              </div>
              <h4 className="font-semibold text-[#0f172a] mb-2">{item.label}</h4>
              <p className="text-sm text-[#64748b]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available Companies */}
      {companies.length > 0 && (
        <div className="max-w-6xl mx-auto px-8 pb-16">
          <h3 className="text-2xl font-bold text-[#0f172a] mb-6">Beschikbare Kiosks</h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {companies.map((company) => (
                <button
                  key={company.company_id}
                  onClick={() => handleCompanySelect(company.company_id)}
                  className="bg-white rounded-xl p-6 border border-[#e2e8f0] hover:border-[#f97316] hover:shadow-lg transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1e293b] flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0f172a]">{company.name}</h4>
                      <p className="text-sm text-[#64748b]">{company.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
