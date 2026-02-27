import React, { useState, useEffect } from 'react';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Loader2, 
  Download,
  FileText,
  Mail,
  RefreshCw,
  Eye,
  Edit,
  Users,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Pagination
  const currentItems = activeTab === 'customers' ? filteredCustomers : filteredInvoices;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = currentItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when switching tabs or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter]);

  // Calculate totals
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'vervallen').reduce((sum, i) => sum + (i.totaal_incl_btw || 0), 0);
  const invoiceStats = {
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
    <div className="min-h-screen bg-slate-100" data-testid="debiteuren-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Debiteuren</h1>
            <p className="text-slate-400 text-sm mt-0.5">Klantenbeheer en openstaande posten</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Vernieuwen
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Exporteren
            </Button>
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="add-customer-btn">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nieuwe debiteur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader className="border-b border-slate-200 pb-4">
                  <DialogTitle className="text-lg font-semibold text-slate-800">Nieuwe debiteur aanmaken</DialogTitle>
                </DialogHeader>
                
                <div className="py-4 space-y-5">
                  {/* Algemeen */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Algemeen</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1 block">Naam <span className="text-red-500">*</span></Label>
                        <Input
                          value={newCustomer.naam}
                          onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                          placeholder="Bedrijfsnaam of naam"
                          className="h-9 text-sm"
                          data-testid="customer-name-input"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">BTW-nummer</Label>
                        <Input
                          value={newCustomer.btw_nummer}
                          onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                          placeholder="BTW-ID"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adres */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Adresgegevens</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1 block">Adres</Label>
                        <Input
                          value={newCustomer.adres}
                          onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                          placeholder="Straat en huisnummer"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">Postcode</Label>
                        <Input
                          value={newCustomer.postcode}
                          onChange={(e) => setNewCustomer({...newCustomer, postcode: e.target.value})}
                          placeholder="Postcode"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">Plaats</Label>
                        <Input
                          value={newCustomer.plaats}
                          onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                          placeholder="Plaatsnaam"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600 mb-1 block">Land</Label>
                        <Select value={newCustomer.land} onValueChange={(v) => setNewCustomer({...newCustomer, land: v})}>
                          <SelectTrigger className="h-9 text-sm">
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
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contactgegevens</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">Telefoon</Label>
                        <Input
                          value={newCustomer.telefoon}
                          onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                          placeholder="+597 000 0000"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">E-mail</Label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                          placeholder="email@voorbeeld.sr"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financieel */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financieel</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 block">Valuta</Label>
                        <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
                          <SelectTrigger className="h-9 text-sm">
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
                        <Label className="text-xs text-slate-600 mb-1 block">Betalingstermijn</Label>
                        <Select 
                          value={String(newCustomer.betalingstermijn)} 
                          onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                        >
                          <SelectTrigger className="h-9 text-sm">
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
                        <Label className="text-xs text-slate-600 mb-1 block">Kredietlimiet</Label>
                        <Input
                          type="number"
                          value={newCustomer.kredietlimiet}
                          onChange={(e) => setNewCustomer({...newCustomer, kredietlimiet: parseFloat(e.target.value) || 0})}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-slate-200 pt-4">
                  <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-customer-btn">
                    {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Opslaan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Totaal Debiteuren</p>
                <p className="text-xl font-bold text-slate-800">{customers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Openstaand</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totalOverdue > 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Vervallen</p>
                <p className={`text-xl font-bold ${totalOverdue > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatCurrency(totalOverdue)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-medium mb-2">Factuurstatus</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-slate-600">{invoiceStats.open} open</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-slate-600">{invoiceStats.overdue} vervallen</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-slate-600">{invoiceStats.paid} betaald</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          {/* Tabs & Search */}
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'customers' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
                data-testid="tab-customers"
              >
                <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Debiteuren ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'invoices' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
                data-testid="tab-invoices"
              >
                <Receipt className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Facturen ({invoices.length})
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-64 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="search-input"
                />
              </div>
              {activeTab === 'invoices' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-40 text-sm bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Alle statussen" />
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

          {/* Debiteuren Table */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Nr.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Naam</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Plaats</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Telefoon</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">E-mail</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Valuta</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Saldo</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((customer, index) => (
                    <tr 
                      key={customer.id} 
                      className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      data-testid={`customer-row-${customer.nummer}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{customer.nummer}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{customer.naam}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{customer.plaats || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{customer.telefoon || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{customer.email || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {customer.valuta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm font-semibold ${
                          (customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : 'text-slate-700'
                        }`}>
                          {formatCurrency(customer.openstaand_bedrag || 0, customer.valuta)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded hover:bg-slate-200 transition-colors" title="Bekijken">
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-slate-200 transition-colors" title="Bewerken">
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        {searchTerm ? 'Geen resultaten gevonden' : 'Nog geen debiteuren aangemaakt'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Facturen Table */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Factuurnr.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Datum</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Debiteur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Vervaldatum</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Bedrag</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Status</th>
                    <th className="px-4 py-3 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((invoice, index) => (
                    <tr 
                      key={invoice.id} 
                      className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      data-testid={`invoice-row-${invoice.factuurnummer}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-emerald-600 hover:text-emerald-700 cursor-pointer hover:underline">
                          {invoice.factuurnummer}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(invoice.factuurdatum)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{invoice.debiteur_naam || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${invoice.status === 'vervallen' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {formatDate(invoice.vervaldatum)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded hover:bg-slate-200 transition-colors" title="Bekijken">
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-slate-200 transition-colors" title="PDF">
                            <FileText className="w-4 h-4 text-slate-500" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-slate-200 transition-colors" title="E-mail">
                            <Mail className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        {searchTerm || statusFilter !== 'all' ? 'Geen resultaten gevonden' : 'Nog geen facturen aangemaakt'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {currentItems.length > 0 
                ? `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, currentItems.length)} van ${currentItems.length} ${activeTab === 'customers' ? 'debiteuren' : 'facturen'}`
                : `0 ${activeTab === 'customers' ? 'debiteuren' : 'facturen'}`
              }
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Pagina {currentPage} van {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    concept: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
    verzonden: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    open: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    betaald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    vervallen: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    herinnering: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };

  const labels = {
    concept: 'Concept',
    verzonden: 'Verzonden',
    open: 'Open',
    betaald: 'Betaald',
    vervallen: 'Vervallen',
    herinnering: 'Herinnering',
  };

  const style = config[status] || config.concept;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded border ${style.bg} ${style.text} ${style.border}`}>
      {labels[status] || status}
    </span>
  );
};

export default DebiterenPage;
