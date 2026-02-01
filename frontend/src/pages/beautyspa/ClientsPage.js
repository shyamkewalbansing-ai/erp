import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2,
  Eye,
  Award,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const skinTypes = [
  { value: 'normaal', label: 'Normaal' },
  { value: 'droog', label: 'Droog' },
  { value: 'vet', label: 'Vet' },
  { value: 'gecombineerd', label: 'Gecombineerd' },
  { value: 'gevoelig', label: 'Gevoelig' },
];

const membershipTypes = [
  { value: 'none', label: 'Geen', color: 'slate' },
  { value: 'bronze', label: 'Bronze', color: 'amber' },
  { value: 'silver', label: 'Silver', color: 'slate' },
  { value: 'gold', label: 'Gold', color: 'yellow' },
  { value: 'platinum', label: 'Platinum', color: 'purple' },
];

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    skin_type: '',
    allergies: '',
    preferences: '',
    notes: '',
    membership_type: 'none'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchClients();
  }, [search, membershipFilter]);

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (membershipFilter) params.append('membership', membershipFilter);
      
      const res = await axios.get(`${API_URL}/beautyspa/clients?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(res.data);
    } catch (error) {
      toast.error('Fout bij laden van klanten');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const res = await axios.get(`${API_URL}/beautyspa/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewClient(res.data);
    } catch (error) {
      toast.error('Fout bij laden van klantgegevens');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...form,
      allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()) : []
    };

    try {
      if (selectedClient) {
        await axios.put(`${API_URL}/beautyspa/clients/${selectedClient.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Klant bijgewerkt');
      } else {
        await axios.post(`${API_URL}/beautyspa/clients`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Klant toegevoegd');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      skin_type: client.skin_type || '',
      allergies: client.allergies?.join(', ') || '',
      preferences: client.preferences || '',
      notes: client.notes || '',
      membership_type: client.membership_type || 'none'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Weet u zeker dat u deze klant wilt verwijderen?')) return;
    
    try {
      await axios.delete(`${API_URL}/beautyspa/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Klant verwijderd');
      fetchClients();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      skin_type: '',
      allergies: '',
      preferences: '',
      notes: '',
      membership_type: 'none'
    });
    setSelectedClient(null);
  };

  const getMembershipBadge = (type) => {
    const membership = membershipTypes.find(m => m.value === type) || membershipTypes[0];
    return (
      <Badge variant="outline" className={`bg-${membership.color}-50 text-${membership.color}-700 border-${membership.color}-200`}>
        <Award className="w-3 h-3 mr-1" />
        {membership.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-clients-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klantenbeheer</h1>
          <p className="text-slate-600">Beheer uw klanten en hun gegevens</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-pink-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Klant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedClient ? 'Klant Bewerken' : 'Nieuwe Klant'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Volledige naam"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    placeholder="Telefoonnummer"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    placeholder="E-mailadres"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({...form, address: e.target.value})}
                    placeholder="Adres"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Huidtype</Label>
                  <Select value={form.skin_type} onValueChange={(v) => setForm({...form, skin_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer huidtype" />
                    </SelectTrigger>
                    <SelectContent>
                      {skinTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lidmaatschap</Label>
                  <Select value={form.membership_type} onValueChange={(v) => setForm({...form, membership_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer lidmaatschap" />
                    </SelectTrigger>
                    <SelectContent>
                      {membershipTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allergieën (komma gescheiden)</Label>
                <Input
                  value={form.allergies}
                  onChange={(e) => setForm({...form, allergies: e.target.value})}
                  placeholder="bijv. noten, latex, parfum"
                />
              </div>

              <div className="space-y-2">
                <Label>Voorkeuren</Label>
                <Input
                  value={form.preferences}
                  onChange={(e) => setForm({...form, preferences: e.target.value})}
                  placeholder="Voorkeuren van de klant"
                />
              </div>

              <div className="space-y-2">
                <Label>Notities</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 border rounded-lg resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Extra notities..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                  {selectedClient ? 'Bijwerken' : 'Toevoegen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoeken op naam, telefoon of e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={membershipFilter || "all"} onValueChange={(v) => setMembershipFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alle lidmaatschappen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle lidmaatschappen</SelectItem>
                {membershipTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen klanten gevonden</h3>
            <p className="text-slate-500 mb-4">Voeg uw eerste klant toe om te beginnen</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Klant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {client.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{client.name}</h3>
                        {getMembershipBadge(client.membership_type)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                      </div>
                      {client.allergies?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          Allergieën: {client.allergies.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-slate-500">Bezoeken</p>
                      <p className="font-bold text-slate-900">{client.total_visits || 0}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-slate-500">Besteed</p>
                      <p className="font-bold text-emerald-600">SRD {(client.total_spent || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-slate-500">Punten</p>
                      <p className="font-bold text-teal-600">{client.loyalty_points || 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fetchClientDetails(client.id)}
                        className="text-slate-500 hover:text-emerald-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        className="text-slate-500 hover:text-teal-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
                        className="text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Details Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Klantgegevens: {viewClient?.name}</DialogTitle>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Telefoon</p>
                  <p className="font-medium">{viewClient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">E-mail</p>
                  <p className="font-medium">{viewClient.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Huidtype</p>
                  <p className="font-medium capitalize">{viewClient.skin_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Lidmaatschap</p>
                  {getMembershipBadge(viewClient.membership_type)}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-emerald-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{viewClient.total_visits || 0}</p>
                    <p className="text-sm text-emerald-700">Bezoeken</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">SRD {(viewClient.total_spent || 0).toLocaleString()}</p>
                    <p className="text-sm text-emerald-700">Besteed</p>
                  </CardContent>
                </Card>
                <Card className="bg-teal-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-teal-600">{viewClient.loyalty_points || 0}</p>
                    <p className="text-sm text-teal-700">Punten</p>
                  </CardContent>
                </Card>
              </div>

              {/* Appointment History */}
              <div>
                <h3 className="font-semibold mb-3">Afspraakgeschiedenis</h3>
                {viewClient.appointment_history?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewClient.appointment_history.map((apt, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{apt.treatment_name}</p>
                          <p className="text-sm text-slate-500">{apt.appointment_date} om {apt.appointment_time}</p>
                        </div>
                        <Badge variant={apt.status === 'completed' ? 'default' : 'outline'}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Geen afspraken gevonden</p>
                )}
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="font-semibold mb-3">Aankoopgeschiedenis</h3>
                {viewClient.purchase_history?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewClient.purchase_history.map((purchase, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{purchase.sale_number}</p>
                          <p className="text-sm text-slate-500">{purchase.created_at?.slice(0, 10)}</p>
                        </div>
                        <p className="font-bold text-emerald-600">SRD {purchase.total_amount?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Geen aankopen gevonden</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
