import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, pdfAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card } from '../../components/ui/card';
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
  AlertCircle, ChevronDown, ChevronRight, FileSpreadsheet,
  Bell, X, Edit, Clock, Home, Settings, HelpCircle, Filter,
  Calendar, ArrowUpDown, Star, Archive, RotateCcw, Link2,
  TrendingUp, TrendingDown, DollarSign, Users, Percent,
  FileCheck, FileClock, FileX, ChevronUp, BarChart2, PieChart
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '../../components/ui/dropdown-menu';

// Currency formatter
const formatCurrency = (amount, currency = 'SRD') => {
  const num = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));
  return currency === 'USD' ? `$ ${num}` : currency === 'EUR' ? `€ ${num}` : `SRD ${num}`;
};

// Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-slate-100 text-slate-600 border-slate-200',
    verzonden: 'bg-sky-50 text-sky-700 border-sky-200',
    betaald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    herinnering: 'bg-amber-50 text-amber-700 border-amber-200',
    geaccepteerd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    nieuw: 'bg-sky-50 text-sky-700 border-sky-200'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${styles[status] || styles.concept}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// Metric Card
const MetricCard = ({ label, value, subValue, icon: Icon, variant = 'default', trend, onClick }) => {
  const variants = {
    default: 'border-l-slate-300',
    primary: 'border-l-blue-500',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500'
  };
  return (
    <div 
      className={`bg-white border border-slate-200 border-l-4 ${variants[variant]} p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
          {subValue && <p className="text-[11px] text-slate-400 mt-0.5">{subValue}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {trend > 0 ? '+' : ''}{trend}% vs vorige maand
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Filter Chip
const FilterChip = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700 border-blue-200' 
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
        {count}
      </span>
    )}
  </button>
);

// Tab Button
const TabButton = ({ active, onClick, icon: Icon, label, count, alert }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active 
        ? 'border-blue-600 text-blue-600' 
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
      {count}
    </span>
    {alert && <span className="absolute top-2 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
  </button>
);

// Detail Sidebar
const DetailSidebar = ({ item, type, open, onClose, onAction }) => {
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
  const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-xl z-50 flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{number}</h2>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm text-slate-500">{customer}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-slate-200 rounded" title="Favoriet">
              <Star className="w-4 h-4 text-slate-400" />
            </button>
            <button className="p-1.5 hover:bg-slate-200 rounded" onClick={onClose}>
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-white">
          <Button variant="outline" size="sm" onClick={() => onAction('pdf', item)}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction('email', item)}>
            <Mail className="w-3.5 h-3.5 mr-1.5" /> E-mail
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction('print', item)}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Meer <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('duplicate', item)}>
                <Copy className="w-4 h-4 mr-2" /> Dupliceren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('edit', item)}>
                <Edit className="w-4 h-4 mr-2" /> Bewerken
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link2 className="w-4 h-4 mr-2" /> Link kopiëren
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" /> Archiveren
              </DropdownMenuItem>
              <DropdownMenuItem className="text-rose-600">
                <Trash2 className="w-4 h-4 mr-2" /> Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Overdue Alert */}
            {isOverdue && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-rose-700">Factuur is {daysOverdue} dagen vervallen</p>
                  <p className="text-xs text-rose-600 mt-0.5">Vervaldatum was {formatDate(dueDate)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-100" onClick={() => onAction('reminder', item)}>
                      <Bell className="w-3 h-3 mr-1" /> Herinnering sturen
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-100" onClick={() => onAction('call', item)}>
                      <Phone className="w-3 h-3 mr-1" /> Bellen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Factuurdatum</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(date)}</p>
              </div>
              <div className={`rounded-lg p-3 ${isOverdue ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <p className="text-[10px] font-medium text-slate-400 uppercase">Vervaldatum</p>
                <p className={`text-sm font-medium mt-1 ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>{formatDate(dueDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Valuta</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{currency}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase">Betaaltermijn</p>
                <p className="text-sm font-medium text-slate-900 mt-1">30 dagen</p>
              </div>
            </div>

            {/* Amounts */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Bedragen</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotaal</span>
                  <span className="text-slate-900">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">BTW (15%)</span>
                  <span className="text-slate-900">{formatCurrency(tax, currency)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-slate-900">Totaal</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(total, currency)}</span>
                </div>
                {type === 'invoice' && paid > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Betaald</span>
                    <span className="font-medium">- {formatCurrency(paid, currency)}</span>
                  </div>
                )}
                {type === 'invoice' && openAmount > 0 && (
                  <div className="bg-amber-50 -mx-3 px-3 py-2 border-t border-amber-200 flex justify-between">
                    <span className="text-sm font-semibold text-amber-700">Openstaand</span>
                    <span className="text-base font-bold text-amber-700">{formatCurrency(openAmount, currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Klantgegevens</p>
                <button className="text-[11px] text-blue-600 hover:underline">Bekijk klant</button>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                    {customer.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{customer}</p>
                    <p className="text-xs text-slate-500">Klant sinds 2024</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {item.debiteur_email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${item.debiteur_email}`} className="hover:text-blue-600">{item.debiteur_email}</a>
                    </div>
                  )}
                  {item.debiteur_telefoon && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{item.debiteur_telefoon}</span>
                    </div>
                  )}
                  {item.debiteur_adres && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{item.debiteur_adres}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lines */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Factuurregels ({lines.length})</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Omschrijving</th>
                    <th className="text-center px-2 py-2 text-[10px] font-semibold text-slate-500 uppercase">Aantal</th>
                    <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="text-slate-900">{line.omschrijving || line.description}</p>
                        <p className="text-[11px] text-slate-400">@ {formatCurrency(line.prijs || line.price || 0, currency)} per stuk</p>
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{line.aantal || line.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(line.totaal || line.total, currency)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">Geen regels</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments */}
            {type === 'invoice' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Betalingen ({payments.length})</p>
                  {item.status !== 'betaald' && (
                    <button 
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                      onClick={() => onAction('payment', item)}
                    >
                      <Plus className="w-3 h-3" /> Betaling toevoegen
                    </button>
                  )}
                </div>
                {payments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {payments.map((p, idx) => (
                      <div key={idx} className="px-3 py-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-900">{formatDate(p.datum || p.date)}</p>
                            <p className="text-[11px] text-slate-500 capitalize">{p.betaalmethode || p.method}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(p.bedrag || p.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center text-slate-400 text-sm">Nog geen betalingen ontvangen</div>
                )}
              </div>
            )}

            {/* Activity Log */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Activiteit</p>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <FileText className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">Factuur aangemaakt</p>
                    <p className="text-[11px] text-slate-400">{formatDate(date)} • Systeem</p>
                  </div>
                </div>
                {item.status === 'verzonden' && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center mt-0.5">
                      <Send className="w-3 h-3 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-900">Factuur verzonden</p>
                      <p className="text-[11px] text-slate-400">{formatDate(date)} • Per e-mail</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        {type === 'invoice' && item.status !== 'betaald' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onAction('payment', item)}>
              <CreditCard className="w-4 h-4 mr-2" /> Betaling Registreren
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction('markPaid', item)}>
              <CheckCircle className="w-4 h-4 mr-2" /> Markeer als Betaald
            </Button>
          </div>
        )}
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
  const [quickFilter, setQuickFilter] = useState('all');
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
    const now = new Date();
    const total = invoices.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const paid = invoices.reduce((s, i) => s + (i.totaal_betaald || 0), 0);
    const open = invoices.reduce((s, i) => s + (i.openstaand_bedrag || 0), 0);
    const overdue = invoices.filter(i => i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < now);
    const overdueAmt = overdue.reduce((s, i) => s + (i.openstaand_bedrag || i.totaal_incl_btw || 0), 0);
    const paidCount = invoices.filter(i => i.status === 'betaald').length;
    const openCount = invoices.filter(i => i.status !== 'betaald').length;
    
    // This month vs last month
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.factuurdatum || i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = invoices.filter(i => {
      const d = new Date(i.factuurdatum || i.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const thisMonthTotal = thisMonth.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const lastMonthTotal = lastMonth.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const trend = lastMonthTotal > 0 ? Math.round((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;
    
    return { total, paid, open, overdueCount: overdue.length, overdueAmt, count: invoices.length, paidCount, openCount, trend };
  }, [invoices]);

  // Filters
  const getData = (data) => {
    let filtered = [...data];
    
    // Quick filter
    const now = new Date();
    if (quickFilter === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      filtered = filtered.filter(i => new Date(i.factuurdatum || i.date) >= weekAgo);
    } else if (quickFilter === 'month') {
      filtered = filtered.filter(i => {
        const d = new Date(i.factuurdatum || i.date);
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
      });
    } else if (quickFilter === 'overdue') {
      filtered = filtered.filter(i => i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < new Date());
    } else if (quickFilter === 'unpaid') {
      filtered = filtered.filter(i => i.status !== 'betaald');
    }
    
    // Search
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const num = (item.factuurnummer || item.invoice_number || item.quote_number || item.order_number || '').toLowerCase();
        const cust = (item.debiteur_naam || item.customer_name || '').toLowerCase();
        return num.includes(t) || cust.includes(t);
      });
    }
    
    // Status
    if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter);
    
    // Sort
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
      case 'email': toast.success('E-mail verstuurd naar klant'); break;
      case 'print': window.print(); break;
      case 'duplicate': toast.success('Factuur gedupliceerd'); break;
      case 'reminder': toast.success('Herinnering verstuurd'); break;
      case 'call': toast.info('Telefoon functie'); break;
      case 'payment':
        setSelectedInvoice(item);
        setNewPayment({ bedrag: item.openstaand_bedrag || item.totaal_incl_btw || 0, datum: new Date().toISOString().split('T')[0], betaalmethode: 'bank', referentie: '' });
        setShowPaymentDialog(true);
        break;
      case 'markPaid':
        try {
          await invoicesAPI.updateStatus(item.id, 'betaald');
          toast.success('Factuur gemarkeerd als betaald');
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

  const handleExport = (format) => {
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
    toast.success(`${format.toUpperCase()} geëxporteerd`);
  };

  const handleBulkAction = (action) => {
    const count = selectedItems.length;
    if (count === 0) return;
    switch (action) {
      case 'send': toast.success(`${count} facturen verzonden`); break;
      case 'reminder': toast.success(`Herinneringen verstuurd (${count})`); break;
      case 'export': handleExport('csv'); break;
      case 'delete':
        if (window.confirm(`${count} items verwijderen?`)) toast.success('Items verwijderd');
        break;
    }
    setSelectedItems([]);
  };

  // Render Table
  const renderTable = (type) => {
    const items = type === 'invoice' ? filteredInvoices : type === 'quote' ? filteredQuotes : filteredOrders;
    
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-10 pl-4">
                <Checkbox checked={selectedItems.length === items.length && items.length > 0} onCheckedChange={() => handleSelectAll(items)} />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('number')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Nummer <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Datum <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('customer')}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Relatie <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-600 uppercase">
                {type === 'invoice' ? 'Vervaldatum' : type === 'quote' ? 'Geldig tot' : 'Leverdatum'}
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600 uppercase">
                  Bedrag <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              {type === 'invoice' && <TableHead className="text-right text-[11px] font-semibold text-slate-600 uppercase">Open</TableHead>}
              <TableHead className="text-[11px] font-semibold text-slate-600 uppercase">Status</TableHead>
              <TableHead className="w-10 pr-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
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
              const isSelected = selectedItems.includes(item.id);

              return (
                <TableRow 
                  key={item.id} 
                  className={`cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''} ${isOverdue ? 'bg-rose-50/50' : ''}`}
                  onClick={() => openDetail(item)}
                >
                  <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(item.id)} />
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
                  <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-slate-100 rounded"><MoreHorizontal className="w-4 h-4 text-slate-400" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openDetail(item)}><Eye className="w-4 h-4 mr-2" /> Bekijken</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('pdf', item)}><Download className="w-4 h-4 mr-2" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('email', item)}><Mail className="w-4 h-4 mr-2" /> E-mail versturen</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Bewerken</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('duplicate', item)}><Copy className="w-4 h-4 mr-2" /> Dupliceren</DropdownMenuItem>
                        {type === 'invoice' && item.status !== 'betaald' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction('payment', item)}><CreditCard className="w-4 h-4 mr-2" /> Betaling</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('reminder', item)}><Bell className="w-4 h-4 mr-2" /> Herinnering</DropdownMenuItem>
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
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Home className="w-4 h-4 text-slate-400" />
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-500">Boekhouding</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-900 font-medium">Verkoop</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-slate-100 rounded"><Settings className="w-4 h-4 text-slate-400" /></button>
            <button className="p-1.5 hover:bg-slate-100 rounded"><HelpCircle className="w-4 h-4 text-slate-400" /></button>
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
                <Button variant="outline">
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
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard label="Totaal Gefactureerd" value={formatCurrency(stats.total)} subValue={`${stats.count} facturen`} icon={DollarSign} variant="primary" trend={stats.trend} />
          <MetricCard label="Ontvangen" value={formatCurrency(stats.paid)} subValue={`${stats.paidCount} betaald`} icon={CheckCircle} variant="success" />
          <MetricCard label="Openstaand" value={formatCurrency(stats.open)} subValue={`${stats.openCount} facturen`} icon={Clock} variant="warning" onClick={() => setQuickFilter(quickFilter === 'unpaid' ? 'all' : 'unpaid')} />
          <MetricCard label="Vervallen" value={formatCurrency(stats.overdueAmt)} subValue={`${stats.overdueCount} facturen`} icon={AlertCircle} variant="danger" onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')} />
          <MetricCard label="Offertes" value={quotes.length.toString()} subValue={`${quotes.filter(q => q.status === 'verzonden').length} verzonden`} icon={FileText} />
        </div>

        {/* Main Card */}
        <Card className="bg-white border-slate-200">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 flex items-center justify-between">
            <div className="flex">
              <TabButton active={activeTab === 'invoices'} onClick={() => { setActiveTab('invoices'); setSelectedItems([]); }} icon={Receipt} label="Facturen" count={invoices.length} alert={stats.overdueCount > 0} />
              <TabButton active={activeTab === 'quotes'} onClick={() => { setActiveTab('quotes'); setSelectedItems([]); }} icon={FileText} label="Offertes" count={quotes.length} />
              <TabButton active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSelectedItems([]); }} icon={ShoppingCart} label="Orders" count={orders.length} />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><BarChart2 className="w-4 h-4 mr-1.5" /> Rapportage</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem><PieChart className="w-4 h-4 mr-2" /> Omzet overzicht</DropdownMenuItem>
                  <DropdownMenuItem><TrendingUp className="w-4 h-4 mr-2" /> Verkooptrend</DropdownMenuItem>
                  <DropdownMenuItem><Users className="w-4 h-4 mr-2" /> Top klanten</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-2">Snel filter:</span>
            <FilterChip label="Alles" active={quickFilter === 'all'} onClick={() => setQuickFilter('all')} />
            <FilterChip label="Deze week" active={quickFilter === 'week'} onClick={() => setQuickFilter('week')} />
            <FilterChip label="Deze maand" active={quickFilter === 'month'} onClick={() => setQuickFilter('month')} />
            <FilterChip label="Openstaand" count={stats.openCount} active={quickFilter === 'unpaid'} onClick={() => setQuickFilter('unpaid')} />
            <FilterChip label="Vervallen" count={stats.overdueCount} active={quickFilter === 'overdue'} onClick={() => setQuickFilter('overdue')} />
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-sm text-slate-600">{selectedItems.length} geselecteerd</span>
                  <div className="w-px h-5 bg-slate-300 mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('send')}><Send className="w-4 h-4 mr-1" /> Verzenden</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('reminder')}><Bell className="w-4 h-4 mr-1" /> Herinnering</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('export')}><Download className="w-4 h-4 mr-1" /> Exporteren</Button>
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => handleBulkAction('delete')}><Trash2 className="w-4 h-4 mr-1" /> Verwijderen</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1" /> Vernieuwen</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><FileSpreadsheet className="w-4 h-4 mr-1" /> Exporteren <ChevronDown className="w-3 h-3 ml-1" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm"><Printer className="w-4 h-4 mr-1" /> Afdrukken</Button>
                </>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {activeTab === 'invoices' && `${filteredInvoices.length} van ${invoices.length}`}
              {activeTab === 'quotes' && `${filteredQuotes.length} van ${quotes.length}`}
              {activeTab === 'orders' && `${filteredOrders.length} van ${orders.length}`}
            </span>
          </div>

          {/* Filters Row */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Zoeken op nummer of relatie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <Filter className="w-4 h-4 mr-1.5 text-slate-400" />
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
            {activeTab === 'invoices' && renderTable('invoice')}
            {activeTab === 'quotes' && renderTable('quote')}
            {activeTab === 'orders' && renderTable('order')}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
            <span>Laatste update: {new Date().toLocaleString('nl-NL')}</span>
            <span>Pagina 1 van 1</span>
          </div>
        </Card>
      </div>

      {/* Detail Sidebar */}
      <DetailSidebar
        item={detailItem}
        type={activeTab === 'invoices' ? 'invoice' : activeTab === 'quotes' ? 'quote' : 'order'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAction={handleAction}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaling Registreren</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between">
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
                  <Input type="number" step="0.01" value={newPayment.bedrag} onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input type="date" value={newPayment.datum} onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})} className="mt-1 h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Betaalmethode</Label>
                  <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
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
                  <Input value={newPayment.referentie} onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})} placeholder="Optioneel" className="mt-1 h-9" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Annuleren</Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
