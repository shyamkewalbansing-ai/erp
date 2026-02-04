import { useState, useEffect } from 'react';
import { 
  getLoans, 
  createLoan, 
  updateLoan,
  deleteLoan, 
  getTenants,
  formatCurrency 
} from '../lib/api';
import { triggerRefresh, REFRESH_EVENTS } from '../lib/refreshEvents';
import { toast } from 'sonner';
import { 
  Banknote, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Clock
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
import { Card, CardContent } from '../components/ui/card';

export default function Leningen() {
  const [loans, setLoans] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [formData, setFormData] = useState({
    tenant_id: '',
    amount: '',
    description: '',
    loan_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener(REFRESH_EVENTS.LOANS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.LOANS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [loansRes, tenantsRes] = await Promise.all([
        getLoans(),
        getTenants()
      ]);
      setLoans(loansRes.data);
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
        amount: parseFloat(formData.amount),
      };

      if (selectedLoan) {
        await updateLoan(selectedLoan.id, data);
        toast.success('Lening bijgewerkt');
      } else {
        await createLoan(data);
        toast.success('Lening toegevoegd');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
      // Trigger refresh for other components
      triggerRefresh(REFRESH_EVENTS.LOANS);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLoan(selectedLoan.id);
      toast.success('Lening verwijderd');
      setShowDeleteDialog(false);
      setSelectedLoan(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const openEditModal = (loan) => {
    setSelectedLoan(loan);
    setFormData({
      tenant_id: loan.tenant_id,
      amount: loan.amount.toString(),
      description: loan.description || '',
      loan_date: loan.loan_date,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedLoan(null);
    setFormData({
      tenant_id: '',
      amount: '',
      description: '',
      loan_date: new Date().toISOString().split('T')[0],
    });
  };

  // Calculate summary
  const summary = {
    total: loans.length,
    totalAmount: loans.reduce((sum, l) => sum + l.amount, 0),
    totalPaid: loans.reduce((sum, l) => sum + l.amount_paid, 0),
    totalRemaining: loans.reduce((sum, l) => sum + l.remaining, 0),
    open: loans.filter(l => l.status === 'open').length,
    partial: loans.filter(l => l.status === 'partial').length,
    paid: loans.filter(l => l.status === 'paid').length,
  };

  // Filter loans
  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      loan.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-muted-foreground">Leningen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="leningen-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-orange-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-yellow-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-orange-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{summary.total} leningen</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Leningen Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer leningen aan huurders
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            size="sm"
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm"
            data-testid="add-loan-btn"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nieuwe Lening
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Loaned - Featured */}
        <div className="col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-4 sm:p-6 text-white shadow-xl shadow-orange-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs sm:text-sm font-medium mb-1">Totaal Uitgeleend</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatCurrency(summary.totalAmount)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Repaid */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Terugbetaald</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Openstaand</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRemaining)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Active Loans */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Actieve Leningen</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{summary.open + summary.partial}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.paid} afbetaald</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
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
              placeholder="Zoek op huurder of omschrijving..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="loan-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" data-testid="loan-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="partial">Gedeeltelijk</SelectItem>
              <SelectItem value="paid">Afbetaald</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loans Table */}
      {filteredLoans.length > 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-border/50">
            {filteredLoans.map((loan) => (
              <div key={loan.id} className="p-4" data-testid={`loan-row-${loan.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{loan.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{loan.loan_date}</p>
                  </div>
                  {loan.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Afbetaald
                    </span>
                  ) : loan.status === 'partial' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                      <Clock className="w-3 h-3" />
                      Gedeeltelijk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800">
                      <AlertCircle className="w-3 h-3" />
                      Open
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Bedrag</p>
                    <p className="text-sm font-semibold">{formatCurrency(loan.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Betaald</p>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(loan.amount_paid)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Open</p>
                    <p className="text-sm font-semibold text-orange-600">{formatCurrency(loan.remaining)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Huurder</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="text-right">Betaald</TableHead>
                  <TableHead className="text-right">Openstaand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id} data-testid={`loan-row-${loan.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{loan.tenant_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {loan.loan_date}
                      </div>
                    </TableCell>
                    <TableCell>{loan.description || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(loan.amount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(loan.amount_paid)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      {formatCurrency(loan.remaining)}
                    </TableCell>
                    <TableCell>
                      {loan.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Afbetaald
                        </span>
                      ) : loan.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3" />
                          Gedeeltelijk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <AlertCircle className="w-3 h-3" />
                          Open
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(loan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setSelectedLoan(loan); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 border-dashed">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
              <Banknote className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">
              {search || statusFilter !== 'all' ? 'Geen leningen gevonden' : 'Nog geen leningen'}
            </h3>
            <p className="text-muted-foreground text-center text-xs sm:text-sm">
              {search || statusFilter !== 'all' 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Klik op "Nieuwe Lening" om een lening toe te voegen'}
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedLoan ? 'Lening bewerken' : 'Nieuwe lening'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Huurder *</Label>
              <Select 
                value={formData.tenant_id} 
                onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
              >
                <SelectTrigger data-testid="loan-tenant-select">
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
              <Label htmlFor="amount">Bedrag (SRD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="loan-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan_date">Datum lening *</Label>
              <Input
                id="loan_date"
                type="date"
                value={formData.loan_date}
                onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                required
                data-testid="loan-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Reden voor lening..."
                rows={2}
                data-testid="loan-description-input"
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
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-loan-btn">
                {selectedLoan ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lening verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze lening wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
