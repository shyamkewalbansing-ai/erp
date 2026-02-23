import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { 
  Plus, Edit, Trash2, ListOrdered, Tag, Loader2
} from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Prijslijsten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="prijslijsten-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <ListOrdered className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Verkoop Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Prijslijsten</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer prijslijsten en klantprijzen</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-prijslijst-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Prijslijst
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal Lijsten</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{prijslijsten.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal Items</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">
                {prijslijsten.reduce((sum, pl) => sum + (pl.items_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Standaard Lijst</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">
                {prijslijsten.filter(pl => pl.is_standaard).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prijslijsten Grid */}
      {prijslijsten.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-8 sm:p-12">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <ListOrdered className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen prijslijsten gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Maak uw eerste prijslijst aan</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Prijslijst
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prijslijsten.map((pl) => (
            <div key={pl.id} className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">{pl.naam}</h3>
                </div>
                {pl.is_standaard && (
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium">
                    Standaard
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {pl.beschrijving || 'Geen beschrijving'}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" /> {pl.items_count || 0} items
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => {
                    setEditingId(pl.id);
                    setForm({ naam: pl.naam, beschrijving: pl.beschrijving || '', is_standaard: pl.is_standaard });
                    setDialogOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => handleDelete(pl.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingId ? 'Prijslijst Bewerken' : 'Nieuwe Prijslijst'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Naam *</Label>
              <Input className="rounded-lg" value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Beschrijving</Label>
              <Input className="rounded-lg" value={form.beschrijving} onChange={(e) => setForm({...form, beschrijving: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <input
                type="checkbox"
                id="is_standaard"
                checked={form.is_standaard}
                onChange={(e) => setForm({...form, is_standaard: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_standaard" className="text-sm">Standaard prijslijst</Label>
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
