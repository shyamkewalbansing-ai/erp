import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, ListOrdered, Tag } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PrijslijstenPage() {
  const [prijslijsten, setPrijslijsten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ naam: '', beschrijving: '', is_standaard: false });

  useEffect(() => {
    fetchPrijslijsten();
  }, []);

  const fetchPrijslijsten = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/verkoop/prijslijsten`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrijslijsten(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen prijslijsten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/verkoop/prijslijsten/${editingId}`
        : `${API_URL}/api/verkoop/prijslijsten`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editingId ? 'Prijslijst bijgewerkt' : 'Prijslijst aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchPrijslijsten();
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze prijslijst wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/verkoop/prijslijsten/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Prijslijst verwijderd');
        fetchPrijslijsten();
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
    setForm({ naam: '', beschrijving: '', is_standaard: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Prijslijsten</h1>
          <p className="text-muted-foreground">Beheer prijslijsten en klantprijzen</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Prijslijst
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : prijslijsten.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Geen prijslijsten gevonden
          </div>
        ) : (
          prijslijsten.map((pl) => (
            <Card key={pl.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-emerald-600" />
                  {pl.naam}
                </CardTitle>
                {pl.is_standaard && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                    Standaard
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{pl.beschrijving || 'Geen beschrijving'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Tag className="h-4 w-4" /> {pl.items_count || 0} items
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(pl.id);
                      setForm({ naam: pl.naam, beschrijving: pl.beschrijving || '', is_standaard: pl.is_standaard });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pl.id)}>
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
            <DialogTitle>{editingId ? 'Prijslijst Bewerken' : 'Nieuwe Prijslijst'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Input value={form.beschrijving} onChange={(e) => setForm({...form, beschrijving: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_standaard"
                checked={form.is_standaard}
                onChange={(e) => setForm({...form, is_standaard: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_standaard">Standaard prijslijst</Label>
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
