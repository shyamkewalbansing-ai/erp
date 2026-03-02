import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, quotesAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  Search,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  CheckCircle,
  Circle,
  ArrowUpDown,
  Download,
  Mail,
  Receipt,
  Eye,
  Trash2,
  MoreHorizontal,
  Building2,
  User,
  CreditCard
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

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

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
      active 
        ? 'bg-emerald-500 text-white shadow-md' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

// Status Legend Item
const StatusLegendItem = ({ icon: Icon, label, color }) => (
  <div className="flex items-center gap-2">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    betaald: { label: 'Betaald', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    verzonden: { label: 'Verzonden', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    herinnering: { label: 'Herinnering', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    verlopen: { label: 'Verlopen', className: 'bg-red-100 text-red-700 border-red-200' },
    concept: { label: 'Concept', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    deelbetaling: { label: 'Deelbetaling', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    geaccepteerd: { label: 'Geaccepteerd', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  
  const { label, className } = config[status] || { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' };
  
  return (
    <Badge className={`${className} text-xs font-medium`}>
      {label}
    </Badge>
  );
};

const VerkoopPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('facturen');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, quotesRes] = await Promise.all([
        invoicesAPI.getAll({ invoice_type: 'sales' }),
        quotesAPI.getAll()
      ]);
      setInvoices(invoicesRes.data || []);
      setQuotes(quotesRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRows = () => {
    const currentData = activeTab === 'facturen' ? filteredInvoices : filteredQuotes;
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map(item => item.id));
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuotes = quotes.filter(quote =>
    (quote.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quote.klant_naam || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totaalOmzet = invoices.filter(i => i.status === 'betaald').reduce((sum, i) => sum + (i.totaal || 0), 0);
  const totaalOpenstaand = invoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').reduce((sum, i) => sum + (i.totaal || 0), 0);
  const aantalFacturen = invoices.length;
  const aantalOffertes = quotes.length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="verkoop-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Verkoopbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <TabButton active={activeTab === 'facturen'} onClick={() => { setActiveTab('facturen'); setSelectedRows([]); }}>
            Facturen
          </TabButton>
          <TabButton active={activeTab === 'offertes'} onClick={() => { setActiveTab('offertes'); setSelectedRows([]); }}>
            Offertes
          </TabButton>
          <TabButton active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSelectedRows([]); }}>
            Verkooporders
          </TabButton>
          <TabButton active={activeTab === 'creditnota'} onClick={() => { setActiveTab('creditnota'); setSelectedRows([]); }}>
            Creditnota's
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => { setActiveTab('rapporten'); setSelectedRows([]); }}>
            Rapporten
          </TabButton>
          
          {/* Action Button */}
          <div className="ml-auto">
            <Button 
              onClick={() => navigate(activeTab === 'offertes' ? '/app/boekhouding/verkoop/offerte' : '/app/boekhouding/verkoop/nieuw')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5" 
              data-testid="add-invoice-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'offertes' ? 'Nieuwe Offerte' : 'Nieuwe Factuur'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="grid grid-cols-5 gap-6 items-end">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Factuur / Klant
            </Label>
            <div className="relative">
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg pr-10 h-11"
                data-testid="search-input"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Boekjaar */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Boekjaar</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="rounded-lg h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg h-11">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="concept">Concept</SelectItem>
                <SelectItem value="verzonden">Verzonden</SelectItem>
                <SelectItem value="betaald">Betaald</SelectItem>
                <SelectItem value="herinnering">Herinnering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Verantwoordelijke */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              Verantwoordelijke
            </Label>
            <Select defaultValue="all">
              <SelectTrigger className="rounded-lg h-11">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="me">Alleen mij</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Totaal Openstaand */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Openstaand</span>
            <p className="text-lg font-bold text-orange-500">{formatCurrency(totaalOpenstaand)}</p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Concept" color="text-gray-400" />
          <StatusLegendItem icon={Send} label="Verzonden" color="text-blue-500" />
          <StatusLegendItem icon={Clock} label="Wachten op betaling" color="text-amber-500" />
          <StatusLegendItem icon={CheckCircle} label="Betaald" color="text-emerald-500" />
          <StatusLegendItem icon={AlertCircle} label="Herinnering verzonden" color="text-amber-600" />
          <StatusLegendItem icon={XCircle} label="Vervallen" color="text-red-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards - 3D Style */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Totaal Facturen */}
          <div 
            className="bg-white rounded-2xl p-6 border border-gray-100 transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">TOTAAL FACTUREN</p>
                <p className="text-4xl font-bold text-gray-900">{aantalFacturen}</p>
                <p className="text-sm text-gray-400 mt-2">Dit boekjaar</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <Receipt className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* Totaal Omzet */}
          <div 
            className="bg-white rounded-2xl p-6 border border-gray-100 transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">TOTAAL OMZET</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totaalOmzet)}</p>
                <p className="text-sm text-gray-400 mt-2">Betaalde facturen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
          
          {/* Openstaand */}
          <div 
            className="bg-white rounded-2xl p-6 border border-gray-100 transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">OPENSTAAND</p>
                <p className="text-3xl font-bold text-orange-500">{formatCurrency(totaalOpenstaand)}</p>
                <p className="text-sm text-gray-400 mt-2">Nog te ontvangen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
          
          {/* Offertes */}
          <div 
            className="bg-white rounded-2xl p-6 border border-gray-100 transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">OFFERTES</p>
                <p className="text-4xl font-bold text-gray-900">{aantalOffertes}</p>
                <p className="text-sm text-gray-400 mt-2">Actieve offertes</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === 'facturen' && `Verkoopfacturen (${filteredInvoices.length})`}
                  {activeTab === 'offertes' && `Offertes (${filteredQuotes.length})`}
                  {activeTab === 'orders' && 'Verkooporders'}
                  {activeTab === 'creditnota' && "Creditnota's"}
                  {activeTab === 'rapporten' && 'Verkooprapporten'}
                </span>
                {selectedRows.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg">
                    <span className="text-sm text-emerald-700">{selectedRows.length} geselecteerd</span>
                    <Button variant="ghost" size="sm" className="h-7 text-emerald-700 hover:bg-emerald-100">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </div>

            {/* Facturen Table */}
            {activeTab === 'facturen' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredInvoices.length && filteredInvoices.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Factuurnummer
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Klant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Vervaldatum</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="w-16 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Laden...</td>
                      </tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Geen facturen gevonden</td>
                      </tr>
                    ) : (
                      filteredInvoices.map(invoice => (
                        <tr 
                          key={invoice.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedRows.includes(invoice.id) ? 'bg-emerald-50' : ''}`}
                          onClick={() => navigate(`/app/boekhouding/verkoop/${invoice.id}`)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRows.includes(invoice.id)}
                              onCheckedChange={() => toggleRowSelection(invoice.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{invoice.nummer}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{invoice.debiteur_naam || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.datum)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.vervaldatum)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(invoice.totaal)}</td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/app/boekhouding/verkoop/${invoice.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Bekijken
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Versturen
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF downloaden
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Markeer als betaald
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Offertes Table */}
            {activeTab === 'offertes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredQuotes.length && filteredQuotes.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Nummer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Klant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Geldig tot</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="w-16 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Laden...</td>
                      </tr>
                    ) : filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Geen offertes gevonden</td>
                      </tr>
                    ) : (
                      filteredQuotes.map(quote => (
                        <tr 
                          key={quote.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedRows.includes(quote.id) ? 'bg-emerald-50' : ''}`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRows.includes(quote.id)}
                              onCheckedChange={() => toggleRowSelection(quote.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{quote.nummer}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{quote.klant_naam || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(quote.datum)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(quote.geldig_tot)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(quote.totaal)}</td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={quote.status} />
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Bekijken
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Versturen
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Receipt className="w-4 h-4 mr-2" />
                                  Omzetten naar factuur
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty states for other tabs */}
            {(activeTab === 'orders' || activeTab === 'creditnota' || activeTab === 'rapporten') && (
              <div className="px-6 py-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {activeTab === 'orders' && 'Nog geen verkooporders'}
                  {activeTab === 'creditnota' && "Nog geen creditnota's"}
                  {activeTab === 'rapporten' && 'Nog geen rapporten'}
                </p>
                {activeTab !== 'rapporten' && (
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    {activeTab === 'orders' ? 'Nieuwe order' : 'Nieuwe creditnota'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerkoopPage;
