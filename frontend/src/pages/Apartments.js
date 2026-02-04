import { useState, useEffect } from 'react';
import { 
  getApartments, 
  createApartment, 
  updateApartment, 
  deleteApartment, 
  getTenants,
  assignTenant,
  removeTenant,
  formatCurrency 
} from '../lib/api';
import { triggerRefresh, REFRESH_EVENTS } from '../lib/refreshEvents';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search,
  MoreHorizontal,
  MapPin,
  Bed,
  Bath,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Home,
  CheckCircle2,
  TrendingUp,
  Grid3X3,
  List,
  Loader2,
  DollarSign
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

export default function Apartments() {
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rent_amount: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener(REFRESH_EVENTS.APARTMENTS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.APARTMENTS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [apartmentsRes, tenantsRes] = await Promise.all([
        getApartments(),
        getTenants()
      ]);
      setApartments(apartmentsRes.data);
      setTenants(tenantsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        rent_amount: parseFloat(formData.rent_amount),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
      };

      if (selectedApartment) {
        await updateApartment(selectedApartment.id, data);
        toast.success('Appartement bijgewerkt');
      } else {
        await createApartment(data);
        toast.success('Appartement toegevoegd');
      }
      setShowModal(false);
      resetForm();
      fetchData();
      // Trigger refresh for other components
      triggerRefresh(REFRESH_EVENTS.APARTMENTS);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEdit = (apartment) => {
    setSelectedApartment(apartment);
    setFormData({
      name: apartment.name,
      address: apartment.address,
      rent_amount: apartment.rent_amount.toString(),
      description: apartment.description || '',
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteApartment(selectedApartment.id);
      toast.success('Appartement verwijderd');
      setShowDeleteDialog(false);
      setSelectedApartment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const handleAssignTenant = async () => {
    if (!selectedTenantId) {
      toast.error('Selecteer een huurder');
      return;
    }
    try {
      await assignTenant(selectedApartment.id, selectedTenantId);
      toast.success('Huurder toegewezen');
      setShowAssignModal(false);
      setSelectedTenantId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toewijzen');
    }
  };

  const handleRemoveTenant = async (apartment) => {
    try {
      await removeTenant(apartment.id);
      toast.success('Huurder verwijderd van appartement');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen huurder');
    }
  };

  const resetForm = () => {
    setSelectedApartment(null);
    setFormData({
      name: '',
      address: '',
      rent_amount: '',
      description: '',
      bedrooms: 1,
      bathrooms: 1,
    });
  };

  // Get available tenants (not assigned to any apartment)
  const availableTenants = tenants.filter(tenant => 
    !apartments.some(apt => apt.tenant_id === tenant.id)
  );

  const filteredApartments = apartments.filter(apt => {
    const matchesSearch = apt.name.toLowerCase().includes(search.toLowerCase()) ||
      apt.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="apartments-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Appartementen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer uw vastgoedportfolio
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-full bg-primary hover:bg-primary/90"
          data-testid="add-apartment-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Appartement toevoegen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of adres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-transparent"
            data-testid="search-apartments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="available">Beschikbaar</SelectItem>
            <SelectItem value="occupied">Bezet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Apartments Grid */}
      {filteredApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApartments.map((apt, index) => (
            <div 
              key={apt.id} 
              className={`bg-card border border-border rounded-lg overflow-hidden card-hover animate-fade-in stagger-${(index % 5) + 1}`}
              data-testid={`apartment-card-${apt.id}`}
            >
              {/* Card Header with gradient */}
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                <Home className="w-12 h-12 text-primary/40" />
                <div className="absolute top-3 right-3">
                  <span className={`status-badge ${apt.status === 'available' ? 'status-available' : 'status-occupied'}`}>
                    {apt.status === 'available' ? 'Beschikbaar' : 'Bezet'}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{apt.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{apt.address}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(apt)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Bewerken
                      </DropdownMenuItem>
                      {apt.status === 'available' ? (
                        <DropdownMenuItem onClick={() => { setSelectedApartment(apt); setShowAssignModal(true); }}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Huurder toewijzen
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRemoveTenant(apt)}>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Huurder verwijderen
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => { setSelectedApartment(apt); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{apt.bedrooms}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{apt.bathrooms}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Huur per maand</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(apt.rent_amount)}
                    </p>
                  </div>
                  {apt.tenant_name && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Huurder</p>
                      <p className="text-sm font-medium text-foreground">{apt.tenant_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen appartementen gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all' 
              ? 'Probeer andere filters' 
              : 'Voeg uw eerste appartement toe'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Appartement toevoegen
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedApartment ? 'Appartement bewerken' : 'Nieuw appartement'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="bijv. Appartement A1"
                required
                data-testid="apartment-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Straat, nummer, stad"
                required
                data-testid="apartment-address-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rent_amount">Huurprijs (SRD) *</Label>
              <Input
                id="rent_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="apartment-rent-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Slaapkamers</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  data-testid="apartment-bedrooms-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Badkamers</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  data-testid="apartment-bathrooms-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Extra informatie over het appartement..."
                rows={3}
                data-testid="apartment-description-input"
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
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-apartment-btn">
                {selectedApartment ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Tenant Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Huurder toewijzen aan {selectedApartment?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableTenants.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Selecteer huurder</Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger data-testid="select-tenant">
                      <SelectValue placeholder="Kies een huurder" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} - {tenant.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowAssignModal(false); setSelectedTenantId(''); }}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button 
                    onClick={handleAssignTenant} 
                    className="flex-1 bg-primary"
                    data-testid="confirm-assign-btn"
                  >
                    Toewijzen
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Alle huurders zijn al toegewezen aan een appartement.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appartement verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u {selectedApartment?.name} wilt verwijderen? 
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
    </div>
  );
}
