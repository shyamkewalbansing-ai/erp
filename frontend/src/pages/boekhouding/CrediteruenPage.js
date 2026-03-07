import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI, purchaseInvoicesAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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
  User,
  Loader2,
  Mail,
  DollarSign,
  Eye,
  Edit,
  BarChart3,
  Link2,
  Receipt,
  Save,
  CreditCard,
  Banknote
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
    case 'verzonden':
    case 'openstaand':
      return <Clock className="w-5 h-5 text-blue-500" />;
    case 'verlopen':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'concept':
      return <Circle className="w-5 h-5 text-gray-400" />;
    default:
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
};

// Stat Card Component with 3D shadow (matching VerkoopPage style)
const StatCard = ({ title, value, subtitle, icon: Icon, valueColor = 'text-gray-800' }) => (
  <Card className="bg-white border border-gray-200 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide">{title}</p>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CrediteruenPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedYear, setSelectedYear] = useState('alle');
  const [selectedRows, setSelectedRows] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [paymentForm, setPaymentForm] = useState({ bedrag: 0, datum: '', betaalmethode: 'bank', referentie: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, invoicesRes] = await Promise.all([
        suppliersAPI.getAll(),
        purchaseInvoicesAPI.getAll()
      ]);
      setSuppliers(suppliersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Calculate available years from invoices
  const availableYears = useMemo(() => {
    const years = new Set();
    invoices.forEach(inv => {
      const datum = inv.datum || inv.factuurdatum || '';
      if (datum) {
        const year = datum.substring(0, 4);
        if (year) years.add(year);
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Filter invoices by selected year
  const filteredInvoices = useMemo(() => {
    if (selectedYear === 'alle') return invoices;
    return invoices.filter(inv => {
      const datum = inv.datum || inv.factuurdatum || '';
      return datum.startsWith(selectedYear);
    });
  }, [invoices, selectedYear]);

  // Calculate period display
  const periodDisplay = useMemo(() => {
    if (selectedYear === 'alle') return 'Alle jaren';
    return `Jan - Dec ${selectedYear}`;
  }, [selectedYear]);

  // Open edit modal
  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({
      naam: supplier.naam || supplier.name || '',
      email: supplier.email || '',
      telefoon: supplier.telefoon || '',
      adres: supplier.adres || '',
      plaats: supplier.plaats || '',
      postcode: supplier.postcode || '',
      land: supplier.land || 'Suriname',
      btw_nummer: supplier.btw_nummer || '',
      kvk_nummer: supplier.kvk_nummer || '',
      betalingstermijn: supplier.betalingstermijn || 30,
      iban: supplier.iban || '',
      bank_naam: supplier.bank_naam || ''
    });
    setEditModalOpen(true);
  };

  // Save edited supplier
  const handleSaveSupplier = async () => {
    if (!editForm.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await suppliersAPI.update(selectedSupplier.id, editForm);
      toast.success('Leverancier bijgewerkt');
      setEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  // Show supplier invoices
  const handleShowInvoices = (supplier) => {
    setSelectedSupplier(supplier);
    setInvoicesModalOpen(true);
  };

  // Get invoices for selected supplier
  const supplierInvoices = useMemo(() => {
    if (!selectedSupplier) return [];
    return filteredInvoices.filter(i => i.crediteur_id === selectedSupplier.id);
  }, [selectedSupplier, filteredInvoices]);

  // Open payment modal
  const handleOpenPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      bedrag: invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal || 0,
      datum: new Date().toISOString().split('T')[0],
      betaalmethode: 'bank',
      referentie: ''
    });
    setPaymentModalOpen(true);
  };

  // Process payment
  const handleProcessPayment = async () => {
    if (!paymentForm.bedrag || paymentForm.bedrag <= 0) {
      toast.error('Vul een geldig bedrag in');
      return;
    }
    setSaving(true);
    try {
      await purchaseInvoicesAPI.addPayment(selectedInvoice.id, paymentForm);
      toast.success('Betaling verwerkt en geboekt naar grootboek');
      setPaymentModalOpen(false);
      setInvoicesModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwerken betaling');
    } finally {
      setSaving(false);
    }
  };

  // Calculate statistics based on filtered invoices
  const stats = useMemo(() => {
    const openInvoices = filteredInvoices.filter(i => i.status !== 'betaald' && i.status !== 'concept');
    const overdueInvoices = openInvoices.filter(i => {
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
    const totalOpen = openInvoices.reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || i.totaal || 0), 0);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || i.totaal || 0), 0);
    const totalPaid = filteredInvoices.filter(i => i.status === 'betaald')
      .reduce((sum, i) => sum + (i.totaal_incl_btw || i.totaal || 0), 0);

    return {
      totalSuppliers: suppliers.length,
      openInvoices: openInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalOpen,
      totalOverdue,
      totalPaid
    };
  }, [suppliers, filteredInvoices]);

  // Filter invoices by status for tabs
  const openstaandeFacturen = useMemo(() => {
    return filteredInvoices.filter(i => 
      i.status === 'verzonden' || 
      i.status === 'openstaand' || 
      i.status === 'nieuw' ||
      i.status === 'geboekt'
    );
  }, [filteredInvoices]);

  const verlopenFacturen = useMemo(() => {
    return filteredInvoices.filter(i => {
      if (i.status === 'betaald' || i.status === 'concept') return false;
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
  }, [filteredInvoices]);

  // Aging analysis
  const ouderdomsAnalyse = useMemo(() => {
    const now = new Date();
    const categories = {
      'current': { label: '0-30 dagen', amount: 0, count: 0 },
      '30-60': { label: '30-60 dagen', amount: 0, count: 0 },
      '60-90': { label: '60-90 dagen', amount: 0, count: 0 },
      '90+': { label: '90+ dagen', amount: 0, count: 0 }
    };
    
    filteredInvoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').forEach(invoice => {
      const dueDate = new Date(invoice.vervaldatum || invoice.datum);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      const amount = invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal || 0;
      
      if (daysOverdue <= 30) {
        categories['current'].amount += amount;
        categories['current'].count++;
      } else if (daysOverdue <= 60) {
        categories['30-60'].amount += amount;
        categories['30-60'].count++;
      } else if (daysOverdue <= 90) {
        categories['60-90'].amount += amount;
        categories['60-90'].count++;
      } else {
        categories['90+'].amount += amount;
        categories['90+'].count++;
      }
    });
    
    return categories;
  }, [filteredInvoices]);

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s =>
    (s.naam || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nummer || s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get supplier name
  const getSupplierName = (crediteurId) => {
    const supplier = suppliers.find(s => s.id === crediteurId);
    return supplier ? (supplier.naam || supplier.name) : 'Onbekend';
  };

  // Get supplier status
  const getSupplierStatus = (supplier) => {
    const supplierInvs = filteredInvoices.filter(i => i.crediteur_id === supplier.id);
    const hasOverdue = supplierInvs.some(i => {
      if (i.status === 'betaald') return false;
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
    const hasOpen = supplierInvs.some(i => i.status !== 'betaald' && i.status !== 'concept');
    
    if (hasOverdue) return 'verlopen';
    if (hasOpen) return 'openstaand';
    return 'betaald';
  };

  // Get supplier open amount
  const getSupplierOpenAmount = (supplier) => {
    return filteredInvoices
      .filter(i => i.crediteur_id === supplier.id && i.status !== 'betaald')
      .reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || i.totaal || 0), 0);
  };

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Bulk pay selected invoices
  const handleBulkPay = async () => {
    if (selectedRows.length === 0) {
      toast.error('Selecteer eerst facturen');
      return;
    }
    setProcessing(true);
    try {
      for (const id of selectedRows) {
        const invoice = filteredInvoices.find(i => i.id === id);
        if (invoice && invoice.status !== 'betaald') {
          await purchaseInvoicesAPI.addPayment(id, {
            bedrag: invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal,
            datum: new Date().toISOString().split('T')[0],
            betaalmethode: 'bank',
            referentie: 'Bulk betaling'
          });
        }
      }
      toast.success(`${selectedRows.length} facturen betaald en geboekt naar grootboek`);
      setSelectedRows([]);
      fetchData();
    } catch (error) {
      toast.error('Fout bij verwerken betalingen');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="crediteuren-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
          <h1 className="text-xl font-semibold text-gray-800">Crediteurenbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'overzicht'} onClick={() => { setActiveTab('overzicht'); setSelectedRows([]); }}>
            Overzicht
          </TabButton>
          <TabButton active={activeTab === 'verwerken'} onClick={() => { setActiveTab('verwerken'); setSelectedRows([]); }}>
            Verwerken
          </TabButton>
          <TabButton active={activeTab === 'facturen'} onClick={() => { setActiveTab('facturen'); setSelectedRows([]); }}>
            Openstaande Facturen
          </TabButton>
          <TabButton active={activeTab === 'betalingen'} onClick={() => { setActiveTab('betalingen'); setSelectedRows([]); }}>
            Betalingen Verwerken
          </TabButton>
          <TabButton active={activeTab === 'afletteren'} onClick={() => { setActiveTab('afletteren'); setSelectedRows([]); }}>
            Afletteren
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => { setActiveTab('rapporten'); setSelectedRows([]); }}>
            Ouderdomsanalyse
          </TabButton>
          
          {/* Add Supplier Button */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={() => navigate('/app/boekhouding/crediteuren/nieuw')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
              data-testid="add-supplier-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Leverancier
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Search */}
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
                <SelectValue placeholder="Selecteer jaar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle jaren</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
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

          {/* Periode */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Periode</span>
            <p className="text-sm font-medium text-gray-700">{periodDisplay}</p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Concept" color="text-gray-400" />
          <StatusLegendItem icon={Clock} label="Openstaand" color="text-blue-500" />
          <StatusLegendItem icon={CheckCircle} label="Betaald" color="text-emerald-500" />
          <StatusLegendItem icon={XCircle} label="Verlopen" color="text-red-500" />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="TOTAAL CREDITEUREN"
            value={stats.totalSuppliers}
            subtitle="Actieve leveranciers"
            icon={Truck}
          />
          <StatCard
            title="TOTAAL BETAALD"
            value={formatCurrency(stats.totalPaid)}
            subtitle="Uitgaande betalingen"
            icon={CheckCircle}
          />
          <StatCard
            title="OPENSTAAND"
            value={formatCurrency(stats.totalOpen)}
            subtitle={`${stats.openInvoices} facturen`}
            icon={Clock}
            valueColor="text-amber-600"
          />
          <StatCard
            title="VERLOPEN"
            value={formatCurrency(stats.totalOverdue)}
            subtitle={`${stats.overdueInvoices} facturen`}
            icon={XCircle}
            valueColor="text-red-600"
          />
        </div>

        {/* Tab Content */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Overzicht Tab */}
            {activeTab === 'overzicht' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Nummer</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Naam</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Email</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Openstaand</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.length > 0 ? filteredSuppliers.map(supplier => {
                      const status = getSupplierStatus(supplier);
                      const openAmount = getSupplierOpenAmount(supplier);
                      return (
                        <tr key={supplier.id} className="border-b border-gray-100 hover:bg-emerald-50/30">
                          <td className="px-4 py-3 font-mono text-sm">{supplier.nummer || supplier.code || '-'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{supplier.naam || supplier.name}</td>
                          <td className="px-4 py-3 text-gray-600">{supplier.email || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {openAmount > 0 ? (
                              <span className="text-amber-600">{formatCurrency(openAmount)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/app/boekhouding/crediteuren/${supplier.id}`)}
                                title="Bekijken"
                                data-testid={`view-supplier-${supplier.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditSupplier(supplier)}
                                title="Bewerken"
                                data-testid={`edit-supplier-${supplier.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleShowInvoices(supplier)}
                                title="Facturen bekijken"
                                data-testid={`invoices-supplier-${supplier.id}`}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
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
            )}

            {/* Openstaande Facturen Tab */}
            {(activeTab === 'facturen' || activeTab === 'verwerken') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === openstaandeFacturen.length && openstaandeFacturen.length > 0}
                          onCheckedChange={() => {
                            if (selectedRows.length === openstaandeFacturen.length) {
                              setSelectedRows([]);
                            } else {
                              setSelectedRows(openstaandeFacturen.map(i => i.id));
                            }
                          }}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Factuurnr</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Leverancier</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Vervaldatum</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openstaandeFacturen.length > 0 ? openstaandeFacturen.map(invoice => {
                      const isOverdue = invoice.vervaldatum && new Date(invoice.vervaldatum) < new Date();
                      return (
                        <tr key={invoice.id} className={`border-b border-gray-100 hover:bg-emerald-50/30 ${isOverdue ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(invoice.id)}
                              onCheckedChange={() => toggleRowSelection(invoice.id)}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                          <td className="px-4 py-3">{getSupplierName(invoice.crediteur_id)}</td>
                          <td className="px-4 py-3">{formatDate(invoice.datum || invoice.factuurdatum)}</td>
                          <td className="px-4 py-3">
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(invoice.vervaldatum)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={isOverdue ? 'verlopen' : invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenPayment(invoice)}
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            >
                              <Banknote className="w-4 h-4 mr-1" />
                              Betalen
                            </Button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-200" />
                          <p className="text-lg font-semibold text-gray-700">Geen openstaande facturen</p>
                          <p className="text-sm text-gray-500">Alle facturen zijn betaald.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* Selection footer */}
                {selectedRows.length > 0 && (
                  <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-emerald-700">
                      {selectedRows.length} factuur/facturen geselecteerd
                    </span>
                    <Button 
                      onClick={handleBulkPay}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Betaal Geselecteerde
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Betalingen Verwerken Tab */}
            {activeTab === 'betalingen' && (
              <div className="p-6">
                <div className="text-center py-8">
                  <Banknote className="w-16 h-16 mx-auto mb-4 text-emerald-200" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Betalingen Verwerken</h3>
                  <p className="text-gray-500 mb-6">Selecteer facturen in de &quot;Openstaande Facturen&quot; tab om betalingen te verwerken.</p>
                  <p className="text-sm text-gray-400">Elke betaling wordt automatisch geboekt naar het grootboek:</p>
                  <div className="mt-4 inline-block text-left bg-gray-50 rounded-lg p-4">
                    <p className="text-sm"><strong>Crediteuren (2300):</strong> Debet (schuld verminderd)</p>
                    <p className="text-sm"><strong>Bank (1100):</strong> Credit (geld uitgegeven)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Afletteren Tab */}
            {activeTab === 'afletteren' && (
              <div className="p-6">
                <div className="text-center py-8">
                  <Link2 className="w-16 h-16 mx-auto mb-4 text-blue-200" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Afletteren</h3>
                  <p className="text-gray-500 mb-6">Koppel bankafschriften aan openstaande facturen voor automatische reconciliatie.</p>
                  <Button onClick={() => navigate('/app/boekhouding/bank')} variant="outline">
                    <Receipt className="w-4 h-4 mr-2" />
                    Ga naar Bankbeheer
                  </Button>
                </div>
              </div>
            )}

            {/* Ouderdomsanalyse Tab */}
            {activeTab === 'rapporten' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Ouderdomsanalyse Crediteuren
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {Object.entries(ouderdomsAnalyse).map(([key, data]) => (
                    <Card key={key} className="bg-white border rounded-lg">
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500 mb-1">{data.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">{data.count} facturen</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-700 mb-4">Verlopen Facturen</h4>
                  {verlopenFacturen.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-red-50 border-b">
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Factuurnr</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Leverancier</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Vervaldatum</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">Bedrag</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">Dagen over</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verlopenFacturen.map(invoice => {
                            const daysOver = Math.floor((new Date() - new Date(invoice.vervaldatum)) / (1000 * 60 * 60 * 24));
                            return (
                              <tr key={invoice.id} className="border-b hover:bg-red-50/50">
                                <td className="px-4 py-2 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                                <td className="px-4 py-2">{getSupplierName(invoice.crediteur_id)}</td>
                                <td className="px-4 py-2 text-red-600">{formatDate(invoice.vervaldatum)}</td>
                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal)}</td>
                                <td className="px-4 py-2 text-right text-red-600 font-medium">{daysOver} dagen</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Geen verlopen facturen</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Supplier Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Leverancier Bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Naam *</Label>
                <Input 
                  value={editForm.naam || ''} 
                  onChange={(e) => setEditForm({...editForm, naam: e.target.value})}
                  placeholder="Bedrijfsnaam"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editForm.email || ''} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="email@leverancier.sr"
                />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input 
                  value={editForm.telefoon || ''} 
                  onChange={(e) => setEditForm({...editForm, telefoon: e.target.value})}
                  placeholder="+597..."
                />
              </div>
              <div className="col-span-2">
                <Label>Adres</Label>
                <Input 
                  value={editForm.adres || ''} 
                  onChange={(e) => setEditForm({...editForm, adres: e.target.value})}
                  placeholder="Straat en huisnummer"
                />
              </div>
              <div>
                <Label>Plaats</Label>
                <Input 
                  value={editForm.plaats || ''} 
                  onChange={(e) => setEditForm({...editForm, plaats: e.target.value})}
                  placeholder="Paramaribo"
                />
              </div>
              <div>
                <Label>Land</Label>
                <Input 
                  value={editForm.land || ''} 
                  onChange={(e) => setEditForm({...editForm, land: e.target.value})}
                  placeholder="Suriname"
                />
              </div>
              <div>
                <Label>BTW Nummer</Label>
                <Input 
                  value={editForm.btw_nummer || ''} 
                  onChange={(e) => setEditForm({...editForm, btw_nummer: e.target.value})}
                />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input 
                  value={editForm.iban || ''} 
                  onChange={(e) => setEditForm({...editForm, iban: e.target.value})}
                  placeholder="Bankrekeningnummer"
                />
              </div>
              <div>
                <Label>Bank Naam</Label>
                <Input 
                  value={editForm.bank_naam || ''} 
                  onChange={(e) => setEditForm({...editForm, bank_naam: e.target.value})}
                  placeholder="DSB, Hakrinbank, etc."
                />
              </div>
              <div>
                <Label>Betalingstermijn (dagen)</Label>
                <Input 
                  type="number"
                  value={editForm.betalingstermijn || 30} 
                  onChange={(e) => setEditForm({...editForm, betalingstermijn: parseInt(e.target.value) || 30})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveSupplier} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Invoices Modal */}
      <Dialog open={invoicesModalOpen} onOpenChange={setInvoicesModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Facturen van {selectedSupplier?.naam || selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {supplierInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Geen facturen gevonden voor deze leverancier</p>
                <Button 
                  className="mt-4" 
                  onClick={() => {
                    setInvoicesModalOpen(false);
                    navigate('/app/boekhouding/inkoop/nieuw');
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Inkoopfactuur
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Factuurnr</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Vervaldatum</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierInvoices.map(invoice => {
                      const isOverdue = invoice.vervaldatum && new Date(invoice.vervaldatum) < new Date() && invoice.status !== 'betaald';
                      return (
                        <tr key={invoice.id} className={`border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                          <td className="px-4 py-3">{formatDate(invoice.datum || invoice.factuurdatum)}</td>
                          <td className="px-4 py-3">
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(invoice.vervaldatum)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(invoice.openstaand_bedrag || invoice.totaal_incl_btw || invoice.totaal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={isOverdue ? 'verlopen' : invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {invoice.status !== 'betaald' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenPayment(invoice)}
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              >
                                <Banknote className="w-4 h-4 mr-1" />
                                Betalen
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Totaal openstaand: <strong className="text-amber-600">
                      {formatCurrency(supplierInvoices.filter(i => i.status !== 'betaald').reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || i.totaal || 0), 0))}
                    </strong>
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setInvoicesModalOpen(false);
                      navigate('/app/boekhouding/inkoop/nieuw');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Factuur
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling Verwerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Factuur: <strong>{selectedInvoice?.factuurnummer || selectedInvoice?.nummer}</strong></p>
              <p className="text-sm text-gray-600">Leverancier: <strong>{getSupplierName(selectedInvoice?.crediteur_id)}</strong></p>
              <p className="text-sm text-gray-600">Openstaand: <strong className="text-amber-600">{formatCurrency(selectedInvoice?.openstaand_bedrag || selectedInvoice?.totaal_incl_btw || selectedInvoice?.totaal)}</strong></p>
            </div>
            
            <div>
              <Label>Bedrag *</Label>
              <Input 
                type="number"
                step="0.01"
                value={paymentForm.bedrag} 
                onChange={(e) => setPaymentForm({...paymentForm, bedrag: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Datum *</Label>
              <Input 
                type="date"
                value={paymentForm.datum} 
                onChange={(e) => setPaymentForm({...paymentForm, datum: e.target.value})}
              />
            </div>
            <div>
              <Label>Betaalmethode</Label>
              <Select value={paymentForm.betaalmethode} onValueChange={(v) => setPaymentForm({...paymentForm, betaalmethode: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bankoverschrijving</SelectItem>
                  <SelectItem value="kas">Contant</SelectItem>
                  <SelectItem value="creditcard">Creditcard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referentie / Omschrijving</Label>
              <Input 
                value={paymentForm.referentie} 
                onChange={(e) => setPaymentForm({...paymentForm, referentie: e.target.value})}
                placeholder="Bijv. bankreferentie"
              />
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="text-blue-800 font-medium">Grootboek boeking:</p>
              <p className="text-blue-600">• Crediteuren (2300): Debet {formatCurrency(paymentForm.bedrag)}</p>
              <p className="text-blue-600">• Bank (1100): Credit {formatCurrency(paymentForm.bedrag)}</p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleProcessPayment} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Betaling Verwerken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrediteruenPage;
