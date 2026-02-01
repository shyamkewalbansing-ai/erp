import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Droplets, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fuelTypes = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'benzine', label: 'Benzine' },
  { value: 'super', label: 'Super' },
  { value: 'kerosine', label: 'Kerosine' },
];

export default function TanksPage() {
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    fuel_type: 'diesel',
    capacity_liters: 10000,
    current_level_liters: 0,
    min_level_alert: 1000,
    location: ''
  });
  const [readingData, setReadingData] = useState({
    level_liters: 0,
    temperature_celsius: null,
    reading_type: 'manual'
  });

  const fetchTanks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/tanks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kon tanks niet laden');
      const data = await res.json();
      setTanks(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTanks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = selectedTank 
        ? `${API_URL}/api/pompstation/tanks/${selectedTank.id}`
        : `${API_URL}/api/pompstation/tanks`;
      
      const res = await fetch(url, {
        method: selectedTank ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Kon tank niet opslaan');
      
      toast.success(selectedTank ? 'Tank bijgewerkt' : 'Tank aangemaakt');
      setDialogOpen(false);
      resetForm();
      fetchTanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReading = async (e) => {
    e.preventDefault();
    if (!selectedTank) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/tanks/${selectedTank.id}/readings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tank_id: selectedTank.id,
          ...readingData
        })
      });

      if (!res.ok) throw new Error('Kon meting niet opslaan');
      
      toast.success('Meting opgeslagen');
      setReadingDialogOpen(false);
      setSelectedTank(null);
      setReadingData({ level_liters: 0, temperature_celsius: null, reading_type: 'manual' });
      fetchTanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (tank) => {
    if (!confirm(`Weet u zeker dat u tank "${tank.name}" wilt verwijderen?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/tanks/${tank.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Kon tank niet verwijderen');
      
      toast.success('Tank verwijderd');
      fetchTanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      fuel_type: 'diesel',
      capacity_liters: 10000,
      current_level_liters: 0,
      min_level_alert: 1000,
      location: ''
    });
    setSelectedTank(null);
  };

  const openEdit = (tank) => {
    setSelectedTank(tank);
    setFormData({
      name: tank.name,
      fuel_type: tank.fuel_type,
      capacity_liters: tank.capacity_liters,
      current_level_liters: tank.current_level_liters,
      min_level_alert: tank.min_level_alert,
      location: tank.location || ''
    });
    setDialogOpen(true);
  };

  const openReading = (tank) => {
    setSelectedTank(tank);
    setReadingData({
      level_liters: tank.current_level_liters,
      temperature_celsius: null,
      reading_type: 'manual'
    });
    setReadingDialogOpen(true);
  };

  const getStatusBadge = (tank) => {
    const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
    if (percentage < 20) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Kritiek</Badge>;
    }
    if (percentage < 40) {
      return <Badge variant="warning" className="gap-1 bg-orange-500"><AlertTriangle className="w-3 h-3" /> Laag</Badge>;
    }
    return <Badge variant="success" className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> OK</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-tanks">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Droplets className="w-8 h-8 text-blue-500" />
            Brandstoftanks
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw brandstoftanks en monitor voorraadniveaus
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTanks} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Tank
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedTank ? 'Tank Bewerken' : 'Nieuwe Tank'}</DialogTitle>
                <DialogDescription>
                  {selectedTank ? 'Wijzig de tankgegevens' : 'Voeg een nieuwe brandstoftank toe'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Naam</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Tank 1 - Diesel"
                      required
                    />
                  </div>
                  <div>
                    <Label>Brandstoftype</Label>
                    <Select 
                      value={formData.fuel_type} 
                      onValueChange={(v) => setFormData({...formData, fuel_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(ft => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Capaciteit (L)</Label>
                    <Input
                      type="number"
                      value={formData.capacity_liters}
                      onChange={(e) => setFormData({...formData, capacity_liters: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Huidig Niveau (L)</Label>
                    <Input
                      type="number"
                      value={formData.current_level_liters}
                      onChange={(e) => setFormData({...formData, current_level_liters: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Min. Alert Niveau (L)</Label>
                    <Input
                      type="number"
                      value={formData.min_level_alert}
                      onChange={(e) => setFormData({...formData, min_level_alert: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Locatie (optioneel)</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Noord-zijde terrein"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annuleren
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {selectedTank ? 'Opslaan' : 'Toevoegen'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tank Reading Dialog */}
      <Dialog open={readingDialogOpen} onOpenChange={setReadingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tankstand Registreren</DialogTitle>
            <DialogDescription>
              Registreer de huidige stand van {selectedTank?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReading} className="space-y-4">
            <div>
              <Label>Huidige Stand (L)</Label>
              <Input
                type="number"
                value={readingData.level_liters}
                onChange={(e) => setReadingData({...readingData, level_liters: parseFloat(e.target.value)})}
                required
              />
            </div>
            <div>
              <Label>Temperatuur (°C, optioneel)</Label>
              <Input
                type="number"
                step="0.1"
                value={readingData.temperature_celsius || ''}
                onChange={(e) => setReadingData({...readingData, temperature_celsius: e.target.value ? parseFloat(e.target.value) : null})}
                placeholder="25.0"
              />
            </div>
            <div>
              <Label>Type Meting</Label>
              <Select 
                value={readingData.reading_type} 
                onValueChange={(v) => setReadingData({...readingData, reading_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Handmatig</SelectItem>
                  <SelectItem value="automatic">Automatisch</SelectItem>
                  <SelectItem value="delivery">Na Levering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReadingDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tanks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tanks.map((tank) => {
          const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
          
          return (
            <Card key={tank.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{tank.name}</CardTitle>
                    <CardDescription className="capitalize">{tank.fuel_type}</CardDescription>
                  </div>
                  {getStatusBadge(tank)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tank Level Visual */}
                <div className="relative h-32 bg-muted rounded-lg overflow-hidden border-2 border-border">
                  <div 
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                      percentage < 20 ? 'bg-red-500' : 
                      percentage < 40 ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }`}
                    style={{ height: `${Math.min(percentage, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white drop-shadow-lg">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Huidig</p>
                    <p className="font-semibold">{tank.current_level_liters.toLocaleString('nl-NL')} L</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capaciteit</p>
                    <p className="font-semibold">{tank.capacity_liters.toLocaleString('nl-NL')} L</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openReading(tank)}
                  >
                    <Gauge className="w-4 h-4 mr-1" />
                    Meting
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEdit(tank)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(tank)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tanks.length === 0 && (
        <Card className="p-8 text-center">
          <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nog geen tanks</h3>
          <p className="text-muted-foreground mb-4">
            Voeg uw eerste brandstoftank toe om te beginnen
          </p>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Tank Toevoegen
          </Button>
        </Card>
      )}
    </div>
  );
}
