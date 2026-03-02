import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI } from '../../lib/boekhoudingApi';
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
  Truck, 
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

// Status Icon Component
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'betaald':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'openstaand':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'verlopen':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-400" />;
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

const CrediteruenPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await suppliersAPI.getAll();
      setSuppliers(res.data || []);
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
    if (selectedRows.length === suppliers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(suppliers.map(s => s.id));
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s =>
    (s.naam || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nummer || s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get supplier status
  const getSupplierStatus = (supplier) => {
    const openstaand = supplier.openstaand_bedrag || 0;
    if (openstaand > 10000) return 'verlopen';
    if (openstaand > 0) return 'openstaand';
    return 'betaald';
  };

  // Calculate totals
  const totalOpenstaand = suppliers.reduce((sum, s) => sum + (s.openstaand_bedrag || 0), 0);
  const overdueSuppliers = suppliers.filter(s => getSupplierStatus(s) === 'verlopen').length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="crediteuren-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Crediteurenbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
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
          <TabButton active={activeTab === 'betalingen'} onClick={() => setActiveTab('betalingen')}>
            Betalingen Verwerken
          </TabButton>
          <TabButton active={activeTab === 'afletteren'} onClick={() => setActiveTab('afletteren')}>
            Afletteren
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => setActiveTab('rapporten')}>
            Ouderdomsanalyse
          </TabButton>
          
          {/* Add Supplier Button */}
          <Button 
            onClick={() => navigate('/app/boekhouding/crediteuren/nieuw')}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
            data-testid="add-supplier-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Leverancier
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Leverancier / Search */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Leverancier
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
                <SelectItem value="me">Alleen mijn leveranciers</SelectItem>
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

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Toekomstige actie" color="text-gray-400" />
          <StatusLegendItem icon={Clock} label="Naderende betaling" color="text-amber-500" />
          <StatusLegendItem icon={AlertCircle} label="Wachten op factuur" color="text-blue-500" />
          <StatusLegendItem icon={Send} label="Betaald" color="text-emerald-500" />
          <StatusLegendItem icon={CheckCircle} label="Afgehandeld" color="text-emerald-600" />
          <StatusLegendItem icon={XCircle} label="Deadline overschreden" color="text-red-500" />
          <StatusLegendItem icon={AlertCircle} label="Geblokkeerd" color="text-red-600" />
        </div>
      </div>

      {/* Data Table */}
      <div className="p-6">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-12 px-4 py-3">
                      <Checkbox 
                        checked={selectedRows.length === suppliers.length && suppliers.length > 0}
                        onCheckedChange={toggleAllRows}
                        className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </th>
                    <th className="text-left px-4 py-3">
                      <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                        Leverancier
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
                      Facturen
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Transacties
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Te Betalen
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
                  ) : filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supplier, index) => {
                      const status = getSupplierStatus(supplier);
                      
                      return (
                        <tr 
                          key={supplier.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(supplier.id) ? 'bg-emerald-50/50' : ''
                          }`}
                          data-testid={`supplier-row-${supplier.nummer || supplier.code}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(supplier.id)}
                              onCheckedChange={() => toggleRowSelection(supplier.id)}
                              className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {supplier.nummer || supplier.code} - {supplier.naam || supplier.name}
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
                              <span className="text-sm text-gray-600">Factuur invoeren</span>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          </td>
                          <td className="px-4 py-3">
                            {(supplier.openstaand_bedrag || 0) > 0 ? (
                              <ActionBadge type="warning" label={formatCurrency(supplier.openstaand_bedrag, supplier.valuta)} />
                            ) : (
                              <ActionBadge type="success" label="Geen" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {status === 'verlopen' ? (
                              <ActionBadge type="danger" label="Betalen" />
                            ) : (
                              <ActionBadge type="neutral" label="Bekijken" />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <Truck className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">Geen leveranciers gevonden</p>
                        <p className="text-sm text-gray-500 mb-6">Voeg uw eerste leverancier toe om te beginnen.</p>
                        <Button onClick={() => navigate('/app/boekhouding/crediteuren/nieuw')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Eerste Leverancier Toevoegen
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
                  {selectedRows.length} leverancier(s) geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Send className="w-4 h-4 mr-2" />
                    Betaling Verwerken
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

export default CrediteruenPage;
