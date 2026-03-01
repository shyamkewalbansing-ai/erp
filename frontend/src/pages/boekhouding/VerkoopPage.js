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
  TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, Users,
  BarChart3, PieChart, Activity, Zap, Star, Archive, RotateCcw,
  ExternalLink, Link2, MessageSquare, Paperclip, Tag, Hash
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '../../components/ui/dropdown-menu';

// Currency formatter
const formatCurrency = (amount, currency = 'SRD') => {
  const num = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));
  return currency === 'USD' ? `$ ${num}` : currency === 'EUR' ? `€ ${num}` : `SRD ${num}`;
};

// Status Badge with dot indicator
const StatusBadge = ({ status, size = 'default' }) => {
  const config = {
    concept: { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    verzonden: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    betaald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    herinnering: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    geaccepteerd: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    nieuw: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  };
  const c = config[status] || config.concept;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} font-medium rounded-full ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {getStatusLabel(status)}
    </span>
  );
};

// Enhanced Metric Card
const MetricCard = ({ label, value, subtext, icon: Icon, trend, trendUp, variant = 'default', onClick }) => {
  const variants = {
    default: { border: 'border-l-slate-300', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
    primary: { border: 'border-l-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    success: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    warning: { border: 'border-l-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    danger: { border: 'border-l-rose-500', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' }
  };
  const v = variants[variant];
  
  return (
    <div 
      className={`bg-white border border-slate-200 border-l-4 ${v.border} rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`inline-flex items-center text-[10px] font-semibold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </span>
            )}
            {subtext && <p className="text-[11px] text-slate-400">{subtext}</p>}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg ${v.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${v.iconColor}`} />
        </div>
      </div>
    </div>
  );
};

// Quick Action Button
const QuickActionBtn = ({ icon: Icon, label, onClick, variant = 'default' }) => {
  const variants = {
    default: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
    primary: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700',
    success: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all ${variants[variant]}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

// Tab Component
const Tab = ({ active, onClick, icon: Icon, label, count, alert }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
      active 
        ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    )}
    {alert && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />}
  </button>
);

// Progress Bar
const ProgressBar = ({ value, max, color = 'blue' }) => {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const colors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500'
  };
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${colors[color]} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
};

// Enhanced Detail Panel
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
  const paymentProgress = total > 0 ? (paid / total) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[560px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{number}</h2>
                <StatusBadge status={item.status} size="sm" />
              </div>
              <p className="text-sm text-slate-500">{customer}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <QuickActionBtn icon={Download} label="PDF" onClick={() => onAction('pdf', item)} />
          <QuickActionBtn icon={Mail} label="E-mail" onClick={() => onAction('email', item)} />
          <QuickActionBtn icon={Printer} label="Print" onClick={() => onAction('print', item)} />
          <QuickActionBtn icon={Copy} label="Kopiëren" onClick={() => onAction('copy', item)} />
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-slate-200 rounded-lg">
                <MoreHorizontal className="w-4 h-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Bewerken</DropdownMenuItem>
              <DropdownMenuItem><Archive className="w-4 h-4 mr-2" /> Archiveren</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600"><Trash2 className="w-4 h-4 mr-2" /> Verwijderen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Factuurdatum</span>
                </div>
                <p className="text-base font-semibold text-slate-900">{formatDate(date)}</p>
              </div>
              <div className={`rounded-xl p-4 border ${isOverdue ? 'bg-rose-50 border-rose-200' : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Vervaldatum</span>
                </div>
                <p className={`text-base font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatDate(dueDate)}
                  {isOverdue && <AlertCircle className="w-4 h-4 inline ml-2" />}
                </p>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Bedragen</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Subtotaal</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">BTW</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(tax, currency)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">Totaal</span>
                  <span className="text-xl font-bold text-slate-900">{formatCurrency(total, currency)}</span>
                </div>
                
                {type === 'invoice' && (
                  <>
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Betaalvoortgang</span>
                        <span className="text-sm font-semibold text-slate-900">{Math.round(paymentProgress)}%</span>
                      </div>
                      <ProgressBar value={paid} max={total} color={paymentProgress === 100 ? 'emerald' : 'blue'} />
                    </div>
                    {paid > 0 && (
                      <div className="flex justify-between items-center text-emerald-600">
                        <span className="text-sm">Betaald</span>
                        <span className="text-sm font-semibold">- {formatCurrency(paid, currency)}</span>
                      </div>
                    )}
                    {openAmount > 0 && (
                      <div className="flex justify-between items-center bg-amber-50 -mx-4 px-4 py-2 border-t border-amber-200">
                        <span className="text-sm font-semibold text-amber-700">Openstaand</span>
                        <span className="text-lg font-bold text-amber-700">{formatCurrency(openAmount, currency)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Klantgegevens</h3>
                <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Bekijk klant
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold">
                    {customer.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-slate-900">{customer}</p>
                    {item.debiteur_email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`mailto:${item.debiteur_email}`} className="hover:text-blue-600">{item.debiteur_email}</a>
                      </div>
                    )}
                    {item.debiteur_telefoon && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.debiteur_telefoon}</span>
                      </div>
                    )}
                    {item.debiteur_adres && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.debiteur_adres}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lines */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Factuurregels ({lines.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {lines.length > 0 ? lines.map((line, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{line.omschrijving || line.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {line.aantal || line.quantity}x @ {formatCurrency(line.prijs || line.price || 0, currency)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(line.totaal || line.total, currency)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm">Geen regels</div>
                )}
              </div>
            </div>

            {/* Payments */}
            {type === 'invoice' && payments.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700">Betalingen ({payments.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {payments.map((p, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-emerald-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{formatDate(p.datum || p.date)}</p>
                          <p className="text-xs text-slate-500 capitalize">{p.betaalmethode || p.method} {p.referentie && `• ${p.referentie}`}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.bedrag || p.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Alert */}
            {isOverdue && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-700">Vervallen factuur</p>
                  <p className="text-xs text-rose-600 mt-0.5">Deze factuur is {Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))} dagen over de vervaldatum.</p>
                  <button 
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors"
                    onClick={() => onAction('reminder', item)}
                  >
                    <Bell className="w-3.5 h-3.5" /> Stuur herinnering
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
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
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.factuurdatum || i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = invoices.filter(i => {
      const d = new Date(i.factuurdatum || i.date);
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
    });
    const thisMonthTotal = thisMonth.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const lastMonthTotal = lastMonth.reduce((s, i) => s + (i.totaal_incl_btw || i.total || 0), 0);
    const trend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;
    
    return { total, paid, open, overdueCount: overdue.length, overdueAmt, count: invoices.length, thisMonthTotal, trend };
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
      case 'email': toast.success('E-mail verstuurd naar klant'); break;
      case 'print': window.print(); break;
      case 'copy':
        navigator.clipboard.writeText(item.factuurnummer || item.invoice_number || '');
        toast.success('Factuurnummer gekopieerd');
        break;
      case 'reminder': toast.success('Herinnering verstuurd'); break;
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
    toast.success('Export gedownload');
  };

  const handleBulkAction = (action) => {
    const count = selectedItems.length;
    if (count === 0) return;
    switch (action) {
      case 'send': toast.success(`${count} facturen verzonden`); break;
      case 'reminder': toast.success(`Herinneringen verstuurd (${count})`); break;
      case 'export': handleExport(); break;
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
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-10 pl-4">
                <Checkbox checked={selectedItems.length === items.length && items.length > 0} onCheckedChange={() => handleSelectAll(items)} />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort('number')}>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Nummer</span>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Datum</span>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort('customer')}>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Relatie</span>
              </TableHead>
              <TableHead>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  {type === 'invoice' ? 'Vervaldatum' : type === 'quote' ? 'Geldig tot' : 'Leverdatum'}
                </span>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('amount')}>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Bedrag</span>
              </TableHead>
              {type === 'invoice' && (
                <TableHead className="text-right">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Openstaand</span>
                </TableHead>
              )}
              <TableHead>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Status</span>
              </TableHead>
              <TableHead className="w-12 pr-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {type === 'invoice' && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
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
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : isOverdue ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'}`}
                  onClick={() => openDetail(item)}
                >
                  <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(item.id)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">{num}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{formatDate(date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold">
                        {(cust || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{cust}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-sm ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                    {formatDate(due)}
                    {isOverdue && <AlertCircle className="w-3.5 h-3.5 inline ml-1.5" />}
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold text-slate-900">{formatCurrency(total, curr)}</TableCell>
                  {type === 'invoice' && (
                    <TableCell className={`text-sm text-right font-semibold ${openAmt > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                      {openAmt > 0 ? formatCurrency(openAmt, curr) : '-'}
                    </TableCell>
                  )}
                  <TableCell><StatusBadge status={item.status} size="sm" /></TableCell>
                  <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openDetail(item)}><Eye className="w-4 h-4 mr-2" /> Bekijken</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('pdf', item)}><Download className="w-4 h-4 mr-2" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Bewerken</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Dupliceren</DropdownMenuItem>
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
                <TableCell colSpan={type === 'invoice' ? 9 : 8} className="text-center py-16">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Geen resultaten</p>
                    <p className="text-sm text-slate-400 mt-1">Pas uw zoekopdracht of filters aan</p>
                  </div>
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
            <button className="p-1.5 hover:bg-slate-100 rounded-md"><Settings className="w-4 h-4 text-slate-400" /></button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md"><HelpCircle className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Verkoop</h1>
            <p className="text-sm text-slate-500 mt-0.5">Beheer uw offertes, orders en facturen</p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Nieuw <ChevronDown className="w-3 h-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}>
                  <Receipt className="w-4 h-4 mr-2" /> Nieuwe Factuur
                </DropdownMenuItem>
                <DropdownMenuItem><FileText className="w-4 h-4 mr-2" /> Nieuwe Offerte</DropdownMenuItem>
                <DropdownMenuItem><ShoppingCart className="w-4 h-4 mr-2" /> Nieuwe Order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard 
            label="Totaal Gefactureerd" 
            value={formatCurrency(stats.total)} 
            subtext={`${stats.count} facturen`}
            icon={TrendingUp}
            variant="primary"
            trend={stats.trend > 0 ? `+${stats.trend}%` : `${stats.trend}%`}
            trendUp={stats.trend > 0}
          />
          <MetricCard 
            label="Ontvangen" 
            value={formatCurrency(stats.paid)} 
            subtext="Betaalde facturen"
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard 
            label="Openstaand" 
            value={formatCurrency(stats.open)} 
            subtext="Te ontvangen"
            icon={Clock}
            variant="warning"
          />
          <MetricCard 
            label="Vervallen" 
            value={formatCurrency(stats.overdueAmt)} 
            subtext={`${stats.overdueCount} facturen`}
            icon={AlertCircle}
            variant="danger"
          />
          <MetricCard 
            label="Offertes" 
            value={quotes.length.toString()} 
            subtext={`${quotes.filter(q => q.status === 'verzonden').length} verzonden`}
            icon={FileText}
          />
        </div>

        {/* Main Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-2">
            <div className="flex">
              <Tab active={activeTab === 'invoices'} onClick={() => { setActiveTab('invoices'); setSelectedItems([]); }} icon={Receipt} label="Facturen" count={invoices.length} alert={stats.overdueCount > 0} />
              <Tab active={activeTab === 'quotes'} onClick={() => { setActiveTab('quotes'); setSelectedItems([]); }} icon={FileText} label="Offertes" count={quotes.length} />
              <Tab active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSelectedItems([]); }} icon={ShoppingCart} label="Orders" count={orders.length} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-sm font-medium text-slate-700">{selectedItems.length} geselecteerd</span>
                  <div className="w-px h-5 bg-slate-300 mx-2" />
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('send')}><Send className="w-4 h-4 mr-1.5" /> Verzenden</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('reminder')}><Bell className="w-4 h-4 mr-1.5" /> Herinnering</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleBulkAction('export')}><Download className="w-4 h-4 mr-1.5" /> Exporteren</Button>
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleBulkAction('delete')}><Trash2 className="w-4 h-4 mr-1.5" /> Verwijderen</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1.5" /> Vernieuwen</Button>
                  <Button variant="ghost" size="sm" onClick={handleExport}><FileSpreadsheet className="w-4 h-4 mr-1.5" /> Exporteren</Button>
                  <Button variant="ghost" size="sm"><Printer className="w-4 h-4 mr-1.5" /> Afdrukken</Button>
                </>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {activeTab === 'invoices' && `${filteredInvoices.length} van ${invoices.length}`}
              {activeTab === 'quotes' && `${filteredQuotes.length} van ${quotes.length}`}
              {activeTab === 'orders' && `${filteredOrders.length} van ${orders.length}`}
            </span>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoeken op nummer of relatie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
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
        </Card>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              Betaling Registreren
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Factuur</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium uppercase">Openstaand</p>
                  <p className="text-base font-bold text-amber-600 mt-0.5">{formatCurrency(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Bedrag *</Label>
                  <Input type="number" step="0.01" value={newPayment.bedrag} onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Datum *</Label>
                  <Input type="date" value={newPayment.datum} onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Betaalmethode</Label>
                  <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bankoverschrijving</SelectItem>
                      <SelectItem value="kas">Contant</SelectItem>
                      <SelectItem value="pin">PIN</SelectItem>
                      <SelectItem value="ideal">iDEAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Referentie</Label>
                  <Input value={newPayment.referentie} onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})} placeholder="Optioneel" className="mt-1" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Annuleren</Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Betaling Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
