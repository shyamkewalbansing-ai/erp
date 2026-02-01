import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Shield, 
  Plus, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const inspectionTypes = [
  { value: 'fire_extinguisher', label: 'Brandblusser' },
  { value: 'emergency_exit', label: 'Nooduitgang' },
  { value: 'tank_inspection', label: 'Tank Inspectie' },
  { value: 'environmental', label: 'Milieu Controle' },
];

const incidentTypes = [
  { value: 'spill', label: 'Morsen' },
  { value: 'accident', label: 'Ongeval' },
  { value: 'theft', label: 'Diefstal' },
  { value: 'equipment_failure', label: 'Apparatuur Defect' },
  { value: 'customer_complaint', label: 'Klacht' },
];

const severityLevels = [
  { value: 'low', label: 'Laag', color: 'bg-green-500' },
  { value: 'medium', label: 'Gemiddeld', color: 'bg-yellow-500' },
  { value: 'high', label: 'Hoog', color: 'bg-orange-500' },
  { value: 'critical', label: 'Kritiek', color: 'bg-red-500' },
];

export default function VeiligheidPage() {
  const [inspections, setInspections] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    inspection_type: 'fire_extinguisher',
    inspector_name: '',
    status: 'passed',
    findings: '',
    next_inspection_date: ''
  });
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'equipment_failure',
    severity: 'low',
    description: '',
    location: '',
    actions_taken: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [inspectionsRes, incidentsRes] = await Promise.all([
        fetch(`${API_URL}/api/pompstation/inspections`, { headers }),
        fetch(`${API_URL}/api/pompstation/incidents`, { headers })
      ]);

      if (!inspectionsRes.ok || !incidentsRes.ok) {
        throw new Error('Kon data niet laden');
      }

      setInspections(await inspectionsRes.json());
      setIncidents(await incidentsRes.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(inspectionForm)
      });

      if (!res.ok) throw new Error('Kon inspectie niet opslaan');
      
      toast.success('Inspectie geregistreerd');
      setInspectionDialogOpen(false);
      setInspectionForm({
        inspection_type: 'fire_extinguisher',
        inspector_name: '',
        status: 'passed',
        findings: '',
        next_inspection_date: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(incidentForm)
      });

      if (!res.ok) throw new Error('Kon incident niet melden');
      
      toast.success('Incident gemeld');
      setIncidentDialogOpen(false);
      setIncidentForm({
        incident_type: 'equipment_failure',
        severity: 'low',
        description: '',
        location: '',
        actions_taken: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Geslaagd</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Aandacht</Badge>;
    }
  };

  const openIncidents = incidents.filter(i => !i.resolved);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-veiligheid">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-500" />
            Veiligheid & Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Inspectie registratie en incident beheer
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      {/* Alerts */}
      {openIncidents.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-600">Open Incidenten</p>
                <p className="text-sm text-muted-foreground">
                  {openIncidents.length} incident(en) wachten op afhandeling
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inspections">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inspections">Inspecties</TabsTrigger>
          <TabsTrigger value="incidents">Incidenten</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Inspectie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inspectie Registreren</DialogTitle>
                  <DialogDescription>
                    Registreer een veiligheidsinspectie
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInspectionSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type Inspectie</Label>
                      <Select 
                        value={inspectionForm.inspection_type} 
                        onValueChange={(v) => setInspectionForm({...inspectionForm, inspection_type: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectionTypes.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={inspectionForm.status} 
                        onValueChange={(v) => setInspectionForm({...inspectionForm, status: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passed">Geslaagd</SelectItem>
                          <SelectItem value="failed">Afgekeurd</SelectItem>
                          <SelectItem value="needs_attention">Aandacht Nodig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Inspecteur</Label>
                      <Input
                        value={inspectionForm.inspector_name}
                        onChange={(e) => setInspectionForm({...inspectionForm, inspector_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Bevindingen</Label>
                      <Textarea
                        value={inspectionForm.findings}
                        onChange={(e) => setInspectionForm({...inspectionForm, findings: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Volgende Inspectie</Label>
                      <Input
                        type="date"
                        value={inspectionForm.next_inspection_date}
                        onChange={(e) => setInspectionForm({...inspectionForm, next_inspection_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInspectionDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Registreren
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inspectie Overzicht</CardTitle>
              <CardDescription>{inspections.length} inspecties geregistreerd</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.map((insp) => (
                  <div key={insp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        insp.status === 'passed' ? 'bg-green-500' : 
                        insp.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {inspectionTypes.find(t => t.value === insp.inspection_type)?.label || insp.inspection_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(insp.inspection_date)} - {insp.inspector_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(insp.status)}
                      {insp.next_inspection_date && (
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(insp.next_inspection_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {inspections.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen inspecties geregistreerd
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Incident Melden
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Incident Melden</DialogTitle>
                  <DialogDescription>
                    Registreer een nieuw incident
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleIncidentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type Incident</Label>
                      <Select 
                        value={incidentForm.incident_type} 
                        onValueChange={(v) => setIncidentForm({...incidentForm, incident_type: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {incidentTypes.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ernst</Label>
                      <Select 
                        value={incidentForm.severity} 
                        onValueChange={(v) => setIncidentForm({...incidentForm, severity: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {severityLevels.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Locatie</Label>
                      <Input
                        value={incidentForm.location}
                        onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                        placeholder="Waar gebeurde het?"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Beschrijving</Label>
                      <Textarea
                        value={incidentForm.description}
                        onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Ondernomen Acties</Label>
                      <Textarea
                        value={incidentForm.actions_taken}
                        onChange={(e) => setIncidentForm({...incidentForm, actions_taken: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIncidentDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">
                      Melden
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Incidenten Overzicht</CardTitle>
              <CardDescription>
                {openIncidents.length} open, {incidents.length - openIncidents.length} opgelost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.map((inc) => {
                  const severity = severityLevels.find(s => s.value === inc.severity);
                  return (
                    <div key={inc.id} className={`p-3 rounded-lg border ${!inc.resolved ? 'bg-red-500/5 border-red-500/30' : 'bg-muted/50'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={severity?.color || 'bg-gray-500'}>
                              {severity?.label || inc.severity}
                            </Badge>
                            <span className="font-medium capitalize">
                              {incidentTypes.find(t => t.value === inc.incident_type)?.label || inc.incident_type}
                            </span>
                            {!inc.resolved && (
                              <Badge variant="destructive">Open</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{inc.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(inc.incident_date)} - Gemeld door {inc.reported_by}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {incidents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen incidenten geregistreerd
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
