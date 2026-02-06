import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Users2, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Briefcase,
  DollarSign,
  Clock,
  Calendar,
  Play,
  Square,
  AlertTriangle,
  Gamepad2,
  Key,
  Link,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WerknemersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [werknemers, setWerknemers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWerknemer, setSelectedWerknemer] = useState(null);
  const [activeTab, setActiveTab] = useState('werknemers');
  
  const [formData, setFormData] = useState({
    name: '',
    function: '',
    hourly_rate: '',
    daily_rate: '',
    status: 'active',
    phone: '',
    address: '',
    notes: '',
    username: '',
    password: ''
  });

  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    machine_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    cash_difference: 0,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [werknemersRes, machinesRes, shiftsRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/werknemers`, { headers }),
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/shifts`, { headers })
      ]);

      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (shiftsRes.ok) setShifts(await shiftsRes.json());
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = selectedWerknemer 
        ? `${API_URL}/api/suribet/werknemers/${selectedWerknemer.id}`
        : `${API_URL}/api/suribet/werknemers`;
      
      const response = await fetch(url, {
        method: selectedWerknemer ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          hourly_rate: parseFloat(formData.hourly_rate) || 0,
          daily_rate: parseFloat(formData.daily_rate) || 0
        })
      });

      if (response.ok) {
        toast.success(selectedWerknemer ? 'Werknemer bijgewerkt' : 'Werknemer toegevoegd');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/shifts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shiftForm)
      });

      if (response.ok) {
        toast.success('Shift geregistreerd');
        setShowShiftModal(false);
        resetShiftForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleEndShift = async (shift) => {
    try {
      const token = localStorage.getItem('token');
      const endTime = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      
      const response = await fetch(`${API_URL}/api/suribet/shifts/${shift.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ end_time: endTime })
      });

      if (response.ok) {
        toast.success('Shift beëindigd');
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij beëindigen shift');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/werknemers/${selectedWerknemer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Werknemer verwijderd');
        setShowDeleteDialog(false);
        setSelectedWerknemer(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleEdit = (werknemer) => {
    setSelectedWerknemer(werknemer);
    setFormData({
      name: werknemer.name,
      function: werknemer.function,
      hourly_rate: werknemer.hourly_rate?.toString() || '',
      daily_rate: werknemer.daily_rate?.toString() || '',
      status: werknemer.status,
      phone: werknemer.phone || '',
      address: werknemer.address || '',
      notes: werknemer.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedWerknemer(null);
    setFormData({
      name: '',
      function: '',
      hourly_rate: '',
      daily_rate: '',
      status: 'active',
      phone: '',
      address: '',
      notes: ''
    });
  };

  const resetShiftForm = () => {
    setShiftForm({
      employee_id: '',
      machine_id: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      cash_difference: 0,
      notes: ''
    });
  };

  const filteredWerknemers = werknemers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
                         w.function.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getMachineName = (id) => machines.find(m => m.id === id)?.machine_id || 'Onbekend';
  const getWerknemerName = (id) => werknemers.find(w => w.id === id)?.name || 'Onbekend';

  // Bereken actieve shifts (shifts zonder end_time voor vandaag)
  const today = new Date().toISOString().split('T')[0];
  const activeShifts = shifts.filter(s => s.date === today && !s.end_time);

  // Stats per werknemer
  const werknemerStats = werknemers.map(w => {
    const werknemerShifts = shifts.filter(s => s.employee_id === w.id);
    const totaalKasverschil = werknemerShifts.reduce((sum, s) => sum + (s.cash_difference || 0), 0);
    const aantalShifts = werknemerShifts.length;
    return { ...w, totaalKasverschil, aantalShifts };
  });

  const stats = {
    total: werknemers.length,
    active: werknemers.filter(w => w.status === 'active').length,
    inactive: werknemers.filter(w => w.status === 'inactive').length,
    activeShifts: activeShifts.length,
    totaalKasverschil: shifts.reduce((sum, s) => sum + (s.cash_difference || 0), 0)
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-werknemers-page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Werknemers</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Personeel & Shift beheer</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => { resetShiftForm(); setShowShiftModal(true); }}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Play className="w-4 h-4 mr-2" />
              Shift Starten
            </Button>
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Werknemer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Totaal</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Users2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Actief</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.active}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Inactief</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-600">{stats.inactive}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Actieve Shifts</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.activeShifts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-lg ${stats.totaalKasverschil !== 0 ? 'ring-2 ring-amber-500' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Kasverschil</p>
                <p className={`text-xl sm:text-2xl font-bold ${stats.totaalKasverschil !== 0 ? 'text-amber-600' : ''}`}>
                  {formatCurrency(stats.totaalKasverschil)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.totaalKasverschil !== 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="werknemers">Werknemers</TabsTrigger>
          <TabsTrigger value="shifts">Shifts ({shifts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="werknemers" className="space-y-4">
          {/* Search and Filters */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op naam of functie..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Werknemers List */}
          {filteredWerknemers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWerknemers.map((werknemer) => {
                const werknemerData = werknemerStats.find(w => w.id === werknemer.id);
                const heeftKasverschil = werknemerData?.totaalKasverschil !== 0;
                
                return (
                  <Card key={werknemer.id} className={`border-0 shadow-lg hover:shadow-xl transition-shadow ${heeftKasverschil ? 'ring-2 ring-amber-500' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                            <span className="text-lg font-bold text-emerald-600">
                              {werknemer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{werknemer.name}</h3>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Briefcase className="w-3 h-3" />
                              <span>{werknemer.function}</span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(werknemer)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => { setSelectedWerknemer(werknemer); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2">
                        {werknemer.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{werknemer.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tarieven:</span>
                          <div className="flex gap-2">
                            {werknemer.hourly_rate > 0 && (
                              <span className="font-medium">{formatCurrency(werknemer.hourly_rate)}/uur</span>
                            )}
                            {werknemer.daily_rate > 0 && (
                              <span className="font-medium">{formatCurrency(werknemer.daily_rate)}/dag</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Shifts:</span>
                          <span className="font-medium">{werknemerData?.aantalShifts || 0}</span>
                        </div>
                        {heeftKasverschil && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Kasverschil:
                            </span>
                            <span className="font-medium text-amber-600">{formatCurrency(werknemerData?.totaalKasverschil)}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <Badge className={werknemer.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }>
                          {werknemer.status === 'active' ? 'Actief' : 'Inactief'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-lg border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Users2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Geen werknemers gevonden</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Voeg uw eerste werknemer toe om te beginnen
                </p>
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Werknemer Toevoegen
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          {/* Active Shifts */}
          {activeShifts.length > 0 && (
            <Card className="border-0 shadow-lg ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                  <Play className="w-5 h-5" />
                  Actieve Shifts Nu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeShifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                          <Users2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{getWerknemerName(shift.employee_id)}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Gamepad2 className="w-3 h-3" />
                            <span>{getMachineName(shift.machine_id)}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>Start: {shift.start_time}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleEndShift(shift)}>
                        <Square className="w-4 h-4 mr-1" />
                        Beëindigen
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Shifts */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Shift Historiek</CardTitle>
            </CardHeader>
            <CardContent>
              {shifts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="pb-3 font-medium">Datum</th>
                        <th className="pb-3 font-medium">Werknemer</th>
                        <th className="pb-3 font-medium">Machine</th>
                        <th className="pb-3 font-medium">Start</th>
                        <th className="pb-3 font-medium">Eind</th>
                        <th className="pb-3 font-medium text-right">Kasverschil</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.slice(0, 20).map((shift) => (
                        <tr key={shift.id} className="border-b last:border-0">
                          <td className="py-3">{new Date(shift.date).toLocaleDateString('nl-NL')}</td>
                          <td className="py-3 font-medium">{getWerknemerName(shift.employee_id)}</td>
                          <td className="py-3">{getMachineName(shift.machine_id)}</td>
                          <td className="py-3">{shift.start_time}</td>
                          <td className="py-3">{shift.end_time || '-'}</td>
                          <td className={`py-3 text-right font-medium ${shift.cash_difference !== 0 ? 'text-amber-600' : ''}`}>
                            {formatCurrency(shift.cash_difference)}
                          </td>
                          <td className="py-3">
                            {shift.end_time ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Voltooid</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Actief</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Geen shifts geregistreerd</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Werknemer Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-emerald-500" />
              {selectedWerknemer ? 'Werknemer Bewerken' : 'Nieuwe Werknemer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Volledige naam"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Functie *</Label>
                <Input
                  value={formData.function}
                  onChange={(e) => setFormData({...formData, function: e.target.value})}
                  placeholder="bijv. Kassier"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({...formData, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Uurloon (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Dagloon (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({...formData, daily_rate: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefoon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+597 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Straat, stad"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notities</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optionele notities"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                {selectedWerknemer ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Modal */}
      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-500" />
              Shift Starten
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShiftSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Werknemer *</Label>
              <Select 
                value={shiftForm.employee_id} 
                onValueChange={(v) => setShiftForm({...shiftForm, employee_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer werknemer..." />
                </SelectTrigger>
                <SelectContent>
                  {werknemers.filter(w => w.status === 'active').map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Machine *</Label>
              <Select 
                value={shiftForm.machine_id} 
                onValueChange={(v) => setShiftForm({...shiftForm, machine_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.filter(m => m.status === 'active').map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.machine_id} - {m.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm({...shiftForm, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Starttijd *</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({...shiftForm, start_time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kasverschil (SRD)</Label>
              <Input
                type="number"
                step="0.01"
                value={shiftForm.cash_difference}
                onChange={(e) => setShiftForm({...shiftForm, cash_difference: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Positief = te veel kas, Negatief = tekort
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notities</Label>
              <Input
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({...shiftForm, notes: e.target.value})}
                placeholder="Optionele notities"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowShiftModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600" disabled={!shiftForm.employee_id || !shiftForm.machine_id || !shiftForm.start_time}>
                Shift Starten
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Werknemer Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u "{selectedWerknemer?.name}" wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
