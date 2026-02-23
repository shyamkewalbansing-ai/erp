import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, Clipboard, CheckCircle, Loader2, Calendar, Package
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  gepland: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_uitvoering: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  afgerond: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
};

export default function InventarisatiePage() {
  const [inventarisaties, setInventarisaties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventarisaties();
  }, []);

  const fetchInventarisaties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventarisaties(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen inventarisaties');
    } finally {
      setLoading(false);
    }
  };

  const createInventarisatie = async () => {
    const naam = prompt('Naam van de inventarisatie:');
    if (!naam) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          naam,
          geplande_datum: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        toast.success('Inventarisatie aangemaakt');
        fetchInventarisaties();
      }
    } catch (error) {
      toast.error('Fout bij aanmaken');
    }
  };

  const afrondenInventarisatie = async (id) => {
    if (!window.confirm('Wilt u deze inventarisatie afronden en de verschillen verwerken?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties/${id}/afronden?verwerk_verschillen=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Inventarisatie afgerond');
        fetchInventarisaties();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij afronden');
      }
    } catch (error) {
      toast.error('Fout bij afronden');
    }
  };

  const stats = {
    totaal: inventarisaties.length,
    gepland: inventarisaties.filter(i => i.status === 'gepland').length,
    in_uitvoering: inventarisaties.filter(i => i.status === 'in_uitvoering').length,
    afgerond: inventarisaties.filter(i => i.status === 'afgerond').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Inventarisaties laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="inventarisatie-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Clipboard className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Voorraad Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Inventarisatie</h1>
            <p className="text-slate-400 text-sm sm:text-base">Voorraadtellingen en correcties</p>
          </div>
          <Button 
            onClick={createInventarisatie} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-inventarisatie-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Inventarisatie
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Clipboard className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
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
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">In Uitvoering</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.in_uitvoering}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Afgerond</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.afgerond}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventarisaties List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <h3 className="font-semibold">Inventarisaties</h3>
        </div>
        {inventarisaties.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Clipboard className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen inventarisaties gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Plan uw eerste voorraadtelling</p>
            <Button onClick={createInventarisatie} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Inventarisatie
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {inventarisaties.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Clipboard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{inv.naam}</p>
                    <p className="text-sm text-muted-foreground">{inv.inventarisatienummer}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Gepland: {inv.geplande_datum}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm">{inv.regels?.length || 0} artikelen geteld</p>
                    <Badge className={`${statusColors[inv.status]} text-xs mt-1`}>
                      {inv.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {inv.status !== 'afgerond' && (
                    <Button 
                      size="sm" 
                      onClick={() => afrondenInventarisatie(inv.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Afronden
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
