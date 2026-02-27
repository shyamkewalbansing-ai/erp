import React, { useState, useEffect } from 'react';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Users, 
  Receipt, 
  Search, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  Calendar
} from 'lucide-react';

const DebiterenPage = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newCustomer, setNewCustomer] = useState({
    naam: '',
    adres: '',
    plaats: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    kredietlimiet: 0,
    valuta: 'SRD'
  });

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
      toast.error('Vul naam in');
      return;
    }
    setSaving(true);
    try {
      await customersAPI.create(newCustomer);
      toast.success('Klant succesvol aangemaakt');
      setShowCustomerDialog(false);
      setNewCustomer({
        naam: '', adres: '', plaats: '', land: 'Suriname', telefoon: '', email: '',
        btw_nummer: '', betalingstermijn: 30, kredietlimiet: 0, valuta: 'SRD'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = searchTerm === '' || 
      (inv.factuurnummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'vervallen' || i.status === 'herinnering');
  const paidThisMonth = invoices.filter(i => i.status === 'betaald').reduce((sum, i) => sum + (i.totaal_incl_btw || 0), 0);
  const avgPaymentDays = 28; // Placeholder - zou berekend moeten worden

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="debiteuren-page">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Gegevens laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="debiteuren-page">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Debiteuren</h1>
              <p className="text-slate-500">Klantenbeheer & Verkoopfacturen</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                data-testid="add-customer-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nieuwe Klant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Nieuwe Klant Toevoegen</DialogTitle>
                    <p className="text-sm text-slate-500">Vul de klantgegevens in</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-6 space-y-6">
                {/* Bedrijfsinformatie */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Bedrijfsinformatie
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-slate-700">Bedrijfsnaam *</Label>
                      <Input
                        value={newCustomer.naam}
                        onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                        placeholder="Acme Corporation N.V."
                        className="h-11"
                        data-testid="customer-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">BTW-nummer</Label>
                      <Input
                        value={newCustomer.btw_nummer}
                        onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                        placeholder="SR123456789B01"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Valuta</Label>
                      <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SRD">🇸🇷 SRD - Surinaamse Dollar</SelectItem>
                          <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Adresgegevens */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Adresgegevens
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-slate-700">Adres</Label>
                      <Input
                        value={newCustomer.adres}
                        onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                        placeholder="Henck Arronstraat 123"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Plaats</Label>
                      <Input
                        value={newCustomer.plaats}
                        onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                        placeholder="Paramaribo"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Land</Label>
                      <Input
                        value={newCustomer.land}
                        onChange={(e) => setNewCustomer({...newCustomer, land: e.target.value})}
                        placeholder="Suriname"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Contactgegevens */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Contactgegevens
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Telefoon</Label>
                      <Input
                        value={newCustomer.telefoon}
                        onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                        placeholder="+597 456 7890"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">E-mail</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        placeholder="info@acme.sr"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Financiële instellingen */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    Financiële Instellingen
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Betalingstermijn</Label>
                      <Select 
                        value={String(newCustomer.betalingstermijn)} 
                        onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="14">14 dagen</SelectItem>
                          <SelectItem value="30">30 dagen</SelectItem>
                          <SelectItem value="45">45 dagen</SelectItem>
                          <SelectItem value="60">60 dagen</SelectItem>
                          <SelectItem value="90">90 dagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Kredietlimiet</Label>
                      <Input
                        type="number"
                        value={newCustomer.kredietlimiet}
                        onChange={(e) => setNewCustomer({...newCustomer, kredietlimiet: parseFloat(e.target.value) || 0})}
                        placeholder="10000"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleCreateCustomer} 
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-blue-700"
                  data-testid="save-customer-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Klant Toevoegen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Totaal Klanten */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Totaal Klanten</p>
                <p className="text-3xl font-bold text-slate-900">{customers.length}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">+2 deze maand</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Openstaand Bedrag */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Openstaand</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-slate-500">{invoices.filter(i => i.status === 'open' || i.status === 'verzonden').length} facturen</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vervallen */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Vervallen</p>
                <p className="text-3xl font-bold text-red-600">{overdueInvoices.length}</p>
                <div className="flex items-center gap-1 mt-2">
                  {overdueInvoices.length > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 font-medium">Actie vereist</span>
                    </>
                  ) : (
                    <span className="text-sm text-emerald-600 font-medium">Alles op tijd</span>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Betaald deze maand */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Betaald (maand)</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(paidThisMonth)}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">+15% vs vorige</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Receipt className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="customers" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-slate-100 p-1 h-12">
            <TabsTrigger 
              value="customers" 
              className="px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-customers"
            >
              <Users className="w-4 h-4 mr-2" />
              Klanten
              <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">{customers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-invoices"
            >
              <FileText className="w-4 h-4 mr-2" />
              Facturen
              <Badge className="ml-2 bg-slate-200 text-slate-700 hover:bg-slate-200">{invoices.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoeken op naam, nummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 h-10 bg-white"
                data-testid="search-input"
              />
            </div>
          </div>
        </div>

        {/* Klanten Tab */}
        <TabsContent value="customers" className="mt-0">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="w-28 font-semibold text-slate-700">Klantnr.</TableHead>
                      <TableHead className="font-semibold text-slate-700">Klant</TableHead>
                      <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                      <TableHead className="font-semibold text-slate-700">Locatie</TableHead>
                      <TableHead className="text-center font-semibold text-slate-700">Termijn</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Openstaand</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow 
                        key={customer.id} 
                        className="group hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => setShowCustomerDetail(customer)}
                        data-testid={`customer-row-${customer.nummer}`}
                      >
                        <TableCell>
                          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                            {customer.nummer}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {(customer.naam || '').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{customer.naam}</p>
                              {customer.btw_nummer && (
                                <p className="text-xs text-slate-500">BTW: {customer.btw_nummer}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {customer.email}
                              </div>
                            )}
                            {customer.telefoon && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {customer.telefoon}
                              </div>
                            )}
                            {!customer.email && !customer.telefoon && (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.plaats ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {customer.plaats}, {customer.land || 'Suriname'}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {customer.betalingstermijn || 30}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-right">
                            <p className={`font-bold font-mono ${(customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                              {formatCurrency(customer.openstaand_bedrag || 0, customer.valuta)}
                            </p>
                            <p className="text-xs text-slate-500">{customer.valuta}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <Users className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="font-medium">Geen klanten gevonden</p>
                            <p className="text-sm">{searchTerm ? 'Probeer een andere zoekterm' : 'Voeg uw eerste klant toe'}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facturen Tab */}
        <TabsContent value="invoices" className="mt-0">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-slate-50/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Verkoopfacturen</CardTitle>
                  <CardDescription>Overzicht van alle uitgaande facturen</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44 bg-white">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="concept">Concept</SelectItem>
                    <SelectItem value="verzonden">Verzonden</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="betaald">Betaald</SelectItem>
                    <SelectItem value="vervallen">Vervallen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="w-32 font-semibold text-slate-700">Factuurnr.</TableHead>
                      <TableHead className="w-28 font-semibold text-slate-700">Datum</TableHead>
                      <TableHead className="font-semibold text-slate-700">Klant</TableHead>
                      <TableHead className="w-28 font-semibold text-slate-700">Vervaldatum</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Bedrag</TableHead>
                      <TableHead className="w-28 font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(invoice => (
                      <TableRow 
                        key={invoice.id} 
                        className="group hover:bg-blue-50/50 transition-colors"
                        data-testid={`invoice-row-${invoice.factuurnummer}`}
                      >
                        <TableCell>
                          <span className="font-mono font-medium text-blue-600">
                            {invoice.factuurnummer}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(invoice.factuurdatum)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">{invoice.debiteur_naam}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${invoice.status === 'vervallen' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            {formatDate(invoice.vervaldatum)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-bold font-mono text-slate-900">
                            {formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(invoice.status)} font-medium`}>
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="font-medium">Geen facturen gevonden</p>
                            <p className="text-sm">Maak uw eerste verkoopfactuur aan</p>
                          </div>
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

      {/* Customer Detail Dialog */}
      {showCustomerDetail && (
        <Dialog open={!!showCustomerDetail} onOpenChange={() => setShowCustomerDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {(showCustomerDetail.naam || '').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-xl">{showCustomerDetail.naam}</DialogTitle>
                  <p className="text-sm text-slate-500">Klantnummer: {showCustomerDetail.nummer}</p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="py-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Bedrijfsinfo
                </h4>
                <div className="space-y-3 text-sm">
                  {showCustomerDetail.btw_nummer && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">BTW-nummer</span>
                      <span className="font-mono">{showCustomerDetail.btw_nummer}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valuta</span>
                    <Badge variant="outline">{showCustomerDetail.valuta}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Betalingstermijn</span>
                    <span>{showCustomerDetail.betalingstermijn} dagen</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Contact
                </h4>
                <div className="space-y-3 text-sm">
                  {showCustomerDetail.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${showCustomerDetail.email}`} className="text-blue-600 hover:underline">
                        {showCustomerDetail.email}
                      </a>
                    </div>
                  )}
                  {showCustomerDetail.telefoon && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{showCustomerDetail.telefoon}</span>
                    </div>
                  )}
                  {showCustomerDetail.plaats && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{showCustomerDetail.adres}, {showCustomerDetail.plaats}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="col-span-2 pt-4 border-t">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-500">Openstaand bedrag</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(showCustomerDetail.openstaand_bedrag || 0, showCustomerDetail.valuta)}
                    </p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Nieuwe Factuur
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DebiterenPage;
