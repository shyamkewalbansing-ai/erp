import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Artikelen</h1>
          <p className="text-muted-foreground">Beheer uw producten en diensten</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuw Artikel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek artikelen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : artikelen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen artikelen gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {artikelen.map((artikel) => (
                <div key={artikel.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${artikel.voorraad_aantal < artikel.min_voorraad ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                      {artikel.voorraad_aantal < artikel.min_voorraad ? (
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      ) : (
                        <Package className="h-6 w-6 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{artikel.naam}</p>
                        <Badge variant="outline">{artikel.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{artikel.artikelcode}</p>
                      <p className="text-xs text-muted-foreground">{artikel.categorie || 'Geen categorie'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm">Voorraad: <span className="font-bold">{artikel.voorraad_aantal || 0}</span> {artikel.eenheid}</p>
                      <p className="text-xs text-muted-foreground">Min: {artikel.min_voorraad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Inkoop: <span className="font-medium">SRD {artikel.inkoopprijs}</span></p>
                      <p className="text-sm">Verkoop: <span className="font-bold text-emerald-600">SRD {artikel.verkoopprijs}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
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
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(artikel.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Artikel Bewerken' : 'Nieuw Artikel'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Artikelcode *</Label>
              <Input value={form.artikelcode} onChange={(e) => setForm({...form, artikelcode: e.target.value})} disabled={!!editingId} />
            </div>
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="dienst">Dienst</SelectItem>
                  <SelectItem value="samenstelling">Samenstelling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Input value={form.categorie} onChange={(e) => setForm({...form, categorie: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Eenheid</Label>
              <Input value={form.eenheid} onChange={(e) => setForm({...form, eenheid: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>BTW Tarief</Label>
              <Select value={form.btw_tarief} onValueChange={(v) => setForm({...form, btw_tarief: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inkoopprijs</Label>
              <Input type="number" value={form.inkoopprijs} onChange={(e) => setForm({...form, inkoopprijs: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Verkoopprijs</Label>
              <Input type="number" value={form.verkoopprijs} onChange={(e) => setForm({...form, verkoopprijs: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Minimum Voorraad</Label>
              <Input type="number" value={form.min_voorraad} onChange={(e) => setForm({...form, min_voorraad: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Voorraad</Label>
              <Input type="number" value={form.max_voorraad} onChange={(e) => setForm({...form, max_voorraad: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Omschrijving</Label>
              <Input value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Bijwerken' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
