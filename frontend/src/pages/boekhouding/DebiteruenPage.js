import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
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
  User,
  Loader2,
  Mail,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Download,
  BarChart3,
  Link2,
  Receipt,
  X,
  Save
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

// Tab Button Component - matching VerkoopPage style
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
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const DebiteurenPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedYear, setSelectedYear] = useState('alle');
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

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
    // Add current year if not present
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a); // Sort descending
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
    if (selectedYear === 'alle') {
      return 'Alle jaren';
    }
    return `Jan - Dec ${selectedYear}`;
  }, [selectedYear]);

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

  // Open edit modal
  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      naam: customer.naam || '',
      email: customer.email || '',
      telefoon: customer.telefoon || '',
      adres: customer.adres || '',
      plaats: customer.plaats || '',
      postcode: customer.postcode || '',
      land: customer.land || 'Suriname',
      btw_nummer: customer.btw_nummer || '',
      betalingstermijn: customer.betalingstermijn || 30
    });
    setEditModalOpen(true);
  };

  // Save edited customer
  const handleSaveCustomer = async () => {
    if (!editForm.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await customersAPI.update(selectedCustomer.id, editForm);
      toast.success('Debiteur bijgewerkt');
      setEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Weet u zeker dat u deze debiteur wilt verwijderen?')) return;
    try {
      await customersAPI.delete(customerId);
      toast.success('Debiteur verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  // Show customer invoices
  const handleShowInvoices = (customer) => {
    setSelectedCustomer(customer);
    setInvoicesModalOpen(true);
  };

  // Get invoices for selected customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return filteredInvoices.filter(i => i.debiteur_id === selectedCustomer.id);
  }, [selectedCustomer, filteredInvoices]);

  // Calculate statistics based on filtered invoices
  const stats = useMemo(() => {
    const openInvoices = filteredInvoices.filter(i => i.status !== 'betaald' && i.status !== 'concept');
    const overdueInvoices = openInvoices.filter(i => {
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
    const totalOpen = openInvoices.reduce((sum, i) => sum + (i.totaal_bedrag || i.totaal || 0), 0);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.totaal_bedrag || i.totaal || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'betaald').reduce((sum, i) => sum + (i.totaal_bedrag || i.totaal || 0), 0);
    
    return {
      totalCustomers: customers.length,
      openInvoices: openInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalOpen,
      totalOverdue,
      totalPaid
    };
  }, [customers, filteredInvoices]);

  // Filter invoices by status for tabs (using filtered invoices)
  const openstaandeFacturen = useMemo(() => {
    return filteredInvoices.filter(i => i.status === 'verzonden' || i.status === 'herinnering');
  }, [filteredInvoices]);

  const verlopenFacturen = useMemo(() => {
    return filteredInvoices.filter(i => {
      if (i.status === 'betaald' || i.status === 'concept') return false;
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
  }, [filteredInvoices]);

  // Aging analysis (using filtered invoices)
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
      const amount = invoice.totaal_bedrag || invoice.totaal || 0;
      
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

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    (c.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nummer || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get customer for invoice
  const getCustomerName = (debiteurId) => {
    const customer = customers.find(c => c.id === debiteurId);
    return customer ? customer.naam : 'Onbekend';
  };

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Send reminder - creates herinnering record and optionally sends email
  const handleSendReminder = async (invoiceIds) => {
    setProcessing(true);
    let successCount = 0;
    let emailCount = 0;
    
    try {
      for (const id of invoiceIds) {
        // First update status to 'herinnering'
        await invoicesAPI.updateStatus(id, 'herinnering');
        successCount++;
        
        // Try to send email via herinnering endpoint
        try {
          // Create herinnering record first
          const herinneringenRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/boekhouding/herinneringen/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ factuur_ids: [id] })
          });
          const herinneringenData = await herinneringenRes.json();
          
          if (herinneringenData.herinneringen && herinneringenData.herinneringen.length > 0) {
            const herinneringId = herinneringenData.herinneringen[0].id;
            
            // Try to send email
            const emailRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/boekhouding/herinneringen/${herinneringId}/email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const emailData = await emailRes.json();
            
            if (emailData.success) {
              emailCount++;
            } else if (!emailData.smtp_configured) {
              // SMTP not configured - only show once
              if (emailCount === 0 && successCount === 1) {
                toast.info('E-mail niet verzonden: SMTP niet geconfigureerd. Ga naar Instellingen > E-mail om dit in te stellen.');
              }
            }
          }
        } catch (emailError) {
          console.log('Email sending skipped:', emailError);
        }
      }
      
      if (emailCount > 0) {
        toast.success(`${successCount} herinnering(en) aangemaakt, ${emailCount} e-mail(s) verzonden`);
      } else {
        toast.success(`${successCount} herinnering(en) aangemaakt (status gewijzigd)`);
      }
      
      fetchData();
      setSelectedRows([]);
    } catch (error) {
      console.error('Herinnering error:', error);
      toast.error('Fout bij verzenden herinneringen');
    } finally {
      setProcessing(false);
    }
  };

  // Afletteren
  const handleAfletteren = async (invoiceId, amount) => {
    setProcessing(true);
    try {
      await invoicesAPI.update(invoiceId, { 
        status: 'betaald',
        betaald_bedrag: amount,
        betaald_datum: new Date().toISOString().split('T')[0]
      });
      toast.success('Factuur als betaald gemarkeerd');
      fetchData();
    } catch (error) {
      toast.error('Fout bij afletteren');
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
    <div className="min-h-screen bg-gray-50" data-testid="debiteuren-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
          <h1 className="text-xl font-semibold text-gray-800">Debiteurenbeheer</h1>
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
          <TabButton active={activeTab === 'herinneringen'} onClick={() => { setActiveTab('herinneringen'); setSelectedRows([]); }}>
            Herinneringen Verzenden
          </TabButton>
          <TabButton active={activeTab === 'afletteren'} onClick={() => { setActiveTab('afletteren'); setSelectedRows([]); }}>
            Afletteren
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => { setActiveTab('rapporten'); setSelectedRows([]); }}>
            Ouderdomsanalyse
          </TabButton>
          
          {/* Action Button */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={() => navigate('/app/boekhouding/debiteuren/nieuw')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
              data-testid="add-debiteur-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Debiteur
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
          <StatusLegendItem icon={Circle} label="Toekomstige actie" color="text-gray-400" />
          <StatusLegendItem icon={AlertCircle} label="Naderende actie" color="text-amber-500" />
          <StatusLegendItem icon={Clock} label="Wachten op betaling" color="text-blue-500" />
          <StatusLegendItem icon={Send} label="Verzonden" color="text-blue-500" />
          <StatusLegendItem icon={CheckCircle} label="Afgehandeld" color="text-emerald-500" />
          <StatusLegendItem icon={XCircle} label="Deadline overschreden" color="text-red-500" />
          <StatusLegendItem icon={AlertCircle} label="Afgekeurd" color="text-red-600" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-2 sm:p-4 lg:p-6">
        {/* Summary Cards - Zakelijk 3D style matching VerkoopPage */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Debiteuren</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalCustomers}</p>
                <p className="text-xs text-gray-400 mt-1">Actieve klanten</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Betaald</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-xs text-gray-400 mt-1">Ontvangen betalingen</p>
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
                <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(stats.totalOpen)}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.openInvoices} facturen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Verlopen</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(stats.totalOverdue)}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.overdueInvoices} facturen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <XCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            
            {/* OVERZICHT TAB */}
            {activeTab === 'overzicht' && (
              <>
                <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <span className="text-sm font-medium text-gray-700">Debiteuren ({filteredCustomers.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Nummer</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Naam</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Email</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Openstaand</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                            Geen debiteuren gevonden
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map(customer => {
                          const customerInvoices = invoices.filter(i => i.debiteur_id === customer.id);
                          const openAmount = customerInvoices
                            .filter(i => i.status !== 'betaald')
                            .reduce((sum, i) => sum + (i.totaal_bedrag || i.totaal || 0), 0);
                          const hasOverdue = customerInvoices.some(i => 
                            i.status !== 'betaald' && i.vervaldatum && new Date(i.vervaldatum) < new Date()
                          );
                          
                          return (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-sm">{customer.nummer}</td>
                              <td className="px-4 py-3 font-medium">{customer.naam}</td>
                              <td className="px-4 py-3 text-gray-600">{customer.email || '-'}</td>
                              <td className="px-4 py-3 text-right font-medium">
                                {openAmount > 0 ? (
                                  <span className={hasOverdue ? 'text-red-600' : 'text-amber-600'}>
                                    {formatCurrency(openAmount)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <StatusIcon status={hasOverdue ? 'verlopen' : openAmount > 0 ? 'verzonden' : 'betaald'} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => navigate(`/app/boekhouding/debiteuren/${customer.id}`)}
                                    title="Bekijken"
                                    data-testid={`view-customer-${customer.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditCustomer(customer)}
                                    title="Bewerken"
                                    data-testid={`edit-customer-${customer.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleShowInvoices(customer)}
                                    title="Facturen bekijken"
                                    data-testid={`invoices-customer-${customer.id}`}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* VERWERKEN TAB */}
            {activeTab === 'verwerken' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col border-2"
                    onClick={() => setActiveTab('herinneringen')}
                  >
                    <Mail className="w-8 h-8 mb-2 text-amber-500" />
                    <span>Herinneringen Versturen</span>
                    {stats.overdueInvoices > 0 && (
                      <span className="mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{stats.overdueInvoices}</span>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col border-2"
                    onClick={() => setActiveTab('afletteren')}
                  >
                    <Link2 className="w-8 h-8 mb-2 text-blue-500" />
                    <span>Betalingen Afletteren</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col border-2"
                    onClick={() => setActiveTab('rapporten')}
                  >
                    <BarChart3 className="w-8 h-8 mb-2 text-emerald-500" />
                    <span>Rapporten Genereren</span>
                  </Button>
                </div>
              </div>
            )}

            {/* OPENSTAANDE FACTUREN TAB */}
            {activeTab === 'facturen' && (
              <>
                <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <span className="text-sm font-medium text-gray-700">Openstaande Facturen ({openstaandeFacturen.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="w-12 px-4 py-3">
                          <Checkbox 
                            checked={selectedRows.length === openstaandeFacturen.length && openstaandeFacturen.length > 0}
                            onCheckedChange={() => {
                              if (selectedRows.length === openstaandeFacturen.length) {
                                setSelectedRows([]);
                              } else {
                                setSelectedRows(openstaandeFacturen.map(f => f.id));
                              }
                            }}
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Factuurnr</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Klant</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Datum</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Vervaldatum</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Bedrag</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeFacturen.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                            <p>Geen openstaande facturen</p>
                          </td>
                        </tr>
                      ) : (
                        openstaandeFacturen.map(invoice => {
                          const isOverdue = invoice.vervaldatum && new Date(invoice.vervaldatum) < new Date();
                          return (
                            <tr key={invoice.id} className={`border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                              <td className="px-4 py-3">
                                <Checkbox 
                                  checked={selectedRows.includes(invoice.id)}
                                  onCheckedChange={() => toggleRowSelection(invoice.id)}
                                />
                              </td>
                              <td className="px-4 py-3 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                              <td className="px-4 py-3">{getCustomerName(invoice.debiteur_id)}</td>
                              <td className="px-4 py-3">{formatDate(invoice.datum)}</td>
                              <td className="px-4 py-3">
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                  {formatDate(invoice.vervaldatum)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.totaal_bedrag || invoice.totaal)}</td>
                              <td className="px-4 py-3 text-center">
                                <StatusIcon status={isOverdue ? 'verlopen' : invoice.status} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleSendReminder([invoice.id])}>
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleAfletteren(invoice.id, invoice.totaal_bedrag || invoice.totaal)}>
                                    <Link2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedRows.length > 0 && (
                  <div className="p-4 bg-emerald-50 border-t flex items-center justify-between">
                    <span>{selectedRows.length} facturen geselecteerd</span>
                    <Button onClick={() => handleSendReminder(selectedRows)} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Herinneringen Versturen
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* HERINNERINGEN TAB */}
            {activeTab === 'herinneringen' && (
              <>
                <div className="bg-red-50 border-b border-red-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <span className="text-sm font-medium text-red-700">Verlopen Facturen - Herinneringen ({verlopenFacturen.length})</span>
                </div>
                {verlopenFacturen.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
                    <p className="text-lg font-medium">Geen verlopen facturen</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-red-50 border-b">
                          <th className="w-12 px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.length === verlopenFacturen.length}
                              onCheckedChange={() => {
                                if (selectedRows.length === verlopenFacturen.length) {
                                  setSelectedRows([]);
                                } else {
                                  setSelectedRows(verlopenFacturen.map(f => f.id));
                                }
                              }}
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-red-700">Factuurnr</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-red-700">Klant</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-red-700">Vervaldatum</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-red-700">Dagen Over</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-red-700">Bedrag</th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-red-700">Actie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verlopenFacturen.map(invoice => {
                          const daysOverdue = Math.floor((new Date() - new Date(invoice.vervaldatum)) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={invoice.id} className="border-b bg-red-50/50 hover:bg-red-100/50">
                              <td className="px-4 py-3">
                                <Checkbox 
                                  checked={selectedRows.includes(invoice.id)}
                                  onCheckedChange={() => toggleRowSelection(invoice.id)}
                                />
                              </td>
                              <td className="px-4 py-3 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                              <td className="px-4 py-3 font-medium">{getCustomerName(invoice.debiteur_id)}</td>
                              <td className="px-4 py-3">{formatDate(invoice.vervaldatum)}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">{daysOverdue} dagen</span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">
                                {formatCurrency(invoice.totaal_bedrag || invoice.totaal)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button 
                                  size="sm" 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleSendReminder([invoice.id])}
                                  disabled={processing}
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  Herinnering
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedRows.length > 0 && (
                  <div className="p-4 bg-red-100 border-t flex items-center justify-between">
                    <span className="text-red-700 font-medium">{selectedRows.length} facturen geselecteerd</span>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleSendReminder(selectedRows)} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Alle Herinneringen Versturen
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* AFLETTEREN TAB */}
            {activeTab === 'afletteren' && (
              <>
                <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <span className="text-sm font-medium text-gray-700">Betalingen Afletteren</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Factuurnr</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Klant</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Vervaldatum</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Bedrag</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openstaandeFacturen.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                            Geen openstaande facturen om af te letteren
                          </td>
                        </tr>
                      ) : (
                        openstaandeFacturen.map(invoice => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono">{invoice.factuurnummer || invoice.nummer}</td>
                            <td className="px-4 py-3">{getCustomerName(invoice.debiteur_id)}</td>
                            <td className="px-4 py-3">{formatDate(invoice.vervaldatum)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.totaal_bedrag || invoice.totaal)}</td>
                            <td className="px-4 py-3 text-center">
                              <Button 
                                size="sm"
                                onClick={() => handleAfletteren(invoice.id, invoice.totaal_bedrag || invoice.totaal)}
                                disabled={processing}
                              >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                Afletteren
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* OUDERDOMSANALYSE TAB */}
            {activeTab === 'rapporten' && (
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Ouderdomsanalyse Debiteuren</h3>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {Object.entries(ouderdomsAnalyse).map(([key, data]) => (
                    <div key={key} className={`p-4 rounded-lg border ${key === '90+' && data.amount > 0 ? 'border-red-300 bg-red-50' : 'bg-gray-50'}`}>
                      <p className="text-sm text-gray-500">{data.label}</p>
                      <p className={`text-xl font-bold ${key === '90+' && data.amount > 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(data.amount)}
                      </p>
                      <p className="text-xs text-gray-400">{data.count} facturen</p>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Visuele Verdeling</h4>
                  <div className="h-8 flex rounded-full overflow-hidden">
                    {Object.entries(ouderdomsAnalyse).map(([key, data], idx) => {
                      const total = Object.values(ouderdomsAnalyse).reduce((sum, d) => sum + d.amount, 0);
                      const percentage = total > 0 ? (data.amount / total) * 100 : 0;
                      const colors = ['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-500'];
                      return percentage > 0 ? (
                        <div 
                          key={key} 
                          className={`${colors[idx]} flex items-center justify-center text-white text-xs font-medium`}
                          style={{ width: `${percentage}%` }}
                          title={`${data.label}: ${formatCurrency(data.amount)}`}
                        >
                          {percentage > 10 ? `${Math.round(percentage)}%` : ''}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>0-30 dagen</span>
                    <span>30-60</span>
                    <span>60-90</span>
                    <span>90+</span>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-6">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export naar Excel
                  </Button>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Export naar PDF
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Edit Customer Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Debiteur Bewerken</DialogTitle>
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
                  placeholder="email@voorbeeld.sr"
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
                  placeholder="BTW nummer"
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
              <Button onClick={handleSaveCustomer} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Invoices Modal */}
      <Dialog open={invoicesModalOpen} onOpenChange={setInvoicesModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Facturen van {selectedCustomer?.naam}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {customerInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Geen facturen gevonden voor deze debiteur</p>
                <Button 
                  className="mt-4" 
                  onClick={() => {
                    setInvoicesModalOpen(false);
                    navigate('/app/boekhouding/verkoop/nieuw');
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Factuur
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
                    {customerInvoices.map(invoice => {
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
                            {formatCurrency(invoice.totaal_incl_btw || invoice.totaal_bedrag || invoice.totaal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={isOverdue ? 'verlopen' : invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/app/boekhouding/verkoop/${invoice.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {invoice.status !== 'betaald' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setInvoicesModalOpen(false);
                                    setActiveTab('afletteren');
                                  }}
                                >
                                  <Link2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Totaal openstaand: <strong className="text-amber-600">
                      {formatCurrency(customerInvoices.filter(i => i.status !== 'betaald').reduce((sum, i) => sum + (i.totaal_incl_btw || i.totaal_bedrag || i.totaal || 0), 0))}
                    </strong>
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setInvoicesModalOpen(false);
                      navigate('/app/boekhouding/verkoop/nieuw');
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
    </div>
  );
};

export default DebiteurenPage;
