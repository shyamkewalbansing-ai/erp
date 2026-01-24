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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leningen-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-7 h-7 text-primary" />
            Leningen
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer leningen aan huurders
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-loan-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Lening
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal Uitgeleend</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalAmount)}</p>
              </div>
              <Banknote className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Terugbetaald</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRemaining)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actieve Leningen</p>
                <p className="text-2xl font-bold text-foreground">{summary.open + summary.partial}</p>
                <p className="text-xs text-muted-foreground">{summary.paid} afbetaald</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Zoek op huurder of omschrijving..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="loan-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="loan-status-filter">
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

      {/* Loans Table */}
      {filteredLoans.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                          className="text-destructive"
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
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Banknote className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen leningen gevonden</h3>
          <p className="text-muted-foreground">
            {search || statusFilter !== 'all' 
              ? 'Probeer andere filters' 
              : 'Klik op "Nieuwe Lening" om een lening toe te voegen'}
          </p>
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
