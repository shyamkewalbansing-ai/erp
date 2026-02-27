import React, { useState, useEffect } from 'react';
import { projectsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Briefcase, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

const ProjectenPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newProject, setNewProject] = useState({
    code: '', naam: '', omschrijving: '', klant: '', status: 'planning',
    startdatum: new Date().toISOString().split('T')[0], einddatum: '',
    budget: 0, uurtarief: 0, valuta: 'SRD'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await projectsAPI.getAll();
      setProjects(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newProject.code || !newProject.naam) { toast.error('Vul code en naam in'); return; }
    setSaving(true);
    try {
      await projectsAPI.create(newProject);
      toast.success('Project aangemaakt');
      setShowDialog(false);
      setNewProject({ code: '', naam: '', omschrijving: '', klant: '', status: 'planning', startdatum: new Date().toISOString().split('T')[0], einddatum: '', budget: 0, uurtarief: 0, valuta: 'SRD' });
      fetchData();
    } catch (error) { toast.error(error.message || 'Fout bij aanmaken'); }
    finally { setSaving(false); }
  };

  const activeProjects = projects.filter(p => p.status === 'actief' || p.status === 'active');
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.gerealiseerd || 0), 0);

  return (
    <div className="space-y-6" data-testid="projecten-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Projecten</h1>
          <p className="text-slate-500 mt-1">Beheer projecten, uren en kosten</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button data-testid="add-project-btn"><Plus className="w-4 h-4 mr-2" />Nieuw Project</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nieuw Project</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Code *</Label><Input value={newProject.code} onChange={(e) => setNewProject({...newProject, code: e.target.value})} placeholder="P001" /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={newProject.status} onValueChange={(v) => setNewProject({...newProject, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planning">Planning</SelectItem><SelectItem value="actief">Actief</SelectItem><SelectItem value="voltooid">Voltooid</SelectItem><SelectItem value="in_wacht">In wacht</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2"><Label>Naam *</Label><Input value={newProject.naam} onChange={(e) => setNewProject({...newProject, naam: e.target.value})} placeholder="Projectnaam" /></div>
              <div className="space-y-2 col-span-2"><Label>Klant</Label><Input value={newProject.klant} onChange={(e) => setNewProject({...newProject, klant: e.target.value})} placeholder="Klantnaam" /></div>
              <div className="space-y-2"><Label>Startdatum</Label><Input type="date" value={newProject.startdatum} onChange={(e) => setNewProject({...newProject, startdatum: e.target.value})} /></div>
              <div className="space-y-2"><Label>Einddatum</Label><Input type="date" value={newProject.einddatum} onChange={(e) => setNewProject({...newProject, einddatum: e.target.value})} /></div>
              <div className="space-y-2"><Label>Budget</Label><Input type="number" step="0.01" value={newProject.budget} onChange={(e) => setNewProject({...newProject, budget: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Uurtarief</Label><Input type="number" step="0.01" value={newProject.uurtarief} onChange={(e) => setNewProject({...newProject, uurtarief: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2 col-span-2"><Label>Omschrijving</Label><Textarea value={newProject.omschrijving} onChange={(e) => setNewProject({...newProject, omschrijving: e.target.value})} placeholder="Projectomschrijving" /></div>
              <div className="col-span-2"><Button onClick={handleCreate} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Actieve Projecten</p><p className="text-2xl font-bold font-mono text-slate-900">{activeProjects.length}</p></div><div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"><Briefcase className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Totaal Budget</p><p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalBudget)}</p></div><div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Gerealiseerd</p><p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalSpent)}</p></div><div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Projectenoverzicht</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-24">Code</TableHead><TableHead>Naam</TableHead><TableHead>Klant</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-28">Budget</TableHead><TableHead className="text-right w-28">Gerealiseerd</TableHead><TableHead className="w-32">Voortgang</TableHead></TableRow></TableHeader>
              <TableBody>
                {projects.map(project => {
                  const progress = project.budget > 0 ? Math.min(100, ((project.gerealiseerd || 0) / project.budget) * 100) : 0;
                  return (
                    <TableRow key={project.code} data-testid={`project-row-${project.code}`}>
                      <TableCell className="font-mono">{project.code}</TableCell>
                      <TableCell className="font-medium">{project.naam}</TableCell>
                      <TableCell className="text-slate-500">{project.klant || '-'}</TableCell>
                      <TableCell><Badge className={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(project.budget, project.valuta)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(project.gerealiseerd || 0, project.valuta)}</TableCell>
                      <TableCell><Progress value={progress} className="h-2" /></TableCell>
                    </TableRow>
                  );
                })}
                {projects.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Geen projecten gevonden</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectenPage;
