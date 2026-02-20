import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeveranciersPage() {
  const [leveranciers, setLeveranciers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    naam: '', bedrijfsnaam: '', email: '', telefoon: '', adres: '',
    stad: '', land: 'Suriname', btw_nummer: '', betalingstermijn: 30,
    standaard_valuta: 'SRD', contactpersoon: '', notities: ''
  });

  useEffect(() => {
    fetchLeveranciers();
  }, [search]);

  const fetchLeveranciers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await fetch(`${API_URL}/api/inkoop/leveranciers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeveranciers(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen leveranciers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/inkoop/leveranciers/${editingId}`
        : `${API_URL}/api/inkoop/leveranciers`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editingId ? 'Leverancier bijgewerkt' : 'Leverancier aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchLeveranciers();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan leverancier');
    }
  };

  const handleEdit = (lev) => {
    setEditingId(lev.id);
    setForm({
      naam: lev.naam || '',
      bedrijfsnaam: lev.bedrijfsnaam || '',
      email: lev.email || '',
      telefoon: lev.telefoon || '',
      adres: lev.adres || '',
      stad: lev.stad || '',
      land: lev.land || 'Suriname',
      btw_nummer: lev.btw_nummer || '',
      betalingstermijn: lev.betalingstermijn || 30,
      standaard_valuta: lev.standaard_valuta || 'SRD',
      contactpersoon: lev.contactpersoon || '',
      notities: lev.notities || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze leverancier wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/leveranciers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Leverancier verwijderd');
        fetchLeveranciers();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      naam: '', bedrijfsnaam: '', email: '', telefoon: '', adres: '',
      stad: '', land: 'Suriname', btw_nummer: '', betalingstermijn: 30,
      standaard_valuta: 'SRD', contactpersoon: '', notities: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Leveranciers</h1>
          <p className="text-muted-foreground">Beheer uw leveranciers en crediteuren</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Leverancier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek leveranciers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : leveranciers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen leveranciers gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {leveranciers.map((lev) => (
                <div key={lev.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                      <Building2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{lev.bedrijfsnaam || lev.naam}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {lev.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lev.email}</span>}
                        {lev.telefoon && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lev.telefoon}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{lev.leveranciersnummer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lev.openstaand_bedrag > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                        Openstaand: {lev.standaard_valuta} {lev.openstaand_bedrag?.toLocaleString()}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(lev)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(lev.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
            <DialogTitle>{editingId ? 'Leverancier Bewerken' : 'Nieuwe Leverancier'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Bedrijfsnaam</Label>
              <Input value={form.bedrijfsnaam} onChange={(e) => setForm({...form, bedrijfsnaam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Telefoon</Label>
              <Input value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Adres</Label>
              <Input value={form.adres} onChange={(e) => setForm({...form, adres: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Stad</Label>
              <Input value={form.stad} onChange={(e) => setForm({...form, stad: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Land</Label>
              <Input value={form.land} onChange={(e) => setForm({...form, land: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>BTW Nummer</Label>
              <Input value={form.btw_nummer} onChange={(e) => setForm({...form, btw_nummer: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Betalingstermijn (dagen)</Label>
              <Input type="number" value={form.betalingstermijn} onChange={(e) => setForm({...form, betalingstermijn: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Standaard Valuta</Label>
              <Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRD">SRD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contactpersoon</Label>
              <Input value={form.contactpersoon} onChange={(e) => setForm({...form, contactpersoon: e.target.value})} />
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
