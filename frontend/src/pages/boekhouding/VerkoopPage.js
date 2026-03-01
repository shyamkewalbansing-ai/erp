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
  TrendingUp,
  TrendingDown,
  DollarSign
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

  // Status badge styling
  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'verzonden': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'herinnering': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'geaccepteerd': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'geleverd': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="verkoop-page">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Verkoop</h1>
              <p className="text-sm text-gray-500 mt-1">Offertes, orders en facturen</p>
            </div>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              data-testid="add-invoice-btn"
              onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Totaal Gefactureerd</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? <Skeleton className="h-8 w-32" /> : formatAmount(totalInvoiced)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{invoices.length} facturen</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ontvangen</p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-1">
                    {loading ? <Skeleton className="h-8 w-32" /> : formatAmount(totalPaid)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
                    Betaald
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Openstaand</p>
                  <p className="text-2xl font-semibold text-amber-600 mt-1">
                    {loading ? <Skeleton className="h-8 w-32" /> : formatAmount(totalOutstanding)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1 text-amber-500" />
                    Te ontvangen
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Offertes</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? <Skeleton className="h-8 w-16" /> : quotes.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Actief</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <TabsList className="bg-transparent p-0 h-auto space-x-6">
              <TabsTrigger 
                value="quotes" 
                className="bg-transparent px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700"
                data-testid="tab-quotes"
              >
                Offertes ({quotes.length})
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="bg-transparent px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700"
                data-testid="tab-sales-orders"
              >
                Orders ({orders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="bg-transparent px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700"
                data-testid="tab-sales-invoices"
              >
                Facturen ({invoices.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Quotes */}
          <TabsContent value="quotes">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Zoeken..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 border-gray-200"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Nummer</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Datum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Klant</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Geldig tot</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Status</TableHead>
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
                        </TableRow>
                      ))
                    ) : filteredQuotes.length > 0 ? (
                      filteredQuotes.map(quote => (
                        <TableRow key={quote.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{quote.quote_number}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(quote.date)}</TableCell>
                          <TableCell className="text-gray-900">{quote.customer_name}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(quote.valid_until)}</TableCell>
                          <TableCell className="text-right font-medium text-gray-900">
                            {formatAmount(quote.total, quote.currency)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusStyle(quote.status)}`}>
                              {getStatusLabel(quote.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                          Geen offertes gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Zoeken..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 border-gray-200"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Nummer</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Datum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Klant</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Leverdatum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Status</TableHead>
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
                        </TableRow>
                      ))
                    ) : filteredOrders.length > 0 ? (
                      filteredOrders.map(order => (
                        <TableRow key={order.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{order.order_number}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(order.date)}</TableCell>
                          <TableCell className="text-gray-900">{order.customer_name}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right font-medium text-gray-900">
                            {formatAmount(order.total, order.currency)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusStyle(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                          Geen orders gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Zoeken..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 border-gray-200"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-44 border-gray-200">
                        <Filter className="w-4 h-4 mr-2 text-gray-400" />
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
                  <span className="text-sm text-gray-500">{filteredInvoices.length} resultaten</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Nummer</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Datum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Klant</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Vervaldatum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase">Status</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 uppercase text-right">Acties</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
                          <TableRow key={invoice.id} className="hover:bg-gray-50" data-testid={`sales-invoice-row-${invoiceNumber}`}>
                            <TableCell className="font-medium text-gray-900">{invoiceNumber}</TableCell>
                            <TableCell className="text-gray-600">{formatDate(invoiceDate)}</TableCell>
                            <TableCell className="text-gray-900">{customerName}</TableCell>
                            <TableCell className="text-gray-600">{formatDate(dueDate)}</TableCell>
                            <TableCell className="text-right font-medium text-gray-900">
                              {formatAmount(totalAmount, currency)}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusStyle(invoice.status)}`}>
                                {getStatusLabel(invoice.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600" disabled={updatingStatus === invoice.id}>
                                      {updatingStatus === invoice.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
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
                                    <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600">
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
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                          Geen facturen gevonden
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling Toevoegen</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Factuur</p>
                    <p className="font-medium text-gray-900">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Openstaand</p>
                    <p className="font-medium text-amber-600">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrag *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPayment.bedrag}
                      onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                      data-testid="payment-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Datum *</Label>
                    <Input
                      type="date"
                      value={newPayment.datum}
                      onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                      data-testid="payment-date-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Betaalmethode</Label>
                    <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                      <SelectTrigger data-testid="payment-method-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bankoverschrijving</SelectItem>
                        <SelectItem value="kas">Contant</SelectItem>
                        <SelectItem value="pin">PIN</SelectItem>
                        <SelectItem value="creditcard">Creditcard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Referentie</Label>
                    <Input
                      value={newPayment.referentie}
                      onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                      placeholder="Optioneel"
                      data-testid="payment-reference-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
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
