import React, { useState, useEffect, useRef } from 'react';
import { bankAccountsAPI, bankTransactionsAPI, bankImportAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, Building2, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Upload, FileUp,
  RefreshCw, Download, Search, Eye, Edit, Trash2, X, CreditCard,
  DollarSign, Calendar, CheckCircle, AlertCircle, Save, Clock, Circle,
  FileText, TrendingUp, TrendingDown, Users, Printer, Mail, MoreHorizontal,
  ArrowUpDown, XCircle, Send
} from 'lucide-react';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  const prefix = amount < 0 ? '-' : '';
  if (currency === 'USD') return `${prefix}$ ${formatted}`;
  if (currency === 'EUR') return `${prefix}€ ${formatted}`;
  return `${prefix}SRD ${formatted}`;
};

// Tab Button Component - Verkoop Style
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
    case 'verwerkt':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'in_behandeling':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'afgewezen':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'concept':
      return <Circle className="w-5 h-5 text-gray-400" />;
    case 'afgestemd':
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
};

// Detail Sidebar for Transaction
const TransactionDetailSidebar = ({ item, open, onClose, accounts }) => {
  if (!item || !open) return null;

  const account = accounts.find(a => a.id === item.bank_account_id || a.id === item.bankrekening_id);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-lg z-50 flex flex-col border-l border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                item.type === 'credit' || item.bedrag > 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {item.type === 'credit' || item.bedrag > 0 
                  ? <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                  : <ArrowUpRight className="w-5 h-5 text-red-600" />
                }
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transactie Details</h2>
                <p className="text-sm text-gray-500">{item.referentie || item.reference || '-'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            <div className={`p-4 rounded-xl text-center ${
              item.type === 'credit' || item.bedrag > 0 ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              <p className="text-sm text-gray-500 mb-1">Bedrag</p>
              <p className={`text-3xl font-bold ${
                item.type === 'credit' || item.bedrag > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {item.type === 'credit' || item.bedrag > 0 ? '+' : '-'} {formatCurrency(Math.abs(item.bedrag || item.amount || 0))}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Transactie Gegevens</p>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Datum</span>
                  <span className="text-gray-900">{formatDate(item.datum || item.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Referentie</span>
                  <span className="text-gray-900">{item.referentie || item.reference || '-'}</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Omschrijving</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">{item.omschrijving || item.description || 'Geen omschrijving'}</p>
              </div>
            </div>

            {account && (
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Bankrekening</p>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.naam || account.name}</p>
                    <p className="text-xs text-gray-500">{account.rekeningnummer || account.account_number}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

// Main Component
const BankKasPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transacties');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Dialogs
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditAccountDialog, setShowEditAccountDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const fileInputRef = useRef(null);

  const [accountForm, setAccountForm] = useState({
    naam: '', bank: '', rekeningnummer: '', valuta: 'SRD', beginsaldo: 0
  });

  const [transactionForm, setTransactionForm] = useState({
    bankrekening_id: '', datum: new Date().toISOString().split('T')[0],
    omschrijving: '', referentie: '', bedrag: 0, type: 'credit'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        bankAccountsAPI.getAll(),
        bankTransactionsAPI.getAll()
      ]);
      setBankAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden bankgegevens');
    } finally {
      setLoading(false);
    }
  };

  // Simple loading state - just spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      </div>
    );
  }

  const handleCreateAccount = async () => {
    if (!accountForm.naam || !accountForm.bank || !accountForm.rekeningnummer) {
      toast.error('Vul alle verplichte velden in'); return;
    }
    setSaving(true);
    try {
      await bankAccountsAPI.create(accountForm);
      toast.success('Bankrekening aangemaakt');
      setShowAccountDialog(false);
      setAccountForm({ naam: '', bank: '', rekeningnummer: '', valuta: 'SRD', beginsaldo: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editAccount) return;
    setSaving(true);
    try {
      await bankAccountsAPI.update(editAccount.id, accountForm);
      toast.success('Bankrekening bijgewerkt');
      setShowEditAccountDialog(false);
      setEditAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!transactionForm.bankrekening_id || !transactionForm.bedrag) {
      toast.error('Selecteer rekening en vul bedrag in'); return;
    }
    setSaving(true);
    try {
      const data = {
        ...transactionForm,
        bedrag: transactionForm.type === 'debit' ? -Math.abs(transactionForm.bedrag) : Math.abs(transactionForm.bedrag)
      };
      await bankTransactionsAPI.create(data);
      toast.success('Transactie aangemaakt');
      setShowTransactionDialog(false);
      setTransactionForm({
        bankrekening_id: '', datum: new Date().toISOString().split('T')[0],
        omschrijving: '', referentie: '', bedrag: 0, type: 'credit'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (account) => {
    if (!confirm(`Weet u zeker dat u "${account.naam || account.name}" wilt verwijderen?`)) return;
    try {
      await bankAccountsAPI.delete(account.id);
      toast.success('Bankrekening verwijderd');
      if (selectedAccount?.id === account.id) setSelectedAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const openEditAccount = (account) => {
    setEditAccount(account);
    setAccountForm({
      naam: account.naam || account.name || '',
      bank: account.bank || '',
      rekeningnummer: account.rekeningnummer || account.account_number || '',
      valuta: account.valuta || account.currency || 'SRD',
      beginsaldo: account.beginsaldo || 0
    });
    setShowEditAccountDialog(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_account_id', selectedAccount?.id || bankAccounts[0]?.id);
      await bankImportAPI.importCSV(formData);
      toast.success('Transacties geïmporteerd');
      setShowImportDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import mislukt');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (selectedRows.length === filteredTransactions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTransactions.map(t => t.id));
    }
  };

  // Calculate stats
  const totalBalance = bankAccounts.reduce((sum, a) => sum + (a.saldo || a.balance || 0), 0);
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.datum || t.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTransactions.filter(t => (t.bedrag || t.amount || 0) > 0).reduce((sum, t) => sum + Math.abs(t.bedrag || t.amount || 0), 0);
  const monthExpense = monthTransactions.filter(t => (t.bedrag || t.amount || 0) < 0).reduce((sum, t) => sum + Math.abs(t.bedrag || t.amount || 0), 0);
  const pendingReconciliation = transactions.filter(t => !t.afgestemd).length;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm || 
      (t.omschrijving || t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.referentie || t.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = !selectedAccount || t.bankrekening_id === selectedAccount.id || t.bank_account_id === selectedAccount.id;
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'credit' && (t.bedrag || t.amount || 0) > 0) ||
      (typeFilter === 'debit' && (t.bedrag || t.amount || 0) < 0);
    return matchesSearch && matchesAccount && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50" data-testid="bank-kas-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Bank & Kas Beheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row - Verkoop Style */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'transacties'} onClick={() => { setActiveTab('transacties'); setSelectedRows([]); }}>
            Transacties
          </TabButton>
          <TabButton active={activeTab === 'rekeningen'} onClick={() => { setActiveTab('rekeningen'); setSelectedRows([]); }}>
            Rekeningen
          </TabButton>
          <TabButton active={activeTab === 'afstemming'} onClick={() => { setActiveTab('afstemming'); setSelectedRows([]); }}>
            Afstemming
          </TabButton>
          <TabButton active={activeTab === 'kasboek'} onClick={() => { setActiveTab('kasboek'); setSelectedRows([]); }}>
            Kasboek
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => { setActiveTab('rapporten'); setSelectedRows([]); }}>
            Rapporten
          </TabButton>
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importeren
            </Button>
            <Button 
              onClick={() => setShowTransactionDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Transactie
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section - Verkoop Style */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Transactie / Omschrijving
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

          {/* Type Filter */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="credit">Ontvangsten</SelectItem>
                <SelectItem value="debit">Uitgaven</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Rekening Filter */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Rekening
            </Label>
            <Select value={selectedAccount?.id || 'all'} onValueChange={(v) => setSelectedAccount(v === 'all' ? null : bankAccounts.find(a => a.id === v))}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle rekeningen</SelectItem>
                {bankAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.naam || a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Totaal Saldo */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Saldo</span>
            <p className={`text-lg font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Status Legend - Verkoop Style */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Concept" color="text-gray-400" />
          <StatusLegendItem icon={Send} label="Geboekt" color="text-blue-500" />
          <StatusLegendItem icon={Clock} label="In behandeling" color="text-amber-500" />
          <StatusLegendItem icon={CheckCircle} label="Afgestemd" color="text-emerald-500" />
          <StatusLegendItem icon={AlertCircle} label="Te controleren" color="text-orange-500" />
          <StatusLegendItem icon={XCircle} label="Afgewezen" color="text-red-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards - 3D Zakelijk */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Saldo</p>
                <p className={`text-2xl font-bold mt-2 ${totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(totalBalance)}</p>
                <p className="text-xs text-gray-400 mt-1">{bankAccounts.length} rekeningen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Wallet className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ontvangsten</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(monthIncome)}</p>
                <p className="text-xs text-emerald-500 mt-1">Deze maand</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <ArrowDownRight className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Uitgaven</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(monthExpense)}</p>
                <p className="text-xs text-red-500 mt-1">Deze maand</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <ArrowUpRight className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Af te stemmen</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{pendingReconciliation}</p>
                <p className="text-xs text-gray-400 mt-1">Transacties</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {activeTab === 'transacties' && `Transacties (${filteredTransactions.length})`}
                {activeTab === 'rekeningen' && `Bankrekeningen (${bankAccounts.length})`}
                {activeTab === 'afstemming' && 'Bank Afstemming'}
                {activeTab === 'kasboek' && 'Kasboek'}
                {activeTab === 'rapporten' && 'Rapporten'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={fetchData}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Vernieuwen
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Printer className="w-4 h-4 mr-2" />
                  Afdrukken
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </div>
          </div>

          {/* Transacties Tab */}
          {activeTab === 'transacties' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-12 px-4 py-3">
                      <Checkbox 
                        checked={selectedRows.length === filteredTransactions.length && filteredTransactions.length > 0}
                        onCheckedChange={toggleAllRows}
                      />
                    </th>
                    <th className="text-left px-4 py-3">
                      <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                        Datum
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Omschrijving
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Rekening
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Referentie
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
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">Geen transacties gevonden</p>
                        <p className="text-sm text-gray-500 mb-6">Voeg uw eerste transactie toe om te beginnen.</p>
                        <Button onClick={() => setShowTransactionDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Nieuwe Transactie
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, index) => {
                      const account = bankAccounts.find(a => a.id === t.bankrekening_id || a.id === t.bank_account_id);
                      return (
                        <tr 
                          key={t.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(t.id) ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(t.id)}
                              onCheckedChange={() => toggleRowSelection(t.id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {formatDate(t.datum || t.date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${(t.bedrag || 0) > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {(t.bedrag || 0) > 0 ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                              </div>
                              <span className="text-sm text-gray-900">{t.omschrijving || t.description || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{account?.naam || account?.name || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500 font-mono">{t.referentie || t.reference || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={t.status || (t.afgestemd ? 'afgestemd' : 'concept')} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${(t.bedrag || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(t.bedrag || 0) > 0 ? '+' : ''}{formatCurrency(t.bedrag || t.amount || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-gray-500 hover:text-gray-700" onClick={() => { setDetailItem(t); setDetailOpen(true); }}>
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Rekeningen Tab */}
          {activeTab === 'rekeningen' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-12 px-4 py-3">
                      <Checkbox />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Rekening
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Bank
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Rekeningnummer
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Valuta
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Saldo
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Actie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">Geen bankrekeningen gevonden</p>
                        <p className="text-sm text-gray-500 mb-6">Voeg uw eerste bankrekening toe om te beginnen.</p>
                        <Button onClick={() => setShowAccountDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Nieuwe Rekening
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    bankAccounts.map((account) => (
                      <tr key={account.id} className="border-b border-gray-100 hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <Checkbox />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{account.naam || account.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{account.bank}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{account.rekeningnummer || account.account_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{account.valuta || 'SRD'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${(account.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(account.saldo || account.balance || 0, account.valuta)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="text-gray-500 hover:text-blue-600" onClick={() => openEditAccount(account)}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-gray-500 hover:text-red-600" onClick={() => handleDeleteAccount(account)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Add New Account Button */}
              <div className="p-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowAccountDialog(true)} className="w-full rounded-lg border-dashed">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Rekening Toevoegen
                </Button>
              </div>
            </div>
          )}

          {/* Afstemming Tab */}
          {activeTab === 'afstemming' && (
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Bank Afstemming</p>
              <p className="text-sm text-gray-500 mb-6">Stem uw banktransacties af met uw boekhouding.</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                Start Afstemming
              </Button>
            </div>
          )}

          {/* Kasboek Tab */}
          {activeTab === 'kasboek' && (
            <div className="p-8 text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Kasboek</p>
              <p className="text-sm text-gray-500 mb-6">Beheer uw kas transacties en contante betalingen.</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Kasboeking
              </Button>
            </div>
          )}

          {/* Rapporten Tab */}
          {activeTab === 'rapporten' && (
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Rapporten</p>
              <p className="text-sm text-gray-500 mb-6">Genereer bank- en kas rapporten.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Bank Overzicht
                </Button>
                <Button variant="outline" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Kas Rapport
                </Button>
              </div>
            </div>
          )}

          {/* Footer with selection info */}
          {selectedRows.length > 0 && activeTab === 'transacties' && (
            <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-emerald-700">
                {selectedRows.length} transactie(s) geselecteerd
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Afstemmen
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                  <Printer className="w-4 h-4 mr-2" />
                  Afdrukken
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Sidebar */}
      <TransactionDetailSidebar item={detailItem} open={detailOpen} onClose={() => setDetailOpen(false)} accounts={bankAccounts} />

      {/* Create Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              Nieuwe Bankrekening
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-gray-500">Naam *</Label>
              <Input value={accountForm.naam} onChange={(e) => setAccountForm({...accountForm, naam: e.target.value})} placeholder="Hoofdrekening" className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bank *</Label>
              <Input value={accountForm.bank} onChange={(e) => setAccountForm({...accountForm, bank: e.target.value})} placeholder="Hakrinbank" className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Rekeningnummer *</Label>
              <Input value={accountForm.rekeningnummer} onChange={(e) => setAccountForm({...accountForm, rekeningnummer: e.target.value})} placeholder="NL00BANK0000000000" className="mt-1 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={accountForm.valuta} onValueChange={(v) => setAccountForm({...accountForm, valuta: v})}>
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Beginsaldo</Label>
                <Input type="number" value={accountForm.beginsaldo} onChange={(e) => setAccountForm({...accountForm, beginsaldo: parseFloat(e.target.value) || 0})} className="mt-1 rounded-lg" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAccountDialog(false)} className="rounded-lg">Annuleren</Button>
            <Button onClick={handleCreateAccount} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditAccountDialog} onOpenChange={setShowEditAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              Rekening Bewerken
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-gray-500">Naam *</Label>
              <Input value={accountForm.naam} onChange={(e) => setAccountForm({...accountForm, naam: e.target.value})} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bank *</Label>
              <Input value={accountForm.bank} onChange={(e) => setAccountForm({...accountForm, bank: e.target.value})} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Rekeningnummer *</Label>
              <Input value={accountForm.rekeningnummer} onChange={(e) => setAccountForm({...accountForm, rekeningnummer: e.target.value})} className="mt-1 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={accountForm.valuta} onValueChange={(v) => setAccountForm({...accountForm, valuta: v})}>
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Beginsaldo</Label>
                <Input type="number" value={accountForm.beginsaldo} onChange={(e) => setAccountForm({...accountForm, beginsaldo: parseFloat(e.target.value) || 0})} className="mt-1 rounded-lg" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditAccountDialog(false)} className="rounded-lg">Annuleren</Button>
            <Button onClick={handleUpdateAccount} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} <Save className="w-4 h-4 mr-2" /> Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              Nieuwe Transactie
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-gray-500">Bankrekening *</Label>
              <Select value={transactionForm.bankrekening_id} onValueChange={(v) => setTransactionForm({...transactionForm, bankrekening_id: v})}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.naam || a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Datum *</Label>
                <Input type="date" value={transactionForm.datum} onChange={(e) => setTransactionForm({...transactionForm, datum: e.target.value})} className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Type *</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm({...transactionForm, type: v})}>
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Ontvangst</SelectItem>
                    <SelectItem value="debit">Uitgave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bedrag *</Label>
              <Input type="number" value={transactionForm.bedrag} onChange={(e) => setTransactionForm({...transactionForm, bedrag: parseFloat(e.target.value) || 0})} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Omschrijving</Label>
              <Input value={transactionForm.omschrijving} onChange={(e) => setTransactionForm({...transactionForm, omschrijving: e.target.value})} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Referentie</Label>
              <Input value={transactionForm.referentie} onChange={(e) => setTransactionForm({...transactionForm, referentie: e.target.value})} className="mt-1 rounded-lg" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)} className="rounded-lg">Annuleren</Button>
            <Button onClick={handleCreateTransaction} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              Transacties Importeren
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-gray-500">Bankrekening</Label>
              <Select value={selectedAccount?.id || ''} onValueChange={(v) => setSelectedAccount(bankAccounts.find(a => a.id === v))}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.naam || a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <FileUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">Sleep een CSV of MT940 bestand hierheen of</p>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv,.mt940" className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="rounded-lg">
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Bestand selecteren
              </Button>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className="rounded-lg">Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankKasPage;
