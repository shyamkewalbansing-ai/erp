import React, { useState, useEffect } from 'react';
import { accountsAPI, journalAPI } from '../../lib/boekhoudingApi';
import { accountTypes, journalTypes, getStatusColor, getStatusLabel } from '../../lib/utils';
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
import { Plus, BookOpen, FileText, Loader2, RefreshCw, Link2, Edit } from 'lucide-react';

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

  // Initialize standard Surinamese chart of accounts
  const handleInitStandaardSchema = async () => {
    if (!window.confirm('Weet u zeker dat u het standaard Surinaamse rekeningschema wilt laden? Dit werkt alleen als er nog geen rekeningen zijn.')) {
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

  // Open dialog to edit external code for an account
  const openExterneCodeDialog = (account) => {
    setSelectedAccount(account);
    setExterneCode(account.externe_code || '');
    setShowExterneCodeDialog(true);
  };

  // Save external code
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

  const filteredAccounts = selectedType === 'all' 
    ? accounts 
    : accounts.filter(a => a.type === selectedType);

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="grootboek-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="grootboek-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Grootboek</h1>
          <p className="text-slate-500 mt-0.5">Beheer uw rekeningschema en journaalposten</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {accounts.length === 0 && (
            <Button 
              variant="outline" 
              onClick={handleInitStandaardSchema} 
              disabled={initializingSchema}
              data-testid="init-standaard-btn"
            >
              {initializingSchema ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Standaard Schema Laden
            </Button>
          )}
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
                      value={newJournal.datum}
                      onChange={(e) => setNewJournal({...newJournal, datum: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dagboek</Label>
                    <Select value={newJournal.dagboek_code} onValueChange={(v) => setNewJournal({...newJournal, dagboek_code: v})}>
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
                      value={newJournal.omschrijving}
                      onChange={(e) => setNewJournal({...newJournal, omschrijving: e.target.value})}
                      placeholder="Omschrijving"
                    />
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-medium text-slate-500">Rekening</TableHead>
                        <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Debet</TableHead>
                        <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newJournal.regels.map((regel, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select value={regel.rekening_id} onValueChange={(v) => updateJournalLine(idx, 'rekening_id', v)}>
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
                      <TableRow className="bg-slate-50">
                        <TableCell className="text-sm font-medium text-slate-700">Totaal</TableCell>
                        <TableCell className="text-right text-sm font-medium text-slate-900">
                          {formatAmount(newJournal.regels.reduce((s, l) => s + (parseFloat(l.debet) || 0), 0), 'SRD')}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-slate-900">
                          {formatAmount(newJournal.regels.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), 'SRD')}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Rekeningen</p>
                <p className="text-2xl font-semibold text-slate-900">{accounts.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Journaalposten</p>
                <p className="text-2xl font-semibold text-slate-900">{journalEntries.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Rekeningschema</CardTitle>
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
              <div className="space-y-6">
                {Object.entries(groupedAccounts).map(([type, accs]) => (
                  <div key={type}>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">{accountTypes[type]}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-24 text-xs font-medium text-slate-500">Code</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                          <TableHead className="text-xs font-medium text-slate-500">Categorie</TableHead>
                          <TableHead className="w-28 text-xs font-medium text-slate-500">Externe Code</TableHead>
                          <TableHead className="w-20 text-xs font-medium text-slate-500">Valuta</TableHead>
                          <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Saldo</TableHead>
                          <TableHead className="w-20 text-xs font-medium text-slate-500">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accs.map(account => (
                          <TableRow key={account.id} data-testid={`account-row-${account.code}`}>
                            <TableCell className="text-sm text-slate-600">{account.code}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">{account.naam}</TableCell>
                            <TableCell className="text-sm text-slate-500">{account.categorie}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {account.externe_code || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{account.valuta}</Badge>
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${account.saldo < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                              {formatAmount(account.saldo || 0, account.valuta)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openExterneCodeDialog(account)}
                                className="h-8 w-8 p-0"
                                title="Externe code koppelen"
                              >
                                <Link2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {Object.keys(groupedAccounts).length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="mb-2">Geen rekeningen gevonden.</p>
                    <p className="text-sm">Klik op "Standaard Schema Laden" om het Surinaamse rekeningschema te initialiseren.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Journaalposten</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Nummer</TableHead>
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Dagboek</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Omschrijving</TableHead>
                    <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map(entry => (
                    <TableRow key={entry.id} data-testid={`journal-row-${entry.volgnummer}`}>
                      <TableCell className="text-sm text-slate-600">{entry.volgnummer}</TableCell>
                      <TableCell className="text-sm text-slate-500">{new Date(entry.datum).toLocaleDateString('nl-NL')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{journalTypes[entry.dagboek_code] || entry.dagboek_code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-900">{entry.omschrijving}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-slate-900">
                        {formatAmount(entry.totaal_debet || 0, 'SRD')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusColor(entry.status)}`}>
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
