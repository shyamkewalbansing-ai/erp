import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { ModulePageLayout, StatsGrid, ContentSection, PageCard } from '../../components/ModulePageLayout';
import { 
  Plus, Wallet, Building, CreditCard, Trash2, ArrowUpRight, ArrowDownRight,
  DollarSign, Euro, Banknote, Calendar, Search, ArrowRightLeft, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', USD: '$', EUR: '€' };
  return `${symbols[currency] || currency} ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
};

const getValutaIcon = (valuta) => {
  if (valuta === 'EUR') return Euro;
  if (valuta === 'USD') return DollarSign;
  return Banknote;
};

export default function BankrekeningenPage() {
  const [rekeningen, setRekeningen] = useState([]);
  const [transacties, setTransacties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactieDialogOpen, setTransactieDialogOpen] = useState(false);
  const [overboekingDialogOpen, setOverboekingDialogOpen] = useState(false);
  const [selectedRekening, setSelectedRekening] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [wisselkoersen, setWisselkoersen] = useState({});
  
  const [form, setForm] = useState({ 
    naam: '', 
    rekeningnummer: '', 
    bank_naam: '', 
    valuta: 'SRD', 
    beginsaldo: 0 
  });
  
  const [transactieForm, setTransactieForm] = useState({
    rekening_id: '',
    datum: new Date().toISOString().split('T')[0],
    type: 'inkomst',
    bedrag: 0,
    valuta: 'SRD',
    omschrijving: '',
    categorie: 'overig',
    referentie: ''
  });

  const [overboekingForm, setOverboekingForm] = useState({
    van_rekening_id: '',
    naar_rekening_id: '',
    bedrag: 0,
    omschrijving: 'Overboeking',
    datum: new Date().toISOString().split('T')[0],
    wisselkoers: null
  });

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rekRes, transRes, koersRes] = await Promise.all([
        api.get('/boekhouding/bankrekeningen'),
        api.get('/boekhouding/transacties?limit=50'),
        api.get('/wisselkoersen/').catch(() => ({ data: [] }))
      ]);
      setRekeningen(rekRes.data);
      setTransacties(transRes.data);
      
      // Bouw wisselkoersen lookup
      const koersen = {};
      koersRes.data?.forEach(k => {
        if (!koersen[k.valuta]) koersen[k.valuta] = k.koers;
      });
      // Standaard fallback koersen
      if (!koersen['USD']) koersen['USD'] = 36.50;
      if (!koersen['EUR']) koersen['EUR'] = 39.00;
      koersen['SRD'] = 1;
      setWisselkoersen(koersen);
    } catch (err) { 
      toast.error('Kon data niet laden'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boekhouding/bankrekeningen', form);
      toast.success('Bankrekening toegevoegd');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Fout bij toevoegen'); 
    }
  };

  const handleTransactieSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boekhouding/transacties', transactieForm);
      toast.success('Transactie toegevoegd');
      setTransactieDialogOpen(false);
      resetTransactieForm();
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Fout bij toevoegen transactie'); 
    }
  };

  const handleOverboekingSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boekhouding/overboekingen', overboekingForm);
      toast.success('Overboeking succesvol uitgevoerd');
      setOverboekingDialogOpen(false);
      resetOverboekingForm();
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Fout bij overboeking'); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze rekening wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/bankrekeningen/${id}`);
      toast.success('Rekening verwijderd');
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Kan niet verwijderen'); 
    }
  };

  const handleDeleteTransactie = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze transactie wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/transacties/${id}`);
      toast.success('Transactie verwijderd');
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Kan niet verwijderen'); 
    }
  };

  const resetForm = () => {
    setForm({ naam: '', rekeningnummer: '', bank_naam: '', valuta: 'SRD', beginsaldo: 0 });
  };

  const resetTransactieForm = () => {
    setTransactieForm({
      rekening_id: selectedRekening?.id || '',
      datum: new Date().toISOString().split('T')[0],
      type: 'inkomst',
      bedrag: 0,
      valuta: selectedRekening?.valuta || 'SRD',
      omschrijving: '',
      categorie: 'overig',
      referentie: ''
    });
  };

  const openTransactieDialog = (rekening = null) => {
    setSelectedRekening(rekening);
    setTransactieForm({
      rekening_id: rekening?.id || '',
      datum: new Date().toISOString().split('T')[0],
      type: 'inkomst',
      bedrag: 0,
      valuta: rekening?.valuta || 'SRD',
      omschrijving: '',
      categorie: 'overig',
      referentie: ''
    });
    setTransactieDialogOpen(true);
  };

  // Calculate totals per currency
  const totaalPerValuta = rekeningen.reduce((acc, r) => { 
    acc[r.valuta] = (acc[r.valuta] || 0) + (r.huidig_saldo || 0); 
    return acc; 
  }, {});

  // Filter transacties
  const filteredTransacties = transacties.filter(t => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return t.omschrijving?.toLowerCase().includes(search) ||
           t.rekening_naam?.toLowerCase().includes(search) ||
           t.referentie?.toLowerCase().includes(search);
  });

  // Stats data
  const statsData = [
    { icon: Banknote, label: 'SRD Saldo', value: formatCurrency(totaalPerValuta['SRD'] || 0, 'SRD'), color: 'emerald' },
    { icon: DollarSign, label: 'USD Saldo', value: formatCurrency(totaalPerValuta['USD'] || 0, 'USD'), color: 'blue' },
    { icon: Euro, label: 'EUR Saldo', value: formatCurrency(totaalPerValuta['EUR'] || 0, 'EUR'), color: 'purple' },
    { icon: CreditCard, label: 'Rekeningen', value: rekeningen.length, color: 'slate' }
  ];

  // Header actions
  const headerActions = (
    <div className="flex gap-3">
      <Button 
        onClick={() => openTransactieDialog()}
        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        data-testid="nieuwe-transactie-btn"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" /> Transactie
      </Button>
      <Button 
        onClick={() => { resetForm(); setDialogOpen(true); }}
        className="bg-white text-emerald-600 hover:bg-emerald-50"
        data-testid="nieuwe-rekening-btn"
      >
        <Plus className="w-4 h-4 mr-2" /> Nieuwe Rekening
      </Button>
    </div>
  );

  return (
    <ModulePageLayout
      title="Bank & Kas"
      subtitle="Beheer uw bankrekeningen en transacties"
      actions={headerActions}
      loading={loading}
      loadingText="Rekeningen laden..."
      testId="bankrekeningen-page"
    >
      {/* Stats Cards */}
      <StatsGrid stats={statsData} columns={4} overlapping={true} />

      {/* Bankrekeningen Grid */}
      <ContentSection>
        <h2 className="text-lg font-semibold mb-4">Bankrekeningen</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rekeningen.map(r => {
            const ValutaIcon = getValutaIcon(r.valuta);
            return (
              <div 
                key={r.id} 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-5 hover:shadow-xl transition-shadow"
                data-testid={`rekening-${r.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{r.naam}</p>
                      <p className="text-sm text-muted-foreground">{r.bank_naam}</p>
                    </div>
                  </div>
                  <Badge className={`${
                    r.valuta === 'SRD' ? 'bg-emerald-100 text-emerald-700' :
                    r.valuta === 'USD' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {r.valuta}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-mono">{r.rekeningnummer}</span>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-muted-foreground">Saldo</span>
                  <div className="flex items-center gap-1">
                    <ValutaIcon className="w-4 h-4 text-muted-foreground" />
                    <span className={`text-xl font-bold ${(r.huidig_saldo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(r.huidig_saldo, r.valuta)}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => openTransactieDialog(r)}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" /> Transactie
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          {rekeningen.length === 0 && (
            <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Geen bankrekeningen</h3>
              <p className="text-muted-foreground mb-4">Voeg uw eerste bankrekening toe om te beginnen</p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" /> Rekening Toevoegen
              </Button>
            </div>
          )}
        </div>
      </ContentSection>

      {/* Transacties Overzicht */}
      <ContentSection className="pb-6">
        <PageCard 
          title="Recente Transacties"
          actions={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
          }
        >
          {filteredTransacties.length > 0 ? (
            <div className="space-y-2">
              {filteredTransacties.slice(0, 20).map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  data-testid={`transactie-${t.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      t.type === 'inkomst' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {t.type === 'inkomst' ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{t.omschrijving || 'Geen omschrijving'}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.rekening_naam} • {t.datum} {t.categorie && `• ${t.categorie}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${t.type === 'inkomst' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'inkomst' ? '+' : '-'}{formatCurrency(t.bedrag, t.valuta)}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteTransactie(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Geen transacties gevonden</p>
            </div>
          )}
        </PageCard>
      </ContentSection>

      {/* Nieuwe Rekening Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Bankrekening</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Naam *</Label>
              <Input 
                value={form.naam} 
                onChange={(e) => setForm({...form, naam: e.target.value})} 
                required 
                placeholder="Zakelijke rekening" 
              />
            </div>
            <div>
              <Label>Rekeningnummer *</Label>
              <Input 
                value={form.rekeningnummer} 
                onChange={(e) => setForm({...form, rekeningnummer: e.target.value})} 
                required 
                placeholder="NL00BANK0000000000" 
              />
            </div>
            <div>
              <Label>Bank *</Label>
              <Input 
                value={form.bank_naam} 
                onChange={(e) => setForm({...form, bank_naam: e.target.value})} 
                required 
                placeholder="DSB, Hakrinbank, Finabank, etc." 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valuta</Label>
                <Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Beginsaldo</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={form.beginsaldo} 
                  onChange={(e) => setForm({...form, beginsaldo: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Toevoegen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nieuwe Transactie Dialog */}
      <Dialog open={transactieDialogOpen} onOpenChange={setTransactieDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nieuwe Transactie
              {selectedRekening && <span className="text-muted-foreground text-sm font-normal ml-2">({selectedRekening.naam})</span>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransactieSubmit} className="space-y-4">
            {!selectedRekening && (
              <div>
                <Label>Rekening *</Label>
                <Select 
                  value={transactieForm.rekening_id} 
                  onValueChange={(v) => {
                    const rek = rekeningen.find(r => r.id === v);
                    setTransactieForm({...transactieForm, rekening_id: v, valuta: rek?.valuta || 'SRD'});
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
                  <SelectContent>
                    {rekeningen.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.naam} ({r.valuta})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select value={transactieForm.type} onValueChange={(v) => setTransactieForm({...transactieForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inkomst">Inkomst (Storting)</SelectItem>
                    <SelectItem value="uitgave">Uitgave (Opname)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Datum *</Label>
                <Input 
                  type="date" 
                  value={transactieForm.datum} 
                  onChange={(e) => setTransactieForm({...transactieForm, datum: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bedrag *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={transactieForm.bedrag} 
                  onChange={(e) => setTransactieForm({...transactieForm, bedrag: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>
              <div>
                <Label>Categorie</Label>
                <Select value={transactieForm.categorie} onValueChange={(v) => setTransactieForm({...transactieForm, categorie: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overig">Overig</SelectItem>
                    <SelectItem value="verkoop">Verkoop</SelectItem>
                    <SelectItem value="inkoop">Inkoop</SelectItem>
                    <SelectItem value="salaris">Salaris</SelectItem>
                    <SelectItem value="huur">Huur</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="belasting">Belasting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Omschrijving *</Label>
              <Input 
                value={transactieForm.omschrijving} 
                onChange={(e) => setTransactieForm({...transactieForm, omschrijving: e.target.value})} 
                required 
                placeholder="Omschrijving van de transactie" 
              />
            </div>
            <div>
              <Label>Referentie</Label>
              <Input 
                value={transactieForm.referentie} 
                onChange={(e) => setTransactieForm({...transactieForm, referentie: e.target.value})} 
                placeholder="Factuurnummer, kenmerk, etc." 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransactieDialogOpen(false)}>Annuleren</Button>
              <Button 
                type="submit" 
                className={transactieForm.type === 'inkomst' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {transactieForm.type === 'inkomst' ? 'Storting Registreren' : 'Uitgave Registreren'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
