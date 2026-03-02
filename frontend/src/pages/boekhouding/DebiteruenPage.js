import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
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
  Users, 
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
  User
} from 'lucide-react';

// Status Legend Item
const StatusLegendItem = ({ icon: Icon, label, color }) => (
  <div className="flex items-center gap-2">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-xs text-gray-600">{label}</span>
  </div>
);

// Tab Button Component - matches the reference design
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

const DebiteurenPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRows, setSelectedRows] = useState([]);

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

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.length === customers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(customers.map(c => c.id));
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    (c.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get invoice status for customer
  const getCustomerInvoiceStatus = (customer) => {
    const customerInvoices = invoices.filter(i => i.debiteur_id === customer.id);
    const hasOverdue = customerInvoices.some(i => {
      if (!i.vervaldatum || i.status === 'betaald') return false;
      return new Date(i.vervaldatum) < new Date();
    });
    const hasPending = customerInvoices.some(i => i.status === 'verzonden');
    const allPaid = customerInvoices.length > 0 && customerInvoices.every(i => i.status === 'betaald');
    
    if (hasOverdue) return 'verlopen';
    if (hasPending) return 'verzonden';
    if (allPaid) return 'betaald';
    return 'concept';
  };

  // Calculate totals
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);
  const overdueCustomers = customers.filter(c => getCustomerInvoiceStatus(c) === 'verlopen').length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="debiteuren-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Debiteurenbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row - Like reference design */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'overzicht'} onClick={() => setActiveTab('overzicht')}>
            Overzicht
          </TabButton>
          <TabButton active={activeTab === 'verwerken'} onClick={() => setActiveTab('verwerken')}>
            Verwerken
          </TabButton>
          <TabButton active={activeTab === 'facturen'} onClick={() => setActiveTab('facturen')}>
            Openstaande Facturen
          </TabButton>
          <TabButton active={activeTab === 'herinneringen'} onClick={() => setActiveTab('herinneringen')}>
            Herinneringen Verzenden
          </TabButton>
          <TabButton active={activeTab === 'afletteren'} onClick={() => setActiveTab('afletteren')}>
            Afletteren
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => setActiveTab('rapporten')}>
            Ouderdomsanalyse
          </TabButton>
          
          {/* Add Customer Button */}
          <Button 
            onClick={() => navigate('/app/boekhouding/debiteuren/nieuw')}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
            data-testid="add-customer-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Debiteur
          </Button>
        </div>
      </div>

      {/* Filter Section - Like reference design */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Administratie / Search */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Debiteur
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
                <SelectItem value="me">Alleen mijn debiteuren</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Periode info */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Periode</span>
            <p className="text-sm font-medium text-gray-700">Jan - Dec {selectedYear}</p>
          </div>
        </div>
      </div>

      {/* Status Legend - Like reference design */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Toekomstige actie" color="text-gray-400" />
          <StatusLegendItem icon={Clock} label="Naderende actie" color="text-amber-500" />
          <StatusLegendItem icon={AlertCircle} label="Wachten op betaling" color="text-blue-500" />
          <StatusLegendItem icon={Send} label="Verzonden" color="text-emerald-500" />
          <StatusLegendItem icon={CheckCircle} label="Afgehandeld" color="text-emerald-600" />
          <StatusLegendItem icon={XCircle} label="Deadline overschreden" color="text-red-500" />
          <StatusLegendItem icon={AlertCircle} label="Afgekeurd" color="text-red-600" />
        </div>
      </div>

      {/* Data Table - Like reference design */}
      <div className="p-6">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-10 px-4 py-3">
                      <Checkbox 
                        checked={selectedRows.length === customers.length && customers.length > 0}
                        onCheckedChange={toggleAllRows}
                      />
                    </th>
                    <th className="text-left px-4 py-3">
                      <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                        Debiteur
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Frequentie
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Periode
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Invoerverzoek
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Transacties
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Openstaand
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
                        <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-5 mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-5 mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      </tr>
                    ))
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => {
                      const status = getCustomerInvoiceStatus(customer);
                      const customerInvoices = invoices.filter(i => i.debiteur_id === customer.id);
                      
                      return (
                        <tr 
                          key={customer.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(customer.id) ? 'bg-emerald-50/50' : ''
                          }`}
                          data-testid={`customer-row-${customer.nummer}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(customer.id)}
                              onCheckedChange={() => toggleRowSelection(customer.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {customer.nummer} - {customer.naam}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">Maandelijks</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{index + 1}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Circle className="w-4 h-4 text-gray-300" />
                              <span className="text-sm text-gray-600">Maak invoerverzoek aan</span>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {customerInvoices.length > 0 ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(customer.openstaand_bedrag || 0) > 0 ? (
                              <ActionBadge type="warning" label={formatAmount(customer.openstaand_bedrag, customer.valuta)} />
                            ) : (
                              <ActionBadge type="success" label="Geen" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {status === 'verlopen' ? (
                              <ActionBadge type="danger" label="Herinnering" />
                            ) : (
                              <ActionBadge type="neutral" label="Aanmaken" />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">Geen debiteuren gevonden</p>
                        <p className="text-sm text-gray-500 mb-6">Voeg uw eerste debiteur toe om te beginnen.</p>
                        <Button onClick={() => navigate('/app/boekhouding/debiteuren/nieuw')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Eerste Debiteur Toevoegen
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with selection info */}
            {selectedRows.length > 0 && (
              <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700">
                  {selectedRows.length} debiteur(en) geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Send className="w-4 h-4 mr-2" />
                    Herinnering Verzenden
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <FileText className="w-4 h-4 mr-2" />
                    Rapport Genereren
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

export default DebiteurenPage;
