import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
      case 'inkoop': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'verkoop': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Voorraadmutaties</h1>
          <p className="text-muted-foreground">Registreer en bekijk voorraadwijzigingen</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Mutatie
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recente Mutaties</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : mutaties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen mutaties gevonden
            </div>
          ) : (
            <div className="space-y-3">
              {mutaties.map((mutatie) => (
                <div key={mutatie.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {getTypeIcon(mutatie.type)}
                    </div>
                    <div>
                      <p className="font-medium">{mutatie.artikel_naam || mutatie.artikelcode}</p>
                      <p className="text-sm text-muted-foreground">{mutatie.omschrijving || mutatie.type}</p>
                      <p className="text-xs text-muted-foreground">{mutatie.datum}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${mutatie.aantal_wijziging > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mutatie.aantal_wijziging > 0 ? '+' : ''}{mutatie.aantal_wijziging}
                    </p>
                    <p className="text-xs text-muted-foreground">Voorraad: {mutatie.voorraad_na}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Voorraadmutatie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Artikel *</Label>
              <Select value={form.artikel_id} onValueChange={(v) => setForm({...form, artikel_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecteer artikel" /></SelectTrigger>
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
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inkoop">Inkoop (voorraad +)</SelectItem>
                  <SelectItem value="verkoop">Verkoop (voorraad -)</SelectItem>
                  <SelectItem value="correctie">Correctie</SelectItem>
                  <SelectItem value="retour">Retour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aantal *</Label>
              <Input type="number" min="1" value={form.aantal} onChange={(e) => setForm({...form, aantal: e.target.value})} />
            </div>
            {form.type === 'inkoop' && (
              <div className="space-y-2">
                <Label>Kostprijs per stuk</Label>
                <Input type="number" step="0.01" value={form.kostprijs} onChange={(e) => setForm({...form, kostprijs: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Input value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit}>Registreren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
