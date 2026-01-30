import { useState, useEffect } from 'react';
import {
  getAutoDealerCustomers,
  createAutoDealerCustomer,
  updateAutoDealerCustomer,
  deleteAutoDealerCustomer
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Loader2,
  ShoppingCart
} from 'lucide-react';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  const symbol = symbols[currency.toUpperCase()] || currency;
  return `${symbol} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  id_number: '',
  notes: '',
  customer_type: 'individual',
  company_name: ''
};

export default function AutoDealerKlanten() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('srd');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await getAutoDealerCustomers();
      setCustomers(res.data);
    } catch (error) {
      toast.error('Kon klanten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const openNewCustomerDialog = () => {
    setSelectedCustomer(null);
    setFormData(emptyCustomer);
    setDialogOpen(true);
  };

  const openEditDialog = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...emptyCustomer,
      ...customer
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Naam is verplicht');
      return;
    }

    setSaving(true);
    try {
      if (selectedCustomer) {
        await updateAutoDealerCustomer(selectedCustomer.id, formData);
        toast.success('Klant bijgewerkt');
      } else {
        await createAutoDealerCustomer(formData);
        toast.success('Klant toegevoegd');
      }
      setDialogOpen(false);
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    
    try {
      await deleteAutoDealerCustomer(selectedCustomer.id);
      toast.success('Klant verwijderd');
      setDeleteDialogOpen(false);
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    return (
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="autodealer-customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Klanten
          </h1>
          <p className="text-muted-foreground">Beheer uw klanten database</p>
        </div>
        <Button onClick={openNewCustomerDialog} data-testid="add-customer-btn">
          <Plus className="w-4 h-4 mr-2" />
          Klant Toevoegen
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, email, telefoon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="customer-search"
              />
            </div>
            <div className="flex gap-1">
              {['srd', 'eur', 'usd'].map((curr) => (
                <Button
                  key={curr}
                  variant={selectedCurrency === curr ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCurrency(curr)}
                >
                  {curr.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Geen klanten gevonden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Pas uw zoekopdracht aan'
                : 'Voeg uw eerste klant toe om te beginnen'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewCustomerDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Klant Toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Klant</th>
                    <th className="text-left py-3 px-4 font-medium">Contact</th>
                    <th className="text-left py-3 px-4 font-medium">Locatie</th>
                    <th className="text-left py-3 px-4 font-medium">Aankopen</th>
                    <th className="text-left py-3 px-4 font-medium">Totaal Besteed</th>
                    <th className="text-left py-3 px-4 font-medium">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {customer.customer_type === 'business' ? (
                              <Building2 className="w-5 h-5 text-primary" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.company_name && (
                              <p className="text-sm text-muted-foreground">{customer.company_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {customer.city && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {customer.city}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                          <span>{customer.total_purchases || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-green-600">
                          {formatCurrency(customer.total_spent?.[selectedCurrency] || 0, selectedCurrency)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedCustomer ? 'Klant Bewerken' : 'Nieuwe Klant'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer ? 'Pas de gegevens van deze klant aan' : 'Voeg een nieuwe klant toe'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer_type">Type Klant</Label>
              <Select 
                value={formData.customer_type} 
                onValueChange={(v) => setFormData({...formData, customer_type: v})}
              >
                <SelectTrigger id="customer_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="business">Zakelijk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Volledige naam"
                data-testid="customer-name-input"
              />
            </div>

            {formData.customer_type === 'business' && (
              <div className="space-y-2">
                <Label htmlFor="company_name">Bedrijfsnaam</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Naam van het bedrijf"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@voorbeeld.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+597 123 4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_number">ID/Paspoort Nummer</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                placeholder="Identificatienummer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Straat en huisnummer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Stad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Paramaribo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Extra informatie over deze klant..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-customer-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCustomer ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze klant wilt verwijderen?
              {selectedCustomer && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedCustomer.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
