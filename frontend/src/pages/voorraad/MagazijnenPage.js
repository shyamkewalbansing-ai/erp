import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MagazijnenPage() {
  const [magazijnen, setMagazijnen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ naam: '', code: '', adres: '', contactpersoon: '', telefoon: '', is_standaard: false });

  useEffect(() => {
    fetchMagazijnen();
  }, []);

  const fetchMagazijnen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/magazijnen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMagazijnen(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen magazijnen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/voorraad/magazijnen/${editingId}`
        : `${API_URL}/api/voorraad/magazijnen`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editingId ? 'Magazijn bijgewerkt' : 'Magazijn aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchMagazijnen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit magazijn wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/magazijnen/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Magazijn verwijderd');
        fetchMagazijnen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij verwijderen');
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ naam: '', code: '', adres: '', contactpersoon: '', telefoon: '', is_standaard: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Magazijnen</h1>
          <p className="text-muted-foreground">Beheer uw magazijnen en opslaglocaties</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuw Magazijn
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : magazijnen.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Geen magazijnen gevonden
          </div>
        ) : (
          magazijnen.map((mag) => (
            <Card key={mag.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{mag.naam}</CardTitle>
                    <p className="text-sm text-muted-foreground">{mag.code}</p>
                  </div>
                </div>
                {mag.is_standaard && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                    Standaard
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {mag.adres && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    {mag.adres}
                  </div>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm">{mag.locaties_count || 0} locaties</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(mag.id);
                      setForm({
                        naam: mag.naam,
                        code: mag.code,
                        adres: mag.adres || '',
                        contactpersoon: mag.contactpersoon || '',
                        telefoon: mag.telefoon || '',
                        is_standaard: mag.is_standaard
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mag.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Magazijn Bewerken' : 'Nieuw Magazijn'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} disabled={!!editingId} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input value={form.adres} onChange={(e) => setForm({...form, adres: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contactpersoon</Label>
                <Input value={form.contactpersoon} onChange={(e) => setForm({...form, contactpersoon: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefoon</Label>
                <Input value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_standaard"
                checked={form.is_standaard}
                onChange={(e) => setForm({...form, is_standaard: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_standaard">Standaard magazijn</Label>
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
