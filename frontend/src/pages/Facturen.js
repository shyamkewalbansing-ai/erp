import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTenants, getApartments, formatCurrency } from '../lib/api';
import api from '../lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  HandCoins,
  Wrench,
  Receipt,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export default function Facturen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [search, setSearch] = useState('');
  
  // Current selected year/month
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null); // null = show year overview
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    tenant_id: '',
    apartment_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'rent',
    period_month: currentDate.getMonth() + 1,
    period_year: currentDate.getFullYear(),
    description: ''
  });
  
  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tenantsRes, apartmentsRes, paymentsRes, loansRes, maintenanceRes] = await Promise.all([
        api.get('/tenants'),
        api.get('/apartments'),
        api.get('/payments'),
        api.get('/loans'),
        api.get('/maintenance')
      ]);
      setTenants(tenantsRes.data);
      setApartments(apartmentsRes.data);
      setPayments(paymentsRes.data);
      setLoans(loansRes.data || []);
      setMaintenance(maintenanceRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Get available years (from first payment to current year + 1)
  const getAvailableYears = () => {
    const years = new Set([currentDate.getFullYear()]);
    payments.forEach(p => {
      if (p.period_year) years.add(p.period_year);
      try {
        const year = new Date(p.payment_date).getFullYear();
        years.add(year);
      } catch {}
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Get tenant's apartment and rent
  const getTenantApartment = (tenantId) => {
    return apartments.find(a => a.tenant_id === tenantId);
  };

  // Calculate invoice data for a tenant for a specific month
  const getInvoiceData = (tenantId, year, month) => {
    const apt = getTenantApartment(tenantId);
    const rentAmount = apt?.rent_amount || 0;
    
    // Get rent payments for this period
    const rentPayments = payments.filter(p => 
      p.tenant_id === tenantId && 
      p.payment_type === 'rent' &&
      p.period_month === month &&
      p.period_year === year
    );
    
    const totalPaid = rentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, rentAmount - totalPaid);
    
    // Get maintenance costs for tenant this month
    const tenantMaintenance = maintenance.filter(m => 
      m.tenant_id === tenantId &&
      m.cost_type === 'tenant'
    ).filter(m => {
      try {
        const mDate = new Date(m.date);
        return mDate.getMonth() + 1 === month && mDate.getFullYear() === year;
      } catch { return false; }
    });
    const maintenanceCost = tenantMaintenance.reduce((sum, m) => sum + m.cost, 0);
    
    // Get loan payments this month
    const tenantLoans = loans.filter(l => l.tenant_id === tenantId);
    const loanPayments = payments.filter(p => 
      p.tenant_id === tenantId &&
      p.payment_type === 'loan'
    ).filter(p => {
      try {
        const pDate = new Date(p.payment_date);
        return pDate.getMonth() + 1 === month && pDate.getFullYear() === year;
      } catch { return false; }
    });
    
    // Calculate loan balance
    const totalLoanAmount = tenantLoans.reduce((sum, l) => sum + l.amount, 0);
    const totalLoanPaid = payments.filter(p => 
      p.tenant_id === tenantId && p.payment_type === 'loan'
    ).reduce((sum, p) => sum + p.amount, 0);
    const loanBalance = Math.max(0, totalLoanAmount - totalLoanPaid);
    
    // Status
    let status = 'unpaid';
    if (totalPaid >= rentAmount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }
    
    return {
      rentAmount,
      totalPaid,
      remaining,
      maintenanceCost,
      loanBalance,
      loanPaymentsThisMonth: loanPayments.reduce((sum, p) => sum + p.amount, 0),
      status,
      payments: rentPayments,
      maintenanceRecords: tenantMaintenance
    };
  };

  // Calculate cumulative balance up to a certain month
  const getCumulativeBalance = (tenantId, year, month) => {
    const apt = getTenantApartment(tenantId);
    const rentAmount = apt?.rent_amount || 0;
    
    let totalDue = 0;
    let totalPaid = 0;
    
    // Calculate for all months up to and including selected month
    for (let y = selectedYear; y <= year; y++) {
      const startMonth = y === selectedYear ? 1 : 1;
      const endMonth = y === year ? month : 12;
      
      for (let m = startMonth; m <= endMonth; m++) {
        totalDue += rentAmount;
        
        const monthPayments = payments.filter(p => 
          p.tenant_id === tenantId && 
          p.payment_type === 'rent' &&
          p.period_month === m &&
          p.period_year === y
        );
        totalPaid += monthPayments.reduce((sum, p) => sum + p.amount, 0);
      }
    }
    
    return {
      totalDue,
      totalPaid,
      balance: totalDue - totalPaid
    };
  };

  // Get tenants with apartments (active renters)
  const activeTenantsData = tenants
    .filter(t => getTenantApartment(t.id))
    .filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      getTenantApartment(t.id)?.name.toLowerCase().includes(search.toLowerCase())
    )
    .map(tenant => {
      const apt = getTenantApartment(tenant.id);
      return {
        ...tenant,
        apartment: apt,
        rentAmount: apt?.rent_amount || 0
      };
    });

  // Get months to display - includes future months if there are payments for them
  const getDisplayMonths = () => {
    // Start with current month as minimum
    let maxMonth = selectedYear === currentDate.getFullYear() 
      ? currentDate.getMonth() + 1 
      : 12;
    
    // Check if there are payments for future months (vooruit betaald)
    if (selectedYear === currentDate.getFullYear()) {
      payments.forEach(p => {
        if (p.period_year === selectedYear && p.period_month > maxMonth) {
          maxMonth = Math.min(12, p.period_month);
        }
      });
    }
    
    // For past years, show all 12 months
    if (selectedYear < currentDate.getFullYear()) {
      maxMonth = 12;
    }
    
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  };

  // Calculate year summary
  const yearSummary = () => {
    let totalDue = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    
    const displayMonths = getDisplayMonths();
    
    activeTenantsData.forEach(tenant => {
      displayMonths.forEach(month => {
        const data = getInvoiceData(tenant.id, selectedYear, month);
        totalDue += data.rentAmount;
        totalPaid += data.totalPaid;
        
        if (data.status === 'paid') paidCount++;
        else if (data.status === 'partial') partialCount++;
        else unpaidCount++;
      });
    });
    
    return { totalDue, totalPaid, balance: totalDue - totalPaid, paidCount, partialCount, unpaidCount };
  };

  const summary = yearSummary();

  // Open detail modal
  const openDetail = (tenant, year, month) => {
    setSelectedTenant(tenant);
    setSelectedPeriod({ year, month });
    setShowDetail(true);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Betaald</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />Gedeeltelijk</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />Openstaand</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="facturen-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Facturen Overzicht
          </h1>
          <p className="text-muted-foreground mt-1">
            Maandelijks overzicht van alle huurbetalingen
          </p>
        </div>
        
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSelectedYear(y => y - 1)}
            disabled={selectedYear <= 2020}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]" data-testid="year-selector">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableYears().map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSelectedYear(y => y + 1)}
            disabled={selectedYear >= currentDate.getFullYear() + 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal Verschuldigd</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalDue)}</p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal Ontvangen</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.balance)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Betaald</p>
                <p className="text-2xl font-bold text-green-600">{summary.paidCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">{summary.unpaidCount + summary.partialCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Zoek op huurder of appartement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="invoice-search"
          />
        </div>
      </div>

      {/* Months Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {getDisplayMonths().map(month => {
          // Calculate month totals
          let monthPaid = 0;
          let monthDue = 0;
          let monthPaidCount = 0;
          let monthUnpaidCount = 0;
          
          activeTenantsData.forEach(tenant => {
            const data = getInvoiceData(tenant.id, selectedYear, month);
            monthDue += data.rentAmount;
            monthPaid += data.totalPaid;
            if (data.status === 'paid') monthPaidCount++;
            else monthUnpaidCount++;
          });
          
          const isCurrentMonth = selectedYear === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
          
          return (
            <Card 
              key={month} 
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                selectedMonth === month ? 'border-primary ring-2 ring-primary/20' : ''
              } ${isCurrentMonth ? 'bg-primary/5' : ''}`}
              onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
              data-testid={`month-card-${month}`}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">{MONTHS[month - 1]}</p>
                  <p className="text-lg font-bold text-foreground">{selectedYear}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600">Betaald:</span>
                      <span className="font-medium">{monthPaidCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">Open:</span>
                      <span className="font-medium">{monthUnpaidCount}</span>
                    </div>
                  </div>
                  {isCurrentMonth && (
                    <Badge variant="outline" className="mt-2 text-xs">Huidige maand</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Month Detail Table */}
      {selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {MONTHS[selectedMonth - 1]} {selectedYear} - Facturen per Huurder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTenantsData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Geen actieve huurders gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Huurder</th>
                      <th className="text-left p-3 font-medium">Appartement</th>
                      <th className="text-right p-3 font-medium">Huur</th>
                      <th className="text-right p-3 font-medium">Betaald</th>
                      <th className="text-right p-3 font-medium">Openstaand</th>
                      <th className="text-right p-3 font-medium">Cum. Saldo</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeTenantsData.map(tenant => {
                      const data = getInvoiceData(tenant.id, selectedYear, selectedMonth);
                      const cumulative = getCumulativeBalance(tenant.id, selectedYear, selectedMonth);
                      
                      return (
                        <tr key={tenant.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{tenant.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span>{tenant.apartment?.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium">{formatCurrency(data.rentAmount)}</td>
                          <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(data.totalPaid)}</td>
                          <td className="p-3 text-right text-orange-600 font-medium">{formatCurrency(data.remaining)}</td>
                          <td className={`p-3 text-right font-bold ${cumulative.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {cumulative.balance > 0 ? '-' : ''}{formatCurrency(Math.abs(cumulative.balance))}
                          </td>
                          <td className="p-3 text-center">{getStatusBadge(data.status)}</td>
                          <td className="p-3 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openDetail(tenant, selectedYear, selectedMonth)}
                              data-testid={`detail-btn-${tenant.id}`}
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Year Overview Table (when no month selected) */}
      {!selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Jaaroverzicht {selectedYear} - Alle Huurders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium sticky left-0 bg-muted/50">Huurder</th>
                    {getDisplayMonths().map(month => (
                      <th key={month} className="text-center p-2 font-medium min-w-[80px]">
                        {MONTHS[month - 1].substring(0, 3)}
                      </th>
                    ))}
                    <th className="text-right p-2 font-medium">Totaal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeTenantsData.map(tenant => {
                    let yearTotal = 0;
                    let yearPaid = 0;
                    
                    return (
                      <tr key={tenant.id} className="hover:bg-muted/30">
                        <td className="p-2 sticky left-0 bg-card">
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate max-w-[120px]" title={tenant.name}>
                              {tenant.name}
                            </span>
                          </div>
                        </td>
                        {getDisplayMonths().map(month => {
                          const data = getInvoiceData(tenant.id, selectedYear, month);
                          yearTotal += data.rentAmount;
                          yearPaid += data.totalPaid;
                          
                          return (
                            <td 
                              key={month} 
                              className="p-2 text-center cursor-pointer hover:bg-primary/10 rounded"
                              onClick={() => openDetail(tenant, selectedYear, month)}
                            >
                              <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center ${
                                data.status === 'paid' ? 'bg-green-100 text-green-700' :
                                data.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {data.status === 'paid' ? '✓' : data.status === 'partial' ? '½' : '○'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-right">
                          <div className="text-xs">
                            <span className="text-green-600">{formatCurrency(yearPaid)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span>{formatCurrency(yearTotal)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs">✓</span>
                Betaald
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs">½</span>
                Gedeeltelijk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs">○</span>
                Openstaand
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Factuur Details - {selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTenant && selectedPeriod && (
            <div className="space-y-4">
              {(() => {
                const data = getInvoiceData(selectedTenant.id, selectedPeriod.year, selectedPeriod.month);
                const cumulative = getCumulativeBalance(selectedTenant.id, selectedPeriod.year, selectedPeriod.month);
                
                return (
                  <>
                    {/* Period Info */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Periode</p>
                          <p className="text-lg font-bold">{MONTHS[selectedPeriod.month - 1]} {selectedPeriod.year}</p>
                        </div>
                        {getStatusBadge(data.status)}
                      </div>
                    </div>
                    
                    {/* Tenant & Apartment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="font-medium">Huurder</span>
                        </div>
                        <p className="text-lg">{selectedTenant.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedTenant.email}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">Appartement</span>
                        </div>
                        <p className="text-lg">{selectedTenant.apartment?.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedTenant.apartment?.address}</p>
                      </div>
                    </div>
                    
                    {/* Amounts */}
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-muted/30 rounded">
                        <span>Maandelijkse Huur</span>
                        <span className="font-medium">{formatCurrency(data.rentAmount)}</span>
                      </div>
                      {data.maintenanceCost > 0 && (
                        <div className="flex justify-between p-3 bg-orange-50 rounded">
                          <span className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-orange-600" />
                            Onderhoudskosten (huurder)
                          </span>
                          <span className="font-medium text-orange-600">{formatCurrency(data.maintenanceCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-3 bg-green-50 rounded">
                        <span>Betaald</span>
                        <span className="font-medium text-green-600">- {formatCurrency(data.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-primary/10 rounded font-bold">
                        <span>Openstaand deze maand</span>
                        <span className={data.remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {formatCurrency(data.remaining)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Cumulative Balance */}
                    <div className="p-4 border-2 border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Cumulatief saldo t/m {MONTHS[selectedPeriod.month - 1]} {selectedPeriod.year}</p>
                      <div className="flex justify-between items-center">
                        <span>Totaal verschuldigd: {formatCurrency(cumulative.totalDue)}</span>
                        <span>Totaal betaald: {formatCurrency(cumulative.totalPaid)}</span>
                      </div>
                      <div className={`text-center text-2xl font-bold mt-2 ${cumulative.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {cumulative.balance > 0 ? 'Achterstallig: ' : 'Vooruit betaald: '}
                        {formatCurrency(Math.abs(cumulative.balance))}
                      </div>
                    </div>
                    
                    {/* Loan Info */}
                    {data.loanBalance > 0 && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <HandCoins className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-600">Openstaande Lening</span>
                        </div>
                        <p className="text-lg font-bold text-purple-600">{formatCurrency(data.loanBalance)}</p>
                        {data.loanPaymentsThisMonth > 0 && (
                          <p className="text-sm text-purple-500">
                            Deze maand afgelost: {formatCurrency(data.loanPaymentsThisMonth)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Payment History */}
                    {data.payments.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Betalingen deze maand</p>
                        <div className="space-y-2">
                          {data.payments.map((payment, idx) => (
                            <div key={idx} className="flex justify-between p-2 bg-muted/30 rounded text-sm">
                              <span>{payment.payment_date}</span>
                              <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
