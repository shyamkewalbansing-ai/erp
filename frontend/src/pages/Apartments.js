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
  DollarSign,
  Banknote
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

  // Stats
  const totalApartments = apartments.length;
  const occupiedApartments = apartments.filter(apt => apt.status === 'occupied').length;
  const availableApartments = apartments.filter(apt => apt.status === 'available').length;
  const totalRentIncome = apartments
    .filter(apt => apt.status === 'occupied')
    .reduce((sum, apt) => sum + (apt.rent_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Appartementen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="apartments-page">
      {/* Hero Header - Same style as Tenants */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs */}
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-blue-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{totalApartments} appartementen</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Appartementen Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer uw vastgoedportfolio en huurders
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            size="sm"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
            data-testid="add-apartment-btn"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nieuw Appartement
          </Button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Apartments - Featured Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Totaal</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{totalApartments}</p>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
          </div>
        </div>

        {/* Occupied Apartments Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Bezet</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{occupiedApartments}</p>
              <p className="text-xs text-muted-foreground mt-1">{totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0}% bezetting</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Available Apartments Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Beschikbaar</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{availableApartments}</p>
              <p className="text-xs text-muted-foreground mt-1">Direct verhuurbaar</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Monthly Income Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-yellow-500/5 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Huurinkomsten</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalRentIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">Per maand</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of adres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="search-apartments"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="available">Beschikbaar</SelectItem>
              <SelectItem value="occupied">Bezet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Apartments Grid */}
      {filteredApartments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredApartments.map((apt) => (
            <div 
              key={apt.id} 
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
              data-testid={`apartment-card-${apt.id}`}
            >
              {/* Card Header with gradient */}
              <div className="h-28 sm:h-32 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent flex items-center justify-center relative">
                <Home className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500/40" />
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                    apt.status === 'available' 
                      ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                      : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}>
                    {apt.status === 'available' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Beschikbaar</>
                    ) : (
                      <><Home className="w-3 h-3" /> Bezet</>
                    )}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{apt.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{apt.address}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
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
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setSelectedApartment(apt); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
                    <Bed className="w-3.5 h-3.5" />
                    <span>{apt.bedrooms}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
                    <Bath className="w-3.5 h-3.5" />
                    <span>{apt.bathrooms}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border/50">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Huur per maand</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600">
                      {formatCurrency(apt.rent_amount)}
                    </p>
                  </div>
                  {apt.tenant_name && (
                    <div className="text-right min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Huurder</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[100px] sm:max-w-[120px]">{apt.tenant_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 border-dashed">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">
              {search || statusFilter !== 'all' ? 'Geen appartementen gevonden' : 'Nog geen appartementen'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm">
              {search || statusFilter !== 'all' 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Voeg uw eerste appartement toe om te beginnen met het beheren van uw vastgoed'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Eerste Appartement Toevoegen
              </Button>
            )}
          </div>
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
