import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const pumpStatuses = [
  { value: 'active', label: 'Actief', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactief', color: 'bg-gray-500' },
  { value: 'maintenance', label: 'Onderhoud', color: 'bg-orange-500' },
];

export default function PompenPage() {
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPump, setSelectedPump] = useState(null);
  const [formData, setFormData] = useState({
    number: 1,
    name: '',
    tank_id: '',
    status: 'active'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pumpsRes, tanksRes] = await Promise.all([
        fetch(`${API_URL}/api/pompstation/pumps`, { headers }),
        fetch(`${API_URL}/api/pompstation/tanks`, { headers })
      ]);

      if (!pumpsRes.ok || !tanksRes.ok) {
        throw new Error('Kon data niet laden');
      }

      setPumps(await pumpsRes.json());
      setTanks(await tanksRes.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/pumps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Kon pomp niet opslaan');
      
      toast.success('Pomp aangemaakt');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    const nextNumber = pumps.length > 0 ? Math.max(...pumps.map(p => p.number)) + 1 : 1;
    setFormData({
      number: nextNumber,
      name: '',
      tank_id: '',
      status: 'active'
    });
    setSelectedPump(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusInfo = pumpStatuses.find(s => s.value === status);
    return (
      <Badge className={statusInfo?.color || 'bg-gray-500'}>
        {status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'inactive' && <AlertTriangle className="w-3 h-3 mr-1" />}
        {status === 'maintenance' && <Wrench className="w-3 h-3 mr-1" />}
        {statusInfo?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-pompen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            Brandstof Pompen
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw brandstofpompen en koppel aan tanks
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Pomp
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Pomp</DialogTitle>
                <DialogDescription>
                  Voeg een nieuwe brandstofpomp toe
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pomp Nummer</Label>
                    <Input
                      type="number"
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Naam (optioneel)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Pomp 1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Gekoppelde Tank</Label>
                    <Select 
                      value={formData.tank_id} 
                      onValueChange={(v) => setFormData({...formData, tank_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {tanks.map(tank => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.name} ({tank.fuel_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({...formData, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pumpStatuses.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annuleren
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                    Toevoegen
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pumps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pumps.map((pump) => (
          <Card key={pump.id} className={`${pump.status !== 'active' ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    pump.status === 'active' ? 'bg-green-500' : 
                    pump.status === 'maintenance' ? 'bg-orange-500' : 
                    'bg-gray-500'
                  }`}>
                    <span className="text-white text-xl font-bold">{pump.number}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Pomp {pump.number}</CardTitle>
                    <CardDescription className="capitalize">{pump.fuel_type}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Vandaag</p>
                  <p className="font-semibold">{formatCurrency(pump.total_sales_today || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Liters</p>
                  <p className="font-semibold">{(pump.total_liters_today || 0).toLocaleString('nl-NL')} L</p>
                </div>
              </div>

              {/* Tank Info */}
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-muted-foreground">Tank</p>
                <p className="font-medium">{pump.tank_name || 'Niet gekoppeld'}</p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                {getStatusBadge(pump.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pumps.length === 0 && (
        <Card className="p-8 text-center">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nog geen pompen</h3>
          <p className="text-muted-foreground mb-4">
            Voeg uw eerste brandstofpomp toe om te beginnen
          </p>
          <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Pomp Toevoegen
          </Button>
        </Card>
      )}
    </div>
  );
}
