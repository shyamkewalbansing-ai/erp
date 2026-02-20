import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function KlantenPage() {
  const [klanten, setKlanten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    naam: '', bedrijfsnaam: '', email: '', telefoon: '', adres: '',
    stad: '', land: 'Suriname', btw_nummer: '', betalingstermijn: 30,
    standaard_valuta: 'SRD', contactpersoon: '', korting_percentage: 0, notities: ''
  });

  useEffect(() => {
    fetchKlanten();
  }, [search]);

  const fetchKlanten = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await fetch(`${API_URL}/api/verkoop/klanten?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKlanten(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen klanten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/verkoop/klanten/${editingId}`
        : `${API_URL}/api/verkoop/klanten`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editingId ? 'Klant bijgewerkt' : 'Klant aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchKlanten();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan klant');
    }
  };

  const handleEdit = (klant) => {
    setEditingId(klant.id);
    setForm({
      naam: klant.naam || '',
      bedrijfsnaam: klant.bedrijfsnaam || '',
      email: klant.email || '',
      telefoon: klant.telefoon || '',
      adres: klant.adres || '',
      stad: klant.stad || '',
      land: klant.land || 'Suriname',
      btw_nummer: klant.btw_nummer || '',
      betalingstermijn: klant.betalingstermijn || 30,
      standaard_valuta: klant.standaard_valuta || 'SRD',
      contactpersoon: klant.contactpersoon || '',
      korting_percentage: klant.korting_percentage || 0,
      notities: klant.notities || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze klant wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/verkoop/klanten/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Klant verwijderd');
        fetchKlanten();
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
      standaard_valuta: 'SRD', contactpersoon: '', korting_percentage: 0, notities: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Klanten</h1>
          <p className="text-muted-foreground">Beheer uw klanten en debiteuren</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Klant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek klanten..."
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
          ) : klanten.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen klanten gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {klanten.map((klant) => (
                <div key={klant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{klant.bedrijfsnaam || klant.naam}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {klant.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{klant.email}</span>}
                        {klant.telefoon && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{klant.telefoon}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{klant.klantnummer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {klant.openstaand_bedrag > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                        Openstaand: {klant.standaard_valuta} {klant.openstaand_bedrag?.toLocaleString()}
                      </span>
                    )}
                    {klant.korting_percentage > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        {klant.korting_percentage}% korting
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(klant)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(klant.id)}>
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
            <DialogTitle>{editingId ? 'Klant Bewerken' : 'Nieuwe Klant'}</DialogTitle>
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
              <Label>Korting %</Label>
              <Input type="number" value={form.korting_percentage} onChange={(e) => setForm({...form, korting_percentage: parseFloat(e.target.value)})} />
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
