import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, ShoppingCart, TrendingUp, ArrowRight, BarChart3,
  Loader2, Receipt
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VerkoopDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/verkoop/dashboard`, {
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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="verkoop-dashboard-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Verkoop Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Verkoop Dashboard</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw verkoopprocessen</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => navigate('/app/boekhouding/verkoop/offertes')} 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <FileText className="w-4 h-4 mr-2" /> Nieuwe Offerte
            </Button>
            <Button 
              onClick={() => navigate('/app/boekhouding/verkoop/orders')} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" /> Nieuwe Order
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/boekhouding/debiteuren')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Debiteuren</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.klanten_count || 0}</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-emerald-600 text-xs sm:text-sm">
            Bekijk alle <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div 
          className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/boekhouding/verkoop/offertes')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Open Offertes</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.open_offertes || 0}</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-blue-600 text-xs sm:text-sm">
            Bekijk alle <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div 
          className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/boekhouding/verkoop/orders')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Open Orders</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.open_orders || 0}</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-purple-600 text-xs sm:text-sm">
            Bekijk alle <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Conversie Ratio</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{dashboard?.conversie_ratio || 0}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">offerte naar order</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Omzet Deze Maand */}
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">Omzet Deze Maand</h3>
          </div>
          {dashboard?.omzet_maand && Object.entries(dashboard.omzet_maand).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(dashboard.omzet_maand).map(([valuta, bedrag]) => (
                <div key={valuta} className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                  <span className="font-medium">{valuta}</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {bedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-muted-foreground text-sm">Geen omzet deze maand</p>
            </div>
          )}
        </div>

        {/* Top 5 Klanten */}
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">Top 5 Debiteuren</h3>
          </div>
          {dashboard?.top_klanten?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.top_klanten.map((klant, index) => (
                <div key={klant._id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium truncate">{klant.naam}</span>
                  </div>
                  <span className="font-bold">{klant.totaal?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-muted-foreground text-sm">Geen klantgegevens</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Snelle Acties</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/app/boekhouding/debiteuren')} className="bg-emerald-500 hover:bg-emerald-600">
            <Users className="mr-2 h-4 w-4" /> Debiteuren Beheren
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/verkoop/offertes')}>
            <FileText className="mr-2 h-4 w-4" /> Offertes Bekijken
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/verkoop/orders')}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Orders Bekijken
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/boekhouding/verkoop/prijslijsten')}>
            <Receipt className="mr-2 h-4 w-4" /> Prijslijsten
          </Button>
        </div>
      </div>
    </div>
  );
}
