import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '../../components/ui/checkbox';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { 
  Plus, FileText, ShoppingCart, Receipt, Loader2, Download, Send, CheckCircle, 
  MoreHorizontal, CreditCard, Search, Filter, Trash2, Eye, RefreshCw, 
  Calendar, Mail, Phone, MapPin, Building2, Copy, Printer, History, 
  AlertCircle, ChevronRight, ChevronDown, ArrowUpDown, FileSpreadsheet,
  Bell, X, Edit, Archive, RotateCcw, DollarSign, Users, Clock, 
  TrendingUp, AlertTriangle, CheckCheck, XCircle, Percent, Hash,
  CalendarDays, Banknote, PiggyBank, CircleDollarSign, BarChart2,
  ListFilter, SlidersHorizontal, Columns, LayoutList, ExternalLink
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from '../../components/ui/dropdown-menu';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  
  const symbols = { USD: '$', EUR: '€', SRD: 'SRD' };
  return `${symbols[currency] || currency} ${formatted}`;
};

// KPI Card Component
const KPICard = ({ label, value, subValue, trend, icon: Icon, variant = 'default' }) => {
  const variants = {
    default: 'bg-white border-gray-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const iconColors = {
    default: 'text-gray-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-blue-600'
  };

  return (
    <div className={`${variants[variant]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${iconColors[variant]}`} />
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
      {trend && (
        <div className={`text-xs mt-1 ${trend.startsWith('+') ? 'text-emerald-600' : trend.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
          {trend}
        </div>
      )}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    concept: { label: 'Concept', className: 'bg-gray-100 text-gray-700 border-gray-300' },
    verzonden: { label: 'Verzonden', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    betaald: { label: 'Betaald', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    herinnering: { label: 'Herinnering', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    vervallen: { label: 'Vervallen', className: 'bg-red-100 text-red-700 border-red-300' },
    geaccepteerd: { label: 'Geaccepteerd', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    afgewezen: { label: 'Afgewezen', className: 'bg-red-100 text-red-700 border-red-300' },
    nieuw: { label: 'Nieuw', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    in_behandeling: { label: 'In behandeling', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    geleverd: { label: 'Geleverd', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' }
  };

  const { label, className } = config[status] || config.concept;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${className}`}>
      {label}
    </span>
  );
};

// Quick Actions Toolbar
const QuickActionsToolbar = ({ selectedCount, onBulkAction, onExport, onRefresh }) => (
  <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
    {selectedCount > 0 ? (
      <>
        <span className="text-sm font-medium text-gray-700">{selectedCount} geselecteerd</span>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="ghost" size="sm" onClick={() => onBulkAction('send')}>
          <Send className="w-4 h-4 mr-1" /> Verzenden
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onBulkAction('reminder')}>
          <Bell className="w-4 h-4 mr-1" /> Herinnering
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onBulkAction('export')}>
          <Download className="w-4 h-4 mr-1" /> Exporteren
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onBulkAction('delete')}>
          <Trash2 className="w-4 h-4 mr-1" /> Verwijderen
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" /> Vernieuwen
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Exporteren <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport('csv')}>Exporteer als CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('excel')}>Exporteer als Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('pdf')}>Exporteer als PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Printer className="w-4 h-4 mr-1" /> Afdrukken <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Overzicht afdrukken</DropdownMenuItem>
            <DropdownMenuItem>Geselecteerde afdrukken</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )}
  </div>
);

// Detail Sidebar Panel
const DetailSidebar = ({ item, type, open, onClose, onAction, formatAmount }) => {
  if (!item || !open) return null;

  const isInvoice = type === 'invoice';
  const isQuote = type === 'quote';
  const isOrder = type === 'order';

  const number = item.factuurnummer || item.invoice_number || item.quote_number || item.order_number || '-';
  const date = item.factuurdatum || item.date;
  const customer = item.debiteur_naam || item.customer_name || '-';
  const total = item.totaal_incl_btw || item.total || 0;
  const subtotal = item.totaal_excl_btw || item.subtotal || 0;
  const tax = item.btw_bedrag || item.tax || 0;
  const paid = item.totaal_betaald || 0;
  const open_amount = item.openstaand_bedrag || total - paid;
  const currency = item.valuta || item.currency || 'SRD';
  const lines = item.regels || item.items || [];
  const payments = item.betalingen || [];
  const dueDate = item.vervaldatum || item.due_date || item.valid_until;
  const isOverdue = item.status !== 'betaald' && dueDate && new Date(dueDate) < new Date();

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{number}</h2>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{customer}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Datum</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(date)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">{isQuote ? 'Geldig tot' : 'Vervaldatum'}</p>
              <p className={`text-sm font-semibold mt-1 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(dueDate)}
                {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Subtotaal</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatAmount(subtotal, currency)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">BTW</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatAmount(tax, currency)}</p>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Totaal</span>
              <span className="text-xl font-bold text-blue-900">{formatAmount(total, currency)}</span>
            </div>
            {isInvoice && paid > 0 && (
              <>
                <Separator className="my-2 bg-blue-200" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Betaald</span>
                  <span className="font-medium text-emerald-600">- {formatAmount(paid, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-blue-600">Openstaand</span>
                  <span className="font-bold text-amber-600">{formatAmount(open_amount, currency)}</span>
                </div>
              </>
            )}
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Klantgegevens</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{customer}</span>
              </div>
              {item.debiteur_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{item.debiteur_email}</span>
                </div>
              )}
              {item.debiteur_telefoon && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{item.debiteur_telefoon}</span>
                </div>
              )}
              {item.debiteur_adres && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{item.debiteur_adres}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {isInvoice ? 'Factuurregels' : isQuote ? 'Offerteregels' : 'Orderregels'} ({lines.length})
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Omschrijving</th>
                    <th className="text-center px-2 py-2 text-xs font-medium text-gray-500">Aantal</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{line.omschrijving || line.description}</td>
                      <td className="px-2 py-2 text-center text-gray-600">{line.aantal || line.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{formatAmount(line.totaal || line.total, currency)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-400">Geen regels</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {isInvoice && payments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Betalingen ({payments.length})</h3>
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(p.datum || p.date)}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.betaalmethode || p.method}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-700">{formatAmount(p.bedrag || p.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Vervallen factuur</p>
                <p className="text-xs text-red-600 mt-0.5">Vervaldatum was {formatDate(dueDate)}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('pdf', item)}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('copy', item)}>
            <Copy className="w-4 h-4 mr-1" /> Kopiëren
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('print', item)}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
        {isInvoice && item.status !== 'betaald' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('payment', item)}>
              <CreditCard className="w-4 h-4 mr-1" /> Betaling
            </Button>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction('markPaid', item)}>
              <CheckCircle className="w-4 h-4 mr-1" /> Betaald
            </Button>
          </div>
        )}
        {isQuote && item.status === 'concept' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('send', item)}>
              <Send className="w-4 h-4 mr-1" /> Verzenden
            </Button>
            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => onAction('convert', item)}>
              <FileText className="w-4 h-4 mr-1" /> Naar Order
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Page Component
const VerkoopPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  
  // Detail sidebar state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState('invoice');

  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPayment, setNewPayment] = useState({
    bedrag: 0,
    datum: new Date().toISOString().split('T')[0],
    betaalmethode: 'bank',
    referentie: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, ordersRes, invoicesRes] = await Promise.all([
        quotesAPI.getAll(),
        salesOrdersAPI.getAll(),
        invoicesAPI.getAll({ invoice_type: 'sales' })
      ]);
      setQuotes(quotesRes.data || []);
      setOrders(ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.total || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.totaal_betaald || 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.openstaand_bedrag || 0), 0);
    const overdueInvoices = invoices.filter(i => 
      i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < now
    );
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || 0), 0);
    
    const thisMonthInvoices = invoices.filter(i => new Date(i.factuurdatum || i.date) >= startOfMonth);
    const thisMonthTotal = thisMonthInvoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.total || 0), 0);

    const pendingQuotes = quotes.filter(q => q.status === 'concept' || q.status === 'verzonden');
    const pendingQuotesTotal = pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdueCount: overdueInvoices.length,
      overdueAmount,
      thisMonthTotal,
      thisMonthCount: thisMonthInvoices.length,
      invoiceCount: invoices.length,
      paidCount: invoices.filter(i => i.status === 'betaald').length,
      openCount: invoices.filter(i => i.status !== 'betaald').length,
      quoteCount: quotes.length,
      pendingQuotes: pendingQuotes.length,
      pendingQuotesTotal,
      orderCount: orders.length
    };
  }, [invoices, quotes, orders]);

  // Filtered data
  const getFilteredData = (data, type) => {
    let filtered = [...data];
    
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const number = (item.factuurnummer || item.invoice_number || item.quote_number || item.order_number || '').toLowerCase();
        const customer = (item.debiteur_naam || item.customer_name || '').toLowerCase();
        return number.includes(term) || customer.includes(term);
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.factuurdatum || item.date);
        switch (dateFilter) {
          case 'today':
            return itemDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            return itemDate >= weekAgo;
          case 'month':
            return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            const itemQuarter = Math.floor(itemDate.getMonth() / 3);
            return itemQuarter === quarter && itemDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'number':
          aVal = a.factuurnummer || a.invoice_number || a.quote_number || a.order_number || '';
          bVal = b.factuurnummer || b.invoice_number || b.quote_number || b.order_number || '';
          break;
        case 'customer':
          aVal = a.debiteur_naam || a.customer_name || '';
          bVal = b.debiteur_naam || b.customer_name || '';
          break;
        case 'amount':
          aVal = a.totaal_incl_btw || a.total || 0;
          bVal = b.totaal_incl_btw || b.total || 0;
          break;
        case 'date':
        default:
          aVal = new Date(a.factuurdatum || a.date);
          bVal = new Date(b.factuurdatum || b.date);
          break;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const filteredInvoices = getFilteredData(invoices, 'invoice');
  const filteredQuotes = getFilteredData(quotes, 'quote');
  const filteredOrders = getFilteredData(orders, 'order');

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSelectAll = (items) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(i => i.id));
    }
  };

  const handleSelect = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openDetail = (item, type) => {
    setDetailItem(item);
    setDetailType(type);
    setDetailOpen(true);
  };

  const handleDetailAction = async (action, item) => {
    switch (action) {
      case 'pdf':
        try {
          const response = await pdfAPI.getInvoicePdf(item.id);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `factuur_${item.factuurnummer || item.invoice_number}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('PDF gedownload');
        } catch {
          toast.error('Fout bij downloaden');
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(item.factuurnummer || item.invoice_number || '');
        toast.success('Nummer gekopieerd');
        break;
      case 'print':
        window.print();
        break;
      case 'payment':
        setSelectedInvoice(item);
        setNewPayment({
          bedrag: item.openstaand_bedrag || item.totaal_incl_btw || 0,
          datum: new Date().toISOString().split('T')[0],
          betaalmethode: 'bank',
          referentie: ''
        });
        setShowPaymentDialog(true);
        break;
      case 'markPaid':
        try {
          await invoicesAPI.updateStatus(item.id, 'betaald');
          toast.success('Factuur gemarkeerd als betaald');
          fetchData();
          setDetailOpen(false);
        } catch {
          toast.error('Fout bij bijwerken');
        }
        break;
      case 'send':
        toast.success('Verzonden naar klant');
        break;
      case 'convert':
        toast.info('Omzetten naar order...');
        break;
      default:
        break;
    }
  };

  const handleBulkAction = (action) => {
    switch (action) {
      case 'send':
        toast.success(`${selectedItems.length} items verzonden`);
        setSelectedItems([]);
        break;
      case 'reminder':
        toast.success(`Herinneringen verstuurd naar ${selectedItems.length} klanten`);
        setSelectedItems([]);
        break;
      case 'export':
        handleExport('csv');
        break;
      case 'delete':
        if (window.confirm(`${selectedItems.length} items verwijderen?`)) {
          toast.success('Items verwijderd');
          setSelectedItems([]);
        }
        break;
      default:
        break;
    }
  };

  const handleExport = (format) => {
    const data = activeTab === 'invoices' ? filteredInvoices : 
                 activeTab === 'quotes' ? filteredQuotes : filteredOrders;
    
    if (format === 'csv') {
      const headers = ['Nummer', 'Datum', 'Klant', 'Bedrag', 'Status'];
      const rows = data.map(item => [
        item.factuurnummer || item.invoice_number || item.quote_number || item.order_number,
        item.factuurdatum || item.date,
        item.debiteur_naam || item.customer_name,
        item.totaal_incl_btw || item.total,
        item.status
      ]);
      
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Bestand gedownload');
    } else {
      toast.info(`${format.toUpperCase()} export komt binnenkort`);
    }
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
      toast.error('Fout bij toevoegen betaling');
    } finally {
      setSaving(false);
    }
  };

  // Table Component
  const DataTable = ({ data, type, columns }) => {
    const items = type === 'invoice' ? filteredInvoices : 
                  type === 'quote' ? filteredQuotes : filteredOrders;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">
                <Checkbox 
                  checked={selectedItems.length === items.length && items.length > 0}
                  onCheckedChange={() => handleSelectAll(items)}
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
                <div className="flex items-center gap-1">
                  Nummer
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Datum
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customer')}>
                <div className="flex items-center gap-1">
                  Klant
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              {type === 'invoice' && <TableHead>Vervaldatum</TableHead>}
              {type === 'quote' && <TableHead>Geldig tot</TableHead>}
              {type === 'order' && <TableHead>Leverdatum</TableHead>}
              <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  Bedrag
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              {type === 'invoice' && <TableHead className="text-right">Openstaand</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  {type === 'invoice' && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map(item => {
                const number = item.factuurnummer || item.invoice_number || item.quote_number || item.order_number;
                const date = item.factuurdatum || item.date;
                const customer = item.debiteur_naam || item.customer_name;
                const dueDate = item.vervaldatum || item.due_date || item.valid_until || item.delivery_date;
                const total = item.totaal_incl_btw || item.total || 0;
                const openAmount = item.openstaand_bedrag || 0;
                const currency = item.valuta || item.currency || 'SRD';
                const isOverdue = type === 'invoice' && item.status !== 'betaald' && dueDate && new Date(dueDate) < new Date();

                return (
                  <TableRow 
                    key={item.id} 
                    className={`cursor-pointer hover:bg-blue-50 ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''} ${isOverdue ? 'bg-red-50' : ''}`}
                    onClick={() => openDetail(item, type)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleSelect(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600 hover:underline">{number}</span>
                    </TableCell>
                    <TableCell className="text-gray-600">{formatDate(date)}</TableCell>
                    <TableCell className="font-medium text-gray-900">{customer}</TableCell>
                    <TableCell className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {formatDate(dueDate)}
                      {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-900">
                      {formatCurrency(total, currency)}
                    </TableCell>
                    {type === 'invoice' && (
                      <TableCell className={`text-right font-medium ${openAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {openAmount > 0 ? formatCurrency(openAmount, currency) : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(item, type)}>
                            <Eye className="w-4 h-4 mr-2" /> Bekijken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDetailAction('pdf', item)}>
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" /> Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" /> Dupliceren
                          </DropdownMenuItem>
                          {type === 'invoice' && item.status !== 'betaald' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDetailAction('payment', item)}>
                                <CreditCard className="w-4 h-4 mr-2" /> Betaling registreren
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Bell className="w-4 h-4 mr-2" /> Herinnering sturen
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={type === 'invoice' ? 9 : 8} className="text-center py-10 text-gray-500">
                  Geen {type === 'invoice' ? 'facturen' : type === 'quote' ? 'offertes' : 'orders'} gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100" data-testid="verkoop-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Verkoop</h1>
            <p className="text-sm text-gray-500">Beheer uw offertes, orders en facturen</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Nieuw <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}>
                  <Receipt className="w-4 h-4 mr-2" /> Nieuwe factuur
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" /> Nieuwe offerte
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ShoppingCart className="w-4 h-4 mr-2" /> Nieuwe order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <KPICard 
            label="Gefactureerd" 
            value={formatCurrency(stats.totalInvoiced)} 
            subValue={`${stats.invoiceCount} facturen`}
            icon={Receipt}
          />
          <KPICard 
            label="Ontvangen" 
            value={formatCurrency(stats.totalPaid)} 
            subValue={`${stats.paidCount} betaald`}
            variant="success"
            icon={CheckCircle}
          />
          <KPICard 
            label="Openstaand" 
            value={formatCurrency(stats.totalOutstanding)} 
            subValue={`${stats.openCount} openstaand`}
            variant="warning"
            icon={Clock}
          />
          <KPICard 
            label="Vervallen" 
            value={formatCurrency(stats.overdueAmount)} 
            subValue={`${stats.overdueCount} facturen`}
            variant="danger"
            icon={AlertCircle}
          />
          <KPICard 
            label="Deze maand" 
            value={formatCurrency(stats.thisMonthTotal)} 
            subValue={`${stats.thisMonthCount} facturen`}
            variant="info"
            icon={CalendarDays}
          />
          <KPICard 
            label="Offertes open" 
            value={stats.pendingQuotes.toString()} 
            subValue={formatCurrency(stats.pendingQuotesTotal)}
            icon={FileText}
          />
        </div>

        {/* Main Content */}
        <Card className="bg-white">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItems([]); }}>
            {/* Tab List */}
            <div className="border-b border-gray-200">
              <div className="px-4">
                <TabsList className="h-auto bg-transparent p-0 gap-0">
                  <TabsTrigger 
                    value="invoices" 
                    className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Facturen
                    <Badge variant="secondary" className="ml-2">{invoices.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="quotes"
                    className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Offertes
                    <Badge variant="secondary" className="ml-2">{quotes.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="orders"
                    className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Orders
                    <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActionsToolbar 
              selectedCount={selectedItems.length}
              onBulkAction={handleBulkAction}
              onExport={handleExport}
              onRefresh={fetchData}
            />

            {/* Filters */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Zoeken op nummer of klant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="verzonden">Verzonden</SelectItem>
                  <SelectItem value="betaald">Betaald</SelectItem>
                  <SelectItem value="herinnering">Herinnering</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle periodes</SelectItem>
                  <SelectItem value="today">Vandaag</SelectItem>
                  <SelectItem value="week">Deze week</SelectItem>
                  <SelectItem value="month">Deze maand</SelectItem>
                  <SelectItem value="quarter">Dit kwartaal</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-sm text-gray-500">
                {activeTab === 'invoices' && `${filteredInvoices.length} van ${invoices.length}`}
                {activeTab === 'quotes' && `${filteredQuotes.length} van ${quotes.length}`}
                {activeTab === 'orders' && `${filteredOrders.length} van ${orders.length}`}
              </div>
            </div>

            {/* Tables */}
            <TabsContent value="invoices" className="m-0 p-4">
              <DataTable data={invoices} type="invoice" />
            </TabsContent>
            <TabsContent value="quotes" className="m-0 p-4">
              <DataTable data={quotes} type="quote" />
            </TabsContent>
            <TabsContent value="orders" className="m-0 p-4">
              <DataTable data={orders} type="order" />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Detail Sidebar */}
      <DetailSidebar
        item={detailItem}
        type={detailType}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAction={handleDetailAction}
        formatAmount={formatCurrency}
      />

      {/* Overlay when sidebar is open */}
      {detailOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setDetailOpen(false)}
        />
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaling registreren</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Factuur</p>
                  <p className="font-semibold">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Openstaand</p>
                  <p className="font-semibold text-amber-600">
                    {formatCurrency(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bedrag *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.bedrag}
                    onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Datum *</Label>
                  <Input
                    type="date"
                    value={newPayment.datum}
                    onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Betaalmethode</Label>
                  <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bankoverschrijving</SelectItem>
                      <SelectItem value="kas">Contant</SelectItem>
                      <SelectItem value="pin">PIN</SelectItem>
                      <SelectItem value="creditcard">Creditcard</SelectItem>
                      <SelectItem value="ideal">iDEAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referentie</Label>
                  <Input
                    value={newPayment.referentie}
                    onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                    placeholder="Optioneel"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Betaling opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
