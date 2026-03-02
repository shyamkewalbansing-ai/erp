import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { btwAPI, reportsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Calculator, 
  FileText, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Download, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Circle,
  XCircle,
  Send,
  ArrowUpDown,
  Calendar,
  Percent,
  Building2,
  User,
  Save,
  BarChart3,
  Receipt
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
    case 'ingediend':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'concept':
      return <Circle className="w-5 h-5 text-gray-400" />;
    case 'te_betalen':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'te_vorderen':
      return <TrendingUp className="w-5 h-5 text-blue-500" />;
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
    <span className={`text-sm font-medium ${colors[type] || colors.neutral}`}>
      {label}
    </span>
  );
};

// BTW Type Badge
const BTWTypeBadge = ({ type }) => {
  if (type === 'sales' || type === 'verkoop') {
    return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">Verkoop</span>;
  }
  if (type === 'purchases' || type === 'inkoop') {
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">Inkoop</span>;
  }
  return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">Beide</span>;
};

// Main Component
const BTWPage = () => {
  const navigate = useNavigate();
  const [btwCodes, setBtwCodes] = useState([]);
  const [btwReport, setBtwReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedQuarter, setSelectedQuarter] = useState('Q4');
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    code: '', naam: '', percentage: 0, type: 'both'
  });

  // Periode data voor de tabel
  const [periodes, setPeriodes] = useState([
    { id: '2024-Q4', periode: 'Q4 2024', maanden: 'Okt - Dec', status: 'concept', verkoop_btw: 45000, inkoop_btw: 32000, saldo: 13000, deadline: '2025-01-31' },
    { id: '2024-Q3', periode: 'Q3 2024', maanden: 'Jul - Sep', status: 'ingediend', verkoop_btw: 52000, inkoop_btw: 38000, saldo: 14000, deadline: '2024-10-31' },
    { id: '2024-Q2', periode: 'Q2 2024', maanden: 'Apr - Jun', status: 'ingediend', verkoop_btw: 48000, inkoop_btw: 35000, saldo: 13000, deadline: '2024-07-31' },
    { id: '2024-Q1', periode: 'Q1 2024', maanden: 'Jan - Mar', status: 'ingediend', verkoop_btw: 41000, inkoop_btw: 29000, saldo: 12000, deadline: '2024-04-30' },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, reportRes] = await Promise.all([
        btwAPI.getAll(),
        reportsAPI.btw()
      ]);
      setBtwCodes(codesRes.data || []);
      setBtwReport(reportRes.data || {});
    } catch (error) {
      toast.error('Fout bij laden BTW gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!formData.code || !formData.naam) {
      toast.error('Code en naam zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      await btwAPI.create(formData);
      toast.success('BTW-code aangemaakt');
      setShowCreateDialog(false);
      setFormData({ code: '', naam: '', percentage: 0, type: 'both' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
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
    if (selectedRows.length === periodes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(periodes.map(p => p.id));
    }
  };

  // Filter BTW codes
  const filteredCodes = btwCodes.filter(code =>
    (code.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (code.naam || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals from report
  const totaalVerkoop = btwReport?.verkoop_btw || periodes.reduce((sum, p) => sum + p.verkoop_btw, 0);
  const totaalInkoop = btwReport?.inkoop_btw || periodes.reduce((sum, p) => sum + p.inkoop_btw, 0);
  const totaalSaldo = totaalVerkoop - totaalInkoop;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="btw-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">BTW Administratie</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'overzicht'} onClick={() => setActiveTab('overzicht')}>
            Overzicht
          </TabButton>
          <TabButton active={activeTab === 'aangiftes'} onClick={() => setActiveTab('aangiftes')}>
            BTW-aangiftes
          </TabButton>
          <TabButton active={activeTab === 'codes'} onClick={() => setActiveTab('codes')}>
            BTW-codes
          </TabButton>
          <TabButton active={activeTab === 'transacties'} onClick={() => setActiveTab('transacties')}>
            Transacties
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => setActiveTab('rapporten')}>
            Rapporten
          </TabButton>
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline"
              className="rounded-lg"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe BTW-code
            </Button>
            <Button 
              onClick={() => navigate('/app/boekhouding/btw/aangifte')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              <FileText className="w-4 h-4 mr-2" />
              BTW-aangifte Maken
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
              <Search className="w-4 h-4" />
              Zoeken
            </Label>
            <div className="relative">
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg pr-10"
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
          
          {/* Kwartaal */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Kwartaal</Label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle kwartalen</SelectItem>
                <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                <SelectItem value="Q4">Q4 (Okt-Dec)</SelectItem>
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

          {/* Saldo Info */}
          <div className="text-right">
            <span className="text-sm text-gray-500">BTW Saldo {selectedYear}</span>
            <p className={`text-sm font-bold ${totaalSaldo >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {totaalSaldo >= 0 ? 'Te betalen: ' : 'Te vorderen: '}
              {formatCurrency(Math.abs(totaalSaldo))}
            </p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Concept" color="text-gray-400" />
          <StatusLegendItem icon={Clock} label="Te betalen" color="text-amber-500" />
          <StatusLegendItem icon={TrendingUp} label="Te vorderen" color="text-blue-500" />
          <StatusLegendItem icon={Send} label="Verzonden" color="text-emerald-500" />
          <StatusLegendItem icon={CheckCircle} label="Ingediend" color="text-emerald-600" />
          <StatusLegendItem icon={XCircle} label="Deadline overschreden" color="text-red-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards - Compact Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">BTW Verkoop</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totaalVerkoop)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">BTW Inkoop</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totaalInkoop)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">BTW Saldo</p>
                  <p className={`text-lg font-bold mt-1 ${totaalSaldo >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {totaalSaldo >= 0 ? '+' : '-'} {formatCurrency(Math.abs(totaalSaldo))}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${totaalSaldo >= 0 ? 'bg-amber-100' : 'bg-emerald-100'} flex items-center justify-center`}>
                  <Calculator className={`w-5 h-5 ${totaalSaldo >= 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">BTW-codes</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{btwCodes.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header Info */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === 'overzicht' && 'BTW-aangiftes Overzicht'}
                  {activeTab === 'aangiftes' && 'Alle BTW-aangiftes'}
                  {activeTab === 'codes' && 'BTW-codes Beheer'}
                  {activeTab === 'transacties' && 'BTW Transacties'}
                  {activeTab === 'rapporten' && 'BTW Rapporten'}
                </span>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </div>

            {/* Table for Overzicht / Aangiftes */}
            {(activeTab === 'overzicht' || activeTab === 'aangiftes') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === periodes.length && periodes.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Periode
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Maanden
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        BTW Verkoop
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        BTW Inkoop
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Saldo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Deadline
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actie
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-5 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : periodes.length > 0 ? (
                      periodes.map((periode) => (
                        <tr 
                          key={periode.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(periode.id) ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(periode.id)}
                              onCheckedChange={() => toggleRowSelection(periode.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">{periode.periode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{periode.maanden}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={periode.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-emerald-600">{formatCurrency(periode.verkoop_btw)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-blue-600">{formatCurrency(periode.inkoop_btw)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${periode.saldo >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {periode.saldo >= 0 ? '+' : '-'} {formatCurrency(Math.abs(periode.saldo))}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{periode.deadline}</span>
                          </td>
                          <td className="px-4 py-3">
                            {periode.status === 'concept' ? (
                              <ActionBadge type="warning" label="Indienen" />
                            ) : (
                              <ActionBadge type="success" label="Bekijken" />
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center">
                          <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen BTW-aangiftes gevonden</p>
                          <p className="text-sm text-gray-500 mb-6">Maak uw eerste BTW-aangifte aan.</p>
                          <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            <Plus className="w-4 h-4 mr-2" />
                            BTW-aangifte Maken
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table for BTW-codes */}
            {activeTab === 'codes' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Code
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Naam
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Percentage
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Type
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
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-6 w-16 mx-auto" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : filteredCodes.length > 0 ? (
                      filteredCodes.map((code) => (
                        <tr 
                          key={code.id} 
                          className="border-b border-gray-100 hover:bg-emerald-50/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono font-medium text-gray-900">{code.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{code.naam}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-900">{code.percentage}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <BTWTypeBadge type={code.type} />
                          </td>
                          <td className="px-4 py-3">
                            <ActionBadge type="neutral" label="Bewerken" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <Percent className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen BTW-codes gevonden</p>
                          <p className="text-sm text-gray-500 mb-6">Voeg uw eerste BTW-code toe.</p>
                          <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            <Plus className="w-4 h-4 mr-2" />
                            BTW-code Toevoegen
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab === 'transacties' || activeTab === 'rapporten') && (
              <div className="px-4 py-16 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {activeTab === 'transacties' ? 'BTW Transacties' : 'BTW Rapporten'}
                </p>
                <p className="text-sm text-gray-500">Deze sectie wordt binnenkort beschikbaar.</p>
              </div>
            )}

            {/* Footer with selection info */}
            {selectedRows.length > 0 && (
              <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700">
                  {selectedRows.length} periode(s) geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Send className="w-4 h-4 mr-2" />
                    Indienen
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

      {/* Create BTW Code Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-600" />
              Nieuwe BTW-code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="Bijv. BTW21"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.naam}
                onChange={(e) => setFormData({...formData, naam: e.target.value})}
                placeholder="Bijv. BTW Hoog Tarief"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Percentage</Label>
              <Input
                type="number"
                value={formData.percentage}
                onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})}
                placeholder="21"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Beide</SelectItem>
                  <SelectItem value="sales">Alleen Verkoop</SelectItem>
                  <SelectItem value="purchases">Alleen Inkoop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-lg">
              Annuleren
            </Button>
            <Button onClick={handleCreateCode} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BTWPage;
