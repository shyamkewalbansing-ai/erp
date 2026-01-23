import { useState, useEffect } from 'react';
import { 
  getPayments, 
  createPayment, 
  deletePayment, 
  getTenants,
  getApartments,
  getTenantOutstanding,
  downloadReceipt,
  formatCurrency 
} from '../lib/api';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Plus, 
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Calendar,
  FileText,
  AlertTriangle
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../components/ui/alert';

const PAYMENT_TYPES = [
  { value: 'rent', label: 'Huur' },
  { value: 'deposit', label: 'Borg' },
  { value: 'other', label: 'Overig' },
];

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maart' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Augustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [outstandingInfo, setOutstandingInfo] = useState(null);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    apartment_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'rent',
    description: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, tenantsRes, apartmentsRes] = await Promise.all([
        getPayments(),
        getTenants(),
        getApartments()
      ]);
      setPayments(paymentsRes.data);
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
        period_month: formData.payment_type === 'rent' ? parseInt(formData.period_month) : null,
        period_year: formData.payment_type === 'rent' ? parseInt(formData.period_year) : null,
      };

      await createPayment(data);
      toast.success('Betaling geregistreerd');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePayment(selectedPayment.id);
      toast.success('Betaling verwijderd');
      setShowDeleteDialog(false);
      setSelectedPayment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      const response = await downloadReceipt(payment.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kwitantie_${payment.id.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Kwitantie gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden kwitantie');
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      apartment_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'rent',
      description: '',
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
    });
    setOutstandingInfo(null);
  };

  // Get tenant's apartment and outstanding info
  const handleTenantChange = async (tenantId) => {
    setFormData({ ...formData, tenant_id: tenantId, apartment_id: '' });
    setOutstandingInfo(null);
    
    const apt = apartments.find(a => a.tenant_id === tenantId);
    if (apt) {
      setFormData(prev => ({ 
        ...prev, 
        tenant_id: tenantId, 
        apartment_id: apt.id,
        amount: apt.rent_amount.toString()
      }));
      
      // Fetch outstanding info
      setLoadingOutstanding(true);
      try {
        const response = await getTenantOutstanding(tenantId);
        setOutstandingInfo(response.data);
        
        // If there are outstanding months, suggest the oldest one
        if (response.data.outstanding_months?.length > 0) {
          const oldest = response.data.outstanding_months[0];
          setFormData(prev => ({
            ...prev,
            period_month: oldest.month,
            period_year: oldest.year
          }));
        }
      } catch (error) {
        console.error('Error fetching outstanding info:', error);
      } finally {
        setLoadingOutstanding(false);
      }
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.apartment_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Generate year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payments-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Betalingen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registreer en beheer betalingen
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-full bg-primary hover:bg-primary/90"
          data-testid="add-payment-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Betaling registreren
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
            data-testid="search-payments"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {PAYMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      {filteredPayments.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Huurder</TableHead>
                <TableHead>Appartement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {payment.payment_date}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{payment.tenant_name}</TableCell>
                  <TableCell>{payment.apartment_name}</TableCell>
                  <TableCell>
                    <span className={`status-badge ${payment.payment_type === 'rent' ? 'status-paid' : 'bg-muted text-muted-foreground'}`}>
                      {PAYMENT_TYPES.find(t => t.value === payment.payment_type)?.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {payment.period_month && payment.period_year 
                      ? `${MONTHS.find(m => m.value === payment.period_month)?.label} ${payment.period_year}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadReceipt(payment)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download kwitantie
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => { setSelectedPayment(payment); setShowDeleteDialog(true); }}
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
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen betalingen gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search || typeFilter !== 'all' 
              ? 'Probeer andere filters' 
              : 'Registreer uw eerste betaling'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Betaling registreren
            </Button>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe betaling</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Huurder *</Label>
              <Select 
                value={formData.tenant_id} 
                onValueChange={handleTenantChange}
              >
                <SelectTrigger data-testid="payment-tenant-select">
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

            {/* Outstanding Balance Warning */}
            {loadingOutstanding && (
              <div className="text-sm text-muted-foreground">Openstaand saldo controleren...</div>
            )}
            {outstandingInfo?.has_outstanding && formData.payment_type === 'rent' && (
              <Alert variant="destructive" className="bg-orange-50 border-orange-200" data-testid="outstanding-warning">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Openstaand saldo</AlertTitle>
                <AlertDescription className="text-orange-700">
                  <p className="mb-2">
                    Deze huurder heeft <strong>{outstandingInfo.outstanding_months.length} openstaande maand(en)</strong>.
                  </p>
                  <p className="mb-2">
                    Totaal openstaand: <strong>{formatCurrency(outstandingInfo.outstanding_amount)}</strong>
                  </p>
                  <p className="text-sm">
                    Oudste onbetaalde maand: <strong>{outstandingInfo.outstanding_months[0]?.label}</strong>
                  </p>
                  {outstandingInfo.outstanding_months.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-orange-200">
                      <p className="text-xs font-medium mb-1">Openstaande maanden:</p>
                      <div className="flex flex-wrap gap-1">
                        {outstandingInfo.outstanding_months.slice(0, 6).map((m, i) => (
                          <span 
                            key={i} 
                            className={`text-xs px-2 py-0.5 rounded ${
                              m.month === formData.period_month && m.year === formData.period_year
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {m.label}
                          </span>
                        ))}
                        {outstandingInfo.outstanding_months.length > 6 && (
                          <span className="text-xs text-orange-600">+{outstandingInfo.outstanding_months.length - 6} meer</span>
                        )}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Appartement *</Label>
              <Select 
                value={formData.apartment_id} 
                onValueChange={(value) => setFormData({ ...formData, apartment_id: value })}
              >
                <SelectTrigger data-testid="payment-apartment-select">
                  <SelectValue placeholder="Selecteer appartement" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name} - {formatCurrency(apt.rent_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type betaling *</Label>
              <Select 
                value={formData.payment_type} 
                onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
              >
                <SelectTrigger data-testid="payment-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.payment_type === 'rent' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maand {outstandingInfo?.has_outstanding && <span className="text-orange-600 text-xs">(oudste geselecteerd)</span>}</Label>
                  <Select 
                    value={formData.period_month.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, period_month: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="payment-month-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                          {outstandingInfo?.outstanding_months?.some(
                            m => m.month === month.value && m.year === formData.period_year
                          ) && ' ⚠️'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jaar</Label>
                  <Select 
                    value={formData.period_year.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, period_year: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="payment-year-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                            {outstandingInfo?.outstanding_months?.some(
                              m => m.year === year && m.month === formData.period_month
                            ) && ' ⚠️'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
                data-testid="payment-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Betalingsdatum *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
                data-testid="payment-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Extra notities..."
                rows={2}
                data-testid="payment-description-input"
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
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-payment-btn">
                Registreren
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Betaling verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze betaling wilt verwijderen? 
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
