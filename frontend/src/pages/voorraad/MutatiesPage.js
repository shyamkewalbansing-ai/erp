import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Plus, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Package
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MutatiesPage() {
  const [mutaties, setMutaties] = useState([]);
  const [artikelen, setArtikelen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    artikel_id: '', type: 'inkoop', aantal: 1, kostprijs: '', omschrijving: ''
  });

  useEffect(() => {
    fetchMutaties();
    fetchArtikelen();
  }, []);

  const fetchMutaties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/mutaties?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMutaties(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen mutaties');
    } finally {
      setLoading(false);
    }
  };

  const fetchArtikelen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/artikelen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArtikelen(data.filter(a => a.voorraad_beheer));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/mutaties`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          aantal: parseFloat(form.aantal),
          kostprijs: form.kostprijs ? parseFloat(form.kostprijs) : null
        })
      });
      if (res.ok) {
        toast.success('Voorraadmutatie geregistreerd');
        setDialogOpen(false);
        resetForm();
        fetchMutaties();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan mutatie');
    }
  };

  const resetForm = () => {
    setForm({ artikel_id: '', type: 'inkoop', aantal: 1, kostprijs: '', omschrijving: '' });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'inkoop': return <ArrowUp className="h-4 w-4 text-emerald-500" />;
      case 'verkoop': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
    }
  };

  const stats = {
    totaal: mutaties.length,
    inkoop: mutaties.filter(m => m.type === 'inkoop').length,
    verkoop: mutaties.filter(m => m.type === 'verkoop').length,
    correctie: mutaties.filter(m => m.type === 'correctie' || m.type === 'retour').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Mutaties laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="mutaties-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Voorraad Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Voorraadmutaties</h1>
            <p className="text-slate-400 text-sm sm:text-base">Registreer en bekijk voorraadwijzigingen</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-mutatie-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Mutatie
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <ArrowUpDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Inkoop</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.inkoop}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Verkoop</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.verkoop}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Correctie/Retour</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.correctie}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mutaties List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <h3 className="font-semibold">Recente Mutaties</h3>
        </div>
        {mutaties.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <ArrowUpDown className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen mutaties gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Registreer uw eerste voorraadmutatie</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Mutatie
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {mutaties.map((mutatie) => (
              <div key={mutatie.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(mutatie.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{mutatie.artikel_naam || mutatie.artikelcode}</p>
                    <p className="text-sm text-muted-foreground">{mutatie.omschrijving || mutatie.type}</p>
                    <p className="text-xs text-muted-foreground">{mutatie.datum}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right ml-13 sm:ml-0">
                  <p className={`text-lg font-bold ${mutatie.aantal_wijziging > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mutatie.aantal_wijziging > 0 ? '+' : ''}{mutatie.aantal_wijziging}
                  </p>
                  <p className="text-xs text-muted-foreground">Voorraad: {mutatie.voorraad_na}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Nieuwe Voorraadmutatie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Artikel *</Label>
              <Select value={form.artikel_id} onValueChange={(v) => setForm({...form, artikel_id: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecteer artikel" /></SelectTrigger>
                <SelectContent>
                  {artikelen.map((art) => (
                    <SelectItem key={art.id} value={art.id}>
                      {art.artikelcode} - {art.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inkoop">Inkoop (voorraad +)</SelectItem>
                  <SelectItem value="verkoop">Verkoop (voorraad -)</SelectItem>
                  <SelectItem value="correctie">Correctie</SelectItem>
                  <SelectItem value="retour">Retour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Aantal *</Label>
              <Input className="rounded-lg" type="number" min="1" value={form.aantal} onChange={(e) => setForm({...form, aantal: e.target.value})} />
            </div>
            {form.type === 'inkoop' && (
              <div className="space-y-2">
                <Label className="text-sm">Kostprijs per stuk</Label>
                <Input className="rounded-lg" type="number" step="0.01" value={form.kostprijs} onChange={(e) => setForm({...form, kostprijs: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm">Omschrijving</Label>
              <Input className="rounded-lg" value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">Annuleren</Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 rounded-lg">Registreren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
