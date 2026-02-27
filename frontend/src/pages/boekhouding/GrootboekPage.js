import React, { useState, useEffect } from 'react';
import { accountsAPI, journalAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, accountTypes, journalTypes, getStatusColor, getStatusLabel } from '../../lib/utils';
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
import { Plus, BookOpen, FileText, Loader2 } from 'lucide-react';

const GrootboekPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState('all');

  const [newAccount, setNewAccount] = useState({
    code: '',
    naam: '',
    type: 'activa',
    categorie: '',
    valuta: 'SRD'
  });

  const [newJournal, setNewJournal] = useState({
    date: new Date().toISOString().split('T')[0],
    journal_type: 'memorial',
    description: '',
    lines: [
      { account_id: '', account_code: '', account_name: '', debit: 0, credit: 0, description: '' },
      { account_id: '', account_code: '', account_name: '', debit: 0, credit: 0, description: '' }
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

  const handleCreateJournal = async () => {
    const totalDebit = newJournal.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = newJournal.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('Debet en credit moeten gelijk zijn');
      return;
    }

    setSaving(true);
    try {
      await journalAPI.create(newJournal);
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
    const lines = [...newJournal.lines];
    if (field === 'account_id') {
      const account = accounts.find(a => a.id === value);
      lines[index] = {
        ...lines[index],
        account_id: value,
        account_code: account?.code || '',
        account_name: account?.naam || ''
      };
    } else {
      lines[index][field] = field === 'debit' || field === 'credit' ? parseFloat(value) || 0 : value;
    }
    setNewJournal({ ...newJournal, lines });
  };

  const addJournalLine = () => {
    setNewJournal({
      ...newJournal,
      lines: [...newJournal.lines, { account_id: '', account_code: '', account_name: '', debit: 0, credit: 0, description: '' }]
    });
  };

  const filteredAccounts = selectedType === 'all' 
    ? accounts 
    : accounts.filter(a => a.type === selectedType);

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="grootboek-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Grootboek</h1>
          <p className="text-slate-500 mt-1">Beheer uw rekeningschema en journaalposten</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-account-btn">
                <Plus className="w-4 h-4 mr-2" />
                Rekening
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                    <Label>Type *</Label>
                    <Select value={newAccount.type} onValueChange={(v) => setNewAccount({...newAccount, type: v})}>
                      <SelectTrigger data-testid="account-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(accountTypes).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
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
                <div className="space-y-2">
                  <Label>Categorie *</Label>
                  <Input
                    value={newAccount.categorie}
                    onChange={(e) => setNewAccount({...newAccount, categorie: e.target.value})}
                    placeholder="Liquide middelen"
                    data-testid="account-category-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newAccount.valuta} onValueChange={(v) => setNewAccount({...newAccount, valuta: v})}>
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
                <Button onClick={handleCreateAccount} className="w-full" disabled={saving} data-testid="save-account-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-journal-btn">
                <Plus className="w-4 h-4 mr-2" />
                Journaalpost
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Nieuwe Journaalpost</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newJournal.date}
                      onChange={(e) => setNewJournal({...newJournal, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dagboek</Label>
                    <Select value={newJournal.journal_type} onValueChange={(v) => setNewJournal({...newJournal, journal_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      value={newJournal.description}
                      onChange={(e) => setNewJournal({...newJournal, description: e.target.value})}
                      placeholder="Omschrijving"
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Rekening</TableHead>
                        <TableHead className="text-right w-32">Debet</TableHead>
                        <TableHead className="text-right w-32">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newJournal.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select value={line.account_id} onValueChange={(v) => updateJournalLine(idx, 'account_id', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Kies rekening" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(a => (
                                  <SelectItem key={a.id} value={a.id}>{a.code} - {a.naam}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.debit || ''}
                              onChange={(e) => updateJournalLine(idx, 'debit', e.target.value)}
                              className="text-right font-mono"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.credit || ''}
                              onChange={(e) => updateJournalLine(idx, 'credit', e.target.value)}
                              className="text-right font-mono"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-medium">
                        <TableCell>Totaal</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(newJournal.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0), 'SRD', false)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(newJournal.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), 'SRD', false)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addJournalLine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Regel toevoegen
                  </Button>
                  <Button onClick={handleCreateJournal} className="ml-auto" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Opslaan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts" data-testid="tab-accounts">
            <BookOpen className="w-4 h-4 mr-2" />
            Rekeningschema
          </TabsTrigger>
          <TabsTrigger value="journal" data-testid="tab-journal">
            <FileText className="w-4 h-4 mr-2" />
            Journaalposten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Rekeningschema</CardTitle>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
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
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedAccounts).map(([type, accs]) => (
                    <div key={type}>
                      <h3 className="font-medium text-slate-900 mb-2">{accountTypes[type]}</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-24">Code</TableHead>
                            <TableHead>Naam</TableHead>
                            <TableHead>Categorie</TableHead>
                            <TableHead className="w-20">Valuta</TableHead>
                            <TableHead className="text-right w-32">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accs.map(account => (
                            <TableRow key={account.id} data-testid={`account-row-${account.code}`}>
                              <TableCell className="font-mono">{account.code}</TableCell>
                              <TableCell className="font-medium">{account.naam}</TableCell>
                              <TableCell className="text-slate-500">{account.categorie}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{account.valuta}</Badge>
                              </TableCell>
                              <TableCell className={`text-right font-mono ${account.saldo < 0 ? 'text-red-600' : ''}`}>
                                {formatCurrency(account.saldo || 0, account.valuta)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                  {Object.keys(groupedAccounts).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      Geen rekeningen gevonden. Maak uw eerste rekening aan.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Journaalposten</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Nummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead className="w-24">Dagboek</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map(entry => (
                    <TableRow key={entry.id} data-testid={`journal-row-${entry.entry_number}`}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>{new Date(entry.date).toLocaleDateString('nl-NL')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{journalTypes[entry.journal_type]}</Badge>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(entry.lines.reduce((s, l) => s + l.debit, 0), entry.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>
                          {getStatusLabel(entry.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {journalEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen journaalposten gevonden
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

export default GrootboekPage;
