import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Gamepad2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Calculator,
  Banknote,
  Euro,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuribetMachines() {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [dagstaten, setDagstaten] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [wisselkoersen, setWisselkoersen] = useState({ eur_to_srd: 38.50, usd_to_srd: 35.50 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Dialogs
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [dagstaatDialogOpen, setDagstaatDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [editingDagstaat, setEditingDagstaat] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Forms
  const [machineForm, setMachineForm] = useState({
    machine_id: '',
    location: '',
    machine_type: 'slot',
    status: 'active',
    notes: ''
  });
  
  const [dagstaatForm, setDagstaatForm] = useState({
    machine_id: '',
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    beginsaldo_srd: 0,
    beginsaldo_eur: 0,
    beginsaldo_usd: 0,
    eindsaldo_srd: 0,
    eindsaldo_eur: 0,
    eindsaldo_usd: 0,
    omzet: 0,
    suribet_percentage: 80,
    notes: '',
    // Biljetten SRD
    srd_5: 0, srd_10: 0, srd_20: 0, srd_50: 0, srd_100: 0, srd_200: 0, srd_500: 0,
    // Biljetten EUR
    eur_5: 0, eur_10: 0, eur_20: 0, eur_50: 0, eur_100: 0, eur_200: 0,
    // Biljetten USD
    usd_1: 0, usd_5: 0, usd_10: 0, usd_20: 0, usd_50: 0, usd_100: 0
  });

  const months = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maart' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Augustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [machinesRes, dagstatenRes, werknemersRes, koersenRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/dagstaten?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers }),
        fetch(`${API_URL}/api/suribet/wisselkoersen`, { headers })
      ]);

      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (dagstatenRes.ok) setDagstaten(await dagstatenRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
      if (koersenRes.ok) setWisselkoersen(await koersenRes.json());
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Machine CRUD
  const openMachineDialog = (machine = null) => {
    if (machine) {
      setEditingMachine(machine);
      setMachineForm({
        machine_id: machine.machine_id,
        location: machine.location,
        machine_type: machine.machine_type,
        status: machine.status,
        notes: machine.notes || ''
      });
    } else {
      setEditingMachine(null);
      setMachineForm({
        machine_id: '',
        location: '',
        machine_type: 'slot',
        status: 'active',
        notes: ''
      });
    }
    setMachineDialogOpen(true);
  };

  const saveMachine = async () => {
    if (!machineForm.machine_id || !machineForm.location) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingMachine 
        ? `${API_URL}/api/suribet/machines/${editingMachine.id}`
        : `${API_URL}/api/suribet/machines`;
      
      const response = await fetch(url, {
        method: editingMachine ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(machineForm)
      });

      if (response.ok) {
        toast.success(editingMachine ? 'Machine bijgewerkt' : 'Machine toegevoegd');
        setMachineDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze machine wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/machines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Machine verwijderd');
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  // Dagstaat CRUD
  const openDagstaatDialog = (dagstaat = null) => {
    if (dagstaat) {
      setEditingDagstaat(dagstaat);
      setDagstaatForm({
        machine_id: dagstaat.machine_id,
        date: dagstaat.date,
        employee_id: dagstaat.employee_id || '',
        beginsaldo_srd: dagstaat.beginsaldo_srd || 0,
        beginsaldo_eur: dagstaat.beginsaldo_eur || 0,
        beginsaldo_usd: dagstaat.beginsaldo_usd || 0,
        eindsaldo_srd: dagstaat.eindsaldo_srd || 0,
        eindsaldo_eur: dagstaat.eindsaldo_eur || 0,
        eindsaldo_usd: dagstaat.eindsaldo_usd || 0,
        omzet: dagstaat.omzet || 0,
        suribet_percentage: dagstaat.suribet_percentage || 80,
        notes: dagstaat.notes || '',
        srd_5: dagstaat.biljetten_srd?.b5 || 0,
        srd_10: dagstaat.biljetten_srd?.b10 || 0,
        srd_20: dagstaat.biljetten_srd?.b20 || 0,
        srd_50: dagstaat.biljetten_srd?.b50 || 0,
        srd_100: dagstaat.biljetten_srd?.b100 || 0,
        srd_200: dagstaat.biljetten_srd?.b200 || 0,
        srd_500: dagstaat.biljetten_srd?.b500 || 0,
        eur_5: dagstaat.biljetten_eur?.b5 || 0,
        eur_10: dagstaat.biljetten_eur?.b10 || 0,
        eur_20: dagstaat.biljetten_eur?.b20 || 0,
        eur_50: dagstaat.biljetten_eur?.b50 || 0,
        eur_100: dagstaat.biljetten_eur?.b100 || 0,
        eur_200: dagstaat.biljetten_eur?.b200 || 0,
        usd_1: dagstaat.biljetten_usd?.b1 || 0,
        usd_5: dagstaat.biljetten_usd?.b5 || 0,
        usd_10: dagstaat.biljetten_usd?.b10 || 0,
        usd_20: dagstaat.biljetten_usd?.b20 || 0,
        usd_50: dagstaat.biljetten_usd?.b50 || 0,
        usd_100: dagstaat.biljetten_usd?.b100 || 0
      });
    } else {
      setEditingDagstaat(null);
      setDagstaatForm({
        machine_id: machines[0]?.machine_id || '',
        date: new Date().toISOString().split('T')[0],
        employee_id: '',
        beginsaldo_srd: 0, beginsaldo_eur: 0, beginsaldo_usd: 0,
        eindsaldo_srd: 0, eindsaldo_eur: 0, eindsaldo_usd: 0,
        omzet: 0, suribet_percentage: 80, notes: '',
        srd_5: 0, srd_10: 0, srd_20: 0, srd_50: 0, srd_100: 0, srd_200: 0, srd_500: 0,
        eur_5: 0, eur_10: 0, eur_20: 0, eur_50: 0, eur_100: 0, eur_200: 0,
        usd_1: 0, usd_5: 0, usd_10: 0, usd_20: 0, usd_50: 0, usd_100: 0
      });
    }
    setDagstaatDialogOpen(true);
  };

  const calculateBiljettenTotal = () => {
    const srdTotal = 
      dagstaatForm.srd_5 * 5 + dagstaatForm.srd_10 * 10 + dagstaatForm.srd_20 * 20 +
      dagstaatForm.srd_50 * 50 + dagstaatForm.srd_100 * 100 + dagstaatForm.srd_200 * 200 +
      dagstaatForm.srd_500 * 500;
    const eurTotal = 
      dagstaatForm.eur_5 * 5 + dagstaatForm.eur_10 * 10 + dagstaatForm.eur_20 * 20 +
      dagstaatForm.eur_50 * 50 + dagstaatForm.eur_100 * 100 + dagstaatForm.eur_200 * 200;
    const usdTotal = 
      dagstaatForm.usd_1 * 1 + dagstaatForm.usd_5 * 5 + dagstaatForm.usd_10 * 10 +
      dagstaatForm.usd_20 * 20 + dagstaatForm.usd_50 * 50 + dagstaatForm.usd_100 * 100;
    
    const totalInSrd = srdTotal + (eurTotal * wisselkoersen.eur_to_srd) + (usdTotal * wisselkoersen.usd_to_srd);
    return { srdTotal, eurTotal, usdTotal, totalInSrd };
  };

  const saveDagstaat = async () => {
    if (!dagstaatForm.machine_id || !dagstaatForm.date) {
      toast.error('Selecteer een machine en datum');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingDagstaat 
        ? `${API_URL}/api/suribet/dagstaten/${editingDagstaat.id}`
        : `${API_URL}/api/suribet/dagstaten`;
      
      const payload = {
        machine_id: dagstaatForm.machine_id,
        date: dagstaatForm.date,
        employee_id: dagstaatForm.employee_id || null,
        beginsaldo_srd: parseFloat(dagstaatForm.beginsaldo_srd) || 0,
        beginsaldo_eur: parseFloat(dagstaatForm.beginsaldo_eur) || 0,
        beginsaldo_usd: parseFloat(dagstaatForm.beginsaldo_usd) || 0,
        eindsaldo_srd: parseFloat(dagstaatForm.eindsaldo_srd) || 0,
        eindsaldo_eur: parseFloat(dagstaatForm.eindsaldo_eur) || 0,
        eindsaldo_usd: parseFloat(dagstaatForm.eindsaldo_usd) || 0,
        omzet: parseFloat(dagstaatForm.omzet) || 0,
        suribet_percentage: parseFloat(dagstaatForm.suribet_percentage) || 80,
        notes: dagstaatForm.notes,
        biljetten_srd: {
          b5: parseInt(dagstaatForm.srd_5) || 0,
          b10: parseInt(dagstaatForm.srd_10) || 0,
          b20: parseInt(dagstaatForm.srd_20) || 0,
          b50: parseInt(dagstaatForm.srd_50) || 0,
          b100: parseInt(dagstaatForm.srd_100) || 0,
          b200: parseInt(dagstaatForm.srd_200) || 0,
          b500: parseInt(dagstaatForm.srd_500) || 0
        },
        biljetten_eur: {
          b5: parseInt(dagstaatForm.eur_5) || 0,
          b10: parseInt(dagstaatForm.eur_10) || 0,
          b20: parseInt(dagstaatForm.eur_20) || 0,
          b50: parseInt(dagstaatForm.eur_50) || 0,
          b100: parseInt(dagstaatForm.eur_100) || 0,
          b200: parseInt(dagstaatForm.eur_200) || 0
        },
        biljetten_usd: {
          b1: parseInt(dagstaatForm.usd_1) || 0,
          b5: parseInt(dagstaatForm.usd_5) || 0,
          b10: parseInt(dagstaatForm.usd_10) || 0,
          b20: parseInt(dagstaatForm.usd_20) || 0,
          b50: parseInt(dagstaatForm.usd_50) || 0,
          b100: parseInt(dagstaatForm.usd_100) || 0
        }
      };

      const response = await fetch(url, {
        method: editingDagstaat ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingDagstaat ? 'Dagstaat bijgewerkt' : 'Dagstaat toegevoegd');
        setDagstaatDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const deleteDagstaat = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze dagstaat wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/suribet/dagstaten/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Dagstaat verwijderd');
      fetchData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredMachines = machines.filter(m => 
    m.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const biljettenTotals = calculateBiljettenTotal();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-machines">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Machines</h1>
              <p className="text-emerald-100 text-sm sm:text-base">{machines.length} machines geregistreerd</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => openMachineDialog()}
              className="bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Machine
            </Button>
            <Button 
              onClick={() => openDagstaatDialog()}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
            >
              <FileText className="w-4 h-4 mr-2" />
              Dagstaat
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Totaal Machines</p>
            <p className="text-2xl font-bold text-emerald-600">{machines.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Actief</p>
            <p className="text-2xl font-bold text-emerald-600">{machines.filter(m => m.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Dagstaten ({months.find(m => m.value === selectedMonth)?.label})</p>
            <p className="text-2xl font-bold">{dagstaten.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Totale Commissie</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(dagstaten.reduce((sum, d) => sum + (d.commissie || 0), 0))}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="machines" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="dagstaten">Dagstaten</TabsTrigger>
        </TabsList>

        <TabsContent value="machines">
          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek machine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map(machine => (
              <Card key={machine.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{machine.machine_id}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {machine.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                      {machine.status === 'active' ? 'Actief' : machine.status === 'maintenance' ? 'Onderhoud' : 'Inactief'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">Type: {machine.machine_type}</p>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openMachineDialog(machine)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Bewerk
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMachine(machine.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredMachines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Geen machines gevonden</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dagstaten">
          {/* Period Selector */}
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="icon" onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(y => y - 1);
              } else {
                setSelectedMonth(m => m - 1);
              }
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(y => y + 1);
              } else {
                setSelectedMonth(m => m + 1);
              }
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Dagstaten Table */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Machine</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Werknemer</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Omzet</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Suribet</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Commissie</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dagstaten.map(d => {
                    const employee = werknemers.find(w => w.id === d.employee_id);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm">{new Date(d.date).toLocaleDateString('nl-NL')}</td>
                        <td className="px-4 py-3 text-sm font-medium">{d.machine_id}</td>
                        <td className="px-4 py-3 text-sm">{employee?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(d.omzet)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(d.suribet_deel)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600">{formatCurrency(d.commissie)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={d.status === 'winst' ? 'default' : 'destructive'}>
                            {d.status === 'winst' ? 'Winst' : 'Verlies'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDagstaatDialog(d)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteDagstaat(d.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {dagstaten.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Geen dagstaten voor deze periode</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Machine Dialog */}
      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMachine ? 'Machine Bewerken' : 'Nieuwe Machine'}</DialogTitle>
            <DialogDescription>Registreer een nieuwe machine of bewerk bestaande</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Machine ID *</Label>
              <Input
                value={machineForm.machine_id}
                onChange={(e) => setMachineForm({...machineForm, machine_id: e.target.value})}
                placeholder="bijv. SLOT-001"
                disabled={!!editingMachine}
              />
            </div>
            <div>
              <Label>Locatie *</Label>
              <Input
                value={machineForm.location}
                onChange={(e) => setMachineForm({...machineForm, location: e.target.value})}
                placeholder="bijv. Paramaribo Centrum"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={machineForm.machine_type} onValueChange={(v) => setMachineForm({...machineForm, machine_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slot">Slot Machine</SelectItem>
                  <SelectItem value="table">Table Game</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                  <SelectItem value="other">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={machineForm.status} onValueChange={(v) => setMachineForm({...machineForm, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                  <SelectItem value="maintenance">Onderhoud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notities</Label>
              <Input
                value={machineForm.notes}
                onChange={(e) => setMachineForm({...machineForm, notes: e.target.value})}
                placeholder="Optionele notities"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMachineDialogOpen(false)}>Annuleren</Button>
            <Button onClick={saveMachine} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dagstaat Dialog */}
      <Dialog open={dagstaatDialogOpen} onOpenChange={setDagstaatDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDagstaat ? 'Dagstaat Bewerken' : 'Nieuwe Dagstaat'}</DialogTitle>
            <DialogDescription>Registreer de dagelijkse machine gegevens</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basis" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basis">Basis</TabsTrigger>
              <TabsTrigger value="biljetten">Biljetten</TabsTrigger>
              <TabsTrigger value="saldo">Saldo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basis" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Machine *</Label>
                  <Select value={dagstaatForm.machine_id} onValueChange={(v) => setDagstaatForm({...dagstaatForm, machine_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map(m => (
                        <SelectItem key={m.id} value={m.machine_id}>{m.machine_id} - {m.location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Datum *</Label>
                  <Input
                    type="date"
                    value={dagstaatForm.date}
                    onChange={(e) => setDagstaatForm({...dagstaatForm, date: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Werknemer</Label>
                <Select value={dagstaatForm.employee_id} onValueChange={(v) => setDagstaatForm({...dagstaatForm, employee_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer werknemer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geen</SelectItem>
                    {werknemers.filter(w => w.status === 'active').map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Omzet (SRD)</Label>
                  <Input
                    type="number"
                    value={dagstaatForm.omzet}
                    onChange={(e) => setDagstaatForm({...dagstaatForm, omzet: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Suribet % (standaard 80%)</Label>
                  <Input
                    type="number"
                    value={dagstaatForm.suribet_percentage}
                    onChange={(e) => setDagstaatForm({...dagstaatForm, suribet_percentage: parseFloat(e.target.value) || 80})}
                  />
                </div>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Berekening</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Suribet deel:</span>
                  <span className="font-medium">{formatCurrency(dagstaatForm.omzet * (dagstaatForm.suribet_percentage / 100))}</span>
                  <span>Jouw commissie:</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(dagstaatForm.omzet * ((100 - dagstaatForm.suribet_percentage) / 100))}</span>
                </div>
              </div>
              
              <div>
                <Label>Notities</Label>
                <Input
                  value={dagstaatForm.notes}
                  onChange={(e) => setDagstaatForm({...dagstaatForm, notes: e.target.value})}
                  placeholder="Optionele notities"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="biljetten" className="space-y-4 mt-4">
              {/* SRD Biljetten */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  SRD Biljetten
                </Label>
                <div className="grid grid-cols-7 gap-2">
                  {[5, 10, 20, 50, 100, 200, 500].map(denom => (
                    <div key={`srd-${denom}`}>
                      <Label className="text-xs">{denom}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dagstaatForm[`srd_${denom}`]}
                        onChange={(e) => setDagstaatForm({...dagstaatForm, [`srd_${denom}`]: parseInt(e.target.value) || 0})}
                        className="text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-right mt-1 font-medium">Totaal: {formatCurrency(biljettenTotals.srdTotal)}</p>
              </div>
              
              {/* EUR Biljetten */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Euro className="w-4 h-4 text-blue-500" />
                  EUR Biljetten
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {[5, 10, 20, 50, 100, 200].map(denom => (
                    <div key={`eur-${denom}`}>
                      <Label className="text-xs">{denom}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dagstaatForm[`eur_${denom}`]}
                        onChange={(e) => setDagstaatForm({...dagstaatForm, [`eur_${denom}`]: parseInt(e.target.value) || 0})}
                        className="text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-right mt-1 font-medium">Totaal: €{biljettenTotals.eurTotal}</p>
              </div>
              
              {/* USD Biljetten */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  USD Biljetten
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 5, 10, 20, 50, 100].map(denom => (
                    <div key={`usd-${denom}`}>
                      <Label className="text-xs">{denom}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dagstaatForm[`usd_${denom}`]}
                        onChange={(e) => setDagstaatForm({...dagstaatForm, [`usd_${denom}`]: parseInt(e.target.value) || 0})}
                        className="text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-right mt-1 font-medium">Totaal: ${biljettenTotals.usdTotal}</p>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium">Totaal omgerekend naar SRD</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(biljettenTotals.totalInSrd)}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="saldo" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><Banknote className="w-3 h-3" /> SRD</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Begin"
                      value={dagstaatForm.beginsaldo_srd}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, beginsaldo_srd: parseFloat(e.target.value) || 0})}
                    />
                    <Input
                      type="number"
                      placeholder="Eind"
                      value={dagstaatForm.eindsaldo_srd}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, eindsaldo_srd: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Euro className="w-3 h-3" /> EUR</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Begin"
                      value={dagstaatForm.beginsaldo_eur}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, beginsaldo_eur: parseFloat(e.target.value) || 0})}
                    />
                    <Input
                      type="number"
                      placeholder="Eind"
                      value={dagstaatForm.eindsaldo_eur}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, eindsaldo_eur: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> USD</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Begin"
                      value={dagstaatForm.beginsaldo_usd}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, beginsaldo_usd: parseFloat(e.target.value) || 0})}
                    />
                    <Input
                      type="number"
                      placeholder="Eind"
                      value={dagstaatForm.eindsaldo_usd}
                      onChange={(e) => setDagstaatForm({...dagstaatForm, eindsaldo_usd: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDagstaatDialogOpen(false)}>Annuleren</Button>
            <Button onClick={saveDagstaat} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
