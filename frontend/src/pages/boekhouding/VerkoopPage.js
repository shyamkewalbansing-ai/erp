import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, customersAPI, productsAPI, pdfAPI, toBackendFormat } from '../../lib/boekhoudingApi';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  Loader2, 
  Trash2, 
  Download, 
  Send, 
  CheckCircle, 
  MoreHorizontal, 
  CreditCard,
  Search,
  Filter,
  TrendingUp,
  Wallet,
  Eye
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

// Stat Card Component matching Dashboard/Grootboek/Debiteuren style
const StatCard = ({ title, value, subtitle, icon: Icon, loading, variant = 'default' }) => {
  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-sm rounded-2xl ${
      variant === 'primary' ? 'bg-emerald-50' : 
      variant === 'warning' ? 'bg-amber-50' : 
      variant === 'blue' ? 'bg-blue-50' :
      'bg-white'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-slate-500 font-medium">{title}</span>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'primary' ? 'bg-emerald-100' : 
              variant === 'warning' ? 'bg-amber-100' : 
              variant === 'blue' ? 'bg-blue-100' :
              'bg-slate-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                variant === 'primary' ? 'text-emerald-600' : 
                variant === 'warning' ? 'text-amber-600' : 
                variant === 'blue' ? 'text-blue-600' :
                'text-slate-600'
              }`} />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
        {subtitle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const VerkoopPage = () => {
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
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

  const [newInvoice, setNewInvoice] = useState({
    type: 'sales',
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'SRD',
    lines: [{ product_id: '', description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
    notes: ''
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

  const updateLine = (index, field, value) => {
    const lines = [...newInvoice.lines];
    lines[index][field] = value;
    
    const quantity = parseFloat(lines[index].quantity) || 0;
    const unitPrice = parseFloat(lines[index].unit_price) || 0;
    const btwPercentage = parseFloat(lines[index].btw_percentage) || 0;
    
    const subtotal = quantity * unitPrice;
    lines[index].btw_amount = subtotal * (btwPercentage / 100);
    lines[index].total = subtotal + lines[index].btw_amount;
    
    setNewInvoice({ ...newInvoice, lines });
  };

  const addLine = () => {
    setNewInvoice({
      ...newInvoice,
      lines: [...newInvoice.lines, { product_id: '', description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }]
    });
  };

  const removeLine = (index) => {
    if (newInvoice.lines.length === 1) return;
    const lines = newInvoice.lines.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, lines });
  };

  const selectProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const lines = [...newInvoice.lines];
      lines[index] = {
        ...lines[index],
        product_id: productId,
        description: product.naam || product.name || '',
        unit_price: product.verkoopprijs || product.sales_price || 0,
      };
      const qty = lines[index].quantity || 1;
      const price = lines[index].unit_price || 0;
      const btwPct = lines[index].btw_percentage || 0;
      const subtotal = qty * price;
      lines[index].btw_amount = subtotal * (btwPct / 100);
      lines[index].total = subtotal + lines[index].btw_amount;
      setNewInvoice({ ...newInvoice, lines });
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

  const handleCreateInvoice = async () => {
    if (!newInvoice.customer_id) {
      toast.error('Selecteer een klant');
      return;
    }
    if (newInvoice.lines.some(l => !l.description || l.unit_price <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      const invoiceData = toBackendFormat({
        customer_id: newInvoice.customer_id,
        invoice_date: newInvoice.date,
        due_date: newInvoice.due_date,
        currency: newInvoice.currency,
        notes: newInvoice.notes
      });
      invoiceData.regels = newInvoice.lines.map(line => toBackendFormat({
        product_id: line.product_id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        btw_percentage: line.btw_percentage
      }));
      
      await invoicesAPI.create(invoiceData);
      toast.success('Factuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({
        type: 'sales', customer_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'SRD',
        lines: [{ product_id: '', description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Invoice creation error:', error);
      toast.error(error.response?.data?.detail || error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
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

  const subtotal = newInvoice.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const btwTotal = newInvoice.lines.reduce((s, l) => s + (l.btw_amount || 0), 0);
  const total = subtotal + btwTotal;

  return (
    <div className="min-h-screen bg-slate-50/50" data-testid="verkoop-page">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Verkoop</h1>
            <p className="text-sm text-slate-500">Beheer offertes, orders en verkoopfacturen</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
              <DialogTrigger asChild>
                <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700" data-testid="add-invoice-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Factuur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nieuwe Verkoopfactuur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Klant *</Label>
                      <Select value={newInvoice.customer_id} onValueChange={(v) => setNewInvoice({...newInvoice, customer_id: v})}>
                        <SelectTrigger data-testid="invoice-customer-select">
                          <SelectValue placeholder="Selecteer klant" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.naam || c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Factuurdatum</Label>
                      <Input
                        type="date"
                        value={newInvoice.date}
                        onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vervaldatum</Label>
                      <Input
                        type="date"
                        value={newInvoice.due_date}
                        onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valuta</Label>
                      <Select value={newInvoice.currency} onValueChange={(v) => setNewInvoice({...newInvoice, currency: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SRD">SRD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="w-[300px] text-xs font-medium text-slate-500">Artikel</TableHead>
                          <TableHead className="w-20 text-xs font-medium text-slate-500">Aantal</TableHead>
                          <TableHead className="w-28 text-xs font-medium text-slate-500">Prijs</TableHead>
                          <TableHead className="w-20 text-xs font-medium text-slate-500">BTW %</TableHead>
                          <TableHead className="w-28 text-right text-xs font-medium text-slate-500">Totaal</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newInvoice.lines.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Select 
                                  value={line.product_id || ''} 
                                  onValueChange={(v) => selectProduct(idx, v)}
                                >
                                  <SelectTrigger data-testid={`invoice-line-product-${idx}`}>
                                    <SelectValue placeholder="Selecteer artikel..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map(product => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.naam || product.name} - {formatAmount(product.verkoopprijs || product.sales_price || 0)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={line.description}
                                  onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                  placeholder="Of typ handmatig..."
                                  className="text-sm"
                                  data-testid={`invoice-line-desc-${idx}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.unit_price}
                                onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', parseFloat(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="10">10%</SelectItem>
                                  <SelectItem value="25">25%</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-slate-900">
                              {formatAmount(line.total || 0, newInvoice.currency)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(idx)}
                                disabled={newInvoice.lines.length === 1}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button variant="outline" onClick={addLine} className="w-full rounded-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Regel toevoegen
                  </Button>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotaal:</span>
                        <span className="font-medium text-slate-900">{formatAmount(subtotal, newInvoice.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">BTW:</span>
                        <span className="font-medium text-slate-900">{formatAmount(btwTotal, newInvoice.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span className="text-slate-900">Totaal:</span>
                        <span className="text-slate-900">{formatAmount(total, newInvoice.currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notities</Label>
                    <Textarea
                      value={newInvoice.notes}
                      onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                      placeholder="Opmerkingen op de factuur"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInvoiceDialog(false)} className="rounded-lg">
                    Annuleren
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" data-testid="save-invoice-btn">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Factuur Aanmaken
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            title="Offertes"
            value={quotes.length}
            subtitle="Totaal aantal"
            icon={FileText}
            loading={loading}
            variant="blue"
          />
          <StatCard
            title="Verkooporders"
            value={orders.length}
            subtitle="Totaal aantal"
            icon={ShoppingCart}
            loading={loading}
          />
          <StatCard
            title="Facturen"
            value={invoices.length}
            subtitle={`${formatAmount(totalInvoiced, 'SRD')} totaal`}
            icon={Receipt}
            loading={loading}
            variant="primary"
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding, 'SRD')}
            subtitle="Te ontvangen"
            icon={TrendingUp}
            loading={loading}
            variant="warning"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-slate-200 rounded-xl p-1">
              <TabsTrigger 
                value="quotes" 
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-quotes"
              >
                <FileText className="w-4 h-4 mr-2" />
                Offertes
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-sales-orders"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-sales-invoices"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Facturen
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quotes">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek offerte..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Quotes Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Klant</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Geldig tot</TableHead>
                        <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                        <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
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
                          <TableRow key={quote.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-sm font-mono text-slate-600">{quote.quote_number}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(quote.date)}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">{quote.customer_name}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(quote.valid_until)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-600">
                              {formatAmount(quote.total, quote.currency)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                quote.status === 'geaccepteerd' ? 'bg-emerald-50 text-emerald-600' : 
                                quote.status === 'verzonden' ? 'bg-blue-50 text-blue-600' : 
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {getStatusLabel(quote.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-medium mb-2">Geen offertes gevonden</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek order..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Klant</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Leverdatum</TableHead>
                        <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                        <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
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
                          <TableRow key={order.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-sm font-mono text-slate-600">{order.order_number}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(order.date)}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">{order.customer_name}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(order.delivery_date)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-600">
                              {formatAmount(order.total, order.currency)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                order.status === 'geleverd' ? 'bg-emerald-50 text-emerald-600' : 
                                order.status === 'in_behandeling' ? 'bg-blue-50 text-blue-600' : 
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-medium mb-2">Geen orders gevonden</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek factuur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48 rounded-lg">
                        <Filter className="w-4 h-4 mr-2" />
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
                </div>

                {/* Invoices Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Klant</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Vervaldatum</TableHead>
                        <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Status</TableHead>
                        <TableHead className="w-24 text-xs font-medium text-slate-500 text-center">Acties</TableHead>
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
                            <TableRow key={invoice.id} className="hover:bg-slate-50/50" data-testid={`sales-invoice-row-${invoiceNumber}`}>
                              <TableCell className="text-sm font-mono text-slate-600">{invoiceNumber}</TableCell>
                              <TableCell className="text-sm text-slate-500">{formatDate(invoiceDate)}</TableCell>
                              <TableCell className="text-sm font-medium text-slate-900">{customerName}</TableCell>
                              <TableCell className="text-sm text-slate-500">{formatDate(dueDate)}</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-emerald-600">
                                {formatAmount(totalAmount, currency)}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  invoice.status === 'betaald' ? 'bg-emerald-50 text-emerald-600' : 
                                  invoice.status === 'verzonden' ? 'bg-blue-50 text-blue-600' : 
                                  invoice.status === 'herinnering' ? 'bg-amber-50 text-amber-600' : 
                                  'bg-slate-50 text-slate-600'
                                }`}>
                                  {getStatusLabel(invoice.status)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                    title="Download PDF"
                                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                  >
                                    <Download className="w-4 h-4 text-slate-400" />
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
                                    <DropdownMenuContent align="end">
                                      {invoice.status === 'concept' && (
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'verzonden')}>
                                          <Send className="w-4 h-4 mr-2" />
                                          Verzenden
                                        </DropdownMenuItem>
                                      )}
                                      {invoice.status !== 'betaald' && (
                                        <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                                          <CreditCard className="w-4 h-4 mr-2" />
                                          Betaling Toevoegen
                                        </DropdownMenuItem>
                                      )}
                                      {(invoice.status === 'concept' || invoice.status === 'verzonden' || invoice.status === 'open') && (
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'betaald')}>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Markeer als Betaald
                                        </DropdownMenuItem>
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
                          <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                            <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-medium mb-2">Geen facturen gevonden</p>
                            <p className="text-sm">Pas de filters aan of maak een nieuwe factuur aan.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Betaling Toevoegen</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Invoice Summary Card */}
              <Card className="bg-slate-50 border-slate-200 rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-slate-700">Factuurgegevens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Factuurnummer</p>
                      <p className="font-semibold text-slate-900">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Totaal bedrag</p>
                      <p className="font-semibold text-slate-900">{formatAmount(selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Reeds betaald</p>
                      <p className="font-semibold text-green-600">{formatAmount(selectedInvoice.totaal_betaald || 0, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Openstaand</p>
                      <p className="font-semibold text-amber-600">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700 border-b pb-2">Betalingsgegevens</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Bedrag *</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={newPayment.bedrag}
                      onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                      data-testid="payment-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Datum *</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={newPayment.datum}
                      onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                      data-testid="payment-date-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Betaalmethode</Label>
                    <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                      <SelectTrigger id="payment-method" data-testid="payment-method-select">
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
                    <Label htmlFor="payment-reference">Referentie/Omschrijving</Label>
                    <Input
                      id="payment-reference"
                      value={newPayment.referentie}
                      onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                      placeholder="Bijv. transactienummer"
                      data-testid="payment-reference-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="rounded-lg" data-testid="payment-cancel-btn">
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" data-testid="payment-submit-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Betaling Registreren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
