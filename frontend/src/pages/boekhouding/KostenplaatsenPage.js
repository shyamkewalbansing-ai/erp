import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ModulePageLayout, ContentSection } from '../../components/ModulePageLayout';
import { Plus, Target, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function KostenplaatsenPage() {
  const [kostenplaatsen, setKostenplaatsen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: '', naam: '', omschrijving: '', type: 'afdeling',
    verantwoordelijke: '', budget: ''
  });

  useEffect(() => {
    fetchKostenplaatsen();
  }, []);

  const fetchKostenplaatsen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/kostenplaatsen/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKostenplaatsen(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen kostenplaatsen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/kostenplaatsen/${editingId}`
        : `${API_URL}/api/kostenplaatsen/`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          budget_jaar: form.budget ? parseFloat(form.budget) : null
        })
      });
      if (res.ok) {
        toast.success(editingId ? 'Kostenplaats bijgewerkt' : 'Kostenplaats aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchKostenplaatsen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze kostenplaats wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/kostenplaatsen/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Kostenplaats verwijderd');
        fetchKostenplaatsen();
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
    setForm({
      code: '', naam: '', omschrijving: '', type: 'afdeling',
      verantwoordelijke: '', budget: ''
    });
  };

  // Header action buttons
  const headerActions = (
    <Button 
      onClick={() => { resetForm(); setDialogOpen(true); }}
      className="bg-white text-emerald-600 hover:bg-emerald-50"
      data-testid="nieuwe-kostenplaats-btn"
    >
      <Plus className="mr-2 h-4 w-4" /> Nieuwe Kostenplaats
    </Button>
  );

  return (
    <ModulePageLayout
      title="Kostenplaatsen"
      subtitle="Beheer kostenplaatsen voor kostentoewijzing"
      actions={headerActions}
      loading={loading}
      loadingText="Kostenplaatsen laden..."
      testId="kostenplaatsen-page"
    >
      <ContentSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kostenplaatsen.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Geen kostenplaatsen gevonden
            </div>
          ) : (
            kostenplaatsen.map((kp) => (
              <div key={kp.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow" data-testid={`kostenplaats-${kp.id}`}>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{kp.naam}</h3>
                        <p className="text-sm text-muted-foreground">{kp.code}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {kp.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{kp.omschrijving || 'Geen omschrijving'}</p>
                  
                  {kp.budget && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget</span>
                        <span className="font-medium">SRD {kp.budget?.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${kp.budget_verbruik_percentage > 100 ? 'bg-red-500' : kp.budget_verbruik_percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(kp.budget_verbruik_percentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verbruikt: SRD {kp.werkelijke_kosten?.toLocaleString() || 0} ({kp.budget_verbruik_percentage || 0}%)
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    {kp.verantwoordelijke && (
                      <span className="text-sm text-muted-foreground">{kp.verantwoordelijke}</span>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingId(kp.id);
                        setForm({
                          code: kp.code,
                          naam: kp.naam,
                          omschrijving: kp.omschrijving || '',
                          type: kp.type,
                          verantwoordelijke: kp.verantwoordelijke || '',
                          budget: kp.budget || ''
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(kp.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </ContentSection>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Kostenplaats Bewerken' : 'Nieuwe Kostenplaats'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} disabled={!!editingId} />
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Input value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} placeholder="afdeling, project, product" />
              </div>
              <div className="space-y-2">
                <Label>Budget (SRD)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verantwoordelijke</Label>
              <Input value={form.verantwoordelijke} onChange={(e) => setForm({...form, verantwoordelijke: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Bijwerken' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
