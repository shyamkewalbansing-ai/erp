import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Edit, Trash2, Briefcase, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-gray-100 text-gray-800',
  actief: 'bg-green-100 text-green-800',
  in_wacht: 'bg-yellow-100 text-yellow-800',
  afgerond: 'bg-blue-100 text-blue-800',
  geannuleerd: 'bg-red-100 text-red-800'
};

export default function ProjectenOverzicht() {
  const [projecten, setProjecten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    naam: '', code: '', omschrijving: '', type: 'klant',
    startdatum: '', einddatum: '', budget: '', uurtarief: ''
  });

  useEffect(() => {
    fetchProjecten();
  }, []);

  const fetchProjecten = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjecten(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen projecten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_URL}/api/projecten/${editingId}`
        : `${API_URL}/api/projecten/`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          budget: form.budget ? parseFloat(form.budget) : null,
          uurtarief: form.uurtarief ? parseFloat(form.uurtarief) : null
        })
      });
      if (res.ok) {
        toast.success(editingId ? 'Project bijgewerkt' : 'Project aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchProjecten();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan project');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success('Status bijgewerkt');
        fetchProjecten();
      }
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit project wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Project verwijderd');
        fetchProjecten();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      naam: '', code: '', omschrijving: '', type: 'klant',
      startdatum: '', einddatum: '', budget: '', uurtarief: ''
    });
  };

  const filteredProjecten = projecten.filter(p => 
    p.naam?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Projecten</h1>
          <p className="text-muted-foreground">Beheer al uw projecten</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nieuw Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek projecten..."
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
          ) : filteredProjecten.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen projecten gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjecten.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <Briefcase className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{project.naam}</p>
                        <Badge variant="outline">{project.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{project.code} - {project.project_nummer}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.startdatum && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {project.startdatum} - {project.einddatum || '...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">Uren: <span className="font-bold">{project.gewerkte_uren?.toFixed(1) || 0}</span></p>
                      {project.budget && (
                        <p className="text-xs text-muted-foreground">Budget: SRD {project.budget?.toLocaleString()}</p>
                      )}
                      {project.budget_verbruik > 0 && (
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${project.budget_verbruik > 100 ? 'bg-red-500' : project.budget_verbruik > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(project.budget_verbruik, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                    <Badge className={statusColors[project.status] || 'bg-gray-100'}>
                      {project.status}
                    </Badge>
                    <Select value={project.status} onValueChange={(v) => updateStatus(project.id, v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concept">Concept</SelectItem>
                        <SelectItem value="actief">Actief</SelectItem>
                        <SelectItem value="in_wacht">In Wacht</SelectItem>
                        <SelectItem value="afgerond">Afgerond</SelectItem>
                        <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingId(project.id);
                        setForm({
                          naam: project.naam,
                          code: project.code,
                          omschrijving: project.omschrijving || '',
                          type: project.type,
                          startdatum: project.startdatum || '',
                          einddatum: project.einddatum || '',
                          budget: project.budget || '',
                          uurtarief: project.uurtarief || ''
                        });
                        setDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)}>
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
            <DialogTitle>{editingId ? 'Project Bewerken' : 'Nieuw Project'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} disabled={!!editingId} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="klant">Klantproject</SelectItem>
                  <SelectItem value="intern">Intern project</SelectItem>
                  <SelectItem value="onderhoud">Onderhoud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={form.startdatum} onChange={(e) => setForm({...form, startdatum: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={form.einddatum} onChange={(e) => setForm({...form, einddatum: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Budget (SRD)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Uurtarief (SRD)</Label>
              <Input type="number" value={form.uurtarief} onChange={(e) => setForm({...form, uurtarief: e.target.value})} />
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
