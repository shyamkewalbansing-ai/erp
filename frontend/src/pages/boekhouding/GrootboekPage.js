import React, { useState, useEffect } from 'react';
import { accountsAPI, journalAPI } from '../../lib/boekhoudingApi';
import { accountTypes, journalTypes, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  BookOpen, 
  FileText, 
  Loader2, 
  RefreshCw, 
  Link2, 
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Filter,
  Search
} from 'lucide-react';

// Stat Card Component matching Dashboard style
const StatCard = ({ title, value, subtitle, icon: Icon, loading, variant = 'default' }) => {
  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-sm rounded-2xl ${
      variant === 'primary' ? 'bg-emerald-50' : 'bg-white'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-slate-500 font-medium">{title}</span>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'primary' ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              <Icon className={`w-5 h-5 ${
                variant === 'primary' ? 'text-emerald-600' : 'text-slate-600'
              }`} />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
        {subtitle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GrootboekPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [showExterneCodeDialog, setShowExterneCodeDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [externeCode, setExterneCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
      const [accountsRes, journalRes] = await Promise.all([
        accountsAPI.getAll(),
        journalAPI.getAll()
      ]);
      setAccounts(accountsRes.data);
      setJournalEntries(journalRes.data);
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

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {});

  // Calculate totals
  const totalDebet = accounts.reduce((sum, acc) => sum + (acc.saldo > 0 ? acc.saldo : 0), 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + (acc.saldo < 0 ? Math.abs(acc.saldo) : 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50" data-testid="grootboek-page">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Grootboek</h1>
            <p className="text-sm text-slate-500">Beheer uw rekeningschema en journaalposten</p>
          </div>
          <div className="flex items-center gap-2">
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
                  
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Rekening</TableHead>
                          <TableHead className="w-32 text-xs text-right">Debet</TableHead>
                          <TableHead className="w-32 text-xs text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newJournal.regels.map((regel, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select value={regel.rekening_id} onValueChange={(v) => updateJournalLine(idx, 'rekening_id', v)}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Selecteer rekening" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.naam}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={regel.debet || ''}
                                onChange={(e) => updateJournalLine(idx, 'debet', e.target.value)}
                                className="text-right text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={regel.credit || ''}
                                onChange={(e) => updateJournalLine(idx, 'credit', e.target.value)}
                                className="text-right text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-emerald-50">
                          <TableCell className="text-sm font-medium text-slate-700">Totaal</TableCell>
                          <TableCell className="text-right text-sm font-bold text-emerald-700">
                            {formatAmount(newJournal.regels.reduce((s, l) => s + (parseFloat(l.debet) || 0), 0), 'SRD')}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-emerald-700">
                            {formatAmount(newJournal.regels.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), 'SRD')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={addJournalLine} className="rounded-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Regel toevoegen
                    </Button>
                    <Button onClick={handleCreateJournal} className="ml-auto bg-emerald-600 hover:bg-emerald-700 rounded-lg" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Opslaan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            title="Totaal Rekeningen"
            value={accounts.length}
            subtitle="Actieve rekeningen"
            icon={BookOpen}
            loading={loading}
          />
          <StatCard
            title="Journaalposten"
            value={journalEntries.length}
            subtitle="Totale boekingen"
            icon={FileText}
            loading={loading}
          />
          <StatCard
            title="Totaal Debet"
            value={formatAmount(totalDebet, 'SRD')}
            subtitle="Alle rekeningen"
            icon={TrendingUp}
            loading={loading}
            variant="primary"
          />
          <StatCard
            title="Totaal Credit"
            value={formatAmount(totalCredit, 'SRD')}
            subtitle="Alle rekeningen"
            icon={Wallet}
            loading={loading}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="accounts" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-slate-200 rounded-xl p-1">
              <TabsTrigger 
                value="accounts" 
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-accounts"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Rekeningschema
              </TabsTrigger>
              <TabsTrigger 
                value="journal"
                className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                data-testid="tab-journal"
              >
                <FileText className="w-4 h-4 mr-2" />
                Journaalposten
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="accounts">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                {/* Filter Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Zoek rekening..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-48 rounded-lg">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        {Object.entries(accountTypes).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Accounts Table */}
                <div className="space-y-6">
                  {Object.entries(groupedAccounts).map(([type, accs]) => (
                    <div key={type}>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {accountTypes[type]}
                        <Badge variant="outline" className="ml-2 text-xs">{accs.length}</Badge>
                      </h3>
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="w-24 text-xs font-medium text-slate-500">Code</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500">Categorie</TableHead>
                              <TableHead className="w-28 text-xs font-medium text-slate-500">Externe Code</TableHead>
                              <TableHead className="w-20 text-xs font-medium text-slate-500">Valuta</TableHead>
                              <TableHead className="text-right w-36 text-xs font-medium text-slate-500">Saldo</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accs.map(account => (
                              <TableRow key={account.id} className="hover:bg-slate-50/50" data-testid={`account-row-${account.code}`}>
                                <TableCell className="text-sm font-mono text-slate-600">{account.code}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-900">{account.naam}</TableCell>
                                <TableCell className="text-sm text-slate-500">{account.categorie}</TableCell>
                                <TableCell className="text-sm text-slate-400 font-mono">
                                  {account.externe_code || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs rounded-md">{account.valuta}</Badge>
                                </TableCell>
                                <TableCell className={`text-right text-sm font-semibold ${
                                  account.saldo < 0 ? 'text-red-600' : 'text-emerald-600'
                                }`}>
                                  {formatAmount(account.saldo || 0, account.valuta)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openExterneCodeDialog(account)}
                                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                    title="Externe code koppelen"
                                  >
                                    <Link2 className="w-4 h-4 text-slate-400" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedAccounts).length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                      <p className="text-lg font-medium mb-2">Geen rekeningen gevonden</p>
                      <p className="text-sm mb-6">Klik op "Standaard Schema" om het Surinaamse rekeningschema te laden.</p>
                      <Button onClick={handleInitStandaardSchema} disabled={initializingSchema} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                        {initializingSchema ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Standaard Schema Laden
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journal">
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Journaalposten</h3>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    Status <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                        <TableHead className="w-24 text-xs font-medium text-slate-500">Dagboek</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Omschrijving</TableHead>
                        <TableHead className="text-right w-36 text-xs font-medium text-slate-500">Bedrag</TableHead>
                        <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journalEntries.map(entry => (
                        <TableRow key={entry.id} className="hover:bg-slate-50/50" data-testid={`journal-row-${entry.volgnummer}`}>
                          <TableCell className="text-sm font-mono text-slate-600">{entry.volgnummer}</TableCell>
                          <TableCell className="text-sm text-slate-500">{new Date(entry.datum).toLocaleDateString('nl-NL')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs rounded-md">{journalTypes[entry.dagboek_code] || entry.dagboek_code}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-900">{entry.omschrijving}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-600">
                            {formatAmount(entry.totaal_debet || 0, 'SRD')}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              entry.status === 'geboekt' ? 'bg-emerald-50 text-emerald-600' : 
                              entry.status === 'concept' ? 'bg-amber-50 text-amber-600' : 
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {getStatusLabel(entry.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {journalEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                            <p>Geen journaalposten gevonden</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* External Code Dialog */}
      <Dialog open={showExterneCodeDialog} onOpenChange={setShowExterneCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Externe Code Koppelen</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Rekening:</span>
                  <span className="font-medium">{selectedAccount.code} - {selectedAccount.naam}</span>
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium">{accountTypes[selectedAccount.type] || selectedAccount.type}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Externe Code</Label>
                <Input
                  value={externeCode}
                  onChange={(e) => setExterneCode(e.target.value)}
                  placeholder="Bijv. EXT-001"
                  className="rounded-lg"
                  data-testid="externe-code-input"
                />
                <p className="text-xs text-slate-500">
                  Koppel uw eigen code voor integratie met externe systemen.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExterneCodeDialog(false)} className="rounded-lg">
              Annuleren
            </Button>
            <Button onClick={handleSaveExterneCode} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrootboekPage;
