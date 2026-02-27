import React, { useState, useEffect, useRef } from 'react';
import { bankAccountsAPI, bankTransactionsAPI, bankImportAPI } from '../../lib/boekhoudingApi';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Building2, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Upload, FileUp } from 'lucide-react';

const BankPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [importAccountId, setImportAccountId] = useState('');
  const [importType, setImportType] = useState('csv');
  const fileInputRef = useRef(null);

  const [newAccount, setNewAccount] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    currency: 'SRD'
  });

  const [newTransaction, setNewTransaction] = useState({
    bank_account_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    amount: 0,
    type: 'credit'
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
      const [accountsRes, transactionsRes] = await Promise.all([
        bankAccountsAPI.getAll(),
        bankTransactionsAPI.getAll()
      ]);
      setBankAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.name || !newAccount.bank_name || !newAccount.account_number) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      const accountData = {
        naam: newAccount.name,
        bank: newAccount.bank_name,
        rekeningnummer: newAccount.account_number,
        valuta: newAccount.currency
      };
      await bankAccountsAPI.create(accountData);
      toast.success('Bankrekening aangemaakt');
      setShowAccountDialog(false);
      setNewAccount({ name: '', bank_name: '', account_number: '', currency: 'SRD' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !importAccountId) {
      toast.error('Selecteer een bankrekening en bestand');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      let response;
      if (importType === 'csv') {
        response = await bankImportAPI.importCSV(importAccountId, formData);
      } else {
        response = await bankImportAPI.importMT940(importAccountId, formData);
      }

      toast.success(response.data.message);
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} fouten genegeerd`);
      }
      setShowImportDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij importeren');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.bank_account_id || !newTransaction.description || !newTransaction.amount) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      const transactionData = {
        bankrekening_id: newTransaction.bank_account_id,
        datum: newTransaction.date,
        omschrijving: newTransaction.description,
        referentie: newTransaction.reference,
        bedrag: newTransaction.amount,
        type: newTransaction.type
      };
      await bankTransactionsAPI.create(transactionData);
      toast.success('Transactie aangemaakt');
      setShowTransactionDialog(false);
      setNewTransaction({
        bank_account_id: '', date: new Date().toISOString().split('T')[0],
        description: '', reference: '', amount: 0, type: 'credit'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = selectedAccount === 'all'
    ? transactions
    : transactions.filter(t => t.bank_account_id === selectedAccount);

  const totalSRD = bankAccounts.filter(a => a.currency === 'SRD').reduce((s, a) => s + a.balance, 0);
  const totalUSD = bankAccounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
  const totalEUR = bankAccounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="bank-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="bank-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank/Kas</h1>
          <p className="text-slate-500 mt-0.5">Beheer uw bankrekeningen en transacties</p>
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
                  <Input
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                    placeholder="Hoofdrekening SRD"
                    data-testid="bank-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank *</Label>
                  <Select value={newAccount.bank_name} onValueChange={(v) => setNewAccount({...newAccount, bank_name: v})}>
                    <SelectTrigger data-testid="bank-select">
                      <SelectValue placeholder="Selecteer bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSB">De Surinaamsche Bank (DSB)</SelectItem>
                      <SelectItem value="RBC">Republic Bank</SelectItem>
                      <SelectItem value="Hakrinbank">Hakrinbank</SelectItem>
                      <SelectItem value="Finabank">Finabank</SelectItem>
                      <SelectItem value="Kas">Kas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rekeningnummer *</Label>
                  <Input
                    value={newAccount.account_number}
                    onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                    placeholder="123456789"
                    data-testid="account-number-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newAccount.currency} onValueChange={(v) => setNewAccount({...newAccount, currency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">SRD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateAccount} className="w-full" disabled={saving} data-testid="save-bank-account-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-transaction-btn">
                <Plus className="w-4 h-4 mr-2" />
                Transactie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Transactie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bankrekening *</Label>
                  <Select value={newTransaction.bank_account_id} onValueChange={(v) => setNewTransaction({...newTransaction, bank_account_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer rekening" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newTransaction.type} onValueChange={(v) => setNewTransaction({...newTransaction, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Bij (Ontvangst)</SelectItem>
                        <SelectItem value="debit">Af (Betaling)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving *</Label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                    placeholder="Omschrijving"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrag *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Referentie</Label>
                    <Input
                      value={newTransaction.reference}
                      onChange={(e) => setNewTransaction({...newTransaction, reference: e.target.value})}
                      placeholder="REF123"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateTransaction} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="import-bank-btn">
                <Upload className="w-4 h-4 mr-2" />
                Importeren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bankafschrift Importeren</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bankrekening *</Label>
                  <Select value={importAccountId} onValueChange={setImportAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer rekening" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bestandstype</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (standaard)</SelectItem>
                      <SelectItem value="mt940">MT940 (SWIFT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bestand</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleImport}
                      accept={importType === 'csv' ? '.csv' : '.sta,.mt940,.940'}
                      className="hidden"
                      disabled={!importAccountId || importing}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!importAccountId || importing}
                      className="w-full"
                    >
                      {importing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileUp className="w-4 h-4 mr-2" />
                      )}
                      {importing ? 'Importeren...' : 'Selecteer Bestand'}
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      {importType === 'csv' ? 'CSV met kolommen: Datum, Omschrijving, Bedrag' : 'MT940/SWIFT bankafschrift'}
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal SRD</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalSRD)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal USD</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalUSD, 'USD')}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal EUR</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalEUR, 'EUR')}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts" data-testid="tab-bank-accounts">
            <Building2 className="w-4 h-4 mr-2" />
            Bankrekeningen
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Transacties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Bankrekeningen</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Bank</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Rekeningnummer</TableHead>
                    <TableHead className="w-20 text-xs font-medium text-slate-500">Valuta</TableHead>
                    <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map(account => (
                    <TableRow key={account.id} data-testid={`bank-account-row-${account.account_number}`}>
                      <TableCell className="text-sm font-medium text-slate-900">{account.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{account.bank_name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{account.account_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{account.currency}</Badge>
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${account.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(account.balance, account.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {bankAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Geen bankrekeningen. Maak uw eerste rekening aan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Transacties</CardTitle>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Alle rekeningen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle rekeningen</SelectItem>
                    {bankAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Omschrijving</TableHead>
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Referentie</TableHead>
                    <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-slate-600">{formatDate(tx.date)}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">{tx.description}</TableCell>
                      <TableCell className="text-sm text-slate-500">{tx.reference || '-'}</TableCell>
                      <TableCell className={`text-right text-sm font-medium flex items-center justify-end gap-1 ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'credit' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {formatAmount(tx.amount, 'SRD')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusColor(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Geen transacties gevonden
                      </TableCell>
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

export default BankPage;
