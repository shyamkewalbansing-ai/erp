import React, { useState, useEffect, useRef } from 'react';
import { bankAccountsAPI, bankTransactionsAPI, bankImportAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, Building2, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Upload, FileUp,
  RefreshCw, Download, Search, Filter, Eye, Edit, Trash2, X, CreditCard,
  DollarSign, TrendingUp, TrendingDown, Calendar, CheckCircle, AlertCircle, Save
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

// Stat Card Component
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, iconColor, onClick }) => {
  return (
    <Card className={`bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
            <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{value}</p>
            {subtitle && (
              <p className={`text-xs mt-1 ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>
          <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Transaction Type Badge
const TransactionBadge = ({ type }) => {
  if (type === 'credit' || type === 'ontvangst') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
        <ArrowDownRight className="w-3 h-3 mr-1" /> Ontvangst
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
      <ArrowUpRight className="w-3 h-3 mr-1" /> Uitgave
    </Badge>
  );
};

// Account Card
const AccountCard = ({ account, onSelect, isSelected }) => {
  const balance = account.saldo || account.balance || 0;
  return (
    <div 
      onClick={() => onSelect(account)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected 
          ? 'border-emerald-500 bg-emerald-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isSelected ? 'bg-emerald-100' : 'bg-gray-100'
        }`}>
          <Building2 className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{account.naam || account.name}</p>
          <p className="text-xs text-gray-500">{account.bank}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{account.rekeningnummer || account.account_number}</p>
        <p className={`font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(balance, account.valuta)}
        </p>
      </div>
    </div>
  );
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
            {/* Bedrag */}
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

            {/* Details */}
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
                  <span className="text-gray-500">Type</span>
                  <TransactionBadge type={item.type || (item.bedrag > 0 ? 'credit' : 'debit')} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Referentie</span>
                  <span className="text-gray-900">{item.referentie || item.reference || '-'}</span>
                </div>
              </div>
            </div>

            {/* Beschrijving */}
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Omschrijving</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">{item.omschrijving || item.description || 'Geen omschrijving'}</p>
              </div>
            </div>

            {/* Bankrekening */}
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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
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

  // Calculate stats
  const totalBalance = bankAccounts.reduce((sum, a) => sum + (a.saldo || a.balance || 0), 0);
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.datum || t.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTransactions.filter(t => (t.bedrag || t.amount || 0) > 0).reduce((sum, t) => sum + Math.abs(t.bedrag || t.amount || 0), 0);
  const monthExpense = monthTransactions.filter(t => (t.bedrag || t.amount || 0) < 0).reduce((sum, t) => sum + Math.abs(t.bedrag || t.amount || 0), 0);

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
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank & Kas</h1>
          <p className="text-sm text-gray-500 mt-1">Beheer uw bankrekeningen en transacties</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Vernieuwen
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Importeren
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowTransactionDialog(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Transactie
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Totaal Saldo"
          value={formatCurrency(totalBalance)}
          subtitle={`${bankAccounts.length} rekeningen`}
          icon={Wallet}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Ontvangsten (Maand)"
          value={formatCurrency(monthIncome)}
          subtitle="Deze maand"
          subtitleColor="text-emerald-500"
          icon={ArrowDownRight}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Uitgaven (Maand)"
          value={formatCurrency(monthExpense)}
          subtitle="Deze maand"
          subtitleColor="text-red-500"
          icon={ArrowUpRight}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Transacties"
          value={monthTransactions.length}
          subtitle="Deze maand"
          icon={CreditCard}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Transacties
          </TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Rekeningen
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                onSelect={setSelectedAccount}
                isSelected={selectedAccount?.id === account.id}
              />
            ))}
            <div 
              onClick={() => setShowAccountDialog(true)}
              className="p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all flex items-center justify-center min-h-[120px]"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nieuwe Rekening</p>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">Recente Transacties</h3>
              <div className="space-y-2">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => { setDetailItem(t); setDetailOpen(true); }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(t.bedrag || 0) > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {(t.bedrag || 0) > 0 ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.omschrijving || t.description || 'Transactie'}</p>
                        <p className="text-xs text-gray-500">{formatDate(t.datum || t.date)}</p>
                      </div>
                    </div>
                    <span className={`font-medium ${(t.bedrag || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(t.bedrag || 0) > 0 ? '+' : ''}{formatCurrency(t.bedrag || t.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
                </div>
                <Select value={selectedAccount?.id || 'all'} onValueChange={(v) => setSelectedAccount(v === 'all' ? null : bankAccounts.find(a => a.id === v))}>
                  <SelectTrigger className="w-full sm:w-48 rounded-lg">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Alle rekeningen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle rekeningen</SelectItem>
                    {bankAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.naam || a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40 rounded-lg">
                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    <SelectItem value="credit">Ontvangsten</SelectItem>
                    <SelectItem value="debit">Uitgaven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Omschrijving</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Rekening</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Referentie</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Bedrag</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 w-16">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center"><CreditCard className="w-10 h-10 mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-500">Geen transacties gevonden</p></td></tr>
                    ) : (
                      filteredTransactions.map(t => {
                        const account = bankAccounts.find(a => a.id === t.bankrekening_id || a.id === t.bank_account_id);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => { setDetailItem(t); setDetailOpen(true); }}>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDate(t.datum || t.date)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${(t.bedrag || 0) > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                  {(t.bedrag || 0) > 0 ? <ArrowDownRight className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-red-600" />}
                                </div>
                                <span className="text-sm text-gray-900">{t.omschrijving || t.description || '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{account?.naam || account?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{t.referentie || t.reference || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium ${(t.bedrag || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {(t.bedrag || 0) > 0 ? '+' : ''}{formatCurrency(t.bedrag || t.amount || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setDetailItem(t); setDetailOpen(true); }}>
                                <Eye className="w-4 h-4 text-gray-400" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="mt-4 space-y-4">
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Bankrekeningen</h3>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" onClick={() => { setAccountForm({ naam: '', bank: '', rekeningnummer: '', valuta: 'SRD', beginsaldo: 0 }); setShowAccountDialog(true); }}>
                <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Rekening
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rekening</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Bank</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Rekeningnummer</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Saldo</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 w-24">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bankAccounts.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-500" />
                          </div>
                          <span className="font-medium text-gray-900">{account.naam || account.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.bank}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell font-mono">{account.rekeningnummer || account.account_number}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${(account.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(account.saldo || account.balance || 0, account.valuta)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openEditAccount(account)}>
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-red-500" onClick={() => handleDeleteAccount(account)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Input value={accountForm.naam} onChange={(e) => setAccountForm({...accountForm, naam: e.target.value})} placeholder="Hoofdrekening" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bank *</Label>
              <Input value={accountForm.bank} onChange={(e) => setAccountForm({...accountForm, bank: e.target.value})} placeholder="Hakrinbank" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Rekeningnummer *</Label>
              <Input value={accountForm.rekeningnummer} onChange={(e) => setAccountForm({...accountForm, rekeningnummer: e.target.value})} placeholder="NL00BANK0000000000" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={accountForm.valuta} onValueChange={(v) => setAccountForm({...accountForm, valuta: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Beginsaldo</Label>
                <Input type="number" value={accountForm.beginsaldo} onChange={(e) => setAccountForm({...accountForm, beginsaldo: parseFloat(e.target.value) || 0})} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreateAccount} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Aanmaken
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
              <Input value={accountForm.naam} onChange={(e) => setAccountForm({...accountForm, naam: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bank *</Label>
              <Input value={accountForm.bank} onChange={(e) => setAccountForm({...accountForm, bank: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Rekeningnummer *</Label>
              <Input value={accountForm.rekeningnummer} onChange={(e) => setAccountForm({...accountForm, rekeningnummer: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Valuta</Label>
                <Select value={accountForm.valuta} onValueChange={(v) => setAccountForm({...accountForm, valuta: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Beginsaldo</Label>
                <Input type="number" value={accountForm.beginsaldo} onChange={(e) => setAccountForm({...accountForm, beginsaldo: parseFloat(e.target.value) || 0})} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditAccountDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdateAccount} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} <Save className="w-4 h-4 mr-1.5" /> Opslaan
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
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
                <Input type="date" value={transactionForm.datum} onChange={(e) => setTransactionForm({...transactionForm, datum: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Type *</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm({...transactionForm, type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Ontvangst</SelectItem>
                    <SelectItem value="debit">Uitgave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Bedrag *</Label>
              <Input type="number" value={transactionForm.bedrag} onChange={(e) => setTransactionForm({...transactionForm, bedrag: parseFloat(e.target.value) || 0})} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Omschrijving</Label>
              <Input value={transactionForm.omschrijving} onChange={(e) => setTransactionForm({...transactionForm, omschrijving: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Referentie</Label>
              <Input value={transactionForm.referentie} onChange={(e) => setTransactionForm({...transactionForm, referentie: e.target.value})} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreateTransaction} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Aanmaken
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
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
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                Bestand selecteren
              </Button>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankKasPage;
