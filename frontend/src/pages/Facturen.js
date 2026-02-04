import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/api';
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
  Plus,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  
  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
      } catch { /* ignore invalid dates */ }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Navigate to payments page and open modal
  const goToPayments = () => {
    navigate('/payments', { state: { openModal: true } });
  };

  // Download invoice PDF
  const handleDownloadPdf = async () => {
    if (!selectedTenant || !selectedPeriod) return;
    
    setDownloadingPdf(true);
    try {
      const response = await api.get(
        `/invoices/pdf/${selectedTenant.id}/${selectedPeriod.year}/${selectedPeriod.month}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Factuur_${selectedTenant.name.replace(/\s/g, '_')}_${MONTHS[selectedPeriod.month - 1]}_${selectedPeriod.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden PDF');
    } finally {
      setDownloadingPdf(false);
    }
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
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Facturen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="facturen-page">
      {/* Hero Header - Same style as Dashboard */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs */}
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-teal-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3 sm:mb-4">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{selectedYear}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
                Facturen Overzicht
              </h1>
              <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
                Maandelijks overzicht van alle huurbetalingen
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Button 
                onClick={goToPayments}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm flex-1 sm:flex-none"
                data-testid="add-payment-btn-facturen"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Betaling Registreren</span>
                <span className="xs:hidden">Betaling</span>
              </Button>
              
              <div className="flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                  onClick={() => setSelectedYear(y => y - 1)}
                  disabled={selectedYear <= 2020}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[90px] sm:w-[110px] bg-transparent border-0 text-white text-sm" data-testid="year-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-white hover:bg-white/20"
                  onClick={() => setSelectedYear(y => y + 1)}
                  disabled={selectedYear >= currentDate.getFullYear() + 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats - Responsive Grid - Better Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Totaal Verschuldigd - Featured */}
        <div className="sm:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-emerald-100 text-sm font-medium">Totaal Verschuldigd</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(summary.totalDue)}</p>
          </div>
        </div>

        {/* Totaal Ontvangen */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Ontvangen</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
        </div>

        {/* Openstaand */}
        <div className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 ${
          summary.balance > 0 
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900' 
            : 'bg-card border border-border/50'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              summary.balance > 0 ? 'bg-orange-500/10' : 'bg-muted'
            }`}>
              <TrendingDown className={`w-5 h-5 ${summary.balance > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Openstaand</p>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${summary.balance > 0 ? 'text-orange-600' : 'text-foreground'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>

        {/* Betaald Count */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Betaald</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{summary.paidCount}</p>
        </div>

        {/* Openstaand Count */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              summary.unpaidCount > 0 ? 'bg-orange-500/10' : 'bg-muted'
            }`}>
              <AlertCircle className={`w-5 h-5 ${summary.unpaidCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Open Facturen</p>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${summary.unpaidCount > 0 ? 'text-orange-600' : 'text-foreground'}`}>
            {summary.unpaidCount + summary.partialCount}
          </p>
        </div>
      </div>

      {/* Search - Responsive */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Zoek op huurder of appartement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
            data-testid="invoice-search"
          />
        </div>
      </div>

      {/* Months Grid - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
            <div 
              key={month} 
              className={`group cursor-pointer transition-all rounded-xl sm:rounded-2xl border overflow-hidden ${
                selectedMonth === month 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30' 
                  : 'border-border/50 bg-card hover:border-emerald-500/50 hover:shadow-lg'
              } ${isCurrentMonth ? 'ring-2 ring-emerald-500/30' : ''}`}
              onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
              data-testid={`month-card-${month}`}
            >
              <div className="p-3 sm:p-4">
                <div className="text-center">
                  <p className={`text-xs sm:text-sm font-medium ${selectedMonth === month ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {MONTHS[month - 1]}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">{selectedYear}</p>
                  {isCurrentMonth && (
                    <Badge className="mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Huidig
                    </Badge>
                  )}
                </div>
              </div>
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Betaald
                  </span>
                  <span className="font-semibold">{monthPaidCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Open
                  </span>
                  <span className="font-semibold">{monthUnpaidCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Month Detail Table - Responsive */}
      {selectedMonth && (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-muted/30">
            <h3 className="font-semibold text-sm sm:text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              {MONTHS[selectedMonth - 1]} {selectedYear} - Facturen per Huurder
            </h3>
          </div>
          <div className="p-3 sm:p-6">
            {activeTenantsData.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">Geen actieve huurders</p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Er zijn geen actieve huurders gevonden</p>
              </div>
            ) : (
              <div className="table-scroll-wrapper">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Huurder</th>
                      <th className="hidden sm:table-cell">Appartement</th>
                      <th className="text-right">Huur</th>
                      <th className="text-right hidden md:table-cell">Betaald</th>
                      <th className="text-right hidden lg:table-cell">Openstaand</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTenantsData.map(tenant => {
                      const data = getInvoiceData(tenant.id, selectedYear, selectedMonth);
                      const cumulative = getCumulativeBalance(tenant.id, selectedYear, selectedMonth);
                      
                      return (
                        <tr key={tenant.id}>
                          <td>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-semibold text-sm">{tenant.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-sm truncate block">{tenant.name}</span>
                                {/* Mobile: show apartment under name */}
                                <span className="text-xs text-muted-foreground sm:hidden">{tenant.apartment?.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{tenant.apartment?.name}</span>
                            </div>
                          </td>
                          <td className="text-right font-medium text-sm">{formatCurrency(data.rentAmount)}</td>
                          <td className="text-right text-emerald-600 font-medium hidden md:table-cell text-sm">{formatCurrency(data.totalPaid)}</td>
                          <td className="text-right text-orange-600 font-medium hidden lg:table-cell text-sm">{formatCurrency(data.remaining)}</td>
                          <td className="text-center">{getStatusBadge(data.status)}</td>
                          <td className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                              onClick={() => openDetail(tenant, selectedYear, selectedMonth)}
                              data-testid={`detail-btn-${tenant.id}`}
                            >
                              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Year Overview Table (when no month selected) - Responsive */}
      {!selectedMonth && (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-muted/30">
            <h3 className="font-semibold text-sm sm:text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Jaaroverzicht {selectedYear} - Alle Huurders
            </h3>
          </div>
          <div className="p-3 sm:p-6">
            <div className="table-scroll-wrapper">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-2 font-semibold sticky left-0 bg-muted/30 text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs">Huurder</th>
                    {getDisplayMonths().map(month => (
                      <th key={month} className="text-center p-2 font-semibold min-w-[60px] sm:min-w-[80px] text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs">
                        {MONTHS[month - 1].substring(0, 3)}
                      </th>
                    ))}
                    <th className="text-right p-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs">Totaal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activeTenantsData.map(tenant => {
                    let yearTotal = 0;
                    let yearPaid = 0;
                    
                    return (
                      <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2 sticky left-0 bg-card">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-[10px] sm:text-xs">{tenant.name.charAt(0)}</span>
                            </div>
                            <span className="font-medium truncate max-w-[80px] sm:max-w-[120px] text-xs sm:text-sm" title={tenant.name}>
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
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto rounded-full flex items-center justify-center text-[10px] sm:text-xs ${
                                data.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                data.status === 'partial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              }`}>
                                {data.status === 'paid' ? '✓' : data.status === 'partial' ? '½' : '○'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-right">
                          <div className="text-[10px] sm:text-xs">
                            <span className="text-emerald-600">{formatCurrency(yearPaid)}</span>
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
            
            {/* Legend - Responsive */}
            <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs">✓</span>
                Betaald
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-[10px] sm:text-xs">½</span>
                Gedeeltelijk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 text-[10px] sm:text-xs">○</span>
                Openstaand
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
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
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg sm:rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Periode</p>
                          <p className="text-base sm:text-lg font-bold">{MONTHS[selectedPeriod.month - 1]} {selectedPeriod.year}</p>
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
          
          <DialogFooter className="mt-4">
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full sm:w-auto"
              data-testid="download-invoice-pdf-btn"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloaden...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
