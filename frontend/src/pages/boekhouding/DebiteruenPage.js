import React, { useState, useEffect } from 'react';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  Search, 
  Loader2, 
  Download,
  Filter,
  ChevronDown,
  FileText,
  Mail,
  Printer,
  MoreVertical,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

const DebiterenPage = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('customers');

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

  // Bereken totalen
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'vervallen').reduce((sum, i) => sum + (i.totaal_incl_btw || 0), 0);
  const invoicesByStatus = {
    open: invoices.filter(i => i.status === 'open' || i.status === 'verzonden').length,
    overdue: invoices.filter(i => i.status === 'vervallen').length,
    paid: invoices.filter(i => i.status === 'betaald').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="debiteuren-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="debiteuren-page">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Debiteuren</h1>
            <p className="text-sm text-slate-500">Beheer klanten en openstaande posten</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Vernieuwen
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Exporteren
            </Button>
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="add-customer-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Nieuwe debiteur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader className="border-b pb-4">
                  <DialogTitle className="text-lg font-semibold">Nieuwe debiteur aanmaken</DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                  {/* Algemeen */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 pb-2 border-b">Algemeen</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1.5 block">Naam <span className="text-red-500">*</span></Label>
                        <Input
                          value={newCustomer.naam}
                          onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                          placeholder="Volledige bedrijfsnaam"
                          className="h-9"
                          data-testid="customer-name-input"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">BTW-nummer</Label>
                        <Input
                          value={newCustomer.btw_nummer}
                          onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                          placeholder="BTW-ID"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adres */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 pb-2 border-b">Adresgegevens</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1.5 block">Adres</Label>
                        <Input
                          value={newCustomer.adres}
                          onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                          placeholder="Straatnaam en huisnummer"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Postcode</Label>
                        <Input
                          value={newCustomer.postcode}
                          onChange={(e) => setNewCustomer({...newCustomer, postcode: e.target.value})}
                          placeholder="Postcode"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Plaats</Label>
                        <Input
                          value={newCustomer.plaats}
                          onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                          placeholder="Plaatsnaam"
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1.5 block">Land</Label>
                        <Select value={newCustomer.land} onValueChange={(v) => setNewCustomer({...newCustomer, land: v})}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Suriname">Suriname</SelectItem>
                            <SelectItem value="Nederland">Nederland</SelectItem>
                            <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                            <SelectItem value="Overig">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 pb-2 border-b">Contactgegevens</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Telefoonnummer</Label>
                        <Input
                          value={newCustomer.telefoon}
                          onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                          placeholder="+597 000 0000"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">E-mailadres</Label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                          placeholder="email@bedrijf.sr"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financieel */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3 pb-2 border-b">Financieel</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Valuta</Label>
                        <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SRD">SRD</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Betalingstermijn</Label>
                        <Select 
                          value={String(newCustomer.betalingstermijn)} 
                          onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Direct</SelectItem>
                            <SelectItem value="14">14 dagen</SelectItem>
                            <SelectItem value="30">30 dagen</SelectItem>
                            <SelectItem value="60">60 dagen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1.5 block">Kredietlimiet</Label>
                        <Input
                          type="number"
                          value={newCustomer.kredietlimiet}
                          onChange={(e) => setNewCustomer({...newCustomer, kredietlimiet: parseFloat(e.target.value) || 0})}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={saving} data-testid="save-customer-btn">
                    {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Opslaan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Debiteuren</span>
            <span className="text-sm font-semibold text-slate-800">{customers.length}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Openstaand</span>
            <span className="text-sm font-semibold text-slate-800">{formatCurrency(totalOutstanding)}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Vervallen</span>
            <span className={`text-sm font-semibold ${totalOverdue > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {formatCurrency(totalOverdue)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-600">Open: {invoicesByStatus.open}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-600">Vervallen: {invoicesByStatus.overdue}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Betaald: {invoicesByStatus.paid}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex items-center justify-between px-4">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'customers' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                  data-testid="tab-customers"
                >
                  Debiteuren ({customers.length})
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'invoices' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                  data-testid="tab-invoices"
                >
                  Verkoopfacturen ({invoices.length})
                </button>
              </div>
              
              {/* Search & Filter */}
              <div className="flex items-center gap-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 w-56 text-sm"
                    data-testid="search-input"
                  />
                </div>
                {activeTab === 'invoices' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-36 text-sm">
                      <Filter className="w-3.5 h-3.5 mr-1" />
                      <SelectValue placeholder="Status" />
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
                )}
              </div>
            </div>
          </div>

          {/* Debiteuren Tabel */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-28 text-xs font-semibold text-slate-600 uppercase">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                        Nr. <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                        Naam <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase">Plaats</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase">Telefoon</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase">E-mail</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase text-center w-20">Valuta</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase text-right w-32">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-slate-800">
                        Saldo <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, index) => (
                    <TableRow 
                      key={customer.id} 
                      className={`hover:bg-blue-50/50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      data-testid={`customer-row-${customer.nummer}`}
                    >
                      <TableCell className="font-mono text-sm text-slate-700">{customer.nummer}</TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-800">{customer.naam}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{customer.plaats || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-mono">{customer.telefoon || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{customer.email || '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {customer.valuta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm font-medium ${
                          (customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-slate-700'
                        }`}>
                          {formatCurrency(customer.openstaand_bedrag || 0, customer.valuta)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        {searchTerm ? 'Geen resultaten gevonden' : 'Geen debiteuren aanwezig'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Facturen Tabel */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-32 text-xs font-semibold text-slate-600 uppercase">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                        Factuurnr. <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-slate-600 uppercase">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                        Datum <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase">Debiteur</TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-slate-600 uppercase">Vervaldatum</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase text-right w-32">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-slate-800">
                        Bedrag <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase text-center w-28">Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice, index) => (
                    <TableRow 
                      key={invoice.id} 
                      className={`hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      data-testid={`invoice-row-${invoice.factuurnummer}`}
                    >
                      <TableCell>
                        <span className="font-mono text-sm text-blue-600 hover:underline cursor-pointer">
                          {invoice.factuurnummer}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{formatDate(invoice.factuurdatum)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-800">{invoice.debiteur_naam || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${invoice.status === 'vervallen' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {formatDate(invoice.vervaldatum)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-medium text-slate-700">
                          {formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bekijken">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="PDF">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="E-mail">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        {searchTerm || statusFilter !== 'all' ? 'Geen resultaten gevonden' : 'Geen facturen aanwezig'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              {activeTab === 'customers' 
                ? `${filteredCustomers.length} van ${customers.length} debiteuren` 
                : `${filteredInvoices.length} van ${invoices.length} facturen`
              }
            </span>
            <div className="flex items-center gap-2">
              <span>Rijen per pagina: 25</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    concept: 'bg-slate-100 text-slate-600 border-slate-200',
    verzonden: 'bg-blue-50 text-blue-700 border-blue-200',
    open: 'bg-amber-50 text-amber-700 border-amber-200',
    betaald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    vervallen: 'bg-red-50 text-red-700 border-red-200',
    herinnering: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const labels = {
    concept: 'Concept',
    verzonden: 'Verzonden',
    open: 'Open',
    betaald: 'Betaald',
    vervallen: 'Vervallen',
    herinnering: 'Herinnering',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.concept}`}>
      {labels[status] || status}
    </span>
  );
};

export default DebiterenPage;
