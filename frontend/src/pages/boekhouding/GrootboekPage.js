import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, Plus, Calculator, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;

const typeLabels = { activa: 'Activa', passiva: 'Passiva', eigen_vermogen: 'Eigen Vermogen', opbrengsten: 'Opbrengsten', kosten: 'Kosten' };
const typeColors = { activa: 'bg-blue-100 text-blue-800', passiva: 'bg-red-100 text-red-800', eigen_vermogen: 'bg-purple-100 text-purple-800', opbrengsten: 'bg-green-100 text-green-800', kosten: 'bg-orange-100 text-orange-800' };

export default function GrootboekPage() {
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ code: '', naam: '', type: 'activa', beschrijving: '', standaard_valuta: 'SRD' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/boekhouding/rekeningen');
      setRekeningen(res.data);
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

  const filtered = filterType === 'all' ? rekeningen : rekeningen.filter(r => r.type === filterType);
  const grouped = filtered.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6" />Grootboek</h1><p className="text-muted-foreground">Rekeningschema en saldi</p></div>
        <div className="flex gap-2">
          {rekeningen.length === 0 && (<Button variant="outline" onClick={handleInitStandaard}><Wand2 className="w-4 h-4 mr-2" />Standaard Schema</Button>)}
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

      <div className="flex gap-2">
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
      {rekeningen.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground"><Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Geen rekeningen gevonden.</p><p className="text-sm mt-2">Klik op "Standaard Schema" om het Surinaams rekeningschema aan te maken.</p></CardContent></Card>}
    </div>
  );
}
