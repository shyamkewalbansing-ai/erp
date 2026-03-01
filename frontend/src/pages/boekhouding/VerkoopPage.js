import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, customersAPI, productsAPI, pdfAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
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
  Trash2,
  ArrowUpRight,
  Wallet,
  Clock,
  ChevronRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

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
      toast.success(`Status gewijzigd naar ${getStatusLabel(newStatus)}`);
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

  // Filters
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

  const filteredQuotes = quotes.filter(q =>
    (q.quote_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Totals
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.totaal_betaald || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.openstaand_bedrag || 0), 0);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'verzonden': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'herinnering': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'geaccepteerd': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'geleverd': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="verkoop-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Verkoop</h1>
              <p className="text-sm text-slate-500 mt-0.5">Beheer uw offertes, orders en facturen</p>
            </div>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
              data-testid="add-invoice-btn"
              onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          {/* Total Invoiced */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Gefactureerd</p>
                  <p className="text-2xl font-bold text-slate-800 mt-2">
                    {loading ? <Skeleton className="h-8 w-28" /> : formatAmount(totalInvoiced)}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center">
                    <Receipt className="w-3 h-3 mr-1" />
                    {invoices.length} facturen
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Received */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Ontvangen</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">
                    {loading ? <Skeleton className="h-8 w-28" /> : formatAmount(totalPaid)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2 flex items-center">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Betaald
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Openstaand</p>
                  <p className="text-2xl font-bold text-amber-600 mt-2">
                    {loading ? <Skeleton className="h-8 w-28" /> : formatAmount(totalOutstanding)}
                  </p>
                  <p className="text-xs text-amber-600 mt-2 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Te ontvangen
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotes */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Offertes</p>
                  <p className="text-2xl font-bold text-slate-800 mt-2">
                    {loading ? <Skeleton className="h-8 w-16" /> : quotes.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    Actief
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white border-0 shadow-sm">
          <Tabs defaultValue="invoices">
            {/* Tab Header */}
            <div className="border-b border-slate-100 px-6">
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="quotes" 
                  className="relative px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium"
                  data-testid="tab-quotes"
                >
                  <FileText className="w-4 h-4 mr-2 inline" />
                  Offertes
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{quotes.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="orders"
                  className="relative px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium"
                  data-testid="tab-sales-orders"
                >
                  <ShoppingCart className="w-4 h-4 mr-2 inline" />
                  Orders
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{orders.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices"
                  className="relative px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium"
                  data-testid="tab-sales-invoices"
                >
                  <Receipt className="w-4 h-4 mr-2 inline" />
                  Facturen
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">{invoices.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="m-0">
              <div className="p-4 border-b border-slate-100">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken op nummer of klant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Geldig tot</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))
                  ) : filteredQuotes.length > 0 ? (
                    filteredQuotes.map(quote => (
                      <TableRow key={quote.id} className="hover:bg-slate-50/50 cursor-pointer group">
                        <TableCell className="font-medium text-slate-800">{quote.quote_number}</TableCell>
                        <TableCell className="text-slate-600">{formatDate(quote.date)}</TableCell>
                        <TableCell className="text-slate-800 font-medium">{quote.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(quote.valid_until)}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {formatAmount(quote.total, quote.currency)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusStyle(quote.status)}`}>
                            {getStatusLabel(quote.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">Geen offertes gevonden</p>
                        <p className="text-slate-400 text-sm mt-1">Maak een nieuwe offerte aan</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="m-0">
              <div className="p-4 border-b border-slate-100">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken op nummer of klant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leverdatum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 cursor-pointer group">
                        <TableCell className="font-medium text-slate-800">{order.order_number}</TableCell>
                        <TableCell className="text-slate-600">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-slate-800 font-medium">{order.customer_name}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(order.delivery_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {formatAmount(order.total, order.currency)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusStyle(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <ShoppingCart className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">Geen orders gevonden</p>
                        <p className="text-slate-400 text-sm mt-1">Orders verschijnen hier na acceptatie</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="m-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Zoeken op nummer of klant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44 bg-slate-50 border-slate-200">
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
                <p className="text-sm text-slate-500">{filteredInvoices.length} resultaten</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 pl-6">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vervaldatum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right pr-6">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
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
                            <span className="font-semibold text-emerald-700">{invoiceNumber}</span>
                          </TableCell>
                          <TableCell className="text-slate-600">{formatDate(invoiceDate)}</TableCell>
                          <TableCell className="text-slate-800 font-medium">{customerName}</TableCell>
                          <TableCell className="text-slate-500">{formatDate(dueDate)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-slate-800">{formatAmount(totalAmount, currency)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusStyle(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" disabled={updatingStatus === invoice.id}>
                                    {updatingStatus === invoice.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="w-4 h-4" />
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
                                  <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600 focus:text-red-600">
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
                      <TableCell colSpan={7} className="text-center py-16">
                        <Receipt className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">Geen facturen gevonden</p>
                        <p className="text-slate-400 text-sm mt-1">Maak een nieuwe factuur of pas de filters aan</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800">Betaling Toevoegen</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-5 py-2">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Factuur</p>
                    <p className="font-semibold text-emerald-700 mt-0.5">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Openstaand</p>
                    <p className="font-semibold text-amber-600 mt-0.5">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Bedrag *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.bedrag}
                    onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                    className="bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="payment-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Datum *</Label>
                  <Input
                    type="date"
                    value={newPayment.datum}
                    onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                    className="bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="payment-date-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Methode</Label>
                  <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                    <SelectTrigger className="bg-slate-50 border-slate-200" data-testid="payment-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="kas">Contant</SelectItem>
                      <SelectItem value="pin">PIN</SelectItem>
                      <SelectItem value="creditcard">Creditcard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Referentie</Label>
                  <Input
                    value={newPayment.referentie}
                    onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                    placeholder="Optioneel"
                    className="bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="payment-reference-input"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} data-testid="payment-cancel-btn">
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-emerald-600 hover:bg-emerald-700" data-testid="payment-submit-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
