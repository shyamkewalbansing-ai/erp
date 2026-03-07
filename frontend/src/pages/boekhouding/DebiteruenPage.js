import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
import { formatDate

 } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
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
  User,
  Loader2,
  Mail,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  BarChart3,
  Link2
} from 'lucide-react';

// Tab Button Component
const TabButton = ({ active, onClick, children, badge }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
    {badge && (
      <span className={`px-2 py-0.5 text-xs rounded-full ${active ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
        {badge}
      </span>
    )}
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

const DebiteurenPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRows, setSelectedRows] = useState([]);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showAfletterDialog, setShowAfletterDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  // Calculate statistics
  const stats = useMemo(() => {
    const openInvoices = invoices.filter(i => i.status !== 'betaald' && i.status !== 'concept');
    const overdueInvoices = openInvoices.filter(i => {
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
    const totalOpen = openInvoices.reduce((sum, i) => sum + (i.totaal_bedrag || 0), 0);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.totaal_bedrag || 0), 0);
    
    return {
      totalCustomers: customers.length,
      openInvoices: openInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalOpen,
      totalOverdue
    };
  }, [customers, invoices]);

  // Filter invoices by status
  const openstaandeFacturen = useMemo(() => {
    return invoices.filter(i => i.status === 'verzonden' || i.status === 'herinnering');
  }, [invoices]);

  const verlopenFacturen = useMemo(() => {
    return invoices.filter(i => {
      if (i.status === 'betaald' || i.status === 'concept') return false;
      if (!i.vervaldatum) return false;
      return new Date(i.vervaldatum) < new Date();
    });
  }, [invoices]);

  // Aging analysis
  const ouderdomsAnalyse = useMemo(() => {
    const now = new Date();
    const categories = {
      'current': { label: '0-30 dagen', amount: 0, count: 0 },
      '30-60': { label: '30-60 dagen', amount: 0, count: 0 },
      '60-90': { label: '60-90 dagen', amount: 0, count: 0 },
      '90+': { label: '90+ dagen', amount: 0, count: 0 }
    };
    
    invoices.filter(i => i.status !== 'betaald' && i.status !== 'concept').forEach(invoice => {
      const dueDate = new Date(invoice.vervaldatum || invoice.datum);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      const amount = invoice.totaal_bedrag || 0;
      
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
  }, [invoices]);

  // Send reminder
  const handleSendReminder = async (invoiceIds) => {
    setProcessing(true);
    try {
      // Update invoice status to 'herinnering'
      for (const id of invoiceIds) {
        await invoicesAPI.update(id, { status: 'herinnering' });
      }
      toast.success(`${invoiceIds.length} herinnering(en) verzonden`);
      fetchData();
      setShowReminderDialog(false);
      setSelectedRows([]);
    } catch (error) {
      toast.error('Fout bij verzenden herinneringen');
    } finally {
      setProcessing(false);
    }
  };

  // Reconcile payment
  const handleAfletteren = async (invoiceId, amount) => {
    setProcessing(true);
    try {
      // Update invoice to paid directly (simplified approach)
      await invoicesAPI.update(invoiceId, { 
        status: 'betaald',
        betaald_bedrag: amount,
        betaald_datum: new Date().toISOString().split('T')[0]
      });
      
      toast.success('Factuur als betaald gemarkeerd');
      fetchData();
      setShowAfletterDialog(false);
    } catch (error) {
      toast.error('Fout bij afletteren');
    } finally {
      setProcessing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="debiteuren-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Debiteurenbeheer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Beheer uw klanten, facturen en openstaande bedragen • 
          <span className="text-emerald-600 font-medium"> Grootboek: 1300 (Debiteuren), 4000 (Omzet), 2350 (BTW)</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Totaal Klanten</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Openstaande Facturen</p>
                <p className="text-2xl font-bold">{stats.openInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Openstaand Bedrag</p>
                <p className="text-2xl font-bold text-emerald-600">{formatAmount(stats.totalOpen)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.overdueInvoices > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verlopen</p>
                <p className="text-2xl font-bold text-red-600">{formatAmount(stats.totalOverdue)}</p>
                <p className="text-xs text-red-500">{stats.overdueInvoices} facturen</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Buttons */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'overzicht'} onClick={() => setActiveTab('overzicht')}>
            <Users className="w-4 h-4" /> Overzicht
          </TabButton>
          <TabButton active={activeTab === 'verwerken'} onClick={() => setActiveTab('verwerken')}>
            <RefreshCw className="w-4 h-4" /> Verwerken
          </TabButton>
          <TabButton 
            active={activeTab === 'facturen'} 
            onClick={() => setActiveTab('facturen')}
            badge={stats.openInvoices > 0 ? stats.openInvoices : null}
          >
            <FileText className="w-4 h-4" /> Openstaande Facturen
          </TabButton>
          <TabButton 
            active={activeTab === 'herinneringen'} 
            onClick={() => setActiveTab('herinneringen')}
            badge={stats.overdueInvoices > 0 ? stats.overdueInvoices : null}
          >
            <Mail className="w-4 h-4" /> Herinneringen
          </TabButton>
          <TabButton active={activeTab === 'afletteren'} onClick={() => setActiveTab('afletteren')}>
            <Link2 className="w-4 h-4" /> Afletteren
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => setActiveTab('rapporten')}>
            <BarChart3 className="w-4 h-4" /> Ouderdomsanalyse
          </TabButton>
          
          <Button 
            onClick={() => navigate('/app/boekhouding/debiteuren/nieuw')}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Debiteur
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        
        {/* OVERZICHT TAB */}
        {activeTab === 'overzicht' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Klanten Overzicht</CardTitle>
              <div className="relative w-64">
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
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
                    {filteredCustomers.map(customer => {
                      const customerInvoices = invoices.filter(i => i.debiteur_id === customer.id);
                      const openAmount = customerInvoices
                        .filter(i => i.status !== 'betaald')
                        .reduce((sum, i) => sum + (i.totaal_bedrag || 0), 0);
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
                                {formatAmount(openAmount)}
                              </span>
                            ) : (
                              <span className="text-emerald-600">Geen</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasOverdue ? (
                              <Badge variant="destructive">Verlopen</Badge>
                            ) : openAmount > 0 ? (
                              <Badge variant="warning" className="bg-amber-100 text-amber-700">Open</Badge>
                            ) : (
                              <Badge variant="success" className="bg-emerald-100 text-emerald-700">OK</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/app/boekhouding/debiteuren/${customer.id}`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VERWERKEN TAB */}
        {activeTab === 'verwerken' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Batch Verwerking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setActiveTab('herinneringen')}
                  >
                    <Mail className="w-8 h-8 mb-2 text-amber-500" />
                    <span>Herinneringen Versturen</span>
                    {stats.overdueInvoices > 0 && (
                      <Badge variant="destructive" className="mt-1">{stats.overdueInvoices}</Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setActiveTab('afletteren')}
                  >
                    <Link2 className="w-8 h-8 mb-2 text-blue-500" />
                    <span>Betalingen Afletteren</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setActiveTab('rapporten')}
                  >
                    <BarChart3 className="w-8 h-8 mb-2 text-emerald-500" />
                    <span>Rapporten Genereren</span>
                  </Button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Grootboek Koppeling</h4>
                  <p className="text-sm text-blue-700">
                    Bij het verwerken van debiteuren worden de volgende grootboekrekeningen gebruikt:
                  </p>
                  <ul className="text-sm text-blue-600 mt-2 space-y-1">
                    <li>• <strong>1300</strong> - Debiteuren (openstaande vorderingen)</li>
                    <li>• <strong>4000</strong> - Omzet binnenland (verkoopopbrengsten)</li>
                    <li>• <strong>2350</strong> - BTW te betalen (verschuldigde BTW)</li>
                    <li>• <strong>1500</strong> - Bank (bij ontvangst betaling)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* OPENSTAANDE FACTUREN TAB */}
        {activeTab === 'facturen' && (
          <Card>
            <CardHeader>
              <CardTitle>Openstaande Facturen ({openstaandeFacturen.length})</CardTitle>
            </CardHeader>
            <CardContent>
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
                                onCheckedChange={() => {
                                  setSelectedRows(prev => 
                                    prev.includes(invoice.id) 
                                      ? prev.filter(id => id !== invoice.id)
                                      : [...prev, invoice.id]
                                  );
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 font-mono">{invoice.factuurnummer}</td>
                            <td className="px-4 py-3">{getCustomerName(invoice.debiteur_id)}</td>
                            <td className="px-4 py-3">{formatDate(invoice.datum)}</td>
                            <td className="px-4 py-3">
                              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {formatDate(invoice.vervaldatum)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{formatAmount(invoice.totaal_bedrag)}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusIcon status={isOverdue ? 'verlopen' : invoice.status} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleSendReminder([invoice.id])}>
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedRows([invoice.id]);
                                  setShowAfletterDialog(true);
                                }}>
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
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg flex items-center justify-between">
                  <span>{selectedRows.length} facturen geselecteerd</span>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSendReminder(selectedRows)}>
                      <Mail className="w-4 h-4 mr-2" />
                      Herinneringen Versturen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* HERINNERINGEN TAB */}
        {activeTab === 'herinneringen' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Verlopen Facturen - Herinneringen ({verlopenFacturen.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verlopenFacturen.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
                  <p className="text-lg font-medium">Geen verlopen facturen</p>
                  <p className="text-sm">Alle facturen zijn op tijd betaald of nog niet vervallen.</p>
                </div>
              ) : (
                <>
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
                                  onCheckedChange={() => {
                                    setSelectedRows(prev => 
                                      prev.includes(invoice.id) 
                                        ? prev.filter(id => id !== invoice.id)
                                        : [...prev, invoice.id]
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3 font-mono">{invoice.factuurnummer}</td>
                              <td className="px-4 py-3 font-medium">{getCustomerName(invoice.debiteur_id)}</td>
                              <td className="px-4 py-3">{formatDate(invoice.vervaldatum)}</td>
                              <td className="px-4 py-3">
                                <Badge variant="destructive">{daysOverdue} dagen</Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">
                                {formatAmount(invoice.totaal_bedrag)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleSendReminder([invoice.id])}
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
                  
                  {selectedRows.length > 0 && (
                    <div className="mt-4 p-4 bg-red-100 rounded-lg flex items-center justify-between">
                      <span className="text-red-700 font-medium">{selectedRows.length} facturen geselecteerd</span>
                      <Button variant="destructive" onClick={() => handleSendReminder(selectedRows)} disabled={processing}>
                        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                        Alle Herinneringen Versturen
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* AFLETTEREN TAB */}
        {activeTab === 'afletteren' && (
          <Card>
            <CardHeader>
              <CardTitle>Betalingen Afletteren</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Wat is afletteren?</h4>
                <p className="text-sm text-blue-700">
                  Afletteren is het koppelen van een ontvangen betaling aan een openstaande factuur. 
                  Hierbij wordt de factuur als 'betaald' gemarkeerd en worden de volgende boekingen gemaakt:
                </p>
                <ul className="text-sm text-blue-600 mt-2 space-y-1">
                  <li>• <strong>Debet 1500</strong> (Bank) - ontvangen bedrag</li>
                  <li>• <strong>Credit 1300</strong> (Debiteuren) - afgeboekt van klant</li>
                </ul>
              </div>
              
              <h4 className="font-medium mb-4">Openstaande facturen om af te letteren</h4>
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
                          <td className="px-4 py-3 font-mono">{invoice.factuurnummer}</td>
                          <td className="px-4 py-3">{getCustomerName(invoice.debiteur_id)}</td>
                          <td className="px-4 py-3">{formatDate(invoice.vervaldatum)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatAmount(invoice.totaal_bedrag)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              size="sm"
                              onClick={() => handleAfletteren(invoice.id, invoice.totaal_bedrag)}
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
            </CardContent>
          </Card>
        )}

        {/* OUDERDOMSANALYSE TAB */}
        {activeTab === 'rapporten' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Ouderdomsanalyse Debiteuren
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(ouderdomsAnalyse).map(([key, data]) => (
                    <Card key={key} className={key === '90+' && data.amount > 0 ? 'border-red-300 bg-red-50' : ''}>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500">{data.label}</p>
                        <p className={`text-xl font-bold ${key === '90+' && data.amount > 0 ? 'text-red-600' : ''}`}>
                          {formatAmount(data.amount)}
                        </p>
                        <p className="text-xs text-gray-400">{data.count} facturen</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Analyse</h4>
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
                          title={`${data.label}: ${formatAmount(data.amount)}`}
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Exporteren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export naar Excel
                  </Button>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Export naar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default DebiteurenPage;
