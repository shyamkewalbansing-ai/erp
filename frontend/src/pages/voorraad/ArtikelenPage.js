import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, Search, Edit, Trash2, Package, AlertTriangle, Loader2,
  ShoppingBag, Archive
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ArtikelenPage() {
  const [artikelen, setArtikelen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    artikelcode: '', naam: '', omschrijving: '', type: 'product',
    categorie: '', eenheid: 'stuk', inkoopprijs: 0, verkoopprijs: 0,
    min_voorraad: 0, max_voorraad: '', btw_tarief: '25',
    voorraad_beheer: true, heeft_serienummers: false
  });

  useEffect(() => {
    fetchArtikelen();
  }, [search]);

  const fetchArtikelen = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await fetch(`${API_URL}/api/voorraad/artikelen?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArtikelen(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen artikelen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/voorraad/artikelen/${editingId}`
        : `${API_URL}/api/voorraad/artikelen`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          max_voorraad: form.max_voorraad ? parseFloat(form.max_voorraad) : null
        })
      });
      if (res.ok) {
        toast.success(editingId ? 'Artikel bijgewerkt' : 'Artikel aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchArtikelen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan artikel');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit artikel wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/artikelen/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Artikel verwijderd');
        fetchArtikelen();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      artikelcode: '', naam: '', omschrijving: '', type: 'product',
      categorie: '', eenheid: 'stuk', inkoopprijs: 0, verkoopprijs: 0,
      min_voorraad: 0, max_voorraad: '', btw_tarief: '25',
      voorraad_beheer: true, heeft_serienummers: false
    });
  };

  const stats = {
    totaal: artikelen.length,
    producten: artikelen.filter(a => a.type === 'product').length,
    diensten: artikelen.filter(a => a.type === 'dienst').length,
    lage_voorraad: artikelen.filter(a => a.voorraad_aantal < a.min_voorraad).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Artikelen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="artikelen-page">
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Artikelen</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw producten en diensten</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuw-artikel-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuw Artikel
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Producten</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.producten}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Diensten</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.diensten}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl bg-card border p-3 sm:p-4 lg:p-5 ${stats.lage_voorraad > 0 ? 'border-orange-300' : 'border-border/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${stats.lage_voorraad > 0 ? 'bg-orange-500/10' : 'bg-slate-500/10'}`}>
              <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${stats.lage_voorraad > 0 ? 'text-orange-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Lage Voorraad</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${stats.lage_voorraad > 0 ? 'text-orange-500' : ''}`}>{stats.lage_voorraad}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek artikelen..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Artikelen List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        {artikelen.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen artikelen gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Maak uw eerste artikel aan</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuw Artikel
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {artikelen.map((artikel) => (
              <div key={artikel.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    artikel.voorraad_aantal < artikel.min_voorraad ? 'bg-orange-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {artikel.voorraad_aantal < artikel.min_voorraad ? (
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    ) : (
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base">{artikel.naam}</p>
                      <Badge variant="outline" className="text-xs">{artikel.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{artikel.artikelcode}</p>
                    <p className="text-xs text-muted-foreground">{artikel.categorie || 'Geen categorie'}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 ml-13 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm">Voorraad: <span className="font-bold">{artikel.voorraad_aantal || 0}</span> {artikel.eenheid}</p>
                    <p className="text-xs text-muted-foreground">Min: {artikel.min_voorraad}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm">Inkoop: <span className="font-medium">SRD {artikel.inkoopprijs}</span></p>
                    <p className="text-sm">Verkoop: <span className="font-bold text-emerald-600">SRD {artikel.verkoopprijs}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => {
                      setEditingId(artikel.id);
                      setForm({
                        artikelcode: artikel.artikelcode,
                        naam: artikel.naam,
                        omschrijving: artikel.omschrijving || '',
                        type: artikel.type,
                        categorie: artikel.categorie || '',
                        eenheid: artikel.eenheid,
                        inkoopprijs: artikel.inkoopprijs,
                        verkoopprijs: artikel.verkoopprijs,
                        min_voorraad: artikel.min_voorraad,
                        max_voorraad: artikel.max_voorraad || '',
                        btw_tarief: artikel.btw_tarief,
                        voorraad_beheer: artikel.voorraad_beheer,
                        heeft_serienummers: artikel.heeft_serienummers
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => handleDelete(artikel.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingId ? 'Artikel Bewerken' : 'Nieuw Artikel'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Artikelcode *</Label>
              <Input className="rounded-lg" value={form.artikelcode} onChange={(e) => setForm({...form, artikelcode: e.target.value})} disabled={!!editingId} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Naam *</Label>
              <Input className="rounded-lg" value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="dienst">Dienst</SelectItem>
                  <SelectItem value="samenstelling">Samenstelling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Categorie</Label>
              <Input className="rounded-lg" value={form.categorie} onChange={(e) => setForm({...form, categorie: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Eenheid</Label>
              <Input className="rounded-lg" value={form.eenheid} onChange={(e) => setForm({...form, eenheid: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">BTW Tarief</Label>
              <Select value={form.btw_tarief} onValueChange={(v) => setForm({...form, btw_tarief: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Inkoopprijs</Label>
              <Input className="rounded-lg" type="number" value={form.inkoopprijs} onChange={(e) => setForm({...form, inkoopprijs: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Verkoopprijs</Label>
              <Input className="rounded-lg" type="number" value={form.verkoopprijs} onChange={(e) => setForm({...form, verkoopprijs: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Minimum Voorraad</Label>
              <Input className="rounded-lg" type="number" value={form.min_voorraad} onChange={(e) => setForm({...form, min_voorraad: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Maximum Voorraad</Label>
              <Input className="rounded-lg" type="number" value={form.max_voorraad} onChange={(e) => setForm({...form, max_voorraad: e.target.value})} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label className="text-sm">Omschrijving</Label>
              <Input className="rounded-lg" value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">Annuleren</Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 rounded-lg">{editingId ? 'Bijwerken' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
