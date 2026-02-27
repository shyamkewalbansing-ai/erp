import React, { useState, useEffect } from 'react';
import { bankAccountsAPI, kasboekAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
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
import { Plus, Building2, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Banknote } from 'lucide-react';

const BankKasPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [kasboek, setKasboek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showMutatieDialog, setShowMutatieDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');

  const [newAccount, setNewAccount] = useState({
    naam: '',
    bank: '',
    rekeningnummer: '',
    valuta: 'SRD'
  });

  const [newMutatie, setNewMutatie] = useState({
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    bedrag: 0,
    type: 'ontvangst'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bankRes, kasRes] = await Promise.all([
        bankAccountsAPI.getAll(),
        kasboekAPI.getAll()
      ]);
      setBankAccounts(Array.isArray(bankRes) ? bankRes : bankRes.data || []);
      setKasboek(Array.isArray(kasRes) ? kasRes : kasRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
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
      setNewAccount({ naam: '', bank: '', rekeningnummer: '', valuta: 'SRD' });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
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
      setNewMutatie({
        datum: new Date().toISOString().split('T')[0],
        omschrijving: '',
        bedrag: 0,
        type: 'ontvangst'
      });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const totalSRD = bankAccounts.filter(a => a.valuta === 'SRD').reduce((s, a) => s + (a.saldo || 0), 0);
  const totalUSD = bankAccounts.filter(a => a.valuta === 'USD').reduce((s, a) => s + (a.saldo || 0), 0);
  const totalEUR = bankAccounts.filter(a => a.valuta === 'EUR').reduce((s, a) => s + (a.saldo || 0), 0);

  return (
    <div className="space-y-6" data-testid="bank-kas-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bank/Kas</h1>
          <p className="text-slate-500 mt-1">Beheer uw bankrekeningen en kasmutaties</p>
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
                    value={newAccount.naam}
                    onChange={(e) => setNewAccount({...newAccount, naam: e.target.value})}
                    placeholder="Hoofdrekening SRD"
                    data-testid="bank-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank *</Label>
                  <Select value={newAccount.bank} onValueChange={(v) => setNewAccount({...newAccount, bank: v})}>
                    <SelectTrigger data-testid="bank-select">
                      <SelectValue placeholder="Selecteer bank" />
                    </SelectTrigger>
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
                  <Input
                    value={newAccount.rekeningnummer}
                    onChange={(e) => setNewAccount({...newAccount, rekeningnummer: e.target.value})}
                    placeholder="123456789"
                    data-testid="account-number-input"
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
                <Button onClick={handleCreateAccount} className="w-full" disabled={saving} data-testid="save-bank-account-btn">
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
                    <Input
                      type="date"
                      value={newMutatie.datum}
                      onChange={(e) => setNewMutatie({...newMutatie, datum: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newMutatie.type} onValueChange={(v) => setNewMutatie({...newMutatie, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ontvangst">Ontvangst</SelectItem>
                        <SelectItem value="uitgave">Uitgave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving *</Label>
                  <Input
                    value={newMutatie.omschrijving}
                    onChange={(e) => setNewMutatie({...newMutatie, omschrijving: e.target.value})}
                    placeholder="Omschrijving"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bedrag *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newMutatie.bedrag}
                    onChange={(e) => setNewMutatie({...newMutatie, bedrag: parseFloat(e.target.value) || 0})}
                  />
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

      <Tabs defaultValue="bank">
        <TabsList>
          <TabsTrigger value="bank" data-testid="tab-bank-accounts">
            <Building2 className="w-4 h-4 mr-2" />
            Bankrekeningen
          </TabsTrigger>
          <TabsTrigger value="kas" data-testid="tab-kasboek">
            <Banknote className="w-4 h-4 mr-2" />
            Kasboek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Bankrekeningen</CardTitle>
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
                      <TableRow key={account.rekeningnummer} data-testid={`bank-account-row-${account.rekeningnummer}`}>
                        <TableCell className="font-medium">{account.naam}</TableCell>
                        <TableCell>{account.bank}</TableCell>
                        <TableCell className="font-mono">{account.rekeningnummer}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.valuta}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono ${(account.saldo || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(account.saldo || 0, account.valuta)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kas" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Kasboek</CardTitle>
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
                        {mutatie.type === 'ontvangst' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {formatCurrency(mutatie.bedrag, 'SRD', false)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {kasboek.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        Geen kasmutaties gevonden
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

export default BankKasPage;
