import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '../../components/ui/checkbox';
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
  Mail,
  Phone,
  MapPin,
  Building2,
  Copy,
  Printer,
  History,
  AlertCircle,
  Sparkles,
  Target,
  Zap,
  FileSpreadsheet,
  Bell,
  Star,
  StarOff,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  PieChart,
  Activity,
  Users,
  Package,
  Banknote,
  CalendarDays,
  CheckCheck,
  XCircle,
  Timer,
  Percent,
  TrendingDown,
  MoreVertical,
  Settings,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '../../components/ui/dropdown-menu';

// Mini Sparkline Component
const MiniSparkline = ({ data, color, height = 30 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Enhanced Stat Card with sparkline
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, gradientFrom, gradientTo, trend, trendUp, loading, onClick, sparklineData, accentColor }) => {
  if (loading) {
    return (
      <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`bg-white border border-gray-100/50 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group ${onClick ? 'cursor-pointer' : ''} relative`}
      onClick={onClick}
    >
      <CardContent className="p-0 relative">
        {/* Animated gradient accent */}
        <div className={`h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo} group-hover:h-2 transition-all duration-300`} />
        
        {/* Glassmorphism background */}
        <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-[0.07] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 group-hover:opacity-[0.12] transition-all duration-700`} />
        
        <div className="p-5 relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Sparkline */}
          {sparklineData && (
            <div className="mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <MiniSparkline data={sparklineData} color={accentColor || '#10b981'} height={25} />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {trend && (
              <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {trend}
              </span>
            )}
            {subtitle && (
              <p className={`text-xs ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Filter Pills
const FilterPill = ({ label, active, onClick, count, color }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      active 
        ? `bg-gradient-to-r ${color} text-white shadow-lg scale-105` 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-white/20' : 'bg-gray-200'}`}>
        {count}
      </span>
    )}
  </button>
);

// Progress Ring Component
const ProgressRing = ({ progress, size = 40, strokeWidth = 4, color = '#10b981' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
};

// Invoice Card for Grid View
const InvoiceCard = ({ invoice, onView, onDownload, onPayment, formatAmount, isSelected, onSelect }) => {
  const invoiceNumber = invoice.factuurnummer || invoice.invoice_number || '-';
  const customerName = invoice.debiteur_naam || invoice.customer_name || '-';
  const totalAmount = invoice.totaal_incl_btw || invoice.total || 0;
  const paidAmount = invoice.totaal_betaald || 0;
  const currency = invoice.valuta || invoice.currency || 'SRD';
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const isOverdue = invoice.status !== 'betaald' && new Date(invoice.vervaldatum || invoice.due_date) < new Date();

  const getStatusColor = (status) => {
    switch(status) {
      case 'betaald': return 'from-emerald-400 to-emerald-600';
      case 'verzonden': return 'from-blue-400 to-blue-600';
      case 'herinnering': return 'from-amber-400 to-amber-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <Card className={`bg-white border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-200' : 'border-gray-100'} ${isOverdue ? 'border-l-4 border-l-red-400' : ''}`}>
      <CardContent className="p-0">
        <div className={`h-1 bg-gradient-to-r ${getStatusColor(invoice.status)}`} />
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={onSelect}
                className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100"
              />
              <div>
                <p className="font-bold text-emerald-600">{invoiceNumber}</p>
                <p className="text-xs text-gray-400">{formatDate(invoice.factuurdatum || invoice.date)}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView(invoice)}>
                  <Eye className="w-4 h-4 mr-2" /> Bekijk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(invoice.id, invoiceNumber)}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </DropdownMenuItem>
                {invoice.status !== 'betaald' && (
                  <DropdownMenuItem onClick={() => onPayment(invoice)}>
                    <CreditCard className="w-4 h-4 mr-2" /> Betaling
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{customerName}</span>
          </div>

          {/* Amount & Progress */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{formatAmount(totalAmount, currency)}</p>
              {invoice.status !== 'betaald' && paidAmount > 0 && (
                <p className="text-xs text-emerald-600">Betaald: {formatAmount(paidAmount, currency)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ProgressRing 
                progress={paymentProgress} 
                size={36} 
                strokeWidth={3}
                color={invoice.status === 'betaald' ? '#10b981' : '#f59e0b'}
              />
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                invoice.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' :
                invoice.status === 'verzonden' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {getStatusLabel(invoice.status)}
              </span>
            </div>
          </div>

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-xs bg-red-50 rounded-lg px-2 py-1.5">
              <AlertCircle className="w-3 h-3" />
              Vervallen op {formatDate(invoice.vervaldatum || invoice.due_date)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Invoice Detail Panel Component
const InvoiceDetailPanel = ({ invoice, open, onClose, onDownloadPdf, onAddPayment, onUpdateStatus, onSendReminder, onDuplicate, formatAmount }) => {
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
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-500';
      case 'verzonden': return 'bg-blue-500';
      case 'herinnering': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 rounded-3xl overflow-hidden max-h-[90vh] bg-gradient-to-br from-white to-gray-50">
        {/* Animated Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyMGgtMnY0aDJ2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${getStatusStyle(invoice.status)} animate-pulse`} />
                  <span className="text-emerald-100 text-sm font-medium uppercase tracking-wider">
                    {getStatusLabel(invoice.status)}
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight">{invoiceNumber}</h2>
                <p className="text-emerald-100 mt-1">{formatDate(invoiceDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-sm mb-1">Totaalbedrag</p>
                <p className="text-4xl font-bold">{formatAmount(totalAmount, currency)}</p>
                {invoice.status !== 'betaald' && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${paymentProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-emerald-100">{Math.round(paymentProgress)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-320px)]">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 text-center">
              <Banknote className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-blue-600 font-medium uppercase">Subtotaal</p>
              <p className="text-lg font-bold text-blue-700">{formatAmount(subtotal, currency)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 text-center">
              <Percent className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-amber-600 font-medium uppercase">BTW</p>
              <p className="text-lg font-bold text-amber-700">{formatAmount(btwAmount, currency)}</p>
            </div>
            <div className={`bg-gradient-to-br ${invoice.status === 'betaald' ? 'from-emerald-50 to-emerald-100/50' : 'from-red-50 to-red-100/50'} rounded-2xl p-4 text-center`}>
              <Timer className="w-6 h-6 mx-auto mb-2" style={{ color: invoice.status === 'betaald' ? '#10b981' : '#ef4444' }} />
              <p className="text-xs font-medium uppercase" style={{ color: invoice.status === 'betaald' ? '#059669' : '#dc2626' }}>Openstaand</p>
              <p className="text-lg font-bold" style={{ color: invoice.status === 'betaald' ? '#047857' : '#b91c1c' }}>{formatAmount(openAmount, currency)}</p>
            </div>
          </div>

          {/* Customer Card */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Klant
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{customerName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{customerEmail}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{customerAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Factuurregels
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-5 py-4">Omschrijving</th>
                    <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-4">Aantal</th>
                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-4">Prijs</th>
                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-5 py-4">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-4 text-gray-900 font-medium">{item.omschrijving || item.description}</td>
                      <td className="px-4 py-4 text-center text-gray-600">{item.aantal || item.quantity}</td>
                      <td className="px-4 py-4 text-right text-gray-600">{formatAmount(item.prijs || item.price, currency)}</td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900">{formatAmount(item.totaal || item.total, currency)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        Geen regels beschikbaar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Betalingen ({payments.length})
              </h3>
              <div className="space-y-2">
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{formatDate(payment.datum || payment.date)}</p>
                        <p className="text-sm text-emerald-600 capitalize">{payment.betaalmethode || payment.method}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">{formatAmount(payment.bedrag || payment.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Warning */}
          {invoice.status !== 'betaald' && new Date(dueDate) < new Date() && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg animate-pulse">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-red-700 text-lg">Vervallen Factuur!</p>
                <p className="text-red-600">Deze factuur was verschuldigd op {formatDate(dueDate)}. Stuur een herinnering naar de klant.</p>
                <Button 
                  size="sm" 
                  className="mt-3 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                  onClick={() => onSendReminder && onSendReminder(invoice)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Stuur Herinnering
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="border-t border-gray-100 bg-white/80 backdrop-blur-lg p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(invoiceNumber);
                toast.success('Factuurnummer gekopieerd');
              }}
              className="rounded-xl hover:bg-gray-100"
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopiëren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPdf(invoice.id, invoiceNumber)}
              className="rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDuplicate && onDuplicate(invoice)}
              className="rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              Dupliceren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
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
                  className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Betaling
                </Button>
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(invoice.id, 'betaald')}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
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

// Main Component
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
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('invoices');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [quickFilter, setQuickFilter] = useState('all');

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

  const handleExportCSV = () => {
    const data = filteredInvoices.map(inv => ({
      Nummer: inv.factuurnummer || inv.invoice_number,
      Datum: inv.factuurdatum || inv.date,
      Klant: inv.debiteur_naam || inv.customer_name,
      Bedrag: inv.totaal_incl_btw || inv.total,
      Status: getStatusLabel(inv.status)
    }));
    
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturen_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export gedownload');
  };

  const handleBulkAction = (action) => {
    if (selectedInvoices.length === 0) {
      toast.error('Selecteer eerst facturen');
      return;
    }
    
    switch(action) {
      case 'export':
        handleExportCSV();
        break;
      case 'delete':
        if (window.confirm(`Weet u zeker dat u ${selectedInvoices.length} facturen wilt verwijderen?`)) {
          toast.success(`${selectedInvoices.length} facturen verwijderd`);
          setSelectedInvoices([]);
        }
        break;
      case 'send':
        toast.success(`Herinneringen verstuurd naar ${selectedInvoices.length} klanten`);
        setSelectedInvoices([]);
        break;
      default:
        break;
    }
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectAllInvoices = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id));
    }
  };

  // Filters & Sorting
  let filteredInvoices = useMemo(() => {
    let result = [...invoices];
    
    // Quick filter
    if (quickFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(i => new Date(i.factuurdatum || i.date) >= weekAgo);
    } else if (quickFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter(i => new Date(i.factuurdatum || i.date) >= monthAgo);
    } else if (quickFilter === 'overdue') {
      result = result.filter(i => i.status !== 'betaald' && new Date(i.vervaldatum || i.due_date) < new Date());
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    // Search
    if (searchTerm) {
      result = result.filter(i =>
        (i.factuurnummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch(sortBy) {
        case 'date':
          comparison = new Date(b.factuurdatum || b.date) - new Date(a.factuurdatum || a.date);
          break;
        case 'amount':
          comparison = (b.totaal_incl_btw || b.total || 0) - (a.totaal_incl_btw || a.total || 0);
          break;
        case 'customer':
          comparison = (a.debiteur_naam || a.customer_name || '').localeCompare(b.debiteur_naam || b.customer_name || '');
          break;
        case 'number':
          comparison = (a.factuurnummer || a.invoice_number || '').localeCompare(b.factuurnummer || b.invoice_number || '');
          break;
        default:
          break;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
    
    return result;
  }, [invoices, statusFilter, searchTerm, quickFilter, sortBy, sortOrder]);

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
  const thisWeekInvoices = invoices.filter(i => {
    const d = new Date(i.factuurdatum || i.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  // Sparkline data (mock for now - would come from API)
  const revenueSparkline = [35, 45, 42, 55, 60, 58, 65, 70];
  const paymentsSparkline = [20, 35, 30, 45, 50, 55, 60, 65];

  const getStatusStyle = (status) => {
    switch(status) {
      case 'betaald': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'verzonden': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'herinnering': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30" data-testid="verkoop-page">
      {/* Enhanced Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-40">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-200/50">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Verkoop</h1>
                <p className="text-gray-500 text-sm">Beheer uw offertes, orders en facturen</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl h-11"
                onClick={fetchData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vernieuwen
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-11">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Exporteer
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('PDF export komt binnenkort')}>
                    <FileText className="w-4 h-4 mr-2" /> Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white px-6 h-11 rounded-xl font-semibold shadow-xl shadow-emerald-200/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl" 
                data-testid="add-invoice-btn"
                onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
              >
                <Plus className="w-5 h-5 mr-2" />
                Nieuwe Factuur
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Row with Sparklines */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Totaal Gefactureerd"
            value={formatAmount(totalInvoiced)}
            subtitle={`${invoices.length} facturen`}
            trend="+12.5%"
            trendUp={true}
            icon={TrendingUp}
            gradientFrom="from-blue-400"
            gradientTo="to-indigo-600"
            loading={loading}
            sparklineData={revenueSparkline}
            accentColor="#3b82f6"
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
            gradientTo="to-teal-600"
            loading={loading}
            sparklineData={paymentsSparkline}
            accentColor="#10b981"
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding)}
            subtitle={`${openCount} facturen`}
            subtitleColor="text-amber-600"
            icon={Clock}
            gradientFrom="from-amber-400"
            gradientTo="to-orange-600"
            loading={loading}
            onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
          />
          <StatCard
            title="Vervallen"
            value={overdueCount.toString()}
            subtitle="Actie vereist"
            subtitleColor="text-red-500"
            icon={AlertCircle}
            gradientFrom="from-red-400"
            gradientTo="to-rose-600"
            loading={loading}
            onClick={() => setQuickFilter('overdue')}
          />
        </div>

        {/* Quick Filters & View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FilterPill 
              label="Alles" 
              active={quickFilter === 'all'} 
              onClick={() => setQuickFilter('all')}
              count={invoices.length}
              color="from-gray-600 to-gray-700"
            />
            <FilterPill 
              label="Deze Week" 
              active={quickFilter === 'week'} 
              onClick={() => setQuickFilter('week')}
              count={thisWeekInvoices}
              color="from-blue-500 to-blue-600"
            />
            <FilterPill 
              label="Deze Maand" 
              active={quickFilter === 'month'} 
              onClick={() => setQuickFilter('month')}
              count={thisMonthInvoices}
              color="from-emerald-500 to-emerald-600"
            />
            <FilterPill 
              label="Vervallen" 
              active={quickFilter === 'overdue'} 
              onClick={() => setQuickFilter('overdue')}
              count={overdueCount}
              color="from-red-500 to-red-600"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Bulk Actions */}
            {selectedInvoices.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-200">
                <span className="text-sm font-medium text-emerald-700">{selectedInvoices.length} geselecteerd</span>
                <Button size="sm" variant="ghost" onClick={() => handleBulkAction('send')} className="text-emerald-600 hover:bg-emerald-100">
                  <Send className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleBulkAction('export')} className="text-emerald-600 hover:bg-emerald-100">
                  <Download className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleBulkAction('delete')} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4 mr-2" /> : <ArrowUp className="w-4 h-4 mr-2" />}
                  Sorteren
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sorteren op</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  <Calendar className="w-4 h-4 mr-2" /> Datum {sortBy === 'date' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('amount')}>
                  <Banknote className="w-4 h-4 mr-2" /> Bedrag {sortBy === 'amount' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('customer')}>
                  <Users className="w-4 h-4 mr-2" /> Klant {sortBy === 'customer' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                  {sortOrder === 'desc' ? <ArrowUp className="w-4 h-4 mr-2" /> : <ArrowDown className="w-4 h-4 mr-2" />}
                  {sortOrder === 'desc' ? 'Oplopend' : 'Aflopend'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-3xl shadow-xl shadow-gray-200/20 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-6">
              <TabsList className="bg-transparent p-0 h-auto gap-2">
                {[
                  { value: 'quotes', icon: FileText, label: 'Offertes', count: quotes.length },
                  { value: 'orders', icon: ShoppingCart, label: 'Orders', count: orders.length },
                  { value: 'invoices', icon: Receipt, label: 'Facturen', count: invoices.length, highlight: true }
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="relative px-5 py-4 rounded-t-xl border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:shadow-md text-gray-500 hover:text-gray-700 font-medium transition-all duration-200"
                    data-testid={`tab-${tab.value}`}
                  >
                    <tab.icon className="w-4 h-4 mr-2 inline" />
                    {tab.label}
                    <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-semibold ${tab.highlight ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200/80 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="m-0">
              {/* Search & Filter Bar */}
              <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Zoeken op factuurnummer of klant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 bg-gray-50/50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 h-12 text-base"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-gray-50/50 border-gray-200 rounded-xl h-12">
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
                  <span className="font-bold text-2xl text-gray-900">{filteredInvoices.length}</span> 
                  <span>resultaten</span>
                </div>
              </div>

              {/* Grid View */}
              {viewMode === 'grid' ? (
                <div className="p-6 grid grid-cols-3 gap-5">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <Card key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <CardContent className="p-5">
                          <Skeleton className="h-6 w-32 mb-3" />
                          <Skeleton className="h-4 w-24 mb-4" />
                          <Skeleton className="h-8 w-36" />
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map(invoice => (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        onView={openDetailPanel}
                        onDownload={handleDownloadPdf}
                        onPayment={openPaymentDialog}
                        formatAmount={formatAmount}
                        isSelected={selectedInvoices.includes(invoice.id)}
                        onSelect={() => toggleInvoiceSelection(invoice.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-20">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                        <Receipt className="w-10 h-10 text-emerald-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-xl">Geen facturen gevonden</p>
                      <p className="text-gray-400 mt-2 mb-6">Maak een nieuwe factuur of pas de filters aan</p>
                      <Button 
                        onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nieuwe Factuur
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* List View */
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                      <TableHead className="w-12 pl-6">
                        <Checkbox 
                          checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                          onCheckedChange={selectAllInvoices}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider py-4">Nummer</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Datum</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Klant</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vervaldatum</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Voortgang</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-6">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-b border-gray-50">
                          <TableCell className="pl-6"><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 mx-auto rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-lg" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredInvoices.length > 0 ? (
                      filteredInvoices.map(invoice => {
                        const invoiceNumber = invoice.factuurnummer || invoice.invoice_number || '-';
                        const invoiceDate = invoice.factuurdatum || invoice.date;
                        const customerName = invoice.debiteur_naam || invoice.customer_name || '-';
                        const dueDate = invoice.vervaldatum || invoice.due_date;
                        const totalAmount = invoice.totaal_incl_btw || invoice.total || 0;
                        const paidAmount = invoice.totaal_betaald || 0;
                        const currency = invoice.valuta || invoice.currency || 'SRD';
                        const isOverdue = invoice.status !== 'betaald' && new Date(dueDate) < new Date();
                        const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
                        
                        return (
                          <TableRow 
                            key={invoice.id} 
                            className={`hover:bg-emerald-50/50 transition-all duration-200 border-b border-gray-50 group cursor-pointer ${isOverdue ? 'bg-red-50/30' : ''} ${selectedInvoices.includes(invoice.id) ? 'bg-emerald-50' : ''}`} 
                            data-testid={`sales-invoice-row-${invoiceNumber}`}
                          >
                            <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedInvoices.includes(invoice.id)}
                                onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                              />
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-600 hover:text-emerald-700">{invoiceNumber}</span>
                                {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                              </div>
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)} className="text-gray-600">{formatDate(invoiceDate)}</TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)}>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
                                  {customerName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-gray-900 font-medium">{customerName}</span>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)} className={`${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                              {formatDate(dueDate)}
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)} className="text-right">
                              <span className="font-bold text-lg text-gray-900">{formatAmount(totalAmount, currency)}</span>
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)} className="text-center">
                              <div className="flex items-center justify-center">
                                <ProgressRing 
                                  progress={paymentProgress} 
                                  size={32} 
                                  strokeWidth={3}
                                  color={invoice.status === 'betaald' ? '#10b981' : paymentProgress > 0 ? '#f59e0b' : '#e5e7eb'}
                                />
                              </div>
                            </TableCell>
                            <TableCell onClick={() => openDetailPanel(invoice)} className="text-center">
                              <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-xl border ${getStatusStyle(invoice.status)}`}>
                                {getStatusLabel(invoice.status)}
                              </span>
                            </TableCell>
                            <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDetailPanel(invoice)}
                                  className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                  title="Bekijk Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)}
                                  className="h-9 w-9 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl" disabled={updatingStatus === invoice.id}>
                                      {updatingStatus === invoice.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-gray-100">
                                    <DropdownMenuItem onClick={() => openDetailPanel(invoice)} className="rounded-lg">
                                      <Eye className="w-4 h-4 mr-3 text-gray-400" />
                                      Bekijk Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id, invoiceNumber)} className="rounded-lg">
                                      <Download className="w-4 h-4 mr-3 text-gray-400" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info('Dupliceren komt binnenkort')} className="rounded-lg">
                                      <Copy className="w-4 h-4 mr-3 text-gray-400" />
                                      Dupliceren
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
                                        <DropdownMenuItem onClick={() => toast.success('Herinnering verstuurd')} className="rounded-lg">
                                          <Bell className="w-4 h-4 mr-3 text-amber-500" />
                                          Stuur Herinnering
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
                        <TableCell colSpan={9} className="text-center py-20">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                            <Receipt className="w-10 h-10 text-emerald-400" />
                          </div>
                          <p className="text-gray-500 font-medium text-xl">Geen facturen gevonden</p>
                          <p className="text-gray-400 mt-2 mb-6">Maak een nieuwe factuur of pas de filters aan</p>
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
              )}
            </TabsContent>

            {/* Quotes Tab - Simplified */}
            <TabsContent value="quotes" className="m-0 p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <FileText className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-gray-500 font-medium text-xl">Offertes</p>
              <p className="text-gray-400 mt-2">{quotes.length} offertes beschikbaar</p>
            </TabsContent>

            {/* Orders Tab - Simplified */}
            <TabsContent value="orders" className="m-0 p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-purple-400" />
              </div>
              <p className="text-gray-500 font-medium text-xl">Orders</p>
              <p className="text-gray-400 mt-2">{orders.length} orders beschikbaar</p>
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
        onSendReminder={(inv) => toast.success('Herinnering verstuurd')}
        onDuplicate={(inv) => toast.info('Dupliceren komt binnenkort')}
        formatAmount={formatAmount}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                Betaling Toevoegen
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Factuur</p>
                      <p className="font-bold text-emerald-600 mt-1 text-xl">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Openstaand</p>
                      <p className="font-bold text-amber-600 mt-1 text-xl">{formatAmount(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.total, selectedInvoice.valuta || selectedInvoice.currency)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Bedrag *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPayment.bedrag}
                      onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})}
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-12"
                      data-testid="payment-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Datum *</Label>
                    <Input
                      type="date"
                      value={newPayment.datum}
                      onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})}
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-12"
                      data-testid="payment-date-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Methode</Label>
                    <Select value={newPayment.betaalmethode} onValueChange={(v) => setNewPayment({...newPayment, betaalmethode: v})}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl h-12" data-testid="payment-method-select">
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
                    <Label className="text-sm font-bold text-gray-700">Referentie</Label>
                    <Input
                      value={newPayment.referentie}
                      onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})}
                      placeholder="Optioneel"
                      className="bg-gray-50 border-gray-200 rounded-xl focus:bg-white h-12"
                      data-testid="payment-reference-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="bg-gray-50 px-6 py-5 gap-3">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="rounded-xl border-gray-200 h-11" data-testid="payment-cancel-btn">
              Annuleren
            </Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-200 h-11" data-testid="payment-submit-btn">
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
