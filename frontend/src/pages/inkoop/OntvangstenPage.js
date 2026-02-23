import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, Package, CheckCircle, Loader2, Calendar, Truck
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  gepland: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ontvangen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  gecontroleerd: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  afgekeurd: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
};

export default function OntvangstenPage() {
  const [ontvangsten, setOntvangsten] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOntvangsten();
  }, []);

  const fetchOntvangsten = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/ontvangsten`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOntvangsten(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen ontvangsten');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totaal: ontvangsten.length,
    gepland: ontvangsten.filter(o => o.status === 'gepland').length,
    ontvangen: ontvangsten.filter(o => o.status === 'ontvangen').length,
    gecontroleerd: ontvangsten.filter(o => o.status === 'gecontroleerd').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Ontvangsten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="ontvangsten-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Inkoop Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Goederenontvangst</h1>
            <p className="text-slate-400 text-sm sm:text-base">Registreer en beheer ontvangen goederen</p>
          </div>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-ontvangst-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Ontvangst
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Gepland</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.gepland}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Ontvangen</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.ontvangen}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Gecontroleerd</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.gecontroleerd}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ontvangsten List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <h3 className="font-semibold">Goederenontvangsten</h3>
        </div>
        {ontvangsten.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen goederenontvangsten gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Er zijn nog geen ontvangsten geregistreerd</p>
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Ontvangst
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ontvangsten.map((ontvangst) => (
              <div key={ontvangst.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{ontvangst.ontvangstnummer}</p>
                    <p className="text-sm text-muted-foreground">Order: {ontvangst.ordernummer}</p>
                    <p className="text-sm text-muted-foreground truncate">{ontvangst.leverancier_naam}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Datum: {ontvangst.ontvangstdatum}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm">{ontvangst.regels?.length || 0} artikelen</p>
                    <Badge className={`${statusColors[ontvangst.status]} text-xs mt-1`}>
                      {ontvangst.status}
                    </Badge>
                  </div>
                  {ontvangst.status === 'ontvangen' && (
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm rounded-lg">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Controleren
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
