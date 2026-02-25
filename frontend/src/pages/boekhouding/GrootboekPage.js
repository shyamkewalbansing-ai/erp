import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, Plus, Calculator, Wand2, Settings, Link, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;

const typeLabels = { activa: 'Activa', passiva: 'Passiva', eigen_vermogen: 'Eigen Vermogen', opbrengsten: 'Opbrengsten', kosten: 'Kosten' };
const typeColors = { activa: 'bg-blue-100 text-blue-800', passiva: 'bg-red-100 text-red-800', eigen_vermogen: 'bg-purple-100 text-purple-800', opbrengsten: 'bg-green-100 text-green-800', kosten: 'bg-orange-100 text-orange-800' };

// Systeemfuncties die gekoppeld moeten worden aan grootboekrekeningen
const systeemFuncties = [
  { key: 'kas', label: 'Kas', beschrijving: 'Contant geld', standaard_code: '1000', type: 'activa' },
  { key: 'bank_srd', label: 'Bank SRD', beschrijving: 'Bankrekening in SRD', standaard_code: '1100', type: 'activa' },
  { key: 'bank_usd', label: 'Bank USD', beschrijving: 'Bankrekening in USD', standaard_code: '1110', type: 'activa' },
  { key: 'bank_eur', label: 'Bank EUR', beschrijving: 'Bankrekening in EUR', standaard_code: '1120', type: 'activa' },
  { key: 'debiteuren', label: 'Debiteuren', beschrijving: 'Vorderingen op klanten', standaard_code: '1300', type: 'activa' },
  { key: 'voorraad', label: 'Voorraad', beschrijving: 'Handelsgoederen', standaard_code: '1400', type: 'activa' },
  { key: 'crediteuren', label: 'Crediteuren', beschrijving: 'Schulden aan leveranciers', standaard_code: '1600', type: 'passiva' },
  { key: 'btw_af', label: 'BTW Afdracht', beschrijving: 'Te betalen BTW', standaard_code: '1700', type: 'passiva' },
  { key: 'btw_voorhef', label: 'BTW Voorheffing', beschrijving: 'Te vorderen BTW', standaard_code: '1710', type: 'activa' },
  { key: 'kapitaal', label: 'Kapitaal', beschrijving: 'Eigen vermogen', standaard_code: '2000', type: 'eigen_vermogen' },
  { key: 'omzet', label: 'Omzet', beschrijving: 'Verkoopopbrengsten', standaard_code: '8000', type: 'opbrengsten' },
  { key: 'inkoop', label: 'Inkoopwaarde', beschrijving: 'Kosten van inkoop', standaard_code: '7000', type: 'kosten' },
  { key: 'afschrijving', label: 'Afschrijvingen', beschrijving: 'Afschrijvingskosten', standaard_code: '6100', type: 'kosten' },
  { key: 'personeelskosten', label: 'Personeelskosten', beschrijving: 'Lonen en salarissen', standaard_code: '6200', type: 'kosten' },
  { key: 'huisvestingskosten', label: 'Huisvestingskosten', beschrijving: 'Huur en onderhoud', standaard_code: '6300', type: 'kosten' },
  { key: 'algemene_kosten', label: 'Algemene Kosten', beschrijving: 'Overige bedrijfskosten', standaard_code: '6400', type: 'kosten' },
];

export default function GrootboekPage() {
  const [rekeningen, setRekeningen] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ code: '', naam: '', type: 'activa', beschrijving: '', standaard_valuta: 'SRD' });
  const [tempMapping, setTempMapping] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rekeningenRes, mappingRes] = await Promise.all([
        api.get('/boekhouding/rekeningen'),
        api.get('/boekhouding/rekeningen/mapping').catch(() => ({ data: {} }))
      ]);
      setRekeningen(rekeningenRes.data);
      setMapping(mappingRes.data || {});
      setTempMapping(mappingRes.data || {});
    } catch (err) {
      toast.error('Kon rekeningen niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleInitStandaard = async () => {
    if (!confirm('Dit maakt het standaard Surinaams rekeningschema aan. Wilt u doorgaan?')) return;
    try {
      await api.post('/boekhouding/rekeningen/init-standaard');
      toast.success('Standaard rekeningschema aangemaakt!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kon rekeningschema niet aanmaken');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boekhouding/rekeningen', form);
      toast.success('Rekening aangemaakt');
      setDialogOpen(false);
      setForm({ code: '', naam: '', type: 'activa', beschrijving: '', standaard_valuta: 'SRD' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij aanmaken');
    }
  };

  const handleSaveMapping = async () => {
    try {
      await api.post('/boekhouding/rekeningen/mapping', tempMapping);
      setMapping(tempMapping);
      toast.success('Koppelingen opgeslagen');
      setMappingDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan koppelingen');
    }
  };

  const getMappedCode = (functieKey) => {
    return mapping[functieKey] || systeemFuncties.find(f => f.key === functieKey)?.standaard_code || '';
  };

  const getRekeningenForType = (type) => {
    return rekeningen.filter(r => r.type === type);
  };

  const filtered = filterType === 'all' ? rekeningen : rekeningen.filter(r => r.type === filterType);
  const grouped = filtered.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});

  // Bereken hoeveel koppelingen ontbreken
  const ontbrekendeKoppelingen = systeemFuncties.filter(f => {
    const mappedCode = mapping[f.key];
    if (!mappedCode) return true;
    return !rekeningen.some(r => r.code === mappedCode);
  }).length;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6" />Grootboek</h1><p className="text-muted-foreground">Rekeningschema en saldi</p></div>
        <div className="flex flex-wrap gap-2">
          {rekeningen.length === 0 && (<Button variant="outline" onClick={handleInitStandaard}><Wand2 className="w-4 h-4 mr-2" />Standaard Schema</Button>)}
          
          {/* Mapping Button */}
          <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="relative">
                <Link className="w-4 h-4 mr-2" />Koppelingen
                {ontbrekendeKoppelingen > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-1.5">
                    {ontbrekendeKoppelingen}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Grootboekkoppelingen
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Koppel uw eigen grootboekcodes aan systeemfuncties. Dit zorgt ervoor dat automatische boekingen (facturen, betalingen, etc.) naar de juiste rekeningen gaan.
                </p>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {Object.entries(typeLabels).map(([type, typeLabel]) => {
                  const functiesVoorType = systeemFuncties.filter(f => f.type === type);
                  if (functiesVoorType.length === 0) return null;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Badge className={typeColors[type]}>{typeLabel}</Badge>
                      </h4>
                      <div className="grid gap-2">
                        {functiesVoorType.map((functie) => {
                          const currentCode = tempMapping[functie.key] || '';
                          const isValid = rekeningen.some(r => r.code === currentCode);
                          
                          return (
                            <div key={functie.key} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{functie.label}</p>
                                <p className="text-xs text-muted-foreground truncate">{functie.beschrijving}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={currentCode} 
                                  onValueChange={(v) => setTempMapping({...tempMapping, [functie.key]: v})}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder={`Standaard: ${functie.standaard_code}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getRekeningenForType(type).sort((a, b) => a.code.localeCompare(b.code)).map((r) => (
                                      <SelectItem key={r.id} value={r.code}>
                                        {r.code} - {r.naam}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {currentCode && isValid ? (
                                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : currentCode ? (
                                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Annuleren</Button>
                <Button onClick={handleSaveMapping} className="bg-emerald-600 hover:bg-emerald-700">
                  <Check className="w-4 h-4 mr-2" />Opslaan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Nieuwe Rekening</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe Rekening</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} required placeholder="1000" /></div>
                  <div><Label>Naam *</Label><Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} required /></div>
                  <div><Label>Type *</Label><Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Valuta</Label><Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label>Beschrijving</Label><Input value={form.beschrijving} onChange={(e) => setForm({...form, beschrijving: e.target.value})} /></div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Aanmaken</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Waarschuwing voor ontbrekende koppelingen */}
      {ontbrekendeKoppelingen > 0 && rekeningen.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">
              {ontbrekendeKoppelingen} systeemfunctie(s) niet gekoppeld
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Klik op "Koppelingen" om uw eigen grootboekcodes te koppelen aan systeemfuncties zoals kas, bank, debiteuren, etc.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={filterType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('all')}>Alle</Button>
        {Object.entries(typeLabels).map(([k, v]) => <Button key={k} variant={filterType === k ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(k)}>{v}</Button>)}
      </div>

      {Object.entries(grouped).map(([type, items]) => (
        <Card key={type}>
          <CardHeader className="pb-2"><CardTitle className="text-lg">{typeLabels[type]}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead className="w-24">Code</TableHead><TableHead>Naam</TableHead><TableHead>Beschrijving</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.sort((a, b) => a.code.localeCompare(b.code)).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.code}</Badge></TableCell>
                    <TableCell className="font-medium">{r.naam}</TableCell>
                    <TableCell className="text-muted-foreground">{r.beschrijving}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.saldo, r.saldo_valuta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {rekeningen.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground"><Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Geen rekeningen gevonden.</p><p className="text-sm mt-2">Klik op &quot;Standaard Schema&quot; om het Surinaams rekeningschema aan te maken.</p></CardContent></Card>}
    </div>
  );
}
