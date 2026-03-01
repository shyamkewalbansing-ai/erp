import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, pdfAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { ScrollArea } from '../../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Plus, FileText, ShoppingCart, Receipt, Loader2, Download, Send, CheckCircle, 
  MoreHorizontal, CreditCard, Search, Trash2, Eye, RefreshCw, 
  Mail, Phone, MapPin, Building2, Copy, Printer, 
  AlertCircle, ChevronDown, ChevronRight, ArrowUpDown, FileSpreadsheet,
  Bell, X, Edit, Clock, Calendar, ChevronLeft, Home,
  Settings, HelpCircle, Filter, LayoutGrid, List, SortAsc, SortDesc
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

// Currency formatter
const formatCurrency = (amount, currency = 'SRD') => {
  const num = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));
  return currency === 'USD' ? `$ ${num}` : currency === 'EUR' ? `€ ${num}` : `SRD ${num}`;
};

// Enterprise Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-slate-100 text-slate-600 border-slate-200',
    verzonden: 'bg-sky-50 text-sky-700 border-sky-200',
    betaald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    herinnering: 'bg-amber-50 text-amber-700 border-amber-200',
    vervallen: 'bg-rose-50 text-rose-700 border-rose-200',
    geaccepteerd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    nieuw: 'bg-sky-50 text-sky-700 border-sky-200'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${styles[status] || styles.concept}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// Metric Card Component
const MetricCard = ({ label, value, subtext, variant = 'default' }) => {
  const variants = {
    default: 'border-l-slate-400',
    primary: 'border-l-blue-500',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500'
  };
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${variants[variant]} p-4`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1">{value}</p>
      {subtext && <p className="text-[11px] text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  );
};

// Tab Button
const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active 
        ? 'border-blue-600 text-blue-600' 
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {children}
    {count !== undefined && (
      <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    )}
  </button>
);

// Detail Panel
const DetailPanel = ({ item, type, open, onClose, onAction }) => {
  if (!item || !open) return null;

  const number = item.factuurnummer || item.invoice_number || item.quote_number || item.order_number || '-';
  const date = item.factuurdatum || item.date;
  const customer = item.debiteur_naam || item.customer_name || '-';
  const total = item.totaal_incl_btw || item.total || 0;
  const subtotal = item.totaal_excl_btw || item.subtotal || 0;
  const tax = item.btw_bedrag || item.tax || 0;
  const paid = item.totaal_betaald || 0;
  const openAmount = item.openstaand_bedrag || total - paid;
  const currency = item.valuta || item.currency || 'SRD';
  const lines = item.regels || item.items || [];
  const payments = item.betalingen || [];
  const dueDate = item.vervaldatum || item.due_date || item.valid_until;
  const isOverdue = item.status !== 'betaald' && dueDate && new Date(dueDate) < new Date();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{number}</h2>
              <p className="text-xs text-slate-500">{customer}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-400 uppercase">Factuurdatum</p>
                <p className="text-sm text-slate-900">{formatDate(date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-400 uppercase">Vervaldatum</p>
                <p className={`text-sm ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-900'}`}>
                  {formatDate(dueDate)} {isOverdue && '(Vervallen)'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-400 uppercase">Valuta</p>
                <p className="text-sm text-slate-900">{currency}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-400 uppercase">Referentie</p>
                <p className="text-sm text-slate-900">{item.referentie || '-'}</p>
              </div>
            </div>

            {/* Amounts */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotaal</span>
                <span className="text-slate-900">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">BTW</span>
                <span className="text-slate-900">{formatCurrency(tax, currency)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="text-sm font-medium text-slate-900">Totaal</span>
                <span className="text-lg font-semibold text-slate-900">{formatCurrency(total, currency)}</span>
              </div>
              {type === 'invoice' && paid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Betaald</span>
                    <span>- {formatCurrency(paid, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-amber-600">Openstaand</span>
                    <span className="text-base font-semibold text-amber-600">{formatCurrency(openAmount, currency)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Customer */}
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase mb-2">Klantgegevens</p>
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{customer}</span>
                </div>
                {item.debiteur_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{item.debiteur_email}</span>
                  </div>
                )}
                {item.debiteur_telefoon && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{item.debiteur_telefoon}</span>
                  </div>
                )}
                {item.debiteur_adres && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{item.debiteur_adres}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lines */}
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase mb-2">Regels ({lines.length})</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Omschrijving</th>
                      <th className="text-center px-2 py-2 text-[11px] font-medium text-slate-500 uppercase">Aantal</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length > 0 ? lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-700">{line.omschrijving || line.description}</td>
                        <td className="px-2 py-2 text-center text-slate-600">{line.aantal || line.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-900 font-medium">{formatCurrency(line.totaal || line.total, currency)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">Geen regels</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments */}
            {type === 'invoice' && payments.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase mb-2">Betalingen ({payments.length})</p>
                <div className="space-y-2">
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-sm text-slate-900">{formatDate(p.datum || p.date)}</p>
                          <p className="text-[11px] text-slate-500 capitalize">{p.betaalmethode || p.method}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">{formatCurrency(p.bedrag || p.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {isOverdue && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-rose-700">Vervallen factuur</p>
                  <p className="text-xs text-rose-600">Vervaldatum: {formatDate(dueDate)}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-2 mb-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('pdf', item)}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('email', item)}>
              <Mail className="w-3.5 h-3.5 mr-1.5" /> E-mail
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('print', item)}>
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
            </Button>
          </div>
          {type === 'invoice' && item.status !== 'betaald' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onAction('payment', item)}>
                <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Betaling
              </Button>
              <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => onAction('markPaid', item)}>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Markeer Betaald
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Main Component
const VerkoopPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', dir: 'desc' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPayment, setNewPayment] = useState({
    bedrag: 0, datum: new Date().toISOString().split('T')[0], betaalmethode: 'bank', referentie: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [q, o, i] = await Promise.all([
        quotesAPI.getAll(), salesOrdersAPI.getAll(), invoicesAPI.getAll({ invoice_type: 'sales' })
      ]);
      setQuotes(q.data || []);
      setOrders(o.data || []);
      setInvoices(i.data || []);
    } catch { toast.error('Fout bij laden'); }
    finally { setLoading(false); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const paid = invoices.reduce((s, i) => s + (i.totaal_betaald || 0), 0);
    const open = invoices.reduce((s, i) => s + (i.openstaand_bedrag || 0), 0);
    const overdue = invoices.filter(i => i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < new Date());
    const overdueAmt = overdue.reduce((s, i) => s + (i.openstaand_bedrag || i.totaal_incl_btw || 0), 0);
    return { total, paid, open, overdueCount: overdue.length, overdueAmt, count: invoices.length };
  }, [invoices]);

  // Filter & Sort
  const getData = (data) => {
    let filtered = [...data];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const num = (item.factuurnummer || item.invoice_number || item.quote_number || item.order_number || '').toLowerCase();
        const cust = (item.debiteur_naam || item.customer_name || '').toLowerCase();
        return num.includes(t) || cust.includes(t);
      });
    }
    if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter);
    filtered.sort((a, b) => {
      let av, bv;
      if (sortConfig.key === 'amount') { av = a.totaal_incl_btw || a.total || 0; bv = b.totaal_incl_btw || b.total || 0; }
      else if (sortConfig.key === 'customer') { av = a.debiteur_naam || a.customer_name || ''; bv = b.debiteur_naam || b.customer_name || ''; }
      else { av = new Date(a.factuurdatum || a.date); bv = new Date(b.factuurdatum || b.date); }
      if (av < bv) return sortConfig.dir === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  };

  const filteredInvoices = getData(invoices);
  const filteredQuotes = getData(quotes);
  const filteredOrders = getData(orders);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const handleSelect = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (items) => {
    setSelectedItems(prev => prev.length === items.length ? [] : items.map(i => i.id));
  };

  const openDetail = (item) => { setDetailItem(item); setDetailOpen(true); };

  const handleAction = async (action, item) => {
    switch (action) {
      case 'pdf':
        try {
          const res = await pdfAPI.getInvoicePdf(item.id);
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.download = `factuur_${item.factuurnummer || item.invoice_number}.pdf`;
          link.click();
          toast.success('PDF gedownload');
        } catch { toast.error('Download mislukt'); }
        break;
      case 'email':
        toast.success('E-mail verstuurd');
        break;
      case 'print':
        window.print();
        break;
      case 'payment':
        setSelectedInvoice(item);
        setNewPayment({ bedrag: item.openstaand_bedrag || item.totaal_incl_btw || 0, datum: new Date().toISOString().split('T')[0], betaalmethode: 'bank', referentie: '' });
        setShowPaymentDialog(true);
        break;
      case 'markPaid':
        try {
          await invoicesAPI.updateStatus(item.id, 'betaald');
          toast.success('Factuur betaald');
          fetchData();
          setDetailOpen(false);
        } catch { toast.error('Actie mislukt'); }
        break;
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice || newPayment.bedrag <= 0) { toast.error('Ongeldig bedrag'); return; }
    setSaving(true);
    try {
      await invoicesAPI.addPayment(selectedInvoice.id, newPayment);
      toast.success('Betaling opgeslagen');
      setShowPaymentDialog(false);
      fetchData();
    } catch { toast.error('Fout bij opslaan'); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    const data = activeTab === 'invoices' ? filteredInvoices : activeTab === 'quotes' ? filteredQuotes : filteredOrders;
    const rows = data.map(i => [
      i.factuurnummer || i.invoice_number || i.quote_number || i.order_number,
      i.factuurdatum || i.date,
      i.debiteur_naam || i.customer_name,
      i.totaal_incl_btw || i.total,
      i.status
    ]);
    const csv = ['Nummer;Datum;Klant;Bedrag;Status', ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_export.csv`;
    link.click();
    toast.success('Geëxporteerd');
  };

  // Render Table
  const renderTable = (data, type) => {
    const items = type === 'invoice' ? filteredInvoices : type === 'quote' ? filteredQuotes : filteredOrders;
    
    return (
      <div className="border border-slate-200 rounded">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-10">
                <Checkbox checked={selectedItems.length === items.length && items.length > 0} onCheckedChange={() => handleSelectAll(items)} />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('number')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Nummer {sortConfig.key === 'number' && (sortConfig.dir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Datum {sortConfig.key === 'date' && (sortConfig.dir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('customer')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Relatie {sortConfig.key === 'customer' && (sortConfig.dir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-600 uppercase">
                {type === 'invoice' ? 'Vervaldatum' : type === 'quote' ? 'Geldig tot' : 'Leverdatum'}
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Bedrag {sortConfig.key === 'amount' && (sortConfig.dir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </div>
              </TableHead>
              {type === 'invoice' && <TableHead className="text-right text-[11px] font-semibold text-slate-600 uppercase">Open</TableHead>}
              <TableHead className="text-[11px] font-semibold text-slate-600 uppercase">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
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
            ) : items.length > 0 ? items.map(item => {
              const num = item.factuurnummer || item.invoice_number || item.quote_number || item.order_number;
              const date = item.factuurdatum || item.date;
              const cust = item.debiteur_naam || item.customer_name;
              const due = item.vervaldatum || item.due_date || item.valid_until || item.delivery_date;
              const total = item.totaal_incl_btw || item.total || 0;
              const openAmt = item.openstaand_bedrag || 0;
              const curr = item.valuta || item.currency || 'SRD';
              const isOverdue = type === 'invoice' && item.status !== 'betaald' && due && new Date(due) < new Date();

              return (
                <TableRow 
                  key={item.id} 
                  className={`cursor-pointer hover:bg-slate-50 ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''} ${isOverdue ? 'bg-rose-50/50' : ''}`}
                  onClick={() => openDetail(item)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => handleSelect(item.id)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-blue-600 hover:underline">{num}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{formatDate(date)}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">{cust}</TableCell>
                  <TableCell className={`text-sm ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                    {formatDate(due)} {isOverdue && <AlertCircle className="w-3 h-3 inline ml-1" />}
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold text-slate-900">{formatCurrency(total, curr)}</TableCell>
                  {type === 'invoice' && (
                    <TableCell className={`text-sm text-right font-medium ${openAmt > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {openAmt > 0 ? formatCurrency(openAmt, curr) : '-'}
                    </TableCell>
                  )}
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-slate-100 rounded"><MoreHorizontal className="w-4 h-4 text-slate-500" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openDetail(item)}><Eye className="w-4 h-4 mr-2" /> Bekijken</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('pdf', item)}><Download className="w-4 h-4 mr-2" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Bewerken</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Dupliceren</DropdownMenuItem>
                        {type === 'invoice' && item.status !== 'betaald' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction('payment', item)}><CreditCard className="w-4 h-4 mr-2" /> Betaling</DropdownMenuItem>
                            <DropdownMenuItem><Bell className="w-4 h-4 mr-2" /> Herinnering</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600"><Trash2 className="w-4 h-4 mr-2" /> Verwijderen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={type === 'invoice' ? 9 : 8} className="text-center py-12 text-slate-500">
                  Geen resultaten gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100" data-testid="verkoop-page">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-3 h-3" />
            <span>Boekhouding</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Verkoop</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1.5 hover:bg-slate-100 rounded"><Settings className="w-4 h-4 text-slate-500" /></button>
            <button className="p-1.5 hover:bg-slate-100 rounded"><HelpCircle className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Verkoop</h1>
            <p className="text-sm text-slate-500 mt-0.5">Beheer uw offertes, orders en facturen</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Nieuw <ChevronDown className="w-3 h-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}>
                  <Receipt className="w-4 h-4 mr-2" /> Nieuwe Factuur
                </DropdownMenuItem>
                <DropdownMenuItem><FileText className="w-4 h-4 mr-2" /> Nieuwe Offerte</DropdownMenuItem>
                <DropdownMenuItem><ShoppingCart className="w-4 h-4 mr-2" /> Nieuwe Order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Metrics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <MetricCard label="Totaal Gefactureerd" value={formatCurrency(stats.total)} subtext={`${stats.count} facturen`} variant="primary" />
          <MetricCard label="Ontvangen" value={formatCurrency(stats.paid)} subtext="Betaalde facturen" variant="success" />
          <MetricCard label="Openstaand" value={formatCurrency(stats.open)} subtext="Te ontvangen" variant="warning" />
          <MetricCard label="Vervallen" value={formatCurrency(stats.overdueAmt)} subtext={`${stats.overdueCount} facturen`} variant="danger" />
          <MetricCard label="Offertes" value={quotes.length.toString()} subtext={`${quotes.filter(q => q.status === 'verzonden').length} verzonden`} />
        </div>

        {/* Main Content Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-0">
                <TabButton active={activeTab === 'invoices'} onClick={() => { setActiveTab('invoices'); setSelectedItems([]); }} count={invoices.length}>
                  <Receipt className="w-4 h-4 mr-1.5 inline" /> Facturen
                </TabButton>
                <TabButton active={activeTab === 'quotes'} onClick={() => { setActiveTab('quotes'); setSelectedItems([]); }} count={quotes.length}>
                  <FileText className="w-4 h-4 mr-1.5 inline" /> Offertes
                </TabButton>
                <TabButton active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSelectedItems([]); }} count={orders.length}>
                  <ShoppingCart className="w-4 h-4 mr-1.5 inline" /> Orders
                </TabButton>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-sm text-slate-600">{selectedItems.length} geselecteerd</span>
                  <div className="h-4 w-px bg-slate-300 mx-2" />
                  <Button variant="ghost" size="sm"><Send className="w-3.5 h-3.5 mr-1" /> Verzenden</Button>
                  <Button variant="ghost" size="sm"><Bell className="w-3.5 h-3.5 mr-1" /> Herinnering</Button>
                  <Button variant="ghost" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1" /> Exporteren</Button>
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5 mr-1" /> Verwijderen</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Vernieuwen</Button>
                  <Button variant="ghost" size="sm" onClick={handleExport}><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exporteren</Button>
                  <Button variant="ghost" size="sm"><Printer className="w-3.5 h-3.5 mr-1" /> Afdrukken</Button>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {activeTab === 'invoices' && `${filteredInvoices.length} van ${invoices.length} facturen`}
              {activeTab === 'quotes' && `${filteredQuotes.length} van ${quotes.length} offertes`}
              {activeTab === 'orders' && `${filteredOrders.length} van ${orders.length} orders`}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoeken op nummer of relatie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
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
          </div>

          {/* Table */}
          <div className="p-4">
            {activeTab === 'invoices' && renderTable(invoices, 'invoice')}
            {activeTab === 'quotes' && renderTable(quotes, 'quote')}
            {activeTab === 'orders' && renderTable(orders, 'order')}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
            Laatste update: {new Date().toLocaleString('nl-NL')}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        item={detailItem}
        type={activeTab === 'invoices' ? 'invoice' : activeTab === 'quotes' ? 'quote' : 'order'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAction={handleAction}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling Registreren</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Factuur</p>
                  <p className="text-sm font-semibold">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Openstaand</p>
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Bedrag *</Label>
                  <Input type="number" step="0.01" value={newPayment.bedrag} onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input type="date" value={newPayment.datum} onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Betaalmethode</Label>
                  <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bankoverschrijving</SelectItem>
                      <SelectItem value="kas">Contant</SelectItem>
                      <SelectItem value="pin">PIN</SelectItem>
                      <SelectItem value="ideal">iDEAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Referentie</Label>
                  <Input value={newPayment.referentie} onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})} placeholder="Optioneel" className="h-9" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(false)}>Annuleren</Button>
            <Button size="sm" onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
