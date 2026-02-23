import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Building2, ArrowUpDown, Clipboard, AlertTriangle, ArrowRight,
  Loader2, Warehouse
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VoorraadDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="voorraad-dashboard-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Voorraad Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Voorraad Dashboard</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw voorraad en logistiek</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => navigate('/app/boekhouding/voorraad/artikelen')} 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Package className="w-4 h-4 mr-2" /> Artikelen
            </Button>
            <Button 
              onClick={() => navigate('/app/boekhouding/voorraad/mutaties')} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <ArrowUpDown className="w-4 h-4 mr-2" /> Voorraadmutatie
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/boekhouding/voorraad/artikelen')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal Artikelen</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.artikelen_count || 0}</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-emerald-600 text-xs sm:text-sm">
            Bekijk alle <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div 
          className={`rounded-xl sm:rounded-2xl bg-card border p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow ${
            dashboard?.lage_voorraad_count > 0 ? 'border-orange-300' : 'border-border/50'
          }`}
          onClick={() => navigate('/app/boekhouding/voorraad/artikelen')}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
              dashboard?.lage_voorraad_count > 0 ? 'bg-orange-500/10' : 'bg-slate-500/10'
            }`}>
              <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${
                dashboard?.lage_voorraad_count > 0 ? 'text-orange-500' : 'text-slate-500'
              }`} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Lage Voorraad</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                dashboard?.lage_voorraad_count > 0 ? 'text-orange-500' : ''
              }`}>
                {dashboard?.lage_voorraad_count || 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">artikelen onder minimum</p>
        </div>

        <div 
          className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/boekhouding/voorraad/magazijnen')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Magazijnen</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.magazijnen_count || 0}</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-blue-600 text-xs sm:text-sm">
            Beheren <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Warehouse className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Voorraadwaarde</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">
                SRD {dashboard?.totale_voorraad_waarde?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">totale waarde</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recente Mutaties */}
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">Recente Mutaties</h3>
            </div>
            <Button variant="link" className="text-emerald-600" onClick={() => navigate('/app/boekhouding/voorraad/mutaties')}>
              Alle bekijken
            </Button>
          </div>
          {dashboard?.recente_mutaties?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recente_mutaties.slice(0, 5).map((mutatie) => (
                <div key={mutatie.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{mutatie.artikel_naam || mutatie.artikelcode}</p>
                    <p className="text-xs text-muted-foreground">{mutatie.type} - {mutatie.datum}</p>
                  </div>
                  <span className={`font-bold ${mutatie.aantal_wijziging > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mutatie.aantal_wijziging > 0 ? '+' : ''}{mutatie.aantal_wijziging}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <ArrowUpDown className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-muted-foreground text-sm">Geen recente mutaties</p>
            </div>
          )}
        </div>

        {/* Top Artikelen */}
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">Top 5 Artikelen (Waarde)</h3>
          </div>
          {dashboard?.top_artikelen_waarde?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.top_artikelen_waarde.map((artikel, index) => (
                <div key={artikel.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{artikel.naam}</p>
                      <p className="text-xs text-muted-foreground">{artikel.artikelcode} - {artikel.voorraad_aantal} stuks</p>
                    </div>
                  </div>
                  <span className="font-bold">SRD {artikel.waarde?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-muted-foreground text-sm">Geen artikelen</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Snelle Acties</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/app/boekhouding/voorraad/artikelen')} className="bg-emerald-500 hover:bg-emerald-600">
            <Package className="mr-2 h-4 w-4" /> Artikelen Beheren
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/voorraad/mutaties')}>
            <ArrowUpDown className="mr-2 h-4 w-4" /> Voorraadmutatie
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/voorraad/magazijnen')}>
            <Building2 className="mr-2 h-4 w-4" /> Magazijnen
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/voorraad/inventarisatie')}>
            <Clipboard className="mr-2 h-4 w-4" /> Inventarisatie
          </Button>
        </div>
      </div>
    </div>
  );
}
