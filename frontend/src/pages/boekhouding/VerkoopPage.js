import React, { useState, useEffect, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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
  Loader2,
  Printer,
  CreditCard,
  Banknote,
  BarChart3,
  TrendingUp,
  Save,
  Trash2,
  Edit,
  Calendar,
  DollarSign
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

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    concept: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Concept' },
    verzonden: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Verzonden' },
    herinnering: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Herinnering' },
    betaald: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Betaald' },
    deelbetaling: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Deelbetaling' },
    vervallen: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vervallen' },
    geannuleerd: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Geannuleerd' }
  };
  const { bg, text, label } = config[status] || config.concept;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
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
  const [selectedYear, setSelectedYear] = useState('alle');
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ bedrag: 0, datum: '', betaalmethode: 'bank', referentie: '' });
  const [saving, setSaving] = useState(false);
  
  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

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

  // Filter invoices by year
  const yearFilteredInvoices = useMemo(() => {
    if (selectedYear === 'alle') return invoices;
    return invoices.filter(inv => {
      const datum = inv.datum || inv.factuurdatum || '';
      return datum.startsWith(selectedYear);
    });
  }, [invoices, selectedYear]);

  // Period display
  const periodDisplay = useMemo(() => {
    if (selectedYear === 'alle') return 'Alle jaren';
    return `Jan - Dec ${selectedYear}`;
  }, [selectedYear]);

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
      await invoicesAPI.addPayment(selectedInvoice.id, paymentForm);
      toast.success('Betaling verwerkt en geboekt naar grootboek');
      setPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwerken betaling');
    } finally {
      setSaving(false);
    }
  };

  // View invoice details
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  };

  // Send email
  const handleSendEmail = async (invoice) => {
    setSelectedInvoice(invoice);
    setEmailModalOpen(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!selectedInvoice) return;
    setEmailSending(true);
    try {
      const factuurnummer = selectedInvoice.nummer || selectedInvoice.factuurnummer || 'Onbekend';
      const emailData = {
        to: selectedInvoice.debiteur_email,
        subject: `Factuur ${factuurnummer}`,
        message: `Geachte ${selectedInvoice.debiteur_naam || 'klant'},\n\nBijgevoegd vindt u factuur ${factuurnummer}.\n\nMet vriendelijke groet`
      };
      
      const result = await invoicesAPI.sendEmail(selectedInvoice.id, emailData);
      console.log('Email result:', result);
      
      if (result.success) {
        toast.success(`E-mail verzonden naar ${selectedInvoice.debiteur_email || 'klant'}`);
        setEmailModalOpen(false);
        fetchData(); // Refresh data to update status
      } else if (result.smtp_configured === false) {
        toast.warning('SMTP niet geconfigureerd. Ga naar Instellingen → E-mail');
      } else {
        const errorMsg = result.error || result.detail || 'Fout bij verzenden e-mail';
        console.error('Email failed:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Email error:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Fout bij verzenden e-mail';
      if (errorMsg.toLowerCase().includes('smtp') || errorMsg.toLowerCase().includes('geconfigureerd')) {
        toast.warning('SMTP niet geconfigureerd. Ga naar Instellingen → E-mail');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setEmailSending(false);
    }
  };

  // Print invoice - download PDF
  const handlePrint = async (invoice) => {
    try {
      toast.info('PDF wordt gegenereerd...');
      const token = localStorage.getItem('token');
      const pdfUrl = `${process.env.REACT_APP_BACKEND_URL}/api/boekhouding/verkoopfacturen/${invoice.id}/pdf`;
      
      // Fetch the PDF with authentication
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Kon PDF niet genereren');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factuur_${invoice.nummer || invoice.factuurnummer || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF gedownload');
    } catch (error) {
      console.error('Print error:', error);
      toast.error(error.message || 'Fout bij genereren PDF');
    }
  };

  // Delete invoice
  const handleDelete = async (invoice) => {
    const factuurnummer = invoice.nummer || invoice.factuurnummer || 'Onbekend';
    if (!window.confirm(`Weet u zeker dat u factuur ${factuurnummer} wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`)) return;
    
    try {
      await invoicesAPI.delete(invoice.id);
      toast.success(`Factuur ${factuurnummer} is verwijderd`);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Fout bij verwijderen';
      toast.error(errorMsg);
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
  const filteredInvoices = useMemo(() => {
    return yearFilteredInvoices.filter(inv => {
      const matchesSearch = 
        (inv.nummer || inv.factuurnummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.debiteur_naam || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [yearFilteredInvoices, searchTerm, statusFilter]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote =>
      (quote.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.klant_naam || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotes, searchTerm]);

  // Calculate totals from year-filtered invoices
  const totaalOmzet = yearFilteredInvoices.filter(i => i.status === 'betaald').reduce((sum, i) => sum + (i.totaal_incl_btw || i.totaal || 0), 0);
  const totaalOpenstaand = yearFilteredInvoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').reduce((sum, i) => sum + (i.totaal_incl_btw || i.totaal || 0), 0);

  // Simple loading state - spinner in content area
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }
  const aantalFacturen = invoices.length;
  const aantalOffertes = quotes.length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="verkoop-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
          <h1 className="text-xl font-semibold text-gray-800">Verkoopbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
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
              onClick={() => navigate(activeTab === 'offertes' ? '/app/boekhouding/verkoop/offerte' : '/app/boekhouding/verkoop/nieuw')}
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
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
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
          
          {/* Periode display */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Periode</span>
            <p className="text-sm font-medium text-gray-700">{periodDisplay}</p>
          </div>

          {/* Totaal info */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Openstaand</span>
            <p className="text-sm font-bold text-amber-600">{formatCurrency(totaalOpenstaand)}</p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
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
      <div className="p-2 sm:p-4 lg:p-6">
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
            <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
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
                            <div className="flex items-center gap-1">
                              <button 
                                className="text-gray-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                onClick={() => handleViewInvoice(invoice)}
                                title="Bekijken"
                                data-testid={`view-invoice-${invoice.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                className="text-gray-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                                onClick={() => handleSendEmail(invoice)}
                                title="E-mail versturen"
                                data-testid={`email-invoice-${invoice.id}`}
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button 
                                className="text-gray-500 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                                onClick={() => handlePrint(invoice)}
                                title="Printen / PDF"
                                data-testid={`print-invoice-${invoice.id}`}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {invoice.status !== 'betaald' && invoice.status !== 'concept' && (
                                <button 
                                  className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                                  onClick={() => handleOpenPayment(invoice)}
                                  title="Betaling registreren"
                                  data-testid={`payment-invoice-${invoice.id}`}
                                >
                                  <Banknote className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                onClick={() => handleDelete(invoice)}
                                title="Verwijderen"
                                data-testid={`delete-invoice-${invoice.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Verkooporders Tab */}
            {activeTab === 'orders' && (
              <div className="p-6">
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Verkooporders</h3>
                  <p className="text-gray-500 mb-6">Verkooporders worden automatisch aangemaakt wanneer een offerte wordt geaccepteerd.</p>
                  <Button onClick={() => setActiveTab('offertes')} variant="outline">
                    Ga naar Offertes
                  </Button>
                </div>
              </div>
            )}

            {/* Creditnota's Tab */}
            {activeTab === 'creditnota' && (
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Creditnota's</h3>
                  <Button onClick={() => navigate('/app/boekhouding/verkoop/creditnota')} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Creditnota
                  </Button>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Grootboek Koppeling:</strong> Creditnota's worden omgekeerd geboekt t.o.v. facturen:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• <strong>Omzet (4000):</strong> Debet (omzet verminderd)</li>
                    <li>• <strong>Debiteuren (1300):</strong> Credit (vordering verminderd)</li>
                    <li>• <strong>BTW (2350):</strong> Debet (BTW schuld verminderd)</li>
                  </ul>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nog geen creditnota's aangemaakt</p>
                </div>
              </div>
            )}

            {/* Rapporten Tab */}
            {activeTab === 'rapporten' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Verkooprapporten
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="border rounded-lg">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Omzet Overzicht ({selectedYear === 'alle' ? 'Alle jaren' : selectedYear})
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Totaal Gefactureerd:</span>
                          <span className="font-medium">{formatCurrency(yearFilteredInvoices.reduce((sum, i) => sum + (i.totaal_incl_btw || i.totaal || 0), 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Totaal Betaald:</span>
                          <span className="font-medium text-emerald-600">{formatCurrency(totaalOmzet)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Totaal Openstaand:</span>
                          <span className="font-medium text-amber-600">{formatCurrency(totaalOpenstaand)}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aantal Facturen:</span>
                          <span className="font-medium">{yearFilteredInvoices.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Betaald:</span>
                          <span className="font-medium text-emerald-600">{yearFilteredInvoices.filter(i => i.status === 'betaald').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Openstaand:</span>
                          <span className="font-medium text-amber-600">{yearFilteredInvoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border rounded-lg">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-800 mb-3">Grootboek Koppeling</h4>
                      <div className="bg-blue-50 rounded-lg p-3 text-sm">
                        <p className="text-blue-800 mb-2"><strong>Verkoopfacturen boeken naar:</strong></p>
                        <ul className="text-blue-700 space-y-1">
                          <li>• <strong>Debiteuren (1300):</strong> Debet (vordering)</li>
                          <li>• <strong>Omzet (4000):</strong> Credit (opbrengst)</li>
                          <li>• <strong>BTW (2350):</strong> Credit (BTW schuld)</li>
                        </ul>
                        <p className="text-blue-800 mt-3 mb-2"><strong>Betalingen boeken naar:</strong></p>
                        <ul className="text-blue-700 space-y-1">
                          <li>• <strong>Bank (1500):</strong> Debet (geld ontvangen)</li>
                          <li>• <strong>Debiteuren (1300):</strong> Credit (vordering verminderd)</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Button variant="outline" onClick={() => navigate('/app/boekhouding/grootboek')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Bekijk Grootboek
                </Button>
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

      {/* Payment Modal - Improved Design */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-lg">Betaling Registreren</span>
                <p className="text-sm font-normal text-gray-500">Registreer een ontvangen betaling</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Invoice Info Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Factuur</p>
                  <p className="text-lg font-bold text-gray-900">{selectedInvoice?.nummer || selectedInvoice?.factuurnummer}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Openstaand</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(selectedInvoice?.openstaand_bedrag || selectedInvoice?.totaal_incl_btw || selectedInvoice?.totaal)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{selectedInvoice?.debiteur_naam || 'Onbekend'}</span>
              </div>
            </div>
            
            {/* Payment Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-gray-700 font-medium">Ontvangen Bedrag *</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number"
                    step="0.01"
                    value={paymentForm.bedrag} 
                    onChange={(e) => setPaymentForm({...paymentForm, bedrag: parseFloat(e.target.value) || 0})}
                    className="pl-10 h-12 text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-gray-700 font-medium">Datum *</Label>
                <div className="relative mt-1.5">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="date"
                    value={paymentForm.datum} 
                    onChange={(e) => setPaymentForm({...paymentForm, datum: e.target.value})}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-gray-700 font-medium">Betaalmethode</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {[
                  { value: 'bank', label: 'Bank', icon: Building2 },
                  { value: 'kas', label: 'Contant', icon: Banknote },
                  { value: 'pin', label: 'PIN', icon: CreditCard },
                  { value: 'creditcard', label: 'Credit', icon: CreditCard }
                ].map(method => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentForm({...paymentForm, betaalmethode: method.value})}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      paymentForm.betaalmethode === method.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-gray-700 font-medium">Referentie / Omschrijving</Label>
              <Input 
                value={paymentForm.referentie} 
                onChange={(e) => setPaymentForm({...paymentForm, referentie: e.target.value})}
                placeholder="Bijv. bankreferentie of omschrijving"
                className="mt-1.5"
              />
            </div>
            
            {/* Grootboek Preview */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Grootboek boeking (automatisch)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Bank (1500)</span>
                  <span className="font-mono text-blue-800">Debet {formatCurrency(paymentForm.bedrag)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Debiteuren (1300)</span>
                  <span className="font-mono text-blue-800">Credit {formatCurrency(paymentForm.bedrag)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)} className="px-6">
                Annuleren
              </Button>
              <Button 
                onClick={handleProcessPayment} 
                disabled={saving || !paymentForm.bedrag || paymentForm.bedrag <= 0} 
                className="bg-emerald-600 hover:bg-emerald-700 px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Betaling Verwerken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Factuur Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedInvoice.nummer || selectedInvoice.factuurnummer}</p>
                  <p className="text-gray-500">{selectedInvoice.debiteur_naam || 'Onbekende klant'}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={selectedInvoice.status} />
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(selectedInvoice.datum || selectedInvoice.factuurdatum)}
                  </p>
                </div>
              </div>
              
              {/* Amount Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Totaal excl. BTW</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedInvoice.totaal_excl_btw || selectedInvoice.subtotaal || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">BTW</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedInvoice.btw_bedrag || 0)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 mb-1">Totaal incl. BTW</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedInvoice.totaal_incl_btw || selectedInvoice.totaal || 0)}</p>
                </div>
              </div>
              
              {/* Invoice Lines */}
              {selectedInvoice.regels && selectedInvoice.regels.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Factuurregels</p>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600">Omschrijving</th>
                          <th className="text-right px-3 py-2 text-gray-600">Aantal</th>
                          <th className="text-right px-3 py-2 text-gray-600">Prijs</th>
                          <th className="text-right px-3 py-2 text-gray-600">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.regels.map((regel, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-3 py-2">{regel.omschrijving || regel.description}</td>
                            <td className="px-3 py-2 text-right">{regel.aantal || regel.quantity || 1}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(regel.prijs || regel.price || 0)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency((regel.aantal || 1) * (regel.prijs || regel.price || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Payment Status */}
              {selectedInvoice.status !== 'betaald' && selectedInvoice.status !== 'concept' && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Openstaand bedrag</p>
                      <p className="text-2xl font-bold text-amber-700">{formatCurrency(selectedInvoice.openstaand_bedrag || selectedInvoice.totaal_incl_btw || selectedInvoice.totaal)}</p>
                    </div>
                    <Button 
                      onClick={() => { setViewModalOpen(false); handleOpenPayment(selectedInvoice); }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Banknote className="w-4 h-4 mr-2" />
                      Betaling Registreren
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSendEmail(selectedInvoice)}>
                    <Mail className="w-4 h-4 mr-2" />
                    E-mail
                  </Button>
                  <Button variant="outline" onClick={() => handlePrint(selectedInvoice)}>
                    <Printer className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                  Sluiten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              Factuur Versturen
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Factuur:</strong> {selectedInvoice.nummer || selectedInvoice.factuurnummer}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Klant:</strong> {selectedInvoice.debiteur_naam || 'Onbekend'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>E-mailadres:</strong> {selectedInvoice.debiteur_email || 'Geen e-mail bekend'}
                </p>
              </div>
              
              {!selectedInvoice.debiteur_email ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Deze klant heeft geen e-mailadres. Voeg eerst een e-mailadres toe bij de klantgegevens.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  De factuur wordt per e-mail verzonden naar <strong>{selectedInvoice.debiteur_email}</strong>.
                </p>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleConfirmSendEmail}
                  disabled={emailSending || !selectedInvoice.debiteur_email}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {emailSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Versturen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerkoopPage;
