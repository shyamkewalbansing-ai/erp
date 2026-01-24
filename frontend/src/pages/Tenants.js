import { useState, useEffect, useCallback } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, getTenantBalance, formatCurrency } from '../lib/api';
import { triggerRefresh, REFRESH_EVENTS } from '../lib/refreshEvents';
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
  UserPlus,
  Filter,
  Grid3X3,
  List,
  Building2,
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  User,
  IdCard,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
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

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => fetchTenants();
    window.addEventListener(REFRESH_EVENTS.TENANTS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.TENANTS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    };
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
      // Trigger refresh for other components
      triggerRefresh(REFRESH_EVENTS.TENANTS);
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
    setSelectedTenant(tenant);
    setShowBalanceModal(true);
    setLoadingBalance(true);
    try {
      const response = await getTenantBalance(tenant.id);
      setBalanceData(response.data);
    } catch (error) {
      toast.error('Fout bij laden saldo');
    } finally {
      setLoadingBalance(false);
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

  // Stats
  const totalTenants = tenants.length;

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Huurders
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw huurders en bekijk hun saldo's
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="h-11 px-5 shadow-lg shadow-primary/20"
          data-testid="add-tenant-btn"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nieuwe Huurder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal Huurders</p>
                <p className="text-2xl font-bold text-foreground">{totalTenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actieve Huurders</p>
                <p className="text-2xl font-bold text-foreground">{totalTenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deze Maand</p>
                <p className="text-2xl font-bold text-foreground">+{tenants.length > 0 ? 1 : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam of telefoon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-muted/30 border-transparent focus:border-primary"
                data-testid="search-tenants"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="icon"
                className="h-11 w-11"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="icon"
                className="h-11 w-11"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Display */}
      {filteredTenants.length > 0 ? (
        viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => (
              <Card 
                key={tenant.id} 
                className="border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group overflow-hidden"
                data-testid={`tenant-card-${tenant.id}`}
              >
                <CardContent className="p-0">
                  {/* Card Header with Avatar */}
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-xl font-bold text-primary">
                              {tenant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">{tenant.name}</h3>
                          {tenant.id_number && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <IdCard className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{tenant.id_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewBalance(tenant)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Bekijk Saldo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setSelectedTenant(tenant); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="px-5 pb-4 space-y-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-foreground">{tenant.phone}</span>
                    </div>
                    {tenant.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-foreground truncate">{tenant.email}</span>
                      </div>
                    )}
                    {tenant.address && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-foreground truncate">{tenant.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="px-5 py-3 bg-muted/30 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      className="w-full h-9 text-sm justify-between group/btn hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleViewBalance(tenant)}
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Bekijk Saldo
                      </span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Huurder</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Adres</th>
                    <th className="text-left p-4 font-semibold text-sm text-muted-foreground">ID Nummer</th>
                    <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr 
                      key={tenant.id} 
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      data-testid={`tenant-row-${tenant.id}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="font-semibold text-primary">
                              {tenant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{tenant.phone}</span>
                          </div>
                          {tenant.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[180px]">{tenant.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {tenant.address || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {tenant.id_number || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8"
                            onClick={() => handleViewBalance(tenant)}
                          >
                            <Wallet className="w-4 h-4 mr-1.5" />
                            Saldo
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        // Empty State
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {search ? 'Geen huurders gevonden' : 'Nog geen huurders'}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {search 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Voeg uw eerste huurder toe om te beginnen met het beheren van uw verhuuradministratie'}
            </p>
            {!search && (
              <Button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="shadow-lg shadow-primary/20"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Eerste Huurder Toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedTenant ? (
                <>
                  <Edit className="w-5 h-5 text-primary" />
                  Huurder Bewerken
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-primary" />
                  Nieuwe Huurder
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Volledige naam *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Volledige naam"
                  required
                  className="pl-10 h-11"
                  data-testid="tenant-name-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefoon *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+597 123 4567"
                    required
                    className="pl-10 h-11"
                    data-testid="tenant-phone-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number" className="text-sm font-medium">ID Nummer</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    placeholder="Identificatienummer"
                    className="pl-10 h-11"
                    data-testid="tenant-id-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@voorbeeld.com"
                  className="pl-10 h-11"
                  data-testid="tenant-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">Adres</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Straat, stad"
                  className="pl-10 h-11"
                  data-testid="tenant-address-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 h-11"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 h-11" data-testid="save-tenant-btn">
                {selectedTenant ? 'Wijzigingen Opslaan' : 'Huurder Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Huurder Verwijderen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u <strong>{selectedTenant?.name}</strong> wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt en alle bijbehorende gegevens worden verwijderd.
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              Saldo Overzicht
            </DialogTitle>
          </DialogHeader>
          
          {loadingBalance ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : balanceData && (
            <div className="space-y-6 mt-4">
              {/* Tenant Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedTenant?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedTenant?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTenant?.phone}</p>
                </div>
              </div>

              {balanceData.apartment ? (
                <>
                  {/* Apartment Info */}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{balanceData.apartment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Huur: {formatCurrency(balanceData.apartment.rent_amount)} / maand
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Totaal Verschuldigd</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(balanceData.total_due)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Totaal Betaald</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(balanceData.total_paid)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${
                      balanceData.balance > 0 ? 'bg-red-500/10' : 'bg-green-500/10'
                    }`}>
                      <p className="text-sm text-muted-foreground mb-1">Openstaand</p>
                      <p className={`text-2xl font-bold ${
                        balanceData.balance > 0 ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {formatCurrency(balanceData.balance)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/10 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Borg</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {balanceData.deposit ? formatCurrency(balanceData.deposit.amount) : formatCurrency(0)}
                      </p>
                      {balanceData.deposit && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {balanceData.deposit.deposit_date}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
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
