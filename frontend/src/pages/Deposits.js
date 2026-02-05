import { useState, useEffect } from 'react';
import { 
  getDeposits, 
  createDeposit, 
  updateDeposit, 
  deleteDeposit, 
  getTenants,
  getApartments,
  downloadDepositRefund,
  formatCurrency 
} from '../lib/api';
import { toast } from 'sonner';
import { 
  Wallet, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCcw,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Banknote,
  TrendingUp
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const DEPOSIT_STATUSES = [
  { value: 'held', label: 'In beheer', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  { value: 'returned', label: 'Terugbetaald', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  { value: 'partial_returned', label: 'Deels terugbetaald', icon: RefreshCcw, color: 'text-orange-600 bg-orange-50' },
];

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [formData, setFormData] = useState({
    tenant_id: '',
    apartment_id: '',
    amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [returnData, setReturnData] = useState({
    return_amount: '',
    return_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [depositsRes, tenantsRes, apartmentsRes] = await Promise.all([
        getDeposits(),
        getTenants(),
        getApartments()
      ]);
      setDeposits(depositsRes.data);
      setTenants(tenantsRes.data);
      setApartments(apartmentsRes.data);
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
        amount: parseFloat(formData.amount),
        status: 'held',
      };

      await createDeposit(data);
      toast.success('Borg geregistreerd');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    try {
      const returnAmount = parseFloat(returnData.return_amount);
      const status = returnAmount >= selectedDeposit.amount ? 'returned' : 'partial_returned';
      
      await updateDeposit(selectedDeposit.id, {
        return_amount: returnAmount,
        return_date: returnData.return_date,
        status: status,
        notes: returnData.notes || selectedDeposit.notes,
      });
      
      toast.success('Borg bijgewerkt');
      setShowReturnModal(false);
      setSelectedDeposit(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeposit(selectedDeposit.id);
      toast.success('Borg verwijderd');
      setShowDeleteDialog(false);
      setSelectedDeposit(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const handleDownloadRefundPdf = async (deposit) => {
    try {
      const response = await downloadDepositRefund(deposit.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `borg_terugbetaling_${deposit.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij downloaden PDF');
    }
  };

  const openReturnModal = (deposit) => {
    setSelectedDeposit(deposit);
    setReturnData({
      return_amount: deposit.amount.toString(),
      return_date: new Date().toISOString().split('T')[0],
      notes: deposit.notes || '',
    });
    setShowReturnModal(true);
  };

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      apartment_id: '',
      amount: '',
      deposit_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Get tenant's apartment
  const handleTenantChange = (tenantId) => {
    setFormData({ ...formData, tenant_id: tenantId, apartment_id: '' });
    const apt = apartments.find(a => a.tenant_id === tenantId);
    if (apt) {
      setFormData(prev => ({ 
        ...prev, 
        tenant_id: tenantId, 
        apartment_id: apt.id,
      }));
    }
  };

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      deposit.apartment_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status) => {
    return DEPOSIT_STATUSES.find(s => s.value === status) || DEPOSIT_STATUSES[0];
  };

  // Calculate stats
  const totalDeposits = deposits.length;
  const heldDeposits = deposits.filter(d => d.status === 'held');
  const totalHeldAmount = heldDeposits.reduce((sum, d) => sum + d.amount, 0);
  const returnedDeposits = deposits.filter(d => d.status === 'returned' || d.status === 'partial_returned');
  const totalReturnedAmount = returnedDeposits.reduce((sum, d) => sum + (d.return_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Borg laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="deposits-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-purple-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-pink-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-purple-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{totalDeposits} borgbetalingen</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Borg Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer borgbetalingen en terugbetalingen
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            size="sm"
            className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm"
            data-testid="add-deposit-btn"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Borg Registreren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Held - Featured - Emerald color like Huurders */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">In Beheer</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatCurrency(totalHeldAmount)}</p>
              <p className="text-emerald-200 text-xs mt-1">{heldDeposits.length} actieve borgen</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Returned */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Terugbetaald</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(totalReturnedAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{returnedDeposits.length} terugbetalingen</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Totaal Geregistreerd</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{totalDeposits}</p>
              <p className="text-xs text-muted-foreground mt-1">Alle borgbetalingen</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
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
              placeholder="Zoek op huurder of appartement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="search-deposits"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {DEPOSIT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deposits Table */}
      {filteredDeposits.length > 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-border/50">
            {filteredDeposits.map((deposit) => {
              const statusInfo = getStatusInfo(deposit.status);
              const StatusIcon = statusInfo.icon;
              return (
                <div key={deposit.id} className="p-4" data-testid={`deposit-row-${deposit.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{deposit.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">{deposit.apartment_name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrag</p>
                      <p className="font-semibold text-foreground">{formatCurrency(deposit.amount)}</p>
                    </div>
                    {deposit.return_amount && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Terugbetaald</p>
                        <p className="font-semibold text-green-600">{formatCurrency(deposit.return_amount)}</p>
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {deposit.status === 'held' && (
                          <DropdownMenuItem onClick={() => openReturnModal(deposit)}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Borg terugbetalen
                          </DropdownMenuItem>
                        )}
                        {(deposit.status === 'returned' || deposit.status === 'partial_returned') && (
                          <DropdownMenuItem onClick={() => handleDownloadRefundPdf(deposit)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => { setSelectedDeposit(deposit); setShowDeleteDialog(true); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Huurder</TableHead>
                  <TableHead>Appartement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="text-right">Terugbetaald</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.map((deposit) => {
                  const statusInfo = getStatusInfo(deposit.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <TableRow key={deposit.id} data-testid={`deposit-row-${deposit.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {deposit.deposit_date}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{deposit.tenant_name}</TableCell>
                      <TableCell>{deposit.apartment_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(deposit.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {deposit.return_amount 
                          ? formatCurrency(deposit.return_amount)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {deposit.status === 'held' && (
                              <DropdownMenuItem onClick={() => openReturnModal(deposit)}>
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Borg terugbetalen
                              </DropdownMenuItem>
                            )}
                            {(deposit.status === 'returned' || deposit.status === 'partial_returned') && (
                              <DropdownMenuItem onClick={() => handleDownloadRefundPdf(deposit)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setSelectedDeposit(deposit); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 border-dashed">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
              <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">
              {search || statusFilter !== 'all' ? 'Geen borgbetalingen gevonden' : 'Nog geen borgbetalingen'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm">
              {search || statusFilter !== 'all' 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Registreer uw eerste borgbetaling om te beginnen'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="shadow-lg shadow-purple-500/20 bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Eerste Borg Registreren
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add Deposit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe borg</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Huurder *</Label>
              <Select 
                value={formData.tenant_id} 
                onValueChange={handleTenantChange}
              >
                <SelectTrigger data-testid="deposit-tenant-select">
                  <SelectValue placeholder="Selecteer huurder" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Appartement *</Label>
              <Select 
                value={formData.apartment_id} 
                onValueChange={(value) => setFormData({ ...formData, apartment_id: value })}
              >
                <SelectTrigger data-testid="deposit-apartment-select">
                  <SelectValue placeholder="Selecteer appartement" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Bedrag (SRD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="deposit-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit_date">Datum ontvangst *</Label>
              <Input
                id="deposit_date"
                type="date"
                value={formData.deposit_date}
                onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
                required
                data-testid="deposit-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Extra notities..."
                rows={2}
                data-testid="deposit-notes-input"
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
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-deposit-btn">
                Registreren
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Deposit Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Borg terugbetalen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Origineel borgbedrag</p>
              <p className="text-xl font-bold text-foreground">
                {selectedDeposit && formatCurrency(selectedDeposit.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return_amount">Terugbetaald bedrag (SRD) *</Label>
              <Input
                id="return_amount"
                type="number"
                step="0.01"
                min="0"
                max={selectedDeposit?.amount}
                value={returnData.return_amount}
                onChange={(e) => setReturnData({ ...returnData, return_amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="return-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                Bij gedeeltelijke terugbetaling wordt de status aangepast
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return_date">Datum terugbetaling *</Label>
              <Input
                id="return_date"
                type="date"
                value={returnData.return_date}
                onChange={(e) => setReturnData({ ...returnData, return_date: e.target.value })}
                required
                data-testid="return-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return_notes">Notities</Label>
              <Textarea
                id="return_notes"
                value={returnData.notes}
                onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                placeholder="Reden voor (gedeeltelijke) terugbetaling..."
                rows={2}
                data-testid="return-notes-input"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReturnModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="confirm-return-btn">
                Bevestigen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borg verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze borgregistratie wilt verwijderen? 
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
