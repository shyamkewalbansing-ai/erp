import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, quotesAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
  TrendingUp,
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
  const aantalBetaald = invoices.filter(i => i.status === 'betaald').length;
  const aantalOpenstaand = invoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').length;

  const tabs = [
    { id: 'facturen', label: 'Facturen', count: aantalFacturen },
    { id: 'offertes', label: 'Offertes', count: aantalOffertes },
    { id: 'orders', label: 'Verkooporders', count: 0 },
    { id: 'creditnota', label: "Creditnota's", count: 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-100" data-testid="verkoop-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Verkoopbeheer</h1>
                <p className="text-xs text-slate-500">Facturen, offertes en verkooporders</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
              <Button 
                onClick={() => navigate(activeTab === 'offertes' ? '/app/boekhouding/verkoop/offerte' : '/app/boekhouding/verkoop/nieuw')}
                className="bg-emerald-600 hover:bg-emerald-700" 
                size="sm"
                data-testid="add-invoice-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'offertes' ? 'Nieuwe Offerte' : 'Nieuwe Factuur'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Totaal Omzet</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totaalOmzet)}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {aantalBetaald} betaald
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Openstaand</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totaalOpenstaand)}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {aantalOpenstaand} facturen
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Facturen</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{aantalFacturen}</p>
                  <p className="text-xs text-slate-500 mt-1">Dit boekjaar</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Offertes</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{aantalOffertes}</p>
                  <p className="text-xs text-slate-500 mt-1">Actief</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="px-4 flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedRows([]); }}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-emerald-600 text-emerald-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                      activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  data-testid="search-input"
                />
              </div>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-sm">
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

              {selectedRows.length > 0 && (
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg">
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
            </div>
          </div>

          {/* Table */}
          <CardContent className="p-0">
            {activeTab === 'facturen' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-10 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredInvoices.length && filteredInvoices.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        <button className="flex items-center gap-1 hover:text-slate-900">
                          Nummer <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Klant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vervaldatum</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                      <th className="w-20 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Laden...</td>
                      </tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Geen facturen gevonden</td>
                      </tr>
                    ) : (
                      filteredInvoices.map(invoice => (
                        <tr 
                          key={invoice.id} 
                          className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedRows.includes(invoice.id) ? 'bg-emerald-50' : ''}`}
                          onClick={() => navigate(`/app/boekhouding/verkoop/${invoice.id}`)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRows.includes(invoice.id)}
                              onCheckedChange={() => toggleRowSelection(invoice.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900">{invoice.nummer}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{invoice.debiteur_naam || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(invoice.datum)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(invoice.vervaldatum)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(invoice.totaal)}</td>
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

            {activeTab === 'offertes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-10 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredQuotes.length && filteredQuotes.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nummer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Klant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Geldig tot</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                      <th className="w-20 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Laden...</td>
                      </tr>
                    ) : filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Geen offertes gevonden</td>
                      </tr>
                    ) : (
                      filteredQuotes.map(quote => (
                        <tr 
                          key={quote.id} 
                          className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedRows.includes(quote.id) ? 'bg-emerald-50' : ''}`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRows.includes(quote.id)}
                              onCheckedChange={() => toggleRowSelection(quote.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900">{quote.nummer}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{quote.klant_naam || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(quote.datum)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(quote.geldig_tot)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(quote.totaal)}</td>
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

            {(activeTab === 'orders' || activeTab === 'creditnota') && (
              <div className="px-6 py-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nog geen {activeTab === 'orders' ? 'verkooporders' : "creditnota's"}</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'orders' ? 'Nieuwe order' : 'Nieuwe creditnota'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerkoopPage;
