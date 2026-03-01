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
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  RefreshCw,
  BarChart3,
  Calendar,
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Copy,
  Printer,
  History,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

// Enhanced Stat Card with gradient and animation
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, gradientFrom, gradientTo, trend, trendUp, loading, onClick }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-0 relative">
        {/* Gradient accent line */}
        <div className={`h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
        
        {/* Background decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700`} />
        
        <div className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{value}</p>
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {trend}
                  </span>
                )}
                {subtitle && (
                  <p className={`text-xs ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
                )}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Action Button with hover effect
const QuickAction = ({ icon: Icon, label, onClick, variant = 'default', badge }) => {
  const variants = {
    default: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300',
    primary: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-transparent shadow-lg shadow-emerald-200',
    secondary: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
  };
  
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-300 hover:scale-105 ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
};

// Invoice Detail Slide-over Panel
const InvoiceDetailPanel = ({ invoice, open, onClose, onDownloadPdf, onAddPayment, onUpdateStatus, formatAmount }) => {
  if (!invoice) return null;

  const invoiceNumber = invoice.factuurnummer || invoice.invoice_number || '-';
  const invoiceDate = invoice.factuurdatum || invoice.date;
  const customerName = invoice.debiteur_naam || invoice.customer_name || '-';
  const customerEmail = invoice.debiteur_email || invoice.customer_email || '-';
  const customerPhone = invoice.debiteur_telefoon || invoice.customer_phone || '-';
  const customerAddress = invoice.debiteur_adres || invoice.customer_address || '-';
  const dueDate = invoice.vervaldatum || invoice.due_date;
  const totalAmount = invoice.totaal_incl_btw || invoice.total || 0;
  const subtotal = invoice.totaal_excl_btw || invoice.subtotal || 0;
  const btwAmount = invoice.btw_bedrag || invoice.tax || 0;
  const paidAmount = invoice.totaal_betaald || 0;
  const openAmount = invoice.openstaand_bedrag || totalAmount - paidAmount;
  const currency = invoice.valuta || invoice.currency || 'SRD';
  const items = invoice.regels || invoice.items || [];
  const payments = invoice.betalingen || [];

  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-100 text-emerald-700';
      case 'verzonden': return 'bg-blue-100 text-blue-700';
      case 'herinnering': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 rounded-2xl overflow-hidden max-h-[90vh]">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Factuur</p>
              <h2 className="text-2xl font-bold mt-1">{invoiceNumber}</h2>
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(invoice.status)} bg-opacity-90`}>
                  {getStatusLabel(invoice.status)}
                </span>
                <span className="text-emerald-100 text-sm">
                  {formatDate(invoiceDate)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm">Totaal</p>
              <p className="text-3xl font-bold">{formatAmount(totalAmount, currency)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Customer Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Klantgegevens</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{customerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{customerAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Factuurregels</h3>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Omschrijving</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Aantal</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Prijs</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="px-4 py-3 text-gray-900">{item.omschrijving || item.description}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.aantal || item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatAmount(item.prijs || item.price, currency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAmount(item.totaal || item.total, currency)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        Geen regels beschikbaar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotaal</span>
                  <span>{formatAmount(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>BTW</span>
                  <span>{formatAmount(btwAmount, currency)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg text-gray-900">
                    <span>Totaal</span>
                    <span>{formatAmount(totalAmount, currency)}</span>
                  </div>
                </div>
                {paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-600">
                      <span>Betaald</span>
                      <span>- {formatAmount(paidAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-600">
                      <span>Openstaand</span>
                      <span>{formatAmount(openAmount, currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Betalingshistorie
              </h3>
              <div className="space-y-2">
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(payment.datum || payment.date)}</p>
                        <p className="text-xs text-gray-500">{payment.betaalmethode || payment.method}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatAmount(payment.bedrag || payment.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Warning */}
          {invoice.status !== 'betaald' && new Date(dueDate) < new Date() && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Vervallen factuur</p>
                <p className="text-sm text-red-600">Deze factuur is vervallen op {formatDate(dueDate)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(invoiceNumber);
                toast.success('Factuurnummer gekopieerd');
              }}
              className="rounded-lg"
            >
              <Copy className="w-4 h-4 mr-1" />
              Kopiëren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPdf(invoice.id, invoiceNumber)}
              className="rounded-lg"
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-lg"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status !== 'betaald' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddPayment(invoice)}
                  className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Betaling
                </Button>
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(invoice.id, 'betaald')}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Markeer Betaald
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Recent Activity Item
const ActivityItem = ({ icon: Icon, iconBg, title, subtitle, time, amount, amountColor }) => (
  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
    <div className="text-right">
      {amount && <p className={`text-sm font-semibold ${amountColor || 'text-gray-900'}`}>{amount}</p>}
      <p className="text-xs text-gray-400">{time}</p>
    </div>
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
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('invoices');

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
      setShowDetailPanel(false);
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
    setShowDetailPanel(false);
    setShowPaymentDialog(true);
  };

  const openDetailPanel = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailPanel(true);
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

  // Calculations
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.totaal_betaald || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.openstaand_bedrag || 0), 0);
  const paidCount = invoices.filter(i => i.status === 'betaald').length;
  const openCount = invoices.filter(i => i.status !== 'betaald').length;
  const overdueCount = invoices.filter(i => i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < new Date()).length;
  const thisMonthInvoices = invoices.filter(i => {
    const d = new Date(i.factuurdatum || i.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Recent activity (last 5 invoices)
  const recentInvoices = [...invoices].sort((a, b) => 
    new Date(b.factuurdatum || b.date) - new Date(a.factuurdatum || a.date)
  ).slice(0, 5);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'verzonden': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'herinnering': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'geaccepteerd': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'geleverd': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" data-testid="verkoop-page">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Verkoop</h1>
                <p className="text-gray-500 text-sm">Beheer uw offertes, orders en facturen</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl h-10"
                onClick={fetchData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vernieuwen
              </Button>
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 h-10 rounded-xl font-medium shadow-lg shadow-emerald-200 transition-all duration-300 hover:shadow-xl hover:scale-105" 
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

      <div className="p-8">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <StatCard
            title="Totaal Gefactureerd"
            value={formatAmount(totalInvoiced)}
            subtitle={`${invoices.length} facturen`}
            trend="+12.5%"
            trendUp={true}
            icon={TrendingUp}
            gradientFrom="from-blue-400"
            gradientTo="to-blue-600"
            loading={loading}
          />
          <StatCard
            title="Ontvangen"
            value={formatAmount(totalPaid)}
            subtitle={`${paidCount} betaald`}
            subtitleColor="text-emerald-600"
            trend="+8.2%"
            trendUp={true}
            icon={Wallet}
            gradientFrom="from-emerald-400"
            gradientTo="to-emerald-600"
            loading={loading}
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding)}
            subtitle={`${openCount} facturen`}
            subtitleColor="text-amber-600"
            icon={Clock}
            gradientFrom="from-amber-400"
            gradientTo="to-amber-600"
            loading={loading}
            onClick={() => setStatusFilter(statusFilter === 'verzonden' ? 'all' : 'verzonden')}
          />
          <StatCard
            title="Deze Maand"
            value={thisMonthInvoices.toString()}
            subtitle="Nieuwe facturen"
            icon={Calendar}
            gradientFrom="from-violet-400"
            gradientTo="to-violet-600"
            loading={loading}
          />
        </div>

        {/* Quick Actions + Recent Activity Row */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Quick Actions Card */}
          <div className="col-span-2">
            <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Snelle Acties
                </h3>
                <div className="flex flex-wrap gap-3">
                  <QuickAction 
                    icon={Plus} 
                    label="Nieuwe Factuur" 
                    onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
                    variant="primary"
                  />
                  <QuickAction 
                    icon={FileText} 
                    label="Nieuwe Offerte" 
                    onClick={() => toast.info('Offerte functie komt binnenkort')}
                  />
                  <QuickAction 
                    icon={BarChart3} 
                    label="Rapportages" 
                    onClick={() => navigate('/app/boekhouding/rapportages')}
                    variant="secondary"
                  />
                  {overdueCount > 0 && (
                    <QuickAction 
                      icon={AlertCircle} 
                      label="Vervallen Facturen" 
                      onClick={() => setStatusFilter('herinnering')}
                      variant="warning"
                      badge={overdueCount}
                    />
                  )}
                  <QuickAction 
                    icon={Target} 
                    label="Doelen" 
                    onClick={() => toast.info('Doelen functie komt binnenkort')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Card */}
          <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Recente Activiteit
              </h3>
              <div className="space-y-1">
                {recentInvoices.slice(0, 3).map((inv, idx) => (
                  <ActivityItem
                    key={idx}
                    icon={Receipt}
                    iconBg={inv.status === 'betaald' ? 'bg-emerald-500' : 'bg-blue-500'}
                    title={inv.factuurnummer || inv.invoice_number}
                    subtitle={inv.debiteur_naam || inv.customer_name}
                    time={formatDate(inv.factuurdatum || inv.date)}
                    amount={formatAmount(inv.totaal_incl_btw || inv.total)}
                    amountColor={inv.status === 'betaald' ? 'text-emerald-600' : 'text-gray-900'}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6">
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                <TabsTrigger 
                  value="quotes" 
                  className="relative px-5 py-4 rounded-t-xl border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 font-medium transition-all duration-200"
                  data-testid="tab-quotes"
                >
                  <FileText className="w-4 h-4 mr-2 inline" />
                  Offertes
                  <span className="ml-2 px-2.5 py-0.5 text-xs rounded-full bg-gray-200/80 text-gray-600">{quotes.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="orders"
                  className="relative px-5 py-4 rounded-t-xl border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 font-medium transition-all duration-200"
                  data-testid="tab-sales-orders"
                >
                  <ShoppingCart className="w-4 h-4 mr-2 inline" />
                  Orders
                  <span className="ml-2 px-2.5 py-0.5 text-xs rounded-full bg-gray-200/80 text-gray-600">{orders.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices"
                  className="relative px-5 py-4 rounded-t-xl border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 font-medium transition-all duration-200"
                  data-testid="tab-sales-invoices"
                >
                  <Receipt className="w-4 h-4 mr-2 inline" />
                  Facturen
                  <span className="ml-2 px-2.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-semibold">{invoices.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="m-0">
              <div className="p-5 border-b border-gray-100 bg-white">
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Zoeken op nummer of klant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 h-11"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 pl-6">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Geldig tot</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i} className="border-b border-gray-50">
                        <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredQuotes.length > 0 ? (
                    filteredQuotes.map(quote => (
                      <TableRow key={quote.id} className="hover:bg-emerald-50/30 transition-colors border-b border-gray-50 cursor-pointer">
                        <TableCell className="font-semibold text-emerald-600 pl-6">{quote.quote_number}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(quote.date)}</TableCell>
                        <TableCell className="text-gray-900 font-medium">{quote.customer_name}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(quote.valid_until)}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          {formatAmount(quote.total, quote.currency)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-lg border ${getStatusStyle(quote.status)}`}>
                            {getStatusLabel(quote.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Geen offertes gevonden</p>
                        <p className="text-gray-400 text-sm mt-1">Maak een nieuwe offerte aan om te beginnen</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="m-0">
              <div className="p-5 border-b border-gray-100 bg-white">
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Zoeken op nummer of klant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 h-11"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 pl-6">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Leverdatum</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i} className="border-b border-gray-50">
                        <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-emerald-50/30 transition-colors border-b border-gray-50 cursor-pointer">
                        <TableCell className="font-semibold text-emerald-600 pl-6">{order.order_number}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-gray-900 font-medium">{order.customer_name}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(order.delivery_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          {formatAmount(order.total, order.currency)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-lg border ${getStatusStyle(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Geen orders gevonden</p>
                        <p className="text-gray-400 text-sm mt-1">Orders verschijnen hier na acceptatie van een offerte</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="m-0">
              <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Zoeken op factuurnummer of klant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 h-11"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-gray-50 border-gray-200 rounded-xl h-11">
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
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> resultaten
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4 pl-6">Nummer</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Klant</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vervaldatum</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right pr-6">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i} className="border-b border-gray-50">
                        <TableCell className="pl-6"><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></TableCell>
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
                      const isOverdue = invoice.status !== 'betaald' && new Date(dueDate) < new Date();
                      
                      return (
                        <TableRow 
                          key={invoice.id} 
                          className={`hover:bg-emerald-50/30 transition-colors border-b border-gray-50 group cursor-pointer ${isOverdue ? 'bg-red-50/30' : ''}`} 
                          data-testid={`sales-invoice-row-${invoiceNumber}`}
                          onClick={() => openDetailPanel(invoice)}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-emerald-600 hover:text-emerald-700">{invoiceNumber}</span>
                              {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{formatDate(invoiceDate)}</TableCell>
                          <TableCell className="text-gray-900 font-medium">{customerName}</TableCell>
                          <TableCell className={`${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {formatDate(dueDate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-gray-900">{formatAmount(totalAmount, currency)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg border ${getStatusStyle(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailPanel(invoice)}
                                className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Bekijk Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                className="h-9 w-9 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" disabled={updatingStatus === invoice.id}>
                                    {updatingStatus === invoice.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="w-4 h-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100">
                                  <DropdownMenuItem onClick={() => openDetailPanel(invoice)} className="rounded-lg">
                                    <Eye className="w-4 h-4 mr-3 text-gray-400" />
                                    Bekijk Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)} className="rounded-lg">
                                    <Download className="w-4 h-4 mr-3 text-gray-400" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  {invoice.status === 'concept' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'verzonden')} className="rounded-lg">
                                      <Send className="w-4 h-4 mr-3 text-blue-500" />
                                      Verzenden
                                    </DropdownMenuItem>
                                  )}
                                  {invoice.status !== 'betaald' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openPaymentDialog(invoice)} className="rounded-lg">
                                        <CreditCard className="w-4 h-4 mr-3 text-emerald-500" />
                                        Betaling Toevoegen
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'betaald')} className="rounded-lg">
                                        <CheckCircle className="w-4 h-4 mr-3 text-emerald-500" />
                                        Markeer als Betaald
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4 mr-3" />
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
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                          <Receipt className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Geen facturen gevonden</p>
                        <p className="text-gray-400 text-sm mt-1 mb-4">Maak een nieuwe factuur of pas de filters aan</p>
                        <Button 
                          onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nieuwe Factuur
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Invoice Detail Panel */}
      <InvoiceDetailPanel
        invoice={selectedInvoice}
        open={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        onDownloadPdf={handleDownloadPdf}
        onAddPayment={openPaymentDialog}
        onUpdateStatus={handleUpdateStatus}
        formatAmount={formatAmount}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                Betaling Toevoegen
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Factuur</p>
                      <p className="font-bold text-emerald-600 mt-0.5 text-lg">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Openstaand</p>
                      <p className="font-bold text-amber-600 mt-0.5 text-lg">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Bedrag *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPayment.bedrag}
                      onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-11"
                      data-testid="payment-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Datum *</Label>
                    <Input
                      type="date"
                      value={newPayment.datum}
                      onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-11"
                      data-testid="payment-date-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Methode</Label>
                    <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl h-11" data-testid="payment-method-select">
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
                    <Label className="text-sm font-semibold text-gray-700">Referentie</Label>
                    <Input
                      value={newPayment.referentie}
                      onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                      placeholder="Optioneel"
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-11"
                      data-testid="payment-reference-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="bg-gray-50 px-6 py-4 gap-3">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="rounded-xl border-gray-200" data-testid="payment-cancel-btn">
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-200" data-testid="payment-submit-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Betaling Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
