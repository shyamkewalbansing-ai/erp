import React, { useState, useEffect } from 'react';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Users, 
  FileText, 
  Loader2, 
  Search,
  Filter,
  TrendingUp,
  Wallet,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Enhanced Stat Card with gradient backgrounds
const StatCard = ({ title, value, subtitle, icon: Icon, loading, variant = 'default', trend }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const variants = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400',
    warning: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-400',
    danger: 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-red-400',
    info: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400'
  };

  const isColored = variant !== 'default';

  return (
    <div className={`rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${variants[variant]}`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`text-sm font-medium ${isColored ? 'text-white/80' : 'text-gray-500'}`}>{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isColored ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            <Icon className={`w-5 h-5 ${isColored ? 'text-white' : 'text-gray-600'}`} />
          </div>
        )}
      </div>
      <div className={`text-2xl md:text-3xl font-bold mb-1 ${isColored ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtitle && (
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isColored ? 'text-white/70' : 'text-gray-400'}`}>{subtitle}</span>
          {trend && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              trend > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Mobile Customer Card
const CustomerCard = ({ customer, formatAmount, onEdit, onDelete }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
          {customer.naam?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{customer.naam}</h3>
          <p className="text-xs text-gray-500 font-mono">{customer.nummer}</p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">{customer.valuta}</Badge>
    </div>
    
    <div className="space-y-2 mb-4">
      {customer.email && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{customer.email}</span>
        </div>
      )}
      {customer.telefoon && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{customer.telefoon}</span>
        </div>
      )}
      {customer.plaats && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{customer.plaats}, {customer.land}</span>
        </div>
      )}
    </div>
    
    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
      <div>
        <p className="text-xs text-gray-500">Openstaand</p>
        <p className={`text-lg font-bold ${
          (customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {formatAmount(customer.openstaand_bedrag || 0, customer.valuta)}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-emerald-600">
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  </div>
);

// Mobile Invoice Card
const InvoiceCard = ({ invoice, formatAmount, formatDate, getStatusLabel }) => {
  const isOverdue = invoice.vervaldatum && new Date(invoice.vervaldatum) < new Date() && invoice.status !== 'betaald';
  
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${
      isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-semibold text-gray-900">{invoice.factuurnummer}</p>
          <p className="text-xs text-gray-500">{formatDate(invoice.factuurdatum)}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          invoice.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' : 
          invoice.status === 'verzonden' ? 'bg-blue-100 text-blue-700' : 
          invoice.status === 'herinnering' ? 'bg-amber-100 text-amber-700' : 
          'bg-gray-100 text-gray-600'
        }`}>
          {getStatusLabel(invoice.status)}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="font-medium text-gray-900">{invoice.debiteur_naam || 'Onbekende klant'}</p>
        {isOverdue && (
          <div className="flex items-center gap-1 mt-1 text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">Verlopen op {formatDate(invoice.vervaldatum)}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Totaal incl. BTW</p>
          <p className="text-lg font-bold text-emerald-600">
            {formatAmount(invoice.totaal_incl_btw, invoice.valuta)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const DebiteurenPage = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const [newCustomer, setNewCustomer] = useState({
    naam: '',
    adres: '',
    plaats: '',
    postcode: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    kredietlimiet: 0,
    valuta: 'SRD'
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

  // Auto-detect mobile view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, invoicesRes] = await Promise.all([
        customersAPI.getAll(),
        invoicesAPI.getAll({ invoice_type: 'sales' })
      ]);
      setCustomers(customersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await customersAPI.create(newCustomer);
      toast.success('Debiteur aangemaakt');
      setShowCustomerDialog(false);
      setNewCustomer({
        naam: '', adres: '', plaats: '', postcode: '', land: 'Suriname', 
        telefoon: '', email: '', btw_nummer: '', betalingstermijn: 30, 
        kredietlimiet: 0, valuta: 'SRD'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    (c.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Calculate totals
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totaal_incl_btw || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === 'betaald').length;
  const overdueInvoices = invoices.filter(i => {
    if (!i.vervaldatum || i.status === 'betaald') return false;
    return new Date(i.vervaldatum) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" data-testid="debiteuren-page">
      {/* Top Header - Responsive */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Debiteuren</h1>
              <p className="text-sm text-gray-500">Beheer klanten & verkoopfacturen</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData}
                className="rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25" data-testid="add-customer-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Nieuwe Debiteur</span>
                    <span className="sm:hidden">Nieuw</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      Nieuwe Debiteur Aanmaken
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Basisgegevens
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Bedrijfsnaam / Naam *</Label>
                          <Input
                            value={newCustomer.naam}
                            onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                            placeholder="Bijv. ABC Trading N.V."
                            className="rounded-lg"
                            data-testid="customer-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>BTW-nummer</Label>
                          <Input
                            value={newCustomer.btw_nummer}
                            onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                            placeholder="BTW123456789"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valuta</Label>
                          <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
                            <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contactgegevens
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Telefoon</Label>
                          <Input
                            value={newCustomer.telefoon}
                            onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                            placeholder="+597 123 4567"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input
                            type="email"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                            placeholder="info@bedrijf.sr"
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresgegevens
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Straat en huisnummer</Label>
                          <Input
                            value={newCustomer.adres}
                            onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                            placeholder="Domineestraat 1"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Postcode</Label>
                          <Input
                            value={newCustomer.postcode}
                            onChange={(e) => setNewCustomer({...newCustomer, postcode: e.target.value})}
                            placeholder="Postcode"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Plaats</Label>
                          <Input
                            value={newCustomer.plaats}
                            onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                            placeholder="Paramaribo"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Land</Label>
                          <Select value={newCustomer.land} onValueChange={(v) => setNewCustomer({...newCustomer, land: v})}>
                            <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Suriname">Suriname</SelectItem>
                              <SelectItem value="Nederland">Nederland</SelectItem>
                              <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                              <SelectItem value="Guyana">Guyana</SelectItem>
                              <SelectItem value="Overig">Overig</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Betalingsvoorwaarden
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Betalingstermijn</Label>
                          <Select 
                            value={String(newCustomer.betalingstermijn)} 
                            onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                          >
                            <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Direct</SelectItem>
                              <SelectItem value="7">7 dagen</SelectItem>
                              <SelectItem value="14">14 dagen</SelectItem>
                              <SelectItem value="30">30 dagen</SelectItem>
                              <SelectItem value="60">60 dagen</SelectItem>
                              <SelectItem value="90">90 dagen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Kredietlimiet</Label>
                          <Input
                            type="number"
                            value={newCustomer.kredietlimiet}
                            onChange={(e) => setNewCustomer({...newCustomer, kredietlimiet: parseFloat(e.target.value) || 0})}
                            placeholder="0.00"
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowCustomerDialog(false)} className="rounded-lg">
                      Annuleren
                    </Button>
                    <Button onClick={handleCreateCustomer} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Opslaan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Row - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Totaal Klanten"
            value={customers.length}
            subtitle="Actieve debiteuren"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Facturen"
            value={invoices.length}
            subtitle={`${paidInvoices} betaald`}
            icon={FileText}
            loading={loading}
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding, 'SRD')}
            subtitle="Te ontvangen"
            icon={Clock}
            loading={loading}
            variant="warning"
          />
          <StatCard
            title="Gefactureerd"
            value={formatAmount(totalInvoiced, 'SRD')}
            subtitle="Totaal omzet"
            icon={TrendingUp}
            loading={loading}
            variant="primary"
          />
        </div>

        {/* Alert for overdue invoices */}
        {overdueInvoices > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800">Let op: {overdueInvoices} verlopen facturen</p>
              <p className="text-sm text-red-600">Er zijn facturen die de vervaldatum hebben overschreden.</p>
            </div>
            <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100 rounded-lg hidden sm:flex">
              Bekijken
            </Button>
          </div>
        )}

        {/* Tabs - Responsive */}
        <Tabs defaultValue="customers" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-white border border-gray-200 rounded-xl p-1 w-full sm:w-auto">
              <TabsTrigger 
                value="customers" 
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 flex-1 sm:flex-none"
                data-testid="tab-customers"
              >
                <Users className="w-4 h-4 mr-2" />
                Klanten
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 flex-1 sm:flex-none"
                data-testid="tab-invoices"
              >
                <FileText className="w-4 h-4 mr-2" />
                Facturen
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -trangray-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Zoek op naam, nummer of e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl bg-white"
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                          <TableHead className="w-24 text-xs font-medium text-gray-500">Nr.</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Naam</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Plaats</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">E-mail</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Telefoon</TableHead>
                          <TableHead className="w-20 text-xs font-medium text-gray-500">Valuta</TableHead>
                          <TableHead className="text-right w-36 text-xs font-medium text-gray-500">Openstaand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {loading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <TableRow key={customer.id} className="hover:bg-emerald-50/30 transition-colors" data-testid={`customer-row-${customer.nummer}`}>
                            <TableCell className="text-sm font-mono text-gray-600">{customer.nummer}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                                  {customer.naam?.charAt(0)?.toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{customer.naam}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{customer.plaats || '-'}</TableCell>
                            <TableCell className="text-sm text-gray-500">{customer.email || '-'}</TableCell>
                            <TableCell className="text-sm text-gray-500">{customer.telefoon || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs rounded-lg font-medium">{customer.valuta}</Badge>
                            </TableCell>
                            <TableCell className={`text-right text-sm font-bold ${
                              (customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {formatAmount(customer.openstaand_bedrag || 0, customer.valuta)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                            <p className="text-lg font-semibold text-gray-700 mb-2">Geen klanten gevonden</p>
                            <p className="text-sm text-gray-500 mb-6">Voeg uw eerste debiteur toe om te beginnen.</p>
                            <Button onClick={() => setShowCustomerDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                              <Plus className="w-4 h-4 mr-2" />
                              Eerste Klant Toevoegen
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                    <Skeleton className="h-12 w-12 rounded-full mb-3" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <CustomerCard 
                    key={customer.id} 
                    customer={customer} 
                    formatAmount={formatAmount}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">Geen klanten</p>
                  <p className="text-sm text-gray-500 mb-4">Voeg uw eerste debiteur toe</p>
                  <Button onClick={() => setShowCustomerDialog(true)} className="bg-emerald-600 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Toevoegen
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -trangray-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Zoek factuur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl bg-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl bg-white">
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

            {/* Desktop Table */}
            <div className="hidden md:block">
              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                          <TableHead className="w-28 text-xs font-medium text-gray-500">Nummer</TableHead>
                          <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Debiteur</TableHead>
                          <TableHead className="w-28 text-xs font-medium text-gray-500">Vervaldatum</TableHead>
                          <TableHead className="text-right w-36 text-xs font-medium text-gray-500">Bedrag</TableHead>
                          <TableHead className="w-32 text-xs font-medium text-gray-500">Status</TableHead>
                          <TableHead className="w-16"></TableHead>
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
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredInvoices.length > 0 ? (
                        filteredInvoices.map(invoice => {
                          const isOverdue = invoice.vervaldatum && new Date(invoice.vervaldatum) < new Date() && invoice.status !== 'betaald';
                          return (
                            <TableRow 
                              key={invoice.id} 
                              className={`transition-colors ${isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-emerald-50/30'}`}
                              data-testid={`invoice-row-${invoice.factuurnummer}`}
                            >
                              <TableCell className="text-sm font-mono text-gray-700 font-medium">{invoice.factuurnummer}</TableCell>
                              <TableCell className="text-sm text-gray-500">{formatDate(invoice.factuurdatum)}</TableCell>
                              <TableCell className="text-sm font-medium text-gray-900">{invoice.debiteur_naam || '-'}</TableCell>
                              <TableCell className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                {formatDate(invoice.vervaldatum)}
                                {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                              </TableCell>
                              <TableCell className="text-right text-sm font-bold text-emerald-600">
                                {formatAmount(invoice.totaal_incl_btw, invoice.valuta)}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  invoice.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' : 
                                  invoice.status === 'verzonden' ? 'bg-blue-100 text-blue-700' : 
                                  invoice.status === 'herinnering' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {getStatusLabel(invoice.status)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg"
                                  title="Bekijken"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                            <p className="text-lg font-semibold text-gray-700 mb-2">Geen facturen gevonden</p>
                            <p className="text-sm text-gray-500">Pas de filters aan of maak een nieuwe factuur aan.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-32 mb-3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map(invoice => (
                  <InvoiceCard 
                    key={invoice.id} 
                    invoice={invoice}
                    formatAmount={formatAmount}
                    formatDate={formatDate}
                    getStatusLabel={getStatusLabel}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">Geen facturen</p>
                  <p className="text-sm text-gray-500">Pas de filters aan</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DebiteurenPage;
