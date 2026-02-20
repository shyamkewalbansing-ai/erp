import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Building2, Calendar, Banknote, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categorieLabels = {
  gebouwen: 'Gebouwen',
  machines: 'Machines',
  inventaris: 'Inventaris',
  transportmiddelen: 'Transportmiddelen',
  computers: 'Computers',
  software: 'Software',
  overig: 'Overig'
};

const statusColors = {
  actief: 'bg-green-100 text-green-800',
  verkocht: 'bg-blue-100 text-blue-800',
  afgeschreven: 'bg-gray-100 text-gray-800',
  buiten_gebruik: 'bg-red-100 text-red-800'
};

export default function ActivaPage() {
  const [activa, setActiva] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    naam: '', omschrijving: '', categorie: 'overig', aanschafdatum: '',
    aanschafwaarde: '', restwaarde: 0, verwachte_levensduur: 5,
    afschrijvings_methode: 'lineair', locatie: '', serienummer: ''
  });

  useEffect(() => {
    fetchActiva();
  }, []);

  const fetchActiva = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/activa/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiva(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen activa');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/activa/${editingId}`
        : `${API_URL}/api/activa/`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          aanschafwaarde: parseFloat(form.aanschafwaarde),
          restwaarde: parseFloat(form.restwaarde),
          verwachte_levensduur: parseInt(form.verwachte_levensduur)
        })
      });
      if (res.ok) {
        toast.success(editingId ? 'Activum bijgewerkt' : 'Activum aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchActiva();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit activum wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/activa/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Activum verwijderd');
        fetchActiva();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      naam: '', omschrijving: '', categorie: 'overig', aanschafdatum: '',
      aanschafwaarde: '', restwaarde: 0, verwachte_levensduur: 5,
      afschrijvings_methode: 'lineair', locatie: '', serienummer: ''
    });
  };

  const totaalAanschaf = activa.filter(a => a.status === 'actief').reduce((sum, a) => sum + (a.aanschafwaarde || 0), 0);
  const totaalBoekwaarde = activa.filter(a => a.status === 'actief').reduce((sum, a) => sum + (a.boekwaarde || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vaste Activa</h1>
          <p className="text-muted-foreground">Beheer uw vaste activa en afschrijvingen</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuw Activum
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal Activa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activa.filter(a => a.status === 'actief').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aanschafwaarde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SRD {totaalAanschaf.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Boekwaarde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">SRD {totaalBoekwaarde.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activa Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : activa.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen vaste activa gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {activa.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <Building2 className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.naam}</p>
                        <Badge variant="outline">{categorieLabels[item.categorie] || item.categorie}</Badge>
                        <Badge className={statusColors[item.status] || 'bg-gray-100'}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.activum_nummer}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Aangeschaft: {item.aanschafdatum}
                        </span>
                        {item.locatie && <span>Locatie: {item.locatie}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm">Aanschafwaarde: <span className="font-medium">SRD {item.aanschafwaarde?.toLocaleString()}</span></p>
                      <p className="text-sm">Boekwaarde: <span className="font-bold text-emerald-600">SRD {item.boekwaarde?.toLocaleString()}</span></p>
                      <p className="text-xs text-muted-foreground">
                        Afgeschreven: SRD {item.totaal_afgeschreven?.toLocaleString()} ({item.afschrijvings_methode})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          naam: item.naam,
                          omschrijving: item.omschrijving || '',
                          categorie: item.categorie,
                          aanschafdatum: item.aanschafdatum,
                          aanschafwaarde: item.aanschafwaarde,
                          restwaarde: item.restwaarde || 0,
                          verwachte_levensduur: item.verwachte_levensduur || 5,
                          afschrijvings_methode: item.afschrijvings_methode || 'lineair',
                          locatie: item.locatie || '',
                          serienummer: item.serienummer || ''
                        });
                        setDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
            <DialogTitle>{editingId ? 'Activum Bewerken' : 'Nieuw Activum'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({...form, categorie: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gebouwen">Gebouwen</SelectItem>
                  <SelectItem value="machines">Machines</SelectItem>
                  <SelectItem value="inventaris">Inventaris</SelectItem>
                  <SelectItem value="transportmiddelen">Transportmiddelen</SelectItem>
                  <SelectItem value="computers">Computers</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="overig">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aanschafdatum *</Label>
              <Input type="date" value={form.aanschafdatum} onChange={(e) => setForm({...form, aanschafdatum: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Aanschafwaarde (SRD) *</Label>
              <Input type="number" value={form.aanschafwaarde} onChange={(e) => setForm({...form, aanschafwaarde: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Restwaarde (SRD)</Label>
              <Input type="number" value={form.restwaarde} onChange={(e) => setForm({...form, restwaarde: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Levensduur (jaren)</Label>
              <Input type="number" value={form.verwachte_levensduur} onChange={(e) => setForm({...form, verwachte_levensduur: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Afschrijvingsmethode</Label>
              <Select value={form.afschrijvings_methode} onValueChange={(v) => setForm({...form, afschrijvings_methode: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lineair">Lineair</SelectItem>
                  <SelectItem value="degressief">Degressief</SelectItem>
                  <SelectItem value="annuiteit">Annuiteit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Locatie</Label>
              <Input value={form.locatie} onChange={(e) => setForm({...form, locatie: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
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
