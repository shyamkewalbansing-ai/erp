import React, { useState, useEffect } from 'react';
import { bankAccountsAPI, kasboekAPI, reconciliatieAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Building2, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Banknote, Upload, RefreshCw, FileText, CheckCircle, Search } from 'lucide-react';

const BankKasPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [kasboek, setKasboek] = useState([]);
  const [reconciliatie, setReconciliatie] = useState({ bankmutaties: [], verkoopfacturen: [], inkoopfacturen: [] });
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showMutatieDialog, setShowMutatieDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bankrekening');

  const [newAccount, setNewAccount] = useState({
    naam: '',
    bank: '',
    rekeningnummer: '',
    valuta: 'SRD',
    beginsaldo: 0
  });

  const [newTransaction, setNewTransaction] = useState({
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    bedrag: 0,
    tegenrekening: ''
  });

  const [newMutatie, setNewMutatie] = useState({
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    bedrag: 0,
    type: 'ontvangst'
  });

  const [importData, setImportData] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      fetchTransactions(selectedBankId);
      fetchReconciliatie(selectedBankId);
    }
  }, [selectedBankId]);

  const fetchData = async () => {
    try {
      const [bankRes, kasRes] = await Promise.all([
        bankAccountsAPI.getAll(),
        kasboekAPI.getAll()
      ]);
      const accounts = Array.isArray(bankRes) ? bankRes : bankRes.data || [];
      setBankAccounts(accounts);
      setKasboek(Array.isArray(kasRes) ? kasRes : kasRes.data || []);
      if (accounts.length > 0 && !selectedBankId) {
        setSelectedBankId(accounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (bankId) => {
    try {
      const res = await bankAccountsAPI.getMutaties(bankId);
      setTransactions(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchReconciliatie = async (bankId) => {
    try {
      const res = await reconciliatieAPI.getOverzicht(bankId);
      setReconciliatie(res);
    } catch (error) {
      console.error('Error fetching reconciliatie:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.naam || !newAccount.bank || !newAccount.rekeningnummer) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await bankAccountsAPI.create(newAccount);
      toast.success('Bankrekening aangemaakt');
      setShowAccountDialog(false);
      setNewAccount({ naam: '', bank: '', rekeningnummer: '', valuta: 'SRD', beginsaldo: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.omschrijving || !newTransaction.bedrag || !selectedBankId) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await bankAccountsAPI.createMutatie(selectedBankId, newTransaction);
      toast.success('Transactie aangemaakt');
      setShowTransactionDialog(false);
      setNewTransaction({ datum: new Date().toISOString().split('T')[0], omschrijving: '', bedrag: 0, tegenrekening: '' });
      fetchTransactions(selectedBankId);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim() || !selectedBankId) {
      toast.error('Voer importdata in');
      return;
    }
    setSaving(true);
    try {
      // Parse CSV data
      const lines = importData.trim().split('\n');
      const mutaties = lines.slice(1).map(line => {
        const [datum, omschrijving, bedrag] = line.split(';');
        return { datum, omschrijving, bedrag: parseFloat(bedrag) || 0 };
      });
      await bankAccountsAPI.importMutaties(selectedBankId, mutaties);
      toast.success(`${mutaties.length} transacties geïmporteerd`);
      setShowImportDialog(false);
      setImportData('');
      fetchTransactions(selectedBankId);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij importeren');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!selectedBankId) return;
    setSaving(true);
    try {
      const result = await reconciliatieAPI.autoMatch(selectedBankId);
      toast.success(`${result.matched || 0} transacties automatisch gematched`);
      fetchReconciliatie(selectedBankId);
      fetchTransactions(selectedBankId);
    } catch (error) {
      toast.error(error.message || 'Fout bij automatisch matchen');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMutatie = async () => {
    if (!newMutatie.omschrijving || !newMutatie.bedrag) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await kasboekAPI.create(newMutatie);
      toast.success('Kasmutatie aangemaakt');
      setShowMutatieDialog(false);
      setNewMutatie({ datum: new Date().toISOString().split('T')[0], omschrijving: '', bedrag: 0, type: 'ontvangst' });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const totalSRD = bankAccounts.filter(a => a.valuta === 'SRD').reduce((s, a) => s + (a.huidig_saldo || a.saldo || 0), 0);
  const totalUSD = bankAccounts.filter(a => a.valuta === 'USD').reduce((s, a) => s + (a.huidig_saldo || a.saldo || 0), 0);
  const totalEUR = bankAccounts.filter(a => a.valuta === 'EUR').reduce((s, a) => s + (a.huidig_saldo || a.saldo || 0), 0);
  const selectedAccount = bankAccounts.find(a => a.id === selectedBankId);
  const unmatchedCount = reconciliatie.bankmutaties?.length || 0;

  return (
    <div className="space-y-6" data-testid="bank-kas-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bank/Kas</h1>
          <p className="text-slate-500 mt-1">Beheer uw bankrekeningen, transacties en kasmutaties</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-bank-account-btn">
                <Plus className="w-4 h-4 mr-2" />
                Bankrekening
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Bankrekening</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input value={newAccount.naam} onChange={(e) => setNewAccount({...newAccount, naam: e.target.value})} placeholder="Hoofdrekening SRD" />
                </div>
                <div className="space-y-2">
                  <Label>Bank *</Label>
                  <Select value={newAccount.bank} onValueChange={(v) => setNewAccount({...newAccount, bank: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecteer bank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSB">De Surinaamsche Bank (DSB)</SelectItem>
                      <SelectItem value="RBC">Republic Bank</SelectItem>
                      <SelectItem value="Hakrinbank">Hakrinbank</SelectItem>
                      <SelectItem value="Finabank">Finabank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rekeningnummer *</Label>
                  <Input value={newAccount.rekeningnummer} onChange={(e) => setNewAccount({...newAccount, rekeningnummer: e.target.value})} placeholder="123456789" />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Beginsaldo</Label>
                    <Input type="number" step="0.01" value={newAccount.beginsaldo} onChange={(e) => setNewAccount({...newAccount, beginsaldo: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <Button onClick={handleCreateAccount} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showMutatieDialog} onOpenChange={setShowMutatieDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-kas-mutatie-btn">
                <Plus className="w-4 h-4 mr-2" />
                Kasmutatie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Kasmutatie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input type="date" value={newMutatie.datum} onChange={(e) => setNewMutatie({...newMutatie, datum: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newMutatie.type} onValueChange={(v) => setNewMutatie({...newMutatie, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ontvangst">Ontvangst</SelectItem>
                        <SelectItem value="uitgave">Uitgave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving *</Label>
                  <Input value={newMutatie.omschrijving} onChange={(e) => setNewMutatie({...newMutatie, omschrijving: e.target.value})} placeholder="Omschrijving" />
                </div>
                <div className="space-y-2">
                  <Label>Bedrag *</Label>
                  <Input type="number" step="0.01" value={newMutatie.bedrag} onChange={(e) => setNewMutatie({...newMutatie, bedrag: parseFloat(e.target.value) || 0})} />
                </div>
                <Button onClick={handleCreateMutatie} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal SRD</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalSRD)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal USD</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalUSD, 'USD')}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal EUR</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalEUR, 'EUR')}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bankrekening" data-testid="tab-bankrekening">
            <Building2 className="w-4 h-4 mr-2" />
            Bankrekening
          </TabsTrigger>
          <TabsTrigger value="transactie" data-testid="tab-transactie">
            <FileText className="w-4 h-4 mr-2" />
            Transactie
          </TabsTrigger>
          <TabsTrigger value="importeren" data-testid="tab-importeren">
            <Upload className="w-4 h-4 mr-2" />
            Importeren
          </TabsTrigger>
          <TabsTrigger value="reconciliatie" data-testid="tab-reconciliatie">
            <RefreshCw className="w-4 h-4 mr-2" />
            Bankreconciliatie
            {unmatchedCount > 0 && <Badge variant="destructive" className="ml-2">{unmatchedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="kasboek" data-testid="tab-kasboek">
            <Banknote className="w-4 h-4 mr-2" />
            Kasboek
          </TabsTrigger>
        </TabsList>

        {/* Bankrekening Tab */}
        <TabsContent value="bankrekening" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Bankrekeningen</CardTitle>
              <CardDescription>Overzicht van al uw bankrekeningen</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Naam</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Rekeningnummer</TableHead>
                      <TableHead className="w-20">Valuta</TableHead>
                      <TableHead className="text-right w-32">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map(account => (
                      <TableRow 
                        key={account.id} 
                        className={`cursor-pointer hover:bg-slate-50 ${selectedBankId === account.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedBankId(account.id)}
                      >
                        <TableCell className="font-medium">{account.naam}</TableCell>
                        <TableCell>{account.bank}</TableCell>
                        <TableCell className="font-mono">{account.rekeningnummer}</TableCell>
                        <TableCell><Badge variant="outline">{account.valuta}</Badge></TableCell>
                        <TableCell className={`text-right font-mono ${(account.huidig_saldo || account.saldo || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(account.huidig_saldo || account.saldo || 0, account.valuta)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {bankAccounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">Geen bankrekeningen. Maak uw eerste rekening aan.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactie Tab */}
        <TabsContent value="transactie" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Transacties</CardTitle>
                <CardDescription>
                  {selectedAccount ? `${selectedAccount.naam} (${selectedAccount.rekeningnummer})` : 'Selecteer eerst een bankrekening'}
                </CardDescription>
              </div>
              <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedBankId} data-testid="add-transaction-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Transactie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Banktransactie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Input type="date" value={newTransaction.datum} onChange={(e) => setNewTransaction({...newTransaction, datum: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Omschrijving *</Label>
                      <Input value={newTransaction.omschrijving} onChange={(e) => setNewTransaction({...newTransaction, omschrijving: e.target.value})} placeholder="Omschrijving" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedrag * (+ voor ontvangst, - voor uitgave)</Label>
                      <Input type="number" step="0.01" value={newTransaction.bedrag} onChange={(e) => setNewTransaction({...newTransaction, bedrag: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tegenrekening</Label>
                      <Input value={newTransaction.tegenrekening} onChange={(e) => setNewTransaction({...newTransaction, tegenrekening: e.target.value})} placeholder="Optioneel" />
                    </div>
                    <Button onClick={handleCreateTransaction} className="w-full" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Opslaan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Tegenrekening</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(tx.datum)}</TableCell>
                      <TableCell className="font-medium">{tx.omschrijving}</TableCell>
                      <TableCell className="text-slate-500">{tx.tegenrekening || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'gematched' ? 'default' : tx.status === 'geboekt' ? 'secondary' : 'outline'}>
                          {tx.status === 'gematched' ? 'Gematched' : tx.status === 'geboekt' ? 'Geboekt' : 'Nieuw'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono flex items-center justify-end gap-1 ${tx.bedrag >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.bedrag >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatCurrency(Math.abs(tx.bedrag), selectedAccount?.valuta || 'SRD', false)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        {selectedBankId ? 'Geen transacties gevonden' : 'Selecteer eerst een bankrekening'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Importeren Tab */}
        <TabsContent value="importeren" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Banktransacties Importeren</CardTitle>
              <CardDescription>Importeer transacties van uw bank (CSV formaat)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecteer Bankrekening</Label>
                <Select value={selectedBankId || ''} onValueChange={setSelectedBankId}>
                  <SelectTrigger><SelectValue placeholder="Selecteer bankrekening" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.naam} ({a.rekeningnummer})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CSV Data</Label>
                <Textarea 
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="datum;omschrijving;bedrag&#10;2024-01-15;Betaling klant ABC;1500.00&#10;2024-01-16;Huur kantoor;-2500.00"
                  className="font-mono h-48"
                />
                <p className="text-sm text-slate-500">Formaat: datum;omschrijving;bedrag (eerste regel is header)</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={!selectedBankId || !importData.trim() || saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Importeren
                </Button>
                <Button variant="outline" disabled>
                  <FileText className="w-4 h-4 mr-2" />
                  MT940 Importeren (binnenkort)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliatie Tab */}
        <TabsContent value="reconciliatie" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bankreconciliatie</CardTitle>
                <CardDescription>Match banktransacties met facturen</CardDescription>
              </div>
              <Button onClick={handleAutoMatch} disabled={!selectedBankId || saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Auto-Match
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Niet-gematchte transacties */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Niet-gematchte transacties ({reconciliatie.bankmutaties?.length || 0})
                  </h3>
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Datum</TableHead>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead className="text-right">Bedrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reconciliatie.bankmutaties || []).map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{formatDate(m.datum)}</TableCell>
                            <TableCell className="truncate max-w-[200px]">{m.omschrijving}</TableCell>
                            <TableCell className={`text-right font-mono ${m.bedrag >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(m.bedrag, 'SRD')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(reconciliatie.bankmutaties?.length || 0) === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-slate-500">
                              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                              Alle transacties zijn gematched
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {/* Openstaande facturen */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Openstaande facturen ({(reconciliatie.verkoopfacturen?.length || 0) + (reconciliatie.inkoopfacturen?.length || 0)})
                  </h3>
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Type</TableHead>
                          <TableHead>Nummer</TableHead>
                          <TableHead className="text-right">Bedrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reconciliatie.verkoopfacturen || []).map((f, idx) => (
                          <TableRow key={`v-${idx}`}>
                            <TableCell><Badge variant="outline" className="text-green-600">Verkoop</Badge></TableCell>
                            <TableCell>{f.factuurnummer}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(f.openstaand_bedrag || f.totaal_incl_btw, 'SRD')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(reconciliatie.inkoopfacturen || []).map((f, idx) => (
                          <TableRow key={`i-${idx}`}>
                            <TableCell><Badge variant="outline" className="text-red-600">Inkoop</Badge></TableCell>
                            <TableCell>{f.intern_nummer || f.factuurnummer}</TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {formatCurrency(f.openstaand_bedrag || f.totaal_incl_btw, 'SRD')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(reconciliatie.verkoopfacturen?.length || 0) + (reconciliatie.inkoopfacturen?.length || 0) === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-slate-500">Geen openstaande facturen</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kasboek Tab */}
        <TabsContent value="kasboek" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Kasboek</CardTitle>
              <CardDescription>Kasgeld ontvangsten en uitgaven</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kasboek.map((mutatie, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(mutatie.datum)}</TableCell>
                      <TableCell className="font-medium">{mutatie.omschrijving}</TableCell>
                      <TableCell>
                        <Badge variant={mutatie.type === 'ontvangst' ? 'default' : 'secondary'}>
                          {mutatie.type === 'ontvangst' ? 'Ontvangst' : 'Uitgave'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono flex items-center justify-end gap-1 ${mutatie.type === 'ontvangst' ? 'text-green-600' : 'text-red-600'}`}>
                        {mutatie.type === 'ontvangst' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatCurrency(mutatie.bedrag, 'SRD', false)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {kasboek.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">Geen kasmutaties gevonden</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BankKasPage;
