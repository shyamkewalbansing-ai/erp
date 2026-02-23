import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Plus, Clock, Calendar, Loader2, Briefcase, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UrenPage() {
  const [projecten, setProjecten] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [uren, setUren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', datum: new Date().toISOString().split('T')[0],
    uren: '', omschrijving: '', factureerbaar: true, medewerker_id: ''
  });

  useEffect(() => {
    fetchProjecten();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchUren(selectedProject);
    } else {
      setUren([]);
    }
  }, [selectedProject]);

  const fetchProjecten = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjecten(data.filter(p => p.status === 'actief'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUren = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/${projectId}/uren`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUren(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!form.project_id || !form.uren) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/${form.project_id}/uren`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          uren: parseFloat(form.uren),
          medewerker_id: form.medewerker_id || 'self'
        })
      });
      if (res.ok) {
        toast.success('Uren geregistreerd');
        setDialogOpen(false);
        if (selectedProject === form.project_id) {
          fetchUren(selectedProject);
        }
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const resetForm = () => {
    setForm({
      project_id: selectedProject || '', datum: new Date().toISOString().split('T')[0],
      uren: '', omschrijving: '', factureerbaar: true, medewerker_id: ''
    });
  };

  const totalUren = uren.reduce((sum, u) => sum + (u.uren || 0), 0);
  const factureeerbaarUren = uren.filter(u => u.factureerbaar).reduce((sum, u) => sum + (u.uren || 0), 0);

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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="uren-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Projecten Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Urenregistratie</h1>
            <p className="text-slate-400 text-sm sm:text-base">Registreer en bekijk uren per project</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="uren-registreren-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Uren Registreren
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Label className="text-sm font-medium">Selecteer Project:</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-72 rounded-lg">
              <SelectValue placeholder="Kies een project" />
            </SelectTrigger>
            <SelectContent>
              {projecten.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code} - {project.naam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedProject && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Totaal Uren</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{totalUren.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Factureerbaar</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{factureeerbaarUren.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Niet Factureerbaar</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{(totalUren - factureeerbaarUren).toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Uren List */}
          <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/50">
              <h3 className="font-semibold">Geregistreerde Uren</h3>
            </div>
            {uren.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Geen uren geregistreerd</h3>
                <p className="text-muted-foreground text-sm mb-4">Er zijn nog geen uren voor dit project</p>
                <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" /> Uren Registreren
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {uren.map((entry) => (
                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base">{entry.omschrijving || 'Geen omschrijving'}</p>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {entry.datum}
                          {entry.medewerker_naam && (
                            <span>• {entry.medewerker_naam}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-13 sm:ml-0">
                      <p className="text-lg font-bold">{entry.uren} uur</p>
                      <span className={`text-xs px-2 py-1 rounded-lg inline-block mt-1 ${
                        entry.factureerbaar 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {entry.factureerbaar ? 'Factureerbaar' : 'Niet factureerbaar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedProject && (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-8 sm:p-12">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Selecteer een project</h3>
            <p className="text-muted-foreground text-sm">Kies een project om de geregistreerde uren te bekijken</p>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Uren Registreren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Project *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({...form, project_id: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecteer project" /></SelectTrigger>
                <SelectContent>
                  {projecten.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {project.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Datum *</Label>
                <Input className="rounded-lg" type="date" value={form.datum} onChange={(e) => setForm({...form, datum: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Aantal Uren *</Label>
                <Input className="rounded-lg" type="number" step="0.5" min="0.5" value={form.uren} onChange={(e) => setForm({...form, uren: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Omschrijving</Label>
              <Input className="rounded-lg" value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} placeholder="Wat heb je gedaan?" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <input
                type="checkbox"
                id="factureerbaar"
                checked={form.factureerbaar}
                onChange={(e) => setForm({...form, factureerbaar: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="factureerbaar" className="text-sm">Factureerbaar</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">Annuleren</Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 rounded-lg">Registreren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
