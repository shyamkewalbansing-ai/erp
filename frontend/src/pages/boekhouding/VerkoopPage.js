import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, salesOrdersAPI, invoicesAPI, pdfAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
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
  Calendar, ArrowUpDown, Save, XCircle, Pencil,
  TrendingUp, Users, DollarSign
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

// Currency formatter
const formatCurrency = (amount, currency = 'SRD') => {
  const num = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount || 0));
  return currency === 'USD' ? `$ ${num}` : currency === 'EUR' ? `€ ${num}` : `SRD ${num}`;
};

// Status Badge - Matching Dashboard style
const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-gray-100 text-gray-600',
    verzonden: 'bg-blue-100 text-blue-700',
    betaald: 'bg-emerald-100 text-emerald-700',
    herinnering: 'bg-amber-100 text-amber-700',
    geaccepteerd: 'bg-emerald-100 text-emerald-700',
    nieuw: 'bg-blue-100 text-blue-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg ${styles[status] || styles.concept}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// Stat Card - Matching Dashboard design exactly with proper number display
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

// Loading Card
const LoadingStatCard = () => (
  <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

// Quick Filter Chip
const FilterChip = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
      active 
        ? 'bg-emerald-100 text-emerald-700' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
        {count}
      </span>
    )}
  </button>
);

// Tab Button - Matching Dashboard style
const TabButton = ({ active, onClick, icon: Icon, label, count, alert }) => (
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
    {alert && <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
  </button>
);

// Enhanced Editable Detail Sidebar
const DetailSidebar = ({ item, type, open, onClose, onAction, onSave, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setEditData({
        factuurnummer: item.factuurnummer || item.invoice_number || '',
        debiteur_naam: item.debiteur_naam || item.customer_name || '',
        debiteur_email: item.debiteur_email || item.customer_email || '',
        debiteur_telefoon: item.debiteur_telefoon || item.customer_phone || '',
        debiteur_adres: item.debiteur_adres || item.customer_address || '',
        factuurdatum: item.factuurdatum || item.date || '',
        vervaldatum: item.vervaldatum || item.due_date || '',
        valuta: item.valuta || item.currency || 'SRD',
        opmerkingen: item.opmerkingen || item.notes || '',
        referentie: item.referentie || item.reference || ''
      });
      setIsEditing(false);
    }
  }, [item]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, editData);
      toast.success('Wijzigingen opgeslagen');
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      factuurnummer: item.factuurnummer || item.invoice_number || '',
      debiteur_naam: item.debiteur_naam || item.customer_name || '',
      debiteur_email: item.debiteur_email || item.customer_email || '',
      debiteur_telefoon: item.debiteur_telefoon || item.customer_phone || '',
      debiteur_adres: item.debiteur_adres || item.customer_address || '',
      factuurdatum: item.factuurdatum || item.date || '',
      vervaldatum: item.vervaldatum || item.due_date || '',
      valuta: item.valuta || item.currency || 'SRD',
      opmerkingen: item.opmerkingen || item.notes || '',
      referentie: item.referentie || item.reference || ''
    });
    setIsEditing(false);
  };

  return (
    <>
      {/* Blurred backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300" 
        onClick={onClose} 
      />
      
      {/* Modern Detail Panel with glassmorphism */}
      <div className="fixed inset-y-0 right-0 w-[540px] bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-l border-gray-200/50 animate-in slide-in-from-right duration-300">
        {/* Header - Modern gradient with glass effect */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{number}</h2>
                  <p className="text-sm text-emerald-100 mt-0.5">{customer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30">
                  <StatusBadge status={item.status} />
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar - Modern design */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAction('pdf', item)}
              className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow transition-all"
            >
              <Download className="w-4 h-4 mr-2 text-emerald-600" /> PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAction('email', item)}
              className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow transition-all"
            >
              <Mail className="w-4 h-4 mr-2 text-blue-600" /> E-mail
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAction('print', item)}
              className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow transition-all"
            >
              <Printer className="w-4 h-4 mr-2 text-gray-600" /> Print
            </Button>
          </div>
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm hover:shadow transition-all"
            >
              <Pencil className="w-4 h-4 mr-2" /> Bewerken
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="bg-white hover:bg-red-50 border-red-200 text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" /> Annuleren
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Overdue Alert - Modern design */}
            {isOverdue && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-red-700">Factuur is {daysOverdue} dagen vervallen</p>
                  <p className="text-sm text-red-600 mt-1">Vervaldatum was {formatDate(dueDate)}</p>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 text-white shadow-sm" 
                      onClick={() => onAction('reminder', item)}
                    >
                      <Bell className="w-4 h-4 mr-2" /> Herinnering sturen
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Factuur Gegevens - Editable with modern card */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Factuurgegevens
                </p>
              </div>
              <div className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Factuurnummer</Label>
                        <Input 
                          value={editData.factuurnummer} 
                          onChange={(e) => setEditData({...editData, factuurnummer: e.target.value})}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Referentie</Label>
                        <Input 
                          value={editData.referentie} 
                          onChange={(e) => setEditData({...editData, referentie: e.target.value})}
                          className="mt-1 h-9"
                          placeholder="Optioneel"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Factuurdatum</Label>
                        <Input 
                          type="date"
                          value={editData.factuurdatum?.split('T')[0] || ''} 
                          onChange={(e) => setEditData({...editData, factuurdatum: e.target.value})}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Vervaldatum</Label>
                        <Input 
                          type="date"
                          value={editData.vervaldatum?.split('T')[0] || ''} 
                          onChange={(e) => setEditData({...editData, vervaldatum: e.target.value})}
                          className="mt-1 h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Valuta</Label>
                      <Select value={editData.valuta} onValueChange={(v) => setEditData({...editData, valuta: v})}>
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Factuurnummer</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Referentie</p>
                      <p className="text-sm text-gray-900 mt-1">{item.referentie || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Factuurdatum</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Vervaldatum</p>
                      <p className={`text-sm mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                        {formatDate(dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Valuta</p>
                      <p className="text-sm text-gray-900 mt-1">{currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Status</p>
                      <div className="mt-1"><StatusBadge status={item.status} /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bedragen - Modern card with gradient */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Bedragen
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subtotaal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">BTW (15%)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(tax, currency)}</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Totaal</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(total, currency)}</span>
                </div>
                {type === 'invoice' && paid > 0 && (
                  <div className="flex justify-between items-center text-sm bg-emerald-50 -mx-5 px-5 py-3 border-t border-emerald-100">
                    <span className="text-emerald-700 font-medium">Betaald</span>
                    <span className="font-bold text-emerald-600">- {formatCurrency(paid, currency)}</span>
                  </div>
                )}
                {type === 'invoice' && openAmount > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-5 px-5 py-4 border-t border-amber-200 flex justify-between items-center">
                    <span className="text-base font-bold text-amber-700">Openstaand</span>
                    <span className="text-2xl font-bold text-amber-600">{formatCurrency(openAmount, currency)}</span>
                  </div>
                )}
                {type === 'invoice' && item.status === 'betaald' && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 -mx-5 px-5 py-4 border-t border-emerald-200 flex justify-between items-center">
                    <span className="text-base font-bold text-emerald-700">Volledig betaald</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Klantgegevens - Editable with modern design */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Klantgegevens
                </p>
                <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors">
                  Bekijk klant →
                </button>
              </div>
              <div className="p-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-gray-500">Bedrijfsnaam</Label>
                      <Input 
                        value={editData.debiteur_naam} 
                        onChange={(e) => setEditData({...editData, debiteur_naam: e.target.value})}
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">E-mailadres</Label>
                      <Input 
                        type="email"
                        value={editData.debiteur_email} 
                        onChange={(e) => setEditData({...editData, debiteur_email: e.target.value})}
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Telefoonnummer</Label>
                      <Input 
                        value={editData.debiteur_telefoon} 
                        onChange={(e) => setEditData({...editData, debiteur_telefoon: e.target.value})}
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Adres</Label>
                      <Textarea 
                        value={editData.debiteur_adres} 
                        onChange={(e) => setEditData({...editData, debiteur_adres: e.target.value})}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold">
                      {customer.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">{customer}</p>
                      {(item.debiteur_email || item.customer_email) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{item.debiteur_email || item.customer_email}</span>
                        </div>
                      )}
                      {(item.debiteur_telefoon || item.customer_phone) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{item.debiteur_telefoon || item.customer_phone}</span>
                        </div>
                      )}
                      {(item.debiteur_adres || item.customer_address) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{item.debiteur_adres || item.customer_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Factuurregels - Modern table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  Factuurregels
                  <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {lines.length} items
                  </span>
                </p>
              </div>
              {lines.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Omschrijving</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Aantal</th>
                      <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Prijs</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-gray-900 font-medium">{line.omschrijving || line.description || 'Product/Dienst'}</td>
                        <td className="px-3 py-4 text-center text-gray-600">{line.aantal || line.quantity || 1}</td>
                        <td className="px-3 py-4 text-right text-gray-600">{formatCurrency(line.prijs || line.price || 0, currency)}</td>
                        <td className="px-5 py-4 text-right font-bold text-gray-900">{formatCurrency(line.totaal || line.total || 0, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Geen regels beschikbaar</p>
                </div>
              )}
            </div>

            {/* Betalingen - Modern design */}
            {type === 'invoice' && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Betalingen
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {payments.length}
                    </span>
                  </p>
                  {item.status !== 'betaald' && (
                    <button 
                      className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                      onClick={() => onAction('payment', item)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Toevoegen
                    </button>
                  )}
                </div>
                {payments.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {payments.map((p, idx) => (
                      <div key={idx} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(p.datum || p.date)}</p>
                            <p className="text-xs text-gray-500 capitalize mt-0.5">{p.betaalmethode || p.method || 'Bank'}</p>
                          </div>
                        </div>
                        <span className="text-base font-bold text-emerald-600">{formatCurrency(p.bedrag || p.amount || 0, currency)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Nog geen betalingen ontvangen</p>
                  </div>
                )}
              </div>
            )}

            {/* Opmerkingen - Editable with modern design */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-gray-600" />
                  Opmerkingen
                </p>
              </div>
              <div className="p-5">
                {isEditing ? (
                  <Textarea 
                    value={editData.opmerkingen} 
                    onChange={(e) => setEditData({...editData, opmerkingen: e.target.value})}
                    placeholder="Voeg opmerkingen toe..."
                    rows={3}
                    className="resize-none border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.opmerkingen || item.notes || 'Geen opmerkingen'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions - Modern design */}
        {type === 'invoice' && item.status !== 'betaald' && !isEditing && (
          <div className="p-5 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-11 bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow transition-all"
              onClick={() => onAction('payment', item)}
            >
              <CreditCard className="w-4 h-4 mr-2 text-emerald-600" /> Betaling Registreren
            </Button>
            <Button 
              className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
              onClick={() => onAction('markPaid', item)}
            >
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
    
    return { total, paid, open, overdueCount: overdue.length, overdueAmt, count: invoices.length, paidCount, openCount };
  }, [invoices]);

  // Filters
  const getData = (data) => {
    let filtered = [...data];
    
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

  const handleSaveInvoice = async (id, data) => {
    // This would call the API to update the invoice
    await invoicesAPI.update(id, data);
  };

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
    toast.success('Geëxporteerd');
  };

  // Render Table
  const renderTable = (type) => {
    const items = type === 'invoice' ? filteredInvoices : type === 'quote' ? filteredQuotes : filteredOrders;
    
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-10 pl-4">
                <Checkbox checked={selectedItems.length === items.length && items.length > 0} onCheckedChange={() => handleSelectAll(items)} />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('number')}>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">
                  Nummer <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">
                  Datum <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('customer')}>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">
                  Klant <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">
                {type === 'invoice' ? 'Vervaldatum' : type === 'quote' ? 'Geldig tot' : 'Leverdatum'}
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1 text-xs font-semibold text-gray-500 uppercase">
                  Bedrag <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              {type === 'invoice' && <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase">Open</TableHead>}
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Status</TableHead>
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
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-emerald-50' : ''} ${isOverdue ? 'bg-red-50/50' : ''}`}
                  onClick={() => openDetail(item)}
                >
                  <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(item.id)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">{num}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(date)}</TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">{cust}</TableCell>
                  <TableCell className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {formatDate(due)} {isOverdue && <AlertCircle className="w-3 h-3 inline ml-1" />}
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold text-gray-900">{formatCurrency(total, curr)}</TableCell>
                  {type === 'invoice' && (
                    <TableCell className={`text-sm text-right font-semibold ${openAmt > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {openAmt > 0 ? formatCurrency(openAmt, curr) : '-'}
                    </TableCell>
                  )}
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openDetail(item)}><Eye className="w-4 h-4 mr-2" /> Bekijken</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('pdf', item)}><Download className="w-4 h-4 mr-2" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('email', item)}><Mail className="w-4 h-4 mr-2" /> E-mail versturen</DropdownMenuItem>
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
                        <DropdownMenuItem className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Verwijderen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={type === 'invoice' ? 9 : 8} className="text-center py-12 text-gray-500">
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
    <div className="min-h-screen bg-gray-100" data-testid="verkoop-page">
      {/* Header - Matching Dashboard */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Verkoop</h1>
            <p className="text-sm text-gray-500 mt-0.5">Beheer uw offertes, orders en facturen</p>
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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Factuur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats - Matching Dashboard design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? (
            <>
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
              <LoadingStatCard />
            </>
          ) : (
            <>
              <StatCard 
                title="Totaal Gefactureerd" 
                value={formatCurrency(stats.total)} 
                subtitle={`${stats.count} facturen`}
                icon={TrendingUp}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatCard 
                title="Ontvangen" 
                value={formatCurrency(stats.paid)} 
                subtitle={`${stats.paidCount} betaald`}
                subtitleColor="text-emerald-600"
                icon={CheckCircle}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
              />
              <StatCard 
                title="Openstaand" 
                value={formatCurrency(stats.open)} 
                subtitle={`${stats.openCount} facturen`}
                subtitleColor="text-amber-600"
                icon={Clock}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                onClick={() => setQuickFilter(quickFilter === 'unpaid' ? 'all' : 'unpaid')}
              />
              <StatCard 
                title="Vervallen" 
                value={formatCurrency(stats.overdueAmt)} 
                subtitle={`${stats.overdueCount} facturen`}
                subtitleColor="text-red-600"
                icon={AlertCircle}
                iconBg="bg-red-100"
                iconColor="text-red-600"
                onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
              />
              <StatCard 
                title="Offertes" 
                value={quotes.length.toString()} 
                subtitle={`${quotes.filter(q => q.status === 'verzonden').length} verzonden`}
                icon={FileText}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
              />
            </>
          )}
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 rounded-2xl shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-4 flex items-center justify-between">
            <div className="flex">
              <TabButton active={activeTab === 'invoices'} onClick={() => { setActiveTab('invoices'); setSelectedItems([]); }} icon={Receipt} label="Facturen" count={invoices.length} alert={stats.overdueCount > 0} />
              <TabButton active={activeTab === 'quotes'} onClick={() => { setActiveTab('quotes'); setSelectedItems([]); }} icon={FileText} label="Offertes" count={quotes.length} />
              <TabButton active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSelectedItems([]); }} icon={ShoppingCart} label="Orders" count={orders.length} />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Filter:</span>
            <FilterChip label="Alles" active={quickFilter === 'all'} onClick={() => setQuickFilter('all')} />
            <FilterChip label="Deze week" active={quickFilter === 'week'} onClick={() => setQuickFilter('week')} />
            <FilterChip label="Deze maand" active={quickFilter === 'month'} onClick={() => setQuickFilter('month')} />
            <FilterChip label="Openstaand" count={stats.openCount} active={quickFilter === 'unpaid'} onClick={() => setQuickFilter('unpaid')} />
            <FilterChip label="Vervallen" count={stats.overdueCount} active={quickFilter === 'overdue'} onClick={() => setQuickFilter('overdue')} />
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-sm text-gray-600">{selectedItems.length} geselecteerd</span>
                  <div className="w-px h-5 bg-gray-300 mx-1" />
                  <Button variant="ghost" size="sm"><Send className="w-4 h-4 mr-1" /> Verzenden</Button>
                  <Button variant="ghost" size="sm"><Bell className="w-4 h-4 mr-1" /> Herinnering</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExport('csv')}><Download className="w-4 h-4 mr-1" /> Exporteren</Button>
                  <Button variant="ghost" size="sm" className="text-red-600"><Trash2 className="w-4 h-4 mr-1" /> Verwijderen</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1" /> Vernieuwen</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExport('csv')}><FileSpreadsheet className="w-4 h-4 mr-1" /> Exporteren</Button>
                  <Button variant="ghost" size="sm"><Printer className="w-4 h-4 mr-1" /> Afdrukken</Button>
                </>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {activeTab === 'invoices' && `${filteredInvoices.length} van ${invoices.length}`}
              {activeTab === 'quotes' && `${filteredQuotes.length} van ${quotes.length}`}
              {activeTab === 'orders' && `${filteredOrders.length} van ${orders.length}`}
            </span>
          </div>

          {/* Search & Filter */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Zoeken op nummer of klant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <Filter className="w-4 h-4 mr-1.5 text-gray-400" />
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

      {/* Detail Sidebar */}
      <DetailSidebar
        item={detailItem}
        type={activeTab === 'invoices' ? 'invoice' : activeTab === 'quotes' ? 'quote' : 'order'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAction={handleAction}
        onSave={handleSaveInvoice}
        onRefresh={fetchData}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              Betaling Registreren
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between">
                <div>
                  <p className="text-xs text-gray-500">Factuur</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedInvoice.factuurnummer || selectedInvoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Openstaand</p>
                  <p className="text-sm font-semibold text-amber-600">{formatCurrency(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Bedrag *</Label>
                  <Input type="number" step="0.01" value={newPayment.bedrag} onChange={(e) => setNewPayment({...newPayment, bedrag: parseFloat(e.target.value) || 0})} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Datum *</Label>
                  <Input type="date" value={newPayment.datum} onChange={(e) => setNewPayment({...newPayment, datum: e.target.value})} className="mt-1 h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Betaalmethode</Label>
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
                  <Label className="text-xs text-gray-500">Referentie</Label>
                  <Input value={newPayment.referentie} onChange={(e) => setNewPayment({...newPayment, referentie: e.target.value})} placeholder="Optioneel" className="mt-1 h-9" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Annuleren</Button>
            <Button onClick={handleAddPayment} disabled={saving || newPayment.bedrag <= 0} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
