import { useState, useEffect } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, getTenantBalance, formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  CreditCard,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.data);
    } catch (error) {
      toast.error('Fout bij laden huurders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTenant) {
        await updateTenant(selectedTenant.id, formData);
        toast.success('Huurder bijgewerkt');
      } else {
        await createTenant(formData);
        toast.success('Huurder toegevoegd');
      }
      setShowModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email || '',
      phone: tenant.phone,
      address: tenant.address || '',
      id_number: tenant.id_number || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteTenant(selectedTenant.id);
      toast.success('Huurder verwijderd');
      setShowDeleteDialog(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const handleViewBalance = async (tenant) => {
    try {
      const response = await getTenantBalance(tenant.id);
      setBalanceData(response.data);
      setSelectedTenant(tenant);
      setShowBalanceModal(true);
    } catch (error) {
      toast.error('Fout bij laden saldo');
    }
  };

  const resetForm = () => {
    setSelectedTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      id_number: '',
    });
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(search.toLowerCase()) ||
    tenant.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tenants-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Huurders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer uw huurders en bekijk hun saldo's
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-full bg-primary hover:bg-primary/90"
          data-testid="add-tenant-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Huurder toevoegen
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of telefoon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-input border-transparent"
          data-testid="search-tenants"
        />
      </div>

      {/* Tenants Grid */}
      {filteredTenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant, index) => (
            <div 
              key={tenant.id} 
              className={`bg-card border border-border rounded-lg p-5 card-hover animate-fade-in stagger-${(index % 5) + 1}`}
              data-testid={`tenant-card-${tenant.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {tenant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                    {tenant.id_number && (
                      <p className="text-xs text-muted-foreground">ID: {tenant.id_number}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewBalance(tenant)}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Bekijk saldo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Bewerken
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => { setSelectedTenant(tenant); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{tenant.phone}</span>
                </div>
                {tenant.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                )}
                {tenant.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{tenant.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen huurders gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Probeer een andere zoekterm' : 'Voeg uw eerste huurder toe'}
          </p>
          {!search && (
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Huurder toevoegen
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? 'Huurder bewerken' : 'Nieuwe huurder'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Volledige naam"
                required
                data-testid="tenant-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoon *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+597 123 4567"
                required
                data-testid="tenant-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@voorbeeld.com"
                data-testid="tenant-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Straat, stad"
                data-testid="tenant-address-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_number">ID Nummer</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                placeholder="Identificatienummer"
                data-testid="tenant-id-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-tenant-btn">
                {selectedTenant ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huurder verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u {selectedTenant?.name} wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Balance Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Saldo - {selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>
          {balanceData && (
            <div className="space-y-4">
              {balanceData.apartment ? (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Appartement</p>
                    <p className="font-medium">{balanceData.apartment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Huur: {formatCurrency(balanceData.apartment.rent_amount)} / maand
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground">Totaal verschuldigd</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(balanceData.total_due)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Betaald</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(balanceData.total_paid)}
                      </p>
                    </div>
                    <div className={`text-center p-4 rounded-lg ${
                      balanceData.balance > 0 ? 'bg-destructive/10' : 'bg-accent'
                    }`}>
                      <p className="text-sm text-muted-foreground">Openstaand</p>
                      <p className={`text-xl font-bold ${
                        balanceData.balance > 0 ? 'text-destructive' : 'text-primary'
                      }`}>
                        {formatCurrency(balanceData.balance)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Deze huurder heeft nog geen appartement toegewezen.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
