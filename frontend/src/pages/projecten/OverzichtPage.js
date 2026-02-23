import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, Search, Edit, Trash2, Briefcase, Calendar, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  actief: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  in_wacht: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  afgerond: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  geannuleerd: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
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

  const stats = {
    totaal: projecten.length,
    actief: projecten.filter(p => p.status === 'actief').length,
    afgerond: projecten.filter(p => p.status === 'afgerond').length,
    in_wacht: projecten.filter(p => p.status === 'in_wacht').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Projecten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="projecten-overzicht-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Projecten Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Projecten</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer al uw projecten</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuw-project-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuw Project
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Actief</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.actief}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">In Wacht</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.in_wacht}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Afgerond</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.afgerond}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek projecten..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Projecten List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        {filteredProjecten.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen projecten gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Maak uw eerste project aan</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuw Project
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredProjecten.map((project) => (
              <div key={project.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base">{project.naam}</p>
                      <Badge variant="outline" className="text-xs">{project.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.code} - {project.project_nummer}</p>
                    {project.startdatum && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {project.startdatum} - {project.einddatum || '...'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 lg:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm">Uren: <span className="font-bold">{project.gewerkte_uren?.toFixed(1) || 0}</span></p>
                    {project.budget && (
                      <p className="text-xs text-muted-foreground">Budget: SRD {project.budget?.toLocaleString()}</p>
                    )}
                    {project.budget_verbruik > 0 && (
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${project.budget_verbruik > 100 ? 'bg-red-500' : project.budget_verbruik > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(project.budget_verbruik, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  <Badge className={`${statusColors[project.status]} text-xs`}>
                    {project.status}
                  </Badge>
                  <Select value={project.status} onValueChange={(v) => updateStatus(project.id, v)}>
                    <SelectTrigger className="w-28 sm:w-32 rounded-lg text-xs sm:text-sm">
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => {
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
                    <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => handleDelete(project.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingId ? 'Project Bewerken' : 'Nieuw Project'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Naam *</Label>
              <Input className="rounded-lg" value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Code *</Label>
              <Input className="rounded-lg" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} disabled={!!editingId} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="klant">Klantproject</SelectItem>
                  <SelectItem value="intern">Intern project</SelectItem>
                  <SelectItem value="onderhoud">Onderhoud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Startdatum</Label>
              <Input className="rounded-lg" type="date" value={form.startdatum} onChange={(e) => setForm({...form, startdatum: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Einddatum</Label>
              <Input className="rounded-lg" type="date" value={form.einddatum} onChange={(e) => setForm({...form, einddatum: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Budget (SRD)</Label>
              <Input className="rounded-lg" type="number" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Uurtarief (SRD)</Label>
              <Input className="rounded-lg" type="number" value={form.uurtarief} onChange={(e) => setForm({...form, uurtarief: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="text-sm">Omschrijving</Label>
              <Input className="rounded-lg" value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} />
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
