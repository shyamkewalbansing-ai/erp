import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Clock, 
  Plus, 
  Play, 
  Square, 
  RefreshCw,
  User,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DienstenPage() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [startForm, setStartForm] = useState({
    operator_id: '',
    pump_numbers: [],
    starting_cash: 0
  });
  const [endingCash, setEndingCash] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [shiftsRes, employeesRes, pumpsRes] = await Promise.all([
        fetch(`${API_URL}/api/pompstation/shifts`, { headers }),
        fetch(`${API_URL}/api/pompstation/employees`, { headers }),
        fetch(`${API_URL}/api/pompstation/pumps`, { headers })
      ]);

      if (!shiftsRes.ok || !employeesRes.ok || !pumpsRes.ok) {
        throw new Error('Kon data niet laden');
      }

      setShifts(await shiftsRes.json());
      setEmployees(await employeesRes.json());
      setPumps(await pumpsRes.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartShift = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/shifts/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(startForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Kon dienst niet starten');
      }
      
      toast.success('Dienst gestart');
      setStartDialogOpen(false);
      setStartForm({ operator_id: '', pump_numbers: [], starting_cash: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!selectedShift) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/shifts/${selectedShift.id}/close?ending_cash=${endingCash}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Kon dienst niet afsluiten');
      
      const result = await res.json();
      toast.success(`Dienst afgesloten. Kas verschil: ${formatCurrency(result.difference)}`);
      setCloseDialogOpen(false);
      setSelectedShift(null);
      setEndingCash(0);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCloseDialog = (shift) => {
    setSelectedShift(shift);
    setEndingCash(shift.starting_cash);
    setCloseDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const activeShifts = shifts.filter(s => s.status === 'active');
  const closedShifts = shifts.filter(s => s.status === 'closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-diensten">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            Diensten Beheer
          </h1>
          <p className="text-muted-foreground mt-1">
            Start en sluit diensten af, beheer kasgeld
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Dienst Starten
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Dienst Starten</DialogTitle>
                <DialogDescription>
                  Start een nieuwe dienst voor een medewerker
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStartShift} className="space-y-4">
                <div>
                  <Label>Medewerker</Label>
                  <Select 
                    value={startForm.operator_id} 
                    onValueChange={(v) => setStartForm({...startForm, operator_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer medewerker" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.is_active).map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pompen</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {pumps.filter(p => p.status === 'active').map((pump) => (
                      <Button
                        key={pump.number}
                        type="button"
                        variant={startForm.pump_numbers.includes(pump.number) ? 'default' : 'outline'}
                        className={startForm.pump_numbers.includes(pump.number) ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        onClick={() => {
                          const nums = startForm.pump_numbers.includes(pump.number)
                            ? startForm.pump_numbers.filter(n => n !== pump.number)
                            : [...startForm.pump_numbers, pump.number];
                          setStartForm({...startForm, pump_numbers: nums});
                        }}
                      >
                        {pump.number}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Startkas (SRD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={startForm.starting_cash}
                    onChange={(e) => setStartForm({...startForm, starting_cash: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStartDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Starten
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dienst Afsluiten</DialogTitle>
            <DialogDescription>
              Sluit de dienst af van {selectedShift?.operator_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseShift} className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Startkas:</span>
                <span className="font-medium">{formatCurrency(selectedShift?.starting_cash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Omzet:</span>
                <span className="font-medium">{formatCurrency(selectedShift?.total_sales || 0)}</span>
              </div>
            </div>
            <div>
              <Label>Eindkas (SRD) - Tel het geld in de kassa</Label>
              <Input
                type="number"
                step="0.01"
                value={endingCash}
                onChange={(e) => setEndingCash(parseFloat(e.target.value))}
                required
                className="text-xl h-12"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                <Square className="w-4 h-4 mr-2" />
                Afsluiten
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Active Shifts */}
      <Card className="border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Play className="w-5 h-5" />
            Actieve Diensten ({activeShifts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeShifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeShifts.map((shift) => (
                <Card key={shift.id} className="bg-green-500/5 border-green-500/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{shift.operator_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Gestart: {formatTime(shift.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pompen</p>
                        <p className="font-medium">{shift.pump_numbers?.join(', ') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Startkas</p>
                        <p className="font-medium">{formatCurrency(shift.starting_cash)}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => openCloseDialog(shift)}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Dienst Afsluiten
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Geen actieve diensten
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Closed Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Afgesloten Diensten</CardTitle>
          <CardDescription>Laatste 10 diensten</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Datum</th>
                  <th className="text-left p-2">Medewerker</th>
                  <th className="text-left p-2">Tijd</th>
                  <th className="text-right p-2">Omzet</th>
                  <th className="text-right p-2">Liters</th>
                  <th className="text-right p-2">Kasverschil</th>
                </tr>
              </thead>
              <tbody>
                {closedShifts.slice(0, 10).map((shift) => (
                  <tr key={shift.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{formatDate(shift.start_time)}</td>
                    <td className="p-2 font-medium">{shift.operator_name}</td>
                    <td className="p-2 text-muted-foreground">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </td>
                    <td className="p-2 text-right font-medium">{formatCurrency(shift.total_sales)}</td>
                    <td className="p-2 text-right">{shift.total_fuel_liters?.toLocaleString('nl-NL')} L</td>
                    <td className={`p-2 text-right font-medium ${
                      (shift.cash_difference || 0) < 0 ? 'text-red-500' : 
                      (shift.cash_difference || 0) > 0 ? 'text-green-500' : ''
                    }`}>
                      {formatCurrency(shift.cash_difference || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {closedShifts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Nog geen afgesloten diensten
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
