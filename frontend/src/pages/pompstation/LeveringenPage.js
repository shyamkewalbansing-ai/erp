import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { 
  Truck, 
  Plus, 
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const suppliers = [
  { value: 'staatsolie', label: 'Staatsolie' },
  { value: 'sol', label: 'SOL' },
  { value: 'gow2', label: 'GOw2' },
  { value: 'other', label: 'Anders' },
];

export default function LeveringenPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tank_id: '',
    supplier: 'staatsolie',
    truck_number: '',
    driver_name: '',
    ordered_liters: 0,
    delivered_liters: 0,
    price_per_liter: 0,
    delivery_note_number: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [deliveriesRes, tanksRes] = await Promise.all([
        fetch(`${API_URL}/api/pompstation/deliveries`, { headers }),
        fetch(`${API_URL}/api/pompstation/tanks`, { headers })
      ]);

      if (!deliveriesRes.ok || !tanksRes.ok) {
        throw new Error('Kon data niet laden');
      }

      setDeliveries(await deliveriesRes.json());
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
      const res = await fetch(`${API_URL}/api/pompstation/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Kon levering niet registreren');
      
      toast.success('Levering geregistreerd');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      tank_id: '',
      supplier: 'staatsolie',
      truck_number: '',
      driver_name: '',
      ordered_liters: 0,
      delivered_liters: 0,
      price_per_liter: 0,
      delivery_note_number: '',
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Geverifieerd</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Betwist</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In afwachting</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-leveringen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-orange-500" />
            Brandstof Leveringen
          </h1>
          <p className="text-muted-foreground mt-1">
            Registreer en beheer brandstof leveringen
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
                Nieuwe Levering
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Levering Registreren</DialogTitle>
                <DialogDescription>
                  Registreer een nieuwe brandstof levering
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Tank</Label>
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
                  <div>
                    <Label>Leverancier</Label>
                    <Select 
                      value={formData.supplier} 
                      onValueChange={(v) => setFormData({...formData, supplier: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vrachtwagen Nr.</Label>
                    <Input
                      value={formData.truck_number}
                      onChange={(e) => setFormData({...formData, truck_number: e.target.value})}
                      placeholder="AB-1234"
                    />
                  </div>
                  <div>
                    <Label>Chauffeur</Label>
                    <Input
                      value={formData.driver_name}
                      onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                      placeholder="Naam"
                    />
                  </div>
                  <div>
                    <Label>Bon Nr.</Label>
                    <Input
                      value={formData.delivery_note_number}
                      onChange={(e) => setFormData({...formData, delivery_note_number: e.target.value})}
                      placeholder="LN-12345"
                    />
                  </div>
                  <div>
                    <Label>Besteld (L)</Label>
                    <Input
                      type="number"
                      value={formData.ordered_liters}
                      onChange={(e) => setFormData({...formData, ordered_liters: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Geleverd (L)</Label>
                    <Input
                      type="number"
                      value={formData.delivered_liters}
                      onChange={(e) => setFormData({...formData, delivered_liters: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Prijs per Liter (SRD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_per_liter}
                      onChange={(e) => setFormData({...formData, price_per_liter: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notities</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Extra opmerkingen..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annuleren
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                    Registreren
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Deliveries List */}
      <Card>
        <CardHeader>
          <CardTitle>Recente Leveringen</CardTitle>
          <CardDescription>{deliveries.length} leveringen geregistreerd</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Datum</th>
                  <th className="text-left p-2">Tank</th>
                  <th className="text-left p-2">Leverancier</th>
                  <th className="text-right p-2">Besteld (L)</th>
                  <th className="text-right p-2">Geleverd (L)</th>
                  <th className="text-right p-2">Verschil</th>
                  <th className="text-right p-2">Totaal</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(delivery.created_at)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{delivery.tank_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{delivery.fuel_type}</p>
                      </div>
                    </td>
                    <td className="p-2 capitalize">{delivery.supplier}</td>
                    <td className="p-2 text-right">{delivery.ordered_liters.toLocaleString('nl-NL')}</td>
                    <td className="p-2 text-right">{delivery.delivered_liters.toLocaleString('nl-NL')}</td>
                    <td className={`p-2 text-right ${delivery.variance_liters < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {delivery.variance_liters > 0 ? '+' : ''}{delivery.variance_liters.toLocaleString('nl-NL')}
                      <span className="text-xs ml-1">({delivery.variance_percentage.toFixed(1)}%)</span>
                    </td>
                    <td className="p-2 text-right font-medium">{formatCurrency(delivery.total_cost)}</td>
                    <td className="p-2 text-center">{getStatusBadge(delivery.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {deliveries.length === 0 && (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nog geen leveringen</h3>
              <p className="text-muted-foreground mb-4">
                Registreer uw eerste brandstof levering
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Eerste Levering
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
