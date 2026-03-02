import React, { useState, useEffect } from 'react';
import { suppliersAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, Truck, Search, Loader2, Filter, RefreshCw, Download,
  Mail, Phone, MapPin, Building2, X, Eye, Edit, Trash2,
  DollarSign, FileText, Send, Printer, CreditCard, MoreHorizontal,
  ChevronDown, Users, TrendingUp, Clock, AlertCircle, CheckCircle, Save
} from 'lucide-react';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  if (currency === 'USD') return `$ ${formatted}`;
  if (currency === 'EUR') return `€ ${formatted}`;
  return `SRD ${formatted}`;
};

// Stat Card Component
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

// Status Badge
const StatusBadge = ({ active }) => {
  if (active) {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Actief</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Inactief</Badge>;
};

// Detail Sidebar
const DetailSidebar = ({ item, open, onClose, onEdit, onDelete }) => {
  if (!item || !open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-lg z-50 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {(item.naam || item.name || 'L').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.naam || item.name}</h2>
                <p className="text-sm text-gray-500">{item.code || item.nummer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={item.actief !== false} />
              <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              <Edit className="w-4 h-4 mr-1.5" /> Bewerken
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </div>
          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(item)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Verwijderen
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {/* Bedrijfsgegevens */}
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Bedrijfsgegevens</p>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Bedrijfsnaam</p>
                    <p className="text-gray-900 font-medium">{item.naam || item.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">BTW Nummer</p>
                    <p className="text-gray-900">{item.btw_nummer || item.btw_number || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Valuta</p>
                    <p className="text-gray-900">{item.valuta || item.currency || 'SRD'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contactgegevens */}
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Contactgegevens</p>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {(item.email) && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${item.email}`} className="text-emerald-600 hover:underline">{item.email}</a>
                  </div>
                )}
                {(item.telefoon || item.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{item.telefoon || item.phone}</span>
                  </div>
                )}
                {(item.adres || item.address) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-900">{item.adres || item.address}</p>
                      <p className="text-gray-500">{item.postcode} {item.plaats || item.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Betalingsvoorwaarden */}
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Betalingsvoorwaarden</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Betalingstermijn</p>
                  <p className="text-gray-900 font-medium">{item.betalingstermijn || item.payment_terms || 30} dagen</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Openstaand</p>
                  <p className={`font-bold ${(item.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(item.openstaand_bedrag || 0, item.valuta)}
                  </p>
                </div>
              </div>
            </div>

            {/* Factuurhistorie samenvatting */}
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Factuurhistorie</p>
              </div>
              <div className="p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Totaal gefactureerd</p>
                    <p className="text-gray-900 font-bold">{formatCurrency(item.totaal_gefactureerd || 0, item.valuta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Aantal facturen</p>
                    <p className="text-gray-900 font-medium">{item.aantal_facturen || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notities */}
            {item.notities && (
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Notities</p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600">{item.notities}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

// Main Component
const CrediteurenPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [formData, setFormData] = useState({
    code: '', naam: '', adres: '', postcode: '', plaats: '', land: 'Suriname',
    telefoon: '', email: '', btw_nummer: '', betalingstermijn: 30, valuta: 'SRD', notities: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await suppliersAPI.getAll();
      setSuppliers(res.data || []);
    } catch (error) {
      toast.error('Fout bij laden leveranciers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.naam) { toast.error('Vul naam in'); return; }
    setSaving(true);
    try {
      await suppliersAPI.create(formData);
      toast.success('Leverancier aangemaakt');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem || !formData.naam) { toast.error('Vul naam in'); return; }
    setSaving(true);
    try {
      await suppliersAPI.update(editItem.id, formData);
      toast.success('Leverancier bijgewerkt');
      setShowEditDialog(false);
      setEditItem(null);
      resetForm();
      fetchData();
      if (detailItem?.id === editItem.id) {
        setDetailItem({ ...detailItem, ...formData });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Weet u zeker dat u "${item.naam || item.name}" wilt verwijderen?`)) return;
    try {
      await suppliersAPI.delete(item.id);
      toast.success('Leverancier verwijderd');
      setDetailOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '', naam: '', adres: '', postcode: '', plaats: '', land: 'Suriname',
      telefoon: '', email: '', btw_nummer: '', betalingstermijn: 30, valuta: 'SRD', notities: ''
    });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      code: item.code || item.nummer || '',
      naam: item.naam || item.name || '',
      adres: item.adres || item.address || '',
      postcode: item.postcode || '',
      plaats: item.plaats || item.city || '',
      land: item.land || 'Suriname',
      telefoon: item.telefoon || item.phone || '',
      email: item.email || '',
      btw_nummer: item.btw_nummer || item.btw_number || '',
      betalingstermijn: item.betalingstermijn || item.payment_terms || 30,
      valuta: item.valuta || item.currency || 'SRD',
      notities: item.notities || ''
    });
    setShowEditDialog(true);
    setDetailOpen(false);
  };

  const openDetail = (item) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  // Calculate stats
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.actief !== false).length,
    totalOutstanding: suppliers.reduce((sum, s) => sum + (s.openstaand_bedrag || 0), 0),
    withOutstanding: suppliers.filter(s => (s.openstaand_bedrag || 0) > 0).length
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = !searchTerm || 
      (s.naam || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code || s.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && s.actief !== false) ||
      (statusFilter === 'inactive' && s.actief === false) ||
      (statusFilter === 'outstanding' && (s.openstaand_bedrag || 0) > 0);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crediteuren</h1>
          <p className="text-sm text-gray-500 mt-1">Beheer uw leveranciers en openstaande schulden</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Vernieuwen
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Leverancier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Totaal Leveranciers"
          value={stats.total}
          subtitle={`${stats.active} actief`}
          icon={Truck}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Openstaande Schuld"
          value={formatCurrency(stats.totalOutstanding)}
          subtitle={`${stats.withOutstanding} leveranciers`}
          subtitleColor="text-amber-500"
          icon={DollarSign}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Actieve Leveranciers"
          value={stats.active}
          subtitle="Met contracten"
          icon={CheckCircle}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Te Betalen"
          value={stats.withOutstanding}
          subtitle="Openstaand"
          subtitleColor="text-red-500"
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Filters & Search */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -trangray-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Zoeken op naam, code of email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Leveranciers</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
                <SelectItem value="outstanding">Met Openstaand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Leverancier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Plaats</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Openstaand</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 w-20">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Laden...</p>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Truck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">Geen leveranciers gevonden</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.id} 
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => openDetail(supplier)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {(supplier.naam || supplier.name || 'L').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{supplier.naam || supplier.name}</p>
                            <p className="text-xs text-gray-500">{supplier.code || supplier.nummer}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-sm">
                          {supplier.email && <p className="text-gray-600">{supplier.email}</p>}
                          {(supplier.telefoon || supplier.phone) && <p className="text-gray-400">{supplier.telefoon || supplier.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{supplier.plaats || supplier.city || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${(supplier.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {formatCurrency(supplier.openstaand_bedrag || 0, supplier.valuta)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={supplier.actief !== false} />
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openDetail(supplier)}>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openEdit(supplier)}>
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sidebar */}
      <DetailSidebar
        item={detailItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              Nieuwe Leverancier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="LEV001" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={formData.valuta} onValueChange={(v) => setFormData({...formData, valuta: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bedrijfsnaam *</Label>
              <Input value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Telefoon</Label>
                <Input value={formData.telefoon} onChange={(e) => setFormData({...formData, telefoon: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Adres</Label>
              <Input value={formData.adres} onChange={(e) => setFormData({...formData, adres: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Postcode</Label>
                <Input value={formData.postcode} onChange={(e) => setFormData({...formData, postcode: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Plaats</Label>
                <Input value={formData.plaats} onChange={(e) => setFormData({...formData, plaats: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Land</Label>
                <Input value={formData.land} onChange={(e) => setFormData({...formData, land: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">BTW Nummer</Label>
                <Input value={formData.btw_nummer} onChange={(e) => setFormData({...formData, btw_nummer: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Betalingstermijn (dagen)</Label>
                <Input type="number" value={formData.betalingstermijn} onChange={(e) => setFormData({...formData, betalingstermijn: parseInt(e.target.value) || 30})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Notities</Label>
              <Textarea value={formData.notities} onChange={(e) => setFormData({...formData, notities: e.target.value})} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              Leverancier Bewerken
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={formData.valuta} onValueChange={(v) => setFormData({...formData, valuta: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bedrijfsnaam *</Label>
              <Input value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Telefoon</Label>
                <Input value={formData.telefoon} onChange={(e) => setFormData({...formData, telefoon: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Adres</Label>
              <Input value={formData.adres} onChange={(e) => setFormData({...formData, adres: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Postcode</Label>
                <Input value={formData.postcode} onChange={(e) => setFormData({...formData, postcode: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Plaats</Label>
                <Input value={formData.plaats} onChange={(e) => setFormData({...formData, plaats: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Land</Label>
                <Input value={formData.land} onChange={(e) => setFormData({...formData, land: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">BTW Nummer</Label>
                <Input value={formData.btw_nummer} onChange={(e) => setFormData({...formData, btw_nummer: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Betalingstermijn (dagen)</Label>
                <Input type="number" value={formData.betalingstermijn} onChange={(e) => setFormData({...formData, betalingstermijn: parseInt(e.target.value) || 30})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Notities</Label>
              <Textarea value={formData.notities} onChange={(e) => setFormData({...formData, notities: e.target.value})} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              <Save className="w-4 h-4 mr-1.5" />
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrediteurenPage;
