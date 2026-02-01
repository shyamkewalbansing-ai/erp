import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Users, 
  Plus, 
  Edit2, 
  RefreshCw,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const roles = [
  { value: 'beheerder', label: 'Beheerder' },
  { value: 'kassier', label: 'Kassier' },
  { value: 'pompbediende', label: 'Pompbediende' },
  { value: 'manager', label: 'Manager' },
];

export default function PersoneelPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'pompbediende',
    pin_code: '',
    hourly_rate: 0,
    start_date: new Date().toISOString().split('T')[0]
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kon personeel niet laden');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Kon medewerker niet opslaan');
      
      toast.success('Medewerker aangemaakt');
      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'pompbediende',
      pin_code: '',
      hourly_rate: 0,
      start_date: new Date().toISOString().split('T')[0]
    });
    setSelectedEmployee(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-personeel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            Personeel
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw pompstation medewerkers
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchEmployees} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Medewerker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Medewerker</DialogTitle>
                <DialogDescription>
                  Voeg een nieuwe medewerker toe aan uw pompstation
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Naam</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Telefoon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Functie</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(v) => setFormData({...formData, role: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>PIN Code (4 cijfers)</Label>
                    <Input
                      maxLength={4}
                      value={formData.pin_code}
                      onChange={(e) => setFormData({...formData, pin_code: e.target.value.replace(/\D/g, '')})}
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <Label>Uurloon (SRD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Startdatum</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
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

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <Card key={emp.id} className={!emp.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {emp.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{emp.name}</CardTitle>
                    <CardDescription className="capitalize">{emp.role}</CardDescription>
                  </div>
                </div>
                <Badge className={emp.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                  {emp.is_active ? 'Actief' : 'Inactief'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact Info */}
              <div className="space-y-1 text-sm">
                {emp.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {emp.phone}
                  </div>
                )}
                {emp.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {emp.email}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                <div>
                  <p className="text-muted-foreground">Diensten</p>
                  <p className="font-semibold">{emp.total_shifts || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uren</p>
                  <p className="font-semibold">{emp.total_hours || 0} uur</p>
                </div>
              </div>

              {emp.hourly_rate > 0 && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Uurloon</p>
                  <p className="font-semibold">{formatCurrency(emp.hourly_rate)}/uur</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nog geen personeel</h3>
          <p className="text-muted-foreground mb-4">
            Voeg uw eerste medewerker toe om te beginnen
          </p>
          <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Medewerker Toevoegen
          </Button>
        </Card>
      )}
    </div>
  );
}
