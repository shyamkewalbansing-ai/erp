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
  ChevronDown,
  Eye
} from 'lucide-react';

// Stat Card Component matching Dashboard/Grootboek style
const StatCard = ({ title, value, subtitle, icon: Icon, loading, variant = 'default' }) => {
  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-sm rounded-2xl ${
      variant === 'primary' ? 'bg-emerald-50' : 
      variant === 'warning' ? 'bg-amber-50' : 
      'bg-white'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-slate-500 font-medium">{title}</span>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'primary' ? 'bg-emerald-100' : 
              variant === 'warning' ? 'bg-amber-100' : 
              'bg-slate-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                variant === 'primary' ? 'text-emerald-600' : 
                variant === 'warning' ? 'text-amber-600' : 
                'text-slate-600'
              }`} />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
        {subtitle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
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
  const overdueInvoices = invoices.filter(i => {
    if (!i.vervaldatum || i.status === 'betaald') return false;
    return new Date(i.vervaldatum) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50/50" data-testid="debiteuren-page">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Debiteuren</h1>
            <p className="text-sm text-slate-500">Beheer uw klanten en verkoopfacturen</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700" data-testid="add-customer-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Debiteur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Debiteur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Naam *</Label>
                      <Input
                        value={newCustomer.naam}
                        onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                        placeholder="Bedrijfsnaam of naam"
                        data-testid="customer-name-input"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Adres</Label>
                      <Input
                        value={newCustomer.adres}
                        onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                        placeholder="Straat en huisnummer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postcode</Label>
                      <Input
                        value={newCustomer.postcode}
                        onChange={(e) => setNewCustomer({...newCustomer, postcode: e.target.value})}
                        placeholder="Postcode"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plaats</Label>
                      <Input
                        value={newCustomer.plaats}
                        onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                        placeholder="Paramaribo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Land</Label>
                      <Select value={newCustomer.land} onValueChange={(v) => setNewCustomer({...newCustomer, land: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Suriname">Suriname</SelectItem>
                          <SelectItem value="Nederland">Nederland</SelectItem>
                          <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                          <SelectItem value="Overig">Overig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>BTW-nummer</Label>
                      <Input
                        value={newCustomer.btw_nummer}
                        onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                        placeholder="BTW123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefoon</Label>
                      <Input
                        value={newCustomer.telefoon}
                        onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                        placeholder="+597 123 4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        placeholder="info@klant.sr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Betalingstermijn</Label>
                      <Select 
                        value={String(newCustomer.betalingstermijn)} 
                        onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Direct</SelectItem>
                          <SelectItem value="14">14 dagen</SelectItem>
                          <SelectItem value="30">30 dagen</SelectItem>
                          <SelectItem value="60">60 dagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valuta</Label>
                      <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SRD">SRD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCustomerDialog(false)} className="rounded-lg">
                    Annuleren
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Opslaan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            title="Totaal Debiteuren"
            value={customers.length}
            subtitle="Actieve klanten"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Verkoopfacturen"
            value={invoices.length}
            subtitle="Totaal aantal"
            icon={FileText}
            loading={loading}
          />
          <StatCard
            title="Openstaand"
            value={formatAmount(totalOutstanding, 'SRD')}
            subtitle="Te ontvangen"
            icon={TrendingUp}
            loading={loading}
            variant="warning"
          />
          <StatCard
            title="Totaal Gefactureerd"
            value={formatAmount(totalInvoiced, 'SRD')}
            subtitle="Alle facturen"
            icon={Wallet}
            loading={loading}
            variant="primary"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-slate-200 rounded-xl p-1">
              <TabsTrigger 
                value="customers" 
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-customers"
              >
                <Users className="w-4 h-4 mr-2" />
                Klanten
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-invoices"
              >
                <FileText className="w-4 h-4 mr-2" />
                Verkoopfacturen
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="customers">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek klant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                        data-testid="search-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Customers Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-24 text-xs font-medium text-slate-500">Nr.</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Plaats</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">E-mail</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Telefoon</TableHead>
                        <TableHead className="w-20 text-xs font-medium text-slate-500">Valuta</TableHead>
                        <TableHead className="text-right w-36 text-xs font-medium text-slate-500">Openstaand</TableHead>
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
                          <TableRow key={customer.id} className="hover:bg-slate-50/50" data-testid={`customer-row-${customer.nummer}`}>
                            <TableCell className="text-sm font-mono text-slate-600">{customer.nummer}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">{customer.naam}</TableCell>
                            <TableCell className="text-sm text-slate-500">{customer.plaats || '-'}</TableCell>
                            <TableCell className="text-sm text-slate-500">{customer.email || '-'}</TableCell>
                            <TableCell className="text-sm text-slate-500">{customer.telefoon || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs rounded-md">{customer.valuta}</Badge>
                            </TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${
                              (customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {formatAmount(customer.openstaand_bedrag || 0, customer.valuta)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                            <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-medium mb-2">Geen klanten gevonden</p>
                            <p className="text-sm mb-6">Maak uw eerste debiteur aan om te beginnen.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek factuur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48 rounded-lg">
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
                  {overdueInvoices > 0 && (
                    <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                      {overdueInvoices} verlopen facturen
                    </div>
                  )}
                </div>

                {/* Invoices Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Debiteur</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Vervaldatum</TableHead>
                        <TableHead className="text-right w-36 text-xs font-medium text-slate-500">Bedrag</TableHead>
                        <TableHead className="w-32 text-xs font-medium text-slate-500">Status</TableHead>
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
                        filteredInvoices.map(invoice => (
                          <TableRow key={invoice.id} className="hover:bg-slate-50/50" data-testid={`invoice-row-${invoice.factuurnummer}`}>
                            <TableCell className="text-sm font-mono text-slate-600">{invoice.factuurnummer}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(invoice.factuurdatum)}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">{invoice.debiteur_naam || '-'}</TableCell>
                            <TableCell className="text-sm text-slate-500">{formatDate(invoice.vervaldatum)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-600">
                              {formatAmount(invoice.totaal_incl_btw, invoice.valuta)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                invoice.status === 'betaald' ? 'bg-emerald-50 text-emerald-600' : 
                                invoice.status === 'verzonden' ? 'bg-blue-50 text-blue-600' : 
                                invoice.status === 'herinnering' ? 'bg-amber-50 text-amber-600' : 
                                invoice.status === 'concept' ? 'bg-slate-50 text-slate-600' : 
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {getStatusLabel(invoice.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                title="Bekijken"
                              >
                                <Eye className="w-4 h-4 text-slate-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-lg font-medium mb-2">Geen facturen gevonden</p>
                            <p className="text-sm">Pas de filters aan of maak een nieuwe factuur aan.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DebiteurenPage;
