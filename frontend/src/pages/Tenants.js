import { useState, useEffect, useCallback } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, getTenantBalance, formatCurrency } from '../lib/api';
import api from '../lib/api';
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
  Eye,
  Key,
  Send,
  Loader2
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
  DialogDescription,
  DialogFooter,
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
  const [showPortalDialog, setShowPortalDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [creatingPortal, setCreatingPortal] = useState(false);
  const [tenantAccounts, setTenantAccounts] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
  });

  useEffect(() => {
    fetchTenants();
    fetchTenantAccounts();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchTenants();
      fetchTenantAccounts();
    };
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

  const fetchTenantAccounts = async () => {
    try {
      const response = await api.get('/tenants/portal-accounts');
      // Create a map of tenant_id -> account status
      const accountMap = {};
      response.data.forEach(acc => {
        accountMap[acc.tenant_id] = acc;
      });
      setTenantAccounts(accountMap);
    } catch (error) {
      // Ignore error - endpoint might not exist yet
      console.log('Could not fetch tenant accounts');
    }
  };

  const handleCreatePortalAccount = async () => {
    if (!portalPassword || portalPassword.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }
    
    setCreatingPortal(true);
    try {
      await api.post('/tenants/create-portal-account', {
        tenant_id: selectedTenant.id,
        password: portalPassword
      });
      toast.success(`Portaal account aangemaakt voor ${selectedTenant.name}! Login: ${selectedTenant.email}`);
      setShowPortalDialog(false);
      setPortalPassword('');
      setSelectedTenant(null);
      fetchTenantAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken account');
    } finally {
      setCreatingPortal(false);
    }
  };

  const handleOpenPortalDialog = (tenant) => {
    if (!tenant.email) {
      toast.error('Deze huurder heeft geen e-mailadres. Voeg eerst een e-mailadres toe.');
      return;
    }
    setSelectedTenant(tenant);
    setPortalPassword('');
    setShowPortalDialog(true);
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
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Huurders laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="tenants-page">
      {/* Hero Header - Same style as Dashboard */}
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
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{totalTenants} huurders</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Huurders Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer uw huurders en bekijk hun saldo's
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            size="sm"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
            data-testid="add-tenant-btn"
          >
            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nieuwe Huurder
          </Button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Tenants - Featured Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Totaal Huurders</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{totalTenants}</p>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
          </div>
        </div>

        {/* Active Tenants Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Actieve Huurders</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{totalTenants}</p>
              <p className="text-xs text-muted-foreground mt-1">100% actief</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* This Month Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Deze Maand</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">+{tenants.length > 0 ? 1 : 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Nieuwe huurders</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
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
              placeholder="Zoek op naam of telefoon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="search-tenants"
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tenants Display */}
      {filteredTenants.length > 0 ? (
        viewMode === 'grid' ? (
          // Grid View - Responsive
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTenants.map((tenant) => (
              <div 
                key={tenant.id} 
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
                data-testid={`tenant-card-${tenant.id}`}
              >
                {/* Card Header with Avatar */}
                <div className="p-4 sm:p-5 pb-3 sm:pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                          <span className="text-lg sm:text-xl font-bold text-emerald-600">
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm sm:text-lg truncate">{tenant.name}</h3>
                          {tenantAccounts[tenant.id] && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px] sm:text-xs flex-shrink-0">
                              <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Portaal
                            </Badge>
                          )}
                        </div>
                        {tenant.id_number && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <IdCard className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] sm:text-xs text-muted-foreground">{tenant.id_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                          {tenantAccounts[tenant.id] ? (
                            <DropdownMenuItem disabled className="text-emerald-600">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Heeft Portaal Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleOpenPortalDialog(tenant)}>
                              <Key className="w-4 h-4 mr-2" />
                              Portaal Account Aanmaken
                            </DropdownMenuItem>
                          )}
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
                <div className="px-4 sm:px-5 pb-3 sm:pb-4 space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </div>
                    <span className="text-foreground truncate">{tenant.phone}</span>
                  </div>
                  {tenant.email && (
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      </div>
                      <span className="text-foreground truncate">{tenant.email}</span>
                    </div>
                  )}
                  {tenant.address && (
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      </div>
                      <span className="text-foreground truncate">{tenant.address}</span>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-muted/30 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm justify-between group/btn hover:bg-emerald-500/10 hover:text-emerald-600"
                    onClick={() => handleViewBalance(tenant)}
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Bekijk Saldo
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
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
                              <DropdownMenuSeparator />
                              {tenantAccounts[tenant.id] ? (
                                <DropdownMenuItem disabled className="text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Heeft Portaal Account
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleOpenPortalDialog(tenant)}>
                                  <Key className="w-4 h-4 mr-2" />
                                  Portaal Account Aanmaken
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
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

      {/* Portal Account Dialog */}
      <Dialog open={showPortalDialog} onOpenChange={setShowPortalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" />
              Portaal Account Aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een account aan zodat {selectedTenant?.name} kan inloggen op het huurders portaal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span className="font-medium">{selectedTenant?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{selectedTenant?.email}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="portal-password">Wachtwoord voor huurder *</Label>
              <Input
                id="portal-password"
                type="password"
                placeholder="Minimaal 6 tekens"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                De huurder kan inloggen op <strong>/huurder</strong> met dit wachtwoord
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPortalDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleCreatePortalAccount}
              disabled={creatingPortal || !portalPassword || portalPassword.length < 6}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {creatingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
              Account Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
