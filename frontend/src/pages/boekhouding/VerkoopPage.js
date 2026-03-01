import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, customersAPI, productsAPI, pdfAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  Loader2, 
  Download, 
  Send, 
  CheckCircle, 
  MoreHorizontal, 
  CreditCard,
  Search,
  Filter,
  TrendingUp,
  Trash2,
  Eye,
  Mail,
  Clock,
  ArrowUpRight,
  Wallet,
  CircleDollarSign,
  FileCheck
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

// Professional Stat Card with hover effects
const StatCard = ({ title, value, subtitle, icon: Icon, loading, variant = 'default', trend }) => {
  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const variants = {
    default: {
      bg: 'bg-white',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueBg: ''
    },
    primary: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      valueBg: 'text-emerald-600'
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100/50',
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
      valueBg: 'text-amber-600'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100/50',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      valueBg: 'text-blue-600'
    },
    success: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-100/50',
      iconBg: 'bg-green-500',
      iconColor: 'text-white',
      valueBg: 'text-green-600'
    }
  };

  const style = variants[variant] || variants.default;

  return (
    <Card className={`${style.bg} border-0 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-slate-500 font-medium">{title}</span>
          {Icon && (
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg} shadow-sm`}>
              <Icon className={`w-5 h-5 ${style.iconColor}`} />
            </div>
          )}
        </div>
        <div className={`text-3xl font-bold mb-2 ${style.valueBg || 'text-slate-900'}`}>{value}</div>
        {subtitle && (
          <div className="flex items-center gap-2">
            {trend && (
              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                <ArrowUpRight className={`w-3 h-3 mr-0.5 ${trend < 0 ? 'rotate-90' : ''}`} />
                {Math.abs(trend)}%
              </span>
            )}
            <span className="text-sm text-slate-400">{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    betaald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    verzonden: 'bg-blue-100 text-blue-700 border-blue-200',
    concept: 'bg-slate-100 text-slate-600 border-slate-200',
    herinnering: 'bg-amber-100 text-amber-700 border-amber-200',
    vervallen: 'bg-red-100 text-red-700 border-red-200',
    geaccepteerd: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_behandeling: 'bg-blue-100 text-blue-700 border-blue-200',
    geleverd: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    open: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <Badge variant="outline" className={`${styles[status] || styles.concept} border font-medium text-xs px-2.5 py-0.5`}>
      {getStatusLabel(status)}
    </Badge>
  );
};

// Empty State Component
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
      <Icon className="w-10 h-10 text-slate-300" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
    {action}
  </div>
);

const VerkoopPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newPayment, setNewPayment] = useState({
    bedrag: 0,
    datum: new Date().toISOString().split('T')[0],
    betaalmethode: 'bank',
    referentie: ''
  });

  // Format number with Dutch locale
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, ordersRes, invoicesRes, customersRes, productsRes] = await Promise.all([
        quotesAPI.getAll(),
        salesOrdersAPI.getAll(),
        invoicesAPI.getAll({ invoice_type: 'sales' }),
        customersAPI.getAll(),
        productsAPI.getAll()
      ]);
      setQuotes(quotesRes.data || []);
      setOrders(ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await pdfAPI.getInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factuur_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden PDF');
    }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    setUpdatingStatus(invoiceId);
    try {
      await invoicesAPI.updateStatus(invoiceId, newStatus);
      toast.success(`Factuur status gewijzigd naar ${getStatusLabel(newStatus)}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij status wijzigen');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openPaymentDialog = (invoice) => {
    const openstaand = invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.total || 0;
    setSelectedInvoice(invoice);
    setNewPayment({
      bedrag: openstaand,
      datum: new Date().toISOString().split('T')[0],
      betaalmethode: 'bank',
      referentie: ''
    });
    setShowPaymentDialog(true);
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice || newPayment.bedrag <= 0) {
      toast.error('Vul een geldig bedrag in');
      return;
    }
    setSaving(true);
    try {
      await invoicesAPI.addPayment(selectedInvoice.id, newPayment);
      toast.success('Betaling toegevoegd');
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen betaling');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Weet u zeker dat u deze factuur wilt verwijderen?')) {
      return;
    }
    try {
      await invoicesAPI.delete(invoiceId);
      toast.success('Factuur verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  // Filter invoices
  let filteredInvoices = invoices;
  if (statusFilter !== 'all') {
    filteredInvoices = invoices.filter(i => i.status === statusFilter);
  }
  if (searchTerm) {
    filteredInvoices = filteredInvoices.filter(i =>
      (i.factuurnummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Filter quotes
  const filteredQuotes = quotes.filter(q =>
    (q.quote_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter orders
  const filteredOrders = orders.filter(o =>
    (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.totaal_betaald || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.openstaand_bedrag || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === 'betaald').length;

  return (
    <div className="min-h-screen bg-slate-50/50" data-testid="verkoop-page">
      {/* Professional Header with Gradient */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Verkoop</h1>
              <p className="text-emerald-100">Beheer uw offertes, orders en verkoopfacturen</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
              >
                <FileText className="w-4 h-4 mr-2" />
                Offerte
              </Button>
              <Button 
                className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl shadow-lg shadow-emerald-700/20" 
                data-testid="add-invoice-btn"
                onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Factuur
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-6">
        {/* Stats Row - Overlapping Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Offertes"
            value={quotes.length}
            subtitle="Totaal aantal"
            icon={FileText}
            loading={loading}
            variant="blue"
          />
          <StatCard
            title="Gefactureerd"
            value={formatAmount(totalInvoiced, 'SRD')}
            subtitle={`${invoices.length} facturen`}
            icon={Receipt}
            loading={loading}
            variant="primary"
          />
          <StatCard
            title="Ontvangen"
            value={formatAmount(totalPaid, 'SRD')}
            subtitle={`${paidInvoices} betaald`}
            icon={Wallet}
            loading={loading}
            variant="success"
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding, 'SRD')}
            subtitle="Te ontvangen"
            icon={Clock}
            loading={loading}
            variant="warning"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invoices" className="space-y-6">
          {/* Professional Tabs */}
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
              <TabsTrigger 
                value="quotes" 
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                data-testid="tab-quotes"
              >
                <FileText className="w-4 h-4 mr-2" />
                Offertes
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 text-xs">{quotes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                data-testid="tab-sales-orders"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Orders
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 text-xs">{orders.length}</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                data-testid="tab-sales-invoices"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Facturen
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 text-xs">{invoices.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {/* Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek op nummer of klant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-4">Nummer</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Klant</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Geldig tot</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredQuotes.length > 0 ? (
                      filteredQuotes.map(quote => (
                        <TableRow key={quote.id} className="hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="font-mono text-sm text-emerald-600 font-medium">{quote.quote_number}</TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(quote.date)}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-900">{quote.customer_name}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(quote.valid_until)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900">
                            {formatAmount(quote.total, quote.currency)}
                          </TableCell>
                          <TableCell><StatusBadge status={quote.status} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState
                            icon={FileText}
                            title="Geen offertes"
                            description="Maak uw eerste offerte aan om potentiële klanten te benaderen."
                            action={
                              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                                <Plus className="w-4 h-4 mr-2" />
                                Nieuwe Offerte
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {/* Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek op nummer of klant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-4">Nummer</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Klant</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leverdatum</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredOrders.length > 0 ? (
                      filteredOrders.map(order => (
                        <TableRow key={order.id} className="hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="font-mono text-sm text-emerald-600 font-medium">{order.order_number}</TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(order.date)}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-900">{order.customer_name}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900">
                            {formatAmount(order.total, order.currency)}
                          </TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState
                            icon={ShoppingCart}
                            title="Geen orders"
                            description="Verkooporders verschijnen hier wanneer offertes worden geaccepteerd."
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {/* Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Zoek op nummer of klant..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-72 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48 rounded-xl border-slate-200">
                          <Filter className="w-4 h-4 mr-2 text-slate-400" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle statussen</SelectItem>
                          <SelectItem value="concept">Concept</SelectItem>
                          <SelectItem value="verzonden">Verzonden</SelectItem>
                          <SelectItem value="betaald">Betaald</SelectItem>
                          <SelectItem value="herinnering">Herinnering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-slate-500">
                      {filteredInvoices.length} facturen gevonden
                    </div>
                  </div>
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-4 pl-6">Nummer</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Klant</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vervaldatum</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center pr-6">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredInvoices.length > 0 ? (
                      filteredInvoices.map(invoice => {
                        const invoiceNumber = invoice.factuurnummer || invoice.invoice_number || '-';
                        const invoiceDate = invoice.factuurdatum || invoice.date;
                        const customerName = invoice.debiteur_naam || invoice.customer_name || '-';
                        const dueDate = invoice.vervaldatum || invoice.due_date;
                        const totalAmount = invoice.totaal_incl_btw || invoice.total || 0;
                        const currency = invoice.valuta || invoice.currency || 'SRD';
                        
                        return (
                          <TableRow key={invoice.id} className="hover:bg-emerald-50/30 transition-colors group" data-testid={`sales-invoice-row-${invoiceNumber}`}>
                            <TableCell className="pl-6">
                              <span className="font-mono text-sm text-emerald-600 font-medium">{invoiceNumber}</span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{formatDate(invoiceDate)}</TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-slate-900">{customerName}</span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(dueDate)}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-semibold text-slate-900">{formatAmount(totalAmount, currency)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <StatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell className="pr-6">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                  title="Download PDF"
                                  className="h-8 w-8 p-0 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg" disabled={updatingStatus === invoice.id}>
                                      {updatingStatus === invoice.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    {invoice.status === 'concept' && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'verzonden')}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Verzenden
                                      </DropdownMenuItem>
                                    )}
                                    {invoice.status !== 'betaald' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                                          <CreditCard className="w-4 h-4 mr-2" />
                                          Betaling Toevoegen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'betaald')}>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Markeer als Betaald
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Verwijderen
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyState
                            icon={Receipt}
                            title="Geen facturen gevonden"
                            description="Maak uw eerste verkoopfactuur aan of pas de filters aan."
                            action={
                              <Button 
                                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                                onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Nieuwe Factuur
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Professional Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Betaling Registreren
            </DialogTitle>
          </div>
          
          {selectedInvoice && (
            <div className="p-6 space-y-6">
              {/* Invoice Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Factuur</p>
                    <p className="font-mono font-semibold text-emerald-600">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Openstaand</p>
                    <p className="font-semibold text-amber-600">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                  </div>
                </div>
              </div>
              
              {/* Payment Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="text-sm font-medium text-slate-700">Bedrag *</Label>
                    <div className="relative">
                      <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="payment-amount"
                        type="number"
                        step="0.01"
                        value={newPayment.bedrag}
                        onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                        className="pl-10 rounded-xl"
                        data-testid="payment-amount-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date" className="text-sm font-medium text-slate-700">Datum *</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={newPayment.datum}
                      onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                      className="rounded-xl"
                      data-testid="payment-date-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method" className="text-sm font-medium text-slate-700">Betaalmethode</Label>
                    <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                      <SelectTrigger id="payment-method" className="rounded-xl" data-testid="payment-method-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bankoverschrijving</SelectItem>
                        <SelectItem value="kas">Contant (Kas)</SelectItem>
                        <SelectItem value="pin">PIN/Kaart</SelectItem>
                        <SelectItem value="creditcard">Creditcard</SelectItem>
                        <SelectItem value="anders">Anders</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-reference" className="text-sm font-medium text-slate-700">Referentie</Label>
                    <Input
                      id="payment-reference"
                      value={newPayment.referentie}
                      onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                      placeholder="Transactienummer"
                      className="rounded-xl"
                      data-testid="payment-reference-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="bg-slate-50 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="rounded-xl" data-testid="payment-cancel-btn">
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" data-testid="payment-submit-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Betaling Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
