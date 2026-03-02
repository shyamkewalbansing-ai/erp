import React, { useState, useEffect } from 'react';
import { accountsAPI, journalAPI } from '../../lib/boekhoudingApi';
import { accountTypes, journalTypes } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  BookOpen, 
  FileText, 
  Loader2, 
  RefreshCw, 
  Link2, 
  TrendingUp,
  Wallet,
  Search,
  Building2,
  User,
  ArrowUpDown,
  Eye,
  Edit,
  Download,
  Clock,
  CheckCircle,
  Circle,
  Upload,
  Settings,
  Copy,
  Trash2,
  Filter,
  MoreHorizontal,
  Printer,
  Mail
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

// Type Badge Component
const TypeBadge = ({ type }) => {
  const config = {
    activa: { label: 'Activa', className: 'bg-blue-100 text-blue-700' },
    passiva: { label: 'Passiva', className: 'bg-purple-100 text-purple-700' },
    kosten: { label: 'Kosten', className: 'bg-red-100 text-red-700' },
    opbrengsten: { label: 'Opbrengsten', className: 'bg-emerald-100 text-emerald-700' },
    eigen_vermogen: { label: 'Eigen Vermogen', className: 'bg-amber-100 text-amber-700' },
  };
  
  const { label, className } = config[type] || { label: type, className: 'bg-gray-100 text-gray-600' };
  
  return (
    <Badge className={`${className} text-xs font-medium`}>
      {label}
    </Badge>
  );
};

const GrootboekPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [showExterneCodeDialog, setShowExterneCodeDialog] = useState(false);
  const [showBulkCodeDialog, setShowBulkCodeDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [externeCode, setExterneCode] = useState('');
  const [bulkCodePrefix, setBulkCodePrefix] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('rekeningen');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024');

  const [newAccount, setNewAccount] = useState({
    code: '',
    naam: '',
    type: 'activa',
    categorie: '',
    valuta: 'SRD'
  });

  const [newJournal, setNewJournal] = useState({
    datum: new Date().toISOString().split('T')[0],
    dagboek_code: 'MM',
    omschrijving: '',
    regels: [
      { rekening_id: '', rekening_code: '', rekening_naam: '', debet: 0, credit: 0 },
      { rekening_id: '', rekening_code: '', rekening_naam: '', debet: 0, credit: 0 }
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, journalRes] = await Promise.all([
        accountsAPI.getAll(),
        journalAPI.getAll()
      ]);
      setAccounts(accountsRes.data || []);
      setJournalEntries(journalRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.code || !newAccount.naam || !newAccount.categorie) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await accountsAPI.create(newAccount);
      toast.success('Rekening aangemaakt');
      setShowAccountDialog(false);
      setNewAccount({ code: '', naam: '', type: 'activa', categorie: '', valuta: 'SRD' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleInitStandaardSchema = async () => {
    if (!window.confirm('Weet u zeker dat u het standaard Surinaamse rekeningschema wilt laden?')) {
      return;
    }
    setInitializingSchema(true);
    try {
      const response = await accountsAPI.initStandaard();
      toast.success(response.data.message || 'Standaard rekeningschema geladen');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij laden standaard schema');
    } finally {
      setInitializingSchema(false);
    }
  };

  const openExterneCodeDialog = (account) => {
    setSelectedAccount(account);
    setExterneCode(account.externe_code || '');
    setShowExterneCodeDialog(true);
  };

  const handleSaveExterneCode = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await accountsAPI.updateExterneCode(selectedAccount.id, externeCode);
      toast.success('Externe code opgeslagen');
      setShowExterneCodeDialog(false);
      setSelectedAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan externe code');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCodeLink = async () => {
    if (selectedRows.length === 0) {
      toast.error('Selecteer eerst rekeningen om te koppelen');
      return;
    }
    setSaving(true);
    try {
      // Link each selected account with prefix + original code
      for (const accountId of selectedRows) {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
          const newCode = bulkCodePrefix ? `${bulkCodePrefix}-${account.code}` : account.code;
          await accountsAPI.updateExterneCode(accountId, newCode);
        }
      }
      toast.success(`${selectedRows.length} rekeningen gekoppeld`);
      setShowBulkCodeDialog(false);
      setBulkCodePrefix('');
      setSelectedRows([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij koppelen codes');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateJournal = async () => {
    const totalDebit = newJournal.regels.reduce((sum, l) => sum + (parseFloat(l.debet) || 0), 0);
    const totalCredit = newJournal.regels.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('Debet en credit moeten gelijk zijn');
      return;
    }

    setSaving(true);
    try {
      await journalAPI.create({
        dagboek_code: newJournal.dagboek_code,
        datum: newJournal.datum,
        omschrijving: newJournal.omschrijving,
        regels: newJournal.regels.map(r => ({
          rekening_code: r.rekening_code,
          debet: r.debet,
          credit: r.credit
        }))
      });
      toast.success('Journaalpost aangemaakt');
      setShowJournalDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const updateJournalLine = (index, field, value) => {
    const regels = [...newJournal.regels];
    if (field === 'rekening_id') {
      const account = accounts.find(a => a.id === value);
      regels[index] = {
        ...regels[index],
        rekening_id: value,
        rekening_code: account?.code || '',
        rekening_naam: account?.naam || ''
      };
    } else {
      regels[index][field] = field === 'debet' || field === 'credit' ? parseFloat(value) || 0 : value;
    }
    setNewJournal({ ...newJournal, regels });
  };

  const addJournalLine = () => {
    setNewJournal({
      ...newJournal,
      regels: [...newJournal.regels, { rekening_id: '', rekening_code: '', rekening_naam: '', debet: 0, credit: 0 }]
    });
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRows = () => {
    if (selectedRows.length === filteredAccounts.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredAccounts.map(a => a.id));
    }
  };

  // Filter accounts
  let filteredAccounts = selectedType === 'all' 
    ? accounts 
    : accounts.filter(a => a.type === selectedType);
  
  if (searchTerm) {
    filteredAccounts = filteredAccounts.filter(a => 
      a.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.naam?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Calculate totals
  const totalDebet = accounts.reduce((sum, acc) => sum + (acc.saldo > 0 ? acc.saldo : 0), 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + (acc.saldo < 0 ? Math.abs(acc.saldo) : 0), 0);
  const aantalRekeningen = accounts.length;
  const aantalJournaalposten = journalEntries.length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="grootboek-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Grootboek</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <TabButton active={activeTab === 'rekeningen'} onClick={() => setActiveTab('rekeningen')}>
            Rekeningen
          </TabButton>
          <TabButton active={activeTab === 'journaal'} onClick={() => setActiveTab('journaal')}>
            Journaalposten
          </TabButton>
          <TabButton active={activeTab === 'balans'} onClick={() => setActiveTab('balans')}>
            Balans
          </TabButton>
          <TabButton active={activeTab === 'resultaat'} onClick={() => setActiveTab('resultaat')}>
            Resultatenrekening
          </TabButton>
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            {accounts.length === 0 && (
              <Button 
                variant="outline" 
                onClick={handleInitStandaardSchema} 
                disabled={initializingSchema}
                className="rounded-lg"
                data-testid="init-standaard-btn"
              >
                {initializingSchema ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Standaard Schema
              </Button>
            )}
            <Button variant="outline" className="rounded-lg" data-testid="import-btn">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" className="rounded-lg" data-testid="bulk-link-btn" onClick={() => setShowBulkCodeDialog(true)}>
              <Link2 className="w-4 h-4 mr-2" />
              Codes Koppelen
            </Button>
            <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-lg" data-testid="add-account-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Rekening
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nieuwe Rekening</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input
                        value={newAccount.code}
                        onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                        placeholder="1000"
                        data-testid="account-code-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valuta</Label>
                      <Select value={newAccount.valuta} onValueChange={(v) => setNewAccount({...newAccount, valuta: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SRD">SRD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Naam *</Label>
                    <Input
                      value={newAccount.naam}
                      onChange={(e) => setNewAccount({...newAccount, naam: e.target.value})}
                      placeholder="Kas"
                      data-testid="account-name-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={newAccount.type} onValueChange={(v) => setNewAccount({...newAccount, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(accountTypes).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Categorie *</Label>
                      <Input
                        value={newAccount.categorie}
                        onChange={(e) => setNewAccount({...newAccount, categorie: e.target.value})}
                        placeholder="Liquide middelen"
                        data-testid="account-category-input"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Annuleren</Button>
                  <Button onClick={handleCreateAccount} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Opslaan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
              <DialogTrigger asChild>
                <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700" data-testid="add-journal-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Journaalpost
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Journaalpost</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Input
                        type="date"
                        value={newJournal.datum}
                        onChange={(e) => setNewJournal({...newJournal, datum: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dagboek</Label>
                      <Select value={newJournal.dagboek_code} onValueChange={(v) => setNewJournal({...newJournal, dagboek_code: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(journalTypes).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Omschrijving</Label>
                      <Input
                        value={newJournal.omschrijving}
                        onChange={(e) => setNewJournal({...newJournal, omschrijving: e.target.value})}
                        placeholder="Omschrijving"
                      />
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Rekening</th>
                          <th className="text-right p-3 font-medium w-32">Debet</th>
                          <th className="text-right p-3 font-medium w-32">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newJournal.regels.map((regel, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">
                              <Select value={regel.rekening_id} onValueChange={(v) => updateJournalLine(idx, 'rekening_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
                                <SelectContent>
                                  {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.naam}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={regel.debet || ''}
                                onChange={(e) => updateJournalLine(idx, 'debet', e.target.value)}
                                className="text-right"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={regel.credit || ''}
                                onChange={(e) => updateJournalLine(idx, 'credit', e.target.value)}
                                className="text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td className="p-3 font-medium">Totaal</td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(newJournal.regels.reduce((s, r) => s + (parseFloat(r.debet) || 0), 0))}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(newJournal.regels.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addJournalLine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Regel toevoegen
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowJournalDialog(false)}>Annuleren</Button>
                  <Button onClick={handleCreateJournal} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Boeken
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="grid grid-cols-5 gap-6 items-end">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Code / Naam
            </Label>
            <div className="relative">
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg pr-10 h-11"
                data-testid="search-input"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Boekjaar */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Boekjaar</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="rounded-lg h-11">
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
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="rounded-lg h-11">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                {Object.entries(accountTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Placeholder for layout */}
          <div></div>

          {/* Totaal Balans */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Debet</span>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalDebet)}</p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={Circle} label="Activa" color="text-blue-500" />
          <StatusLegendItem icon={Circle} label="Passiva" color="text-purple-500" />
          <StatusLegendItem icon={Circle} label="Kosten" color="text-red-500" />
          <StatusLegendItem icon={Circle} label="Opbrengsten" color="text-emerald-500" />
          <StatusLegendItem icon={Circle} label="Eigen Vermogen" color="text-amber-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards - Zakelijk 3D */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Rekeningen</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{aantalRekeningen}</p>
                <p className="text-xs text-gray-400 mt-1">Totaal in schema</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <BookOpen className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Debet</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalDebet)}</p>
                <p className="text-xs text-gray-400 mt-1">Debet saldo</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-inner">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Credit</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(totalCredit)}</p>
                <p className="text-xs text-gray-400 mt-1">Credit saldo</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-inner">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Journaalposten</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{aantalJournaalposten}</p>
                <p className="text-xs text-gray-400 mt-1">Dit boekjaar</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === 'rekeningen' && `Rekeningschema (${filteredAccounts.length})`}
                  {activeTab === 'journaal' && `Journaalposten (${journalEntries.length})`}
                  {activeTab === 'balans' && 'Balans'}
                  {activeTab === 'resultaat' && 'Resultatenrekening'}
                </span>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </div>

            {/* Rekeningen Tab */}
            {activeTab === 'rekeningen' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredAccounts.length && filteredAccounts.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Code
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Naam</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Categorie</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Saldo</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Externe Code</th>
                      <th className="w-20 px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Laden...</td>
                      </tr>
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Geen rekeningen gevonden</td>
                      </tr>
                    ) : (
                      filteredAccounts.map(account => (
                        <tr 
                          key={account.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 ${selectedRows.includes(account.id) ? 'bg-emerald-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(account.id)}
                              onCheckedChange={() => toggleRowSelection(account.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-gray-900">{account.code}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{account.naam}</td>
                          <td className="px-4 py-3">
                            <TypeBadge type={account.type} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">{account.categorie}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            <span className={account.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {formatCurrency(account.saldo || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {account.externe_code ? (
                              <Badge variant="outline" className="text-xs">{account.externe_code}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openExterneCodeDialog(account)}>
                                <Link2 className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-gray-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Journaal Tab */}
            {activeTab === 'journaal' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Dagboek</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Omschrijving</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Debet</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Laden...</td>
                      </tr>
                    ) : journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Geen journaalposten gevonden</td>
                      </tr>
                    ) : (
                      journalEntries.map(entry => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{entry.datum}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{entry.dagboek_code}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{entry.omschrijving}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {formatCurrency(entry.totaal_debet || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">
                            {formatCurrency(entry.totaal_credit || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Balans & Resultaat Tabs */}
            {(activeTab === 'balans' || activeTab === 'resultaat') && (
              <div className="px-6 py-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {activeTab === 'balans' ? 'Balansrapport wordt gegenereerd...' : 'Resultatenrekening wordt gegenereerd...'}
                </p>
              </div>
            )}

            {/* Footer with selection info */}
            {selectedRows.length > 0 && activeTab === 'rekeningen' && (
              <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700">
                  {selectedRows.length} rekening(en) geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    onClick={() => setShowBulkCodeDialog(true)}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Codes Koppelen
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
          </CardContent>
        </Card>
      </div>

      {/* Externe Code Dialog */}
      <Dialog open={showExterneCodeDialog} onOpenChange={setShowExterneCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Externe Code Koppelen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAccount && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{selectedAccount.code} - {selectedAccount.naam}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Externe Code</Label>
              <Input
                value={externeCode}
                onChange={(e) => setExterneCode(e.target.value)}
                placeholder="Bijv. ABC123"
              />
              <p className="text-xs text-gray-500">Koppel deze rekening aan een externe boekhoudsoftware</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExterneCodeDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveExterneCode} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Code Koppeling Dialog */}
      <Dialog open={showBulkCodeDialog} onOpenChange={setShowBulkCodeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Codes Bulk Koppelen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Koppel uw eigen codes</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Selecteer rekeningen in de tabel en koppel ze aan uw externe boekhoudsysteem met een voorvoegsel.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Geselecteerde rekeningen</Label>
              <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {selectedRows.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen rekeningen geselecteerd. Selecteer rekeningen in de tabel.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedRows.map(id => {
                      const acc = accounts.find(a => a.id === id);
                      return acc ? (
                        <Badge key={id} variant="outline" className="text-xs">
                          {acc.code} - {acc.naam}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Voorvoegsel (Prefix)</Label>
              <Input
                value={bulkCodePrefix}
                onChange={(e) => setBulkCodePrefix(e.target.value)}
                placeholder="Bijv. EXT of uw bedrijfscode"
              />
              <p className="text-xs text-gray-500">
                De externe code wordt: <span className="font-mono bg-gray-100 px-1 rounded">{bulkCodePrefix || 'PREFIX'}-[rekeningcode]</span>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Voorbeeld:</strong> Met prefix "EXT" wordt rekening 1000 gekoppeld als "EXT-1000"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkCodeDialog(false)}>Annuleren</Button>
            <Button 
              onClick={handleBulkCodeLink} 
              disabled={saving || selectedRows.length === 0} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              {selectedRows.length} Rekeningen Koppelen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrootboekPage;
