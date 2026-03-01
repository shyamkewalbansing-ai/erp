import React, { useState, useEffect } from 'react';
import { projectsAPI, timeEntriesAPI, customersAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, FolderKanban, Clock, Loader2 } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

const ProjectenPage = () => {
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newProject, setNewProject] = useState({
    code: '',
    name: '',
    description: '',
    customer_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0,
    currency: 'SRD',
    hours_budget: 0
  });

  const [newTimeEntry, setNewTimeEntry] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    description: '',
    billable: true,
    hourly_rate: 0
  });

  // Format number with Dutch locale
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const formatNumber = (num, decimals = 0) => {
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num || 0);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, timeRes, customersRes] = await Promise.all([
        projectsAPI.getAll(),
        timeEntriesAPI.getAll(),
        customersAPI.getAll()
      ]);
      setProjects(projectsRes.data);
      setTimeEntries(timeRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.code || !newProject.name) {
      toast.error('Vul code en naam in');
      return;
    }
    setSaving(true);
    try {
      const projectData = {
        code: newProject.code,
        naam: newProject.name,
        omschrijving: newProject.description,
        klant_id: newProject.customer_id,
        startdatum: newProject.start_date,
        einddatum: newProject.end_date,
        budget: newProject.budget,
        valuta: newProject.currency,
        uren_budget: newProject.hours_budget
      };
      await projectsAPI.create(projectData);
      toast.success('Project aangemaakt');
      setShowProjectDialog(false);
      setNewProject({
        code: '', name: '', description: '', customer_id: '',
        start_date: new Date().toISOString().split('T')[0], end_date: '',
        budget: 0, currency: 'SRD', hours_budget: 0
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTimeEntry = async () => {
    if (!newTimeEntry.project_id || !newTimeEntry.hours || !newTimeEntry.description) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await timeEntriesAPI.create(newTimeEntry);
      toast.success('Uren geregistreerd');
      setShowTimeDialog(false);
      setNewTimeEntry({
        project_id: '', date: new Date().toISOString().split('T')[0],
        hours: 0, description: '', billable: true, hourly_rate: 0
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij registreren');
    } finally {
      setSaving(false);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="projecten-page">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="projecten-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projecten</h1>
          <p className="text-gray-500 mt-0.5">Beheer projecten en urenregistratie</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-project-btn">
                <Plus className="w-4 h-4 mr-2" />
                Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      value={newProject.code}
                      onChange={(e) => setNewProject({...newProject, code: e.target.value})}
                      placeholder="PRJ001"
                      data-testid="project-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Klant</Label>
                    <Select value={newProject.customer_id} onValueChange={(v) => setNewProject({...newProject, customer_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer klant" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.naam || c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    placeholder="Project naam"
                    data-testid="project-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving</Label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Projectomschrijving"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startdatum</Label>
                    <Input
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Einddatum</Label>
                    <Input
                      type="date"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({...newProject, budget: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valuta</Label>
                    <Select value={newProject.currency} onValueChange={(v) => setNewProject({...newProject, currency: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SRD">SRD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Uren budget</Label>
                    <Input
                      type="number"
                      value={newProject.hours_budget}
                      onChange={(e) => setNewProject({...newProject, hours_budget: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateProject} className="w-full" disabled={saving} data-testid="save-project-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-time-btn">
                <Plus className="w-4 h-4 mr-2" />
                Uren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Uren Registreren</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project *</Label>
                  <Select value={newTimeEntry.project_id} onValueChange={(v) => setNewTimeEntry({...newTimeEntry, project_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newTimeEntry.date}
                      onChange={(e) => setNewTimeEntry({...newTimeEntry, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Uren *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={newTimeEntry.hours}
                      onChange={(e) => setNewTimeEntry({...newTimeEntry, hours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving *</Label>
                  <Textarea
                    value={newTimeEntry.description}
                    onChange={(e) => setNewTimeEntry({...newTimeEntry, description: e.target.value})}
                    placeholder="Wat heeft u gedaan?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Uurtarief</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newTimeEntry.hourly_rate}
                      onChange={(e) => setNewTimeEntry({...newTimeEntry, hourly_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Factureerbaar</Label>
                    <Select value={newTimeEntry.billable ? 'yes' : 'no'} onValueChange={(v) => setNewTimeEntry({...newTimeEntry, billable: v === 'yes'})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Ja</SelectItem>
                        <SelectItem value="no">Nee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateTimeEntry} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Registreren
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Totaal Projecten</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Actieve Projecten</p>
                <p className="text-2xl font-semibold text-green-600">{activeProjects}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Totaal Uren</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(totalHours, 1)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects" data-testid="tab-projects">
            <FolderKanban className="w-4 h-4 mr-2" />
            Projecten
          </TabsTrigger>
          <TabsTrigger value="time" data-testid="tab-time-entries">
            <Clock className="w-4 h-4 mr-2" />
            Urenregistratie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">Projecten</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24 text-xs font-medium text-gray-500">Code</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Naam</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Klant</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-gray-500">Budget</TableHead>
                    <TableHead className="w-32 text-xs font-medium text-gray-500">Uren</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-gray-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map(project => {
                    const hoursProgress = project.hours_budget > 0 ? (project.hours_actual / project.hours_budget) * 100 : 0;
                    return (
                      <TableRow key={project.id} data-testid={`project-row-${project.code}`}>
                        <TableCell className="text-sm text-gray-600">{project.code}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">{project.name}</TableCell>
                        <TableCell className="text-sm text-gray-500">{project.customer_name || '-'}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-gray-900">
                          {formatAmount(project.budget, project.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(hoursProgress, 100)} className="h-2 flex-1" />
                            <span className="text-xs text-gray-500 w-16">
                              {formatNumber(project.hours_actual, 1)}/{formatNumber(project.hours_budget, 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                            {getStatusLabel(project.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Geen projecten gevonden. Maak uw eerste project aan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">Urenregistratie</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Project</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Omschrijving</TableHead>
                    <TableHead className="text-right w-20 text-xs font-medium text-gray-500">Uren</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-gray-500">Factureerbaar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map(entry => {
                    const project = projects.find(p => p.id === entry.project_id);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-gray-600">{formatDate(entry.date)}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">{project?.name || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{entry.description}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-gray-900">{formatNumber(entry.hours, 1)}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${entry.billable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-gray-500'}`}>
                            {entry.billable ? 'Ja' : 'Nee'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {timeEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Geen uren geregistreerd
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectenPage;
