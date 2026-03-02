import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, quotesAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  Search,
  Building2,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  CheckCircle,
  Circle,
  ArrowUpDown,
  User,
  Download,
  Mail,
  ShoppingCart,
  Receipt,
  Eye,
  Printer
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

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
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
    <span className="text-xs text-gray-600">{label}</span>
  </div>
);

// Status Icon Component
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'betaald':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'verzonden':
      return <Send className="w-5 h-5 text-blue-500" />;
    case 'herinnering':
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case 'verlopen':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'concept':
      return <Circle className="w-5 h-5 text-gray-400" />;
    case 'geaccepteerd':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

// Action Badge Component
const ActionBadge = ({ type, label }) => {
  const colors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600', 
    danger: 'text-red-600',
    info: 'text-blue-600',
    neutral: 'text-gray-500'
  };
  
  return (
    <span className={`text-sm ${colors[type] || colors.neutral}`}>
      {label}
    </span>
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

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Toggle all rows
  const toggleAllRows = () => {
    const currentData = activeTab === 'facturen' ? filteredInvoices : filteredQuotes;
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map(item => item.id));
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter quotes
  const filteredQuotes = quotes.filter(quote =>
    (quote.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quote.klant_naam || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totaalOmzet = invoices.filter(i => i.status === 'betaald').reduce((sum, i) => sum + (i.totaal || 0), 0);
  const totaalOpenstaand = invoices.filter(i => i.status !== 'betaald').reduce((sum, i) => sum + (i.totaal || 0), 0);
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
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={() => navigate('/app/boekhouding/verkoop/nieuw')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
              data-testid="add-invoice-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'offertes' ? 'Nieuwe Offerte' : 'Nieuwe Factuur'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {activeTab === 'facturen' ? 'Factuur / Klant' : 'Offerte / Klant'}
            </Label>
            <div className="relative">
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg pr-10"
                data-testid="search-input"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Boekjaar */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Boekjaar</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="rounded-lg">
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
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
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
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              Verantwoordelijke
            </Label>
            <Select defaultValue="all">
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="me">Alleen mij</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Totaal info */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Openstaand</span>
            <p className="text-sm font-bold text-amber-600">{formatCurrency(totaalOpenstaand)}</p>
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
        {/* Summary Cards - Zakelijk 3D */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Facturen</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{aantalFacturen}</p>
                <p className="text-xs text-gray-400 mt-1">Dit boekjaar</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Receipt className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Omzet</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totaalOmzet)}</p>
                <p className="text-xs text-gray-400 mt-1">Betaalde facturen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Openstaand</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(totaalOpenstaand)}</p>
                <p className="text-xs text-gray-400 mt-1">Nog te ontvangen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Offertes</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{aantalOffertes}</p>
                <p className="text-xs text-gray-400 mt-1">Actieve offertes</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

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
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </div>

            {/* Facturen Table */}
            {activeTab === 'facturen' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredInvoices.length && filteredInvoices.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Factuurnummer
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Klant
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Datum
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Vervaldatum
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Bedrag
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actie
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-5 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <tr 
                          key={invoice.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(invoice.id) ? 'bg-emerald-50/50' : ''
                          }`}
                          data-testid={`invoice-row-${invoice.nummer}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(invoice.id)}
                              onCheckedChange={() => toggleRowSelection(invoice.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">{invoice.nummer}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{invoice.debiteur_naam || 'Onbekend'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDate(invoice.datum)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDate(invoice.vervaldatum)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.totaal, invoice.valuta)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-gray-500 hover:text-gray-700">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <Mail className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen facturen gevonden</p>
                          <p className="text-sm text-gray-500 mb-6">Maak uw eerste verkoopfactuur aan.</p>
                          <Button onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            <Plus className="w-4 h-4 mr-2" />
                            Nieuwe Factuur
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Offertes Table */}
            {activeTab === 'offertes' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredQuotes.length && filteredQuotes.length > 0}
                          onCheckedChange={toggleAllRows}
                          className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Offertenummer
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Klant
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Datum
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Geldig tot
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Bedrag
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actie
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-5 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : filteredQuotes.length > 0 ? (
                      filteredQuotes.map((quote) => (
                        <tr 
                          key={quote.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(quote.id) ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(quote.id)}
                              onCheckedChange={() => toggleRowSelection(quote.id)}
                              className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">{quote.nummer}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{quote.klant_naam || 'Onbekend'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDate(quote.datum)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDate(quote.geldig_tot)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={quote.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(quote.totaal, quote.valuta)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-gray-500 hover:text-gray-700">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen offertes gevonden</p>
                          <p className="text-sm text-gray-500 mb-6">Maak uw eerste offerte aan.</p>
                          <Button onClick={() => navigate('/app/boekhouding/verkoop/nieuw')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            <Plus className="w-4 h-4 mr-2" />
                            Nieuwe Offerte
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab === 'orders' || activeTab === 'creditnota' || activeTab === 'rapporten') && (
              <div className="px-4 py-16 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {activeTab === 'orders' && 'Verkooporders'}
                  {activeTab === 'creditnota' && "Creditnota's"}
                  {activeTab === 'rapporten' && 'Verkooprapporten'}
                </p>
                <p className="text-sm text-gray-500">Deze sectie wordt binnenkort beschikbaar.</p>
              </div>
            )}

            {/* Footer with selection info */}
            {selectedRows.length > 0 && (
              <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700">
                  {selectedRows.length} {activeTab === 'facturen' ? 'factuur/facturen' : 'offerte(s)'} geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Mail className="w-4 h-4 mr-2" />
                    Versturen
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Download className="w-4 h-4 mr-2" />
                    Exporteren
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerkoopPage;
