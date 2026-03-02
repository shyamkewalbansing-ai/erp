import React, { useState, useEffect } from 'react';
import { purchaseOrdersAPI, purchaseInvoicesAPI, suppliersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Plus, ShoppingCart, Receipt, Loader2, Trash2, Search, RefreshCw,
  Eye, X, Edit, Printer, DollarSign, Clock, TrendingDown
} from 'lucide-react';

// Currency formatter - matching VerkoopPage
const formatCurrency = (amount, currency = 'SRD') => {
  const num = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));
  return currency === 'USD' ? `$ ${num}` : currency === 'EUR' ? `€ ${num}` : `SRD ${num}`;
};

// Status Badge - matching VerkoopPage
const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-gray-100 text-gray-600',
    verzonden: 'bg-blue-100 text-blue-700',
    betaald: 'bg-emerald-100 text-emerald-700',
    openstaand: 'bg-amber-100 text-amber-700',
    nieuw: 'bg-blue-100 text-blue-700',
    ontvangen: 'bg-emerald-100 text-emerald-700',
    gedeeltelijk: 'bg-orange-100 text-orange-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${styles[status] || styles.concept}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// Stat Card - exact matching VerkoopPage design
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, iconColor, onClick }) => {
  return (
    <Card className={`bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
            <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{value}</p>
            {subtitle && (
              <p className={`text-xs mt-1 ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>
          <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Tab Button - matching VerkoopPage style
const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active 
        ? 'border-emerald-500 text-emerald-600' 
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
      {count}
    </span>
  </button>
);

// Detail Sidebar - matching VerkoopPage style
const DetailSidebar = ({ item, open, onClose }) => {
  if (!item || !open) return null;

  const number = item.factuurnummer || item.invoice_number || '-';
  const date = item.factuurdatum || item.date;
  const supplier = item.crediteur_naam || item.supplier_name || '-';
  const total = item.totaal_incl_btw || item.total || 0;
  const subtotal = item.subtotaal || item.totaal_excl_btw || item.subtotal || 0;
  const tax = item.btw_bedrag || item.tax || 0;
  const currency = item.valuta || item.currency || 'SRD';
  const lines = item.regels || item.factuurregels || [];
  const dueDate = item.vervaldatum || item.due_date;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-lg z-50 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                {supplier.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{number}</h2>
                <p className="text-sm text-gray-500">{supplier}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1.5" /> Bewerken
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Factuurdatum</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Vervaldatum</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(dueDate)}</p>
              </div>
            </div>

            {/* Lines */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Factuurregels</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Omschrijving</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">
                          {line.omschrijving || line.description}
                          <span className="text-gray-400 ml-1">x{line.aantal || line.quantity || 1}</span>
                        </td>
                        <td className="text-right px-3 py-2 font-medium text-gray-900">
                          {formatCurrency(line.totaal || line.total || (line.aantal * line.prijs_per_stuk), currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Subtotaal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">BTW</span>
                <span className="font-medium text-gray-900">{formatCurrency(tax, currency)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Totaal</span>
                <span className="text-gray-900">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

const InkoopPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    type: 'purchase',
    supplier_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'SRD',
    lines: [{ description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
    notes: '',
    external_number: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, invoicesRes, suppliersRes, productsRes] = await Promise.all([
        purchaseOrdersAPI.getAll(),
        purchaseInvoicesAPI.getAll(),
        suppliersAPI.getAll(),
        productsAPI.getAll()
      ]);
      setPurchaseOrders(ordersRes.data);
      setInvoices(invoicesRes.data);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data);
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
      lines: [...newInvoice.lines, { description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }]
    });
  };

  const removeLine = (index) => {
    if (newInvoice.lines.length === 1) return;
    const lines = newInvoice.lines.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, lines });
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.supplier_id) {
      toast.error('Selecteer een leverancier');
      return;
    }
    if (newInvoice.lines.some(l => !l.description || l.unit_price <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      const invoiceData = {
        crediteur_id: newInvoice.supplier_id,
        extern_factuurnummer: newInvoice.external_number || `INK-${Date.now()}`,
        factuurdatum: newInvoice.date,
        vervaldatum: newInvoice.due_date,
        valuta: newInvoice.currency,
        regels: newInvoice.lines.map(l => ({
          omschrijving: l.description,
          aantal: parseFloat(l.quantity) || 1,
          prijs_per_stuk: parseFloat(l.unit_price) || 0,
          btw_percentage: parseFloat(l.btw_percentage) || 0,
        })),
        opmerkingen: newInvoice.notes
      };
      await purchaseInvoicesAPI.create(invoiceData);
      toast.success('Inkoopfactuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({
        type: 'purchase', supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'SRD',
        lines: [{ description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
        notes: '', external_number: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  // Calculate statistics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totaal_incl_btw || inv.total || 0), 0);
  const openAmount = invoices.filter(inv => inv.status !== 'betaald').reduce((sum, inv) => sum + (inv.totaal_incl_btw || inv.total || 0), 0);
  const paidCount = invoices.filter(inv => inv.status === 'betaald').length;

  const subtotal = newInvoice.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const btwTotal = newInvoice.lines.reduce((s, l) => s + (l.btw_amount || 0), 0);
  const total = subtotal + btwTotal;

  // Filter items
  const filteredInvoices = invoices.filter(inv => 
    (inv.factuurnummer || inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.crediteur_naam || inv.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = purchaseOrders.filter(ord =>
    (ord.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ord.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="inkoop-page">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inkoop-page">
      {/* Header - matching VerkoopPage */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inkoop</h1>
          <p className="text-gray-500 mt-0.5">Beheer inkooporders en inkoopfacturen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-purchase-invoice-btn">
                <Plus className="w-4 h-4 mr-2" />
                Inkoopfactuur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Inkoopfactuur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Leverancier *</Label>
                    <Select value={newInvoice.supplier_id} onValueChange={(v) => setNewInvoice({...newInvoice, supplier_id: v})}>
                      <SelectTrigger data-testid="purchase-supplier-select">
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.naam || s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Extern Factuurnr</Label>
                    <Input
                      value={newInvoice.external_number || ''}
                      onChange={(e) => setNewInvoice({...newInvoice, external_number: e.target.value})}
                      placeholder="Nummer leverancier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Factuurdatum</Label>
                    <Input type="date" value={newInvoice.date} onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vervaldatum</Label>
                    <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[300px] text-xs font-medium text-gray-500">Omschrijving</TableHead>
                        <TableHead className="w-20 text-xs font-medium text-gray-500">Aantal</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-gray-500">Prijs</TableHead>
                        <TableHead className="w-20 text-xs font-medium text-gray-500">BTW %</TableHead>
                        <TableHead className="w-28 text-right text-xs font-medium text-gray-500">Totaal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newInvoice.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="Omschrijving" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(idx, 'unit_price', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', parseFloat(v))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.total, newInvoice.currency)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={newInvoice.lines.length === 1}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button variant="outline" onClick={addLine} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Regel toevoegen
                </Button>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotaal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(subtotal, newInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">BTW:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(btwTotal, newInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-gray-900">Totaal:</span>
                      <span className="text-gray-900">{formatCurrency(total, newInvoice.currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notities</Label>
                  <Textarea value={newInvoice.notes} onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})} placeholder="Opmerkingen" />
                </div>

                <Button onClick={handleCreateInvoice} className="w-full" disabled={saving} data-testid="save-purchase-invoice-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Factuur Aanmaken
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards - matching VerkoopPage with 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inkooporders"
          value={purchaseOrders.length}
          subtitle="Totaal orders"
          icon={ShoppingCart}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Inkoopfacturen"
          value={invoices.length}
          subtitle={`${paidCount} betaald`}
          subtitleColor="text-emerald-600"
          icon={Receipt}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Totaal Gefactureerd"
          value={formatCurrency(totalInvoiced)}
          subtitle="Dit periode"
          icon={DollarSign}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Openstaand"
          value={formatCurrency(openAmount)}
          subtitle="Te betalen"
          subtitleColor="text-red-500"
          icon={Clock}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Tabs - matching VerkoopPage style */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardContent className="p-0">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-1">
              <TabButton active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} icon={Receipt} label="Inkoopfacturen" count={invoices.length} />
              <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={ShoppingCart} label="Inkooporders" count={purchaseOrders.length} />
            </div>
          </div>

          {/* Search bar */}
          <div className="p-6 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Zoeken op nummer of leverancier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
          </div>

          {/* Table */}
          <div className="p-6">
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              {activeTab === 'invoices' ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-28 text-xs font-medium text-gray-500">Nummer</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500">Leverancier</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-gray-500">Vervaldatum</TableHead>
                      <TableHead className="text-right w-32 text-xs font-medium text-gray-500">Bedrag</TableHead>
                      <TableHead className="w-24 text-xs font-medium text-gray-500">Status</TableHead>
                      <TableHead className="w-16 text-xs font-medium text-gray-500">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(invoice => (
                      <TableRow 
                        key={invoice.id} 
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => { setDetailItem(invoice); setShowDetail(true); }}
                        data-testid={`purchase-invoice-row-${invoice.factuurnummer || invoice.invoice_number}`}
                      >
                        <TableCell className="text-sm font-medium text-gray-900">{invoice.factuurnummer || invoice.invoice_number || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(invoice.factuurdatum || invoice.date)}</TableCell>
                        <TableCell className="text-sm text-gray-700">{invoice.crediteur_naam || invoice.supplier_name || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(invoice.vervaldatum || invoice.due_date)}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.totaal_incl_btw || invoice.total, invoice.valuta || invoice.currency)}
                        </TableCell>
                        <TableCell><StatusBadge status={invoice.status} /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetailItem(invoice); setShowDetail(true); }}>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      Geen inkoopfacturen gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-28 text-xs font-medium text-gray-500">Nummer</TableHead>
                  <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Leverancier</TableHead>
                  <TableHead className="w-28 text-xs font-medium text-gray-500">Verwacht</TableHead>
                  <TableHead className="text-right w-32 text-xs font-medium text-gray-500">Bedrag</TableHead>
                  <TableHead className="w-24 text-xs font-medium text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium text-gray-900">{order.order_number}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(order.date)}</TableCell>
                    <TableCell className="text-sm text-gray-700">{order.supplier_name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(order.expected_date)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(order.total, order.currency)}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      Geen inkooporders gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sidebar */}
      <DetailSidebar item={detailItem} open={showDetail} onClose={() => setShowDetail(false)} />
    </div>
  );
};

export default InkoopPage;
