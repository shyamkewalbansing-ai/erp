import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Clock, Calendar } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Urenregistratie</h1>
          <p className="text-muted-foreground">Registreer en bekijk uren per project</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Uren Registreren
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Label>Selecteer Project:</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
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
        </CardHeader>
      </Card>

      {selectedProject && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Totaal Uren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUren.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Factureerbaar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{factureeerbaarUren.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Niet Factureerbaar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">{(totalUren - factureeerbaarUren).toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Geregistreerde Uren</CardTitle>
            </CardHeader>
            <CardContent>
              {uren.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Geen uren geregistreerd voor dit project
                </div>
              ) : (
                <div className="space-y-3">
                  {uren.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{entry.omschrijving || 'Geen omschrijving'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {entry.datum}
                            {entry.medewerker_naam && (
                              <span>• {entry.medewerker_naam}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{entry.uren} uur</p>
                        <span className={`text-xs px-2 py-1 rounded ${entry.factureerbaar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {entry.factureerbaar ? 'Factureerbaar' : 'Niet factureerbaar'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uren Registreren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({...form, project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecteer project" /></SelectTrigger>
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
                <Label>Datum *</Label>
                <Input type="date" value={form.datum} onChange={(e) => setForm({...form, datum: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Aantal Uren *</Label>
                <Input type="number" step="0.5" min="0.5" value={form.uren} onChange={(e) => setForm({...form, uren: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Input value={form.omschrijving} onChange={(e) => setForm({...form, omschrijving: e.target.value})} placeholder="Wat heb je gedaan?" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="factureerbaar"
                checked={form.factureerbaar}
                onChange={(e) => setForm({...form, factureerbaar: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="factureerbaar">Factureerbaar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit}>Registreren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
