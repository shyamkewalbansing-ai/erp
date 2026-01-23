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
  FileText
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="deposits-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Borg</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer borgbetalingen en terugbetalingen
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-full bg-primary hover:bg-primary/90"
          data-testid="add-deposit-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Borg registreren
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op huurder of appartement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-transparent"
            data-testid="search-deposits"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
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

      {/* Deposits Table */}
      {filteredDeposits.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                      <span className={`status-badge flex items-center gap-1 ${statusInfo.color}`}>
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
                          <DropdownMenuItem 
                            className="text-destructive"
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
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen borgbetalingen gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all' 
              ? 'Probeer andere filters' 
              : 'Registreer uw eerste borgbetaling'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Borg registreren
            </Button>
          )}
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
