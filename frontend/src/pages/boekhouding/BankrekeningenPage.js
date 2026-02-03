import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Loader2, Plus, Wallet, Building, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;
const valutaIcons = { SRD: '🇸🇷', USD: '🇺🇸', EUR: '🇪🇺' };

export default function BankrekeningenPage() {
  const [rekeningen, setRekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ naam: '', rekeningnummer: '', bank_naam: '', valuta: 'SRD', beginsaldo: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/boekhouding/bankrekeningen');
      setRekeningen(res.data);
    } catch (err) { toast.error('Kon bankrekeningen niet laden'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boekhouding/bankrekeningen', form);
      toast.success('Bankrekening toegevoegd');
      setDialogOpen(false);
      setForm({ naam: '', rekeningnummer: '', bank_naam: '', valuta: 'SRD', beginsaldo: 0 });
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Fout bij toevoegen'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet u zeker dat u deze rekening wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/bankrekeningen/${id}`);
      toast.success('Rekening verwijderd');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Kan niet verwijderen'); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const totaalPerValuta = rekeningen.reduce((acc, r) => { acc[r.valuta] = (acc[r.valuta] || 0) + r.huidig_saldo; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" />Bankrekeningen</h1><p className="text-muted-foreground">Beheer uw bankrekeningen</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Nieuwe Rekening</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuwe Bankrekening</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Naam *</Label><Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} required placeholder="Zakelijke rekening" /></div>
              <div><Label>Rekeningnummer *</Label><Input value={form.rekeningnummer} onChange={(e) => setForm({...form, rekeningnummer: e.target.value})} required placeholder="NL00BANK0000000000" /></div>
              <div><Label>Bank *</Label><Input value={form.bank_naam} onChange={(e) => setForm({...form, bank_naam: e.target.value})} required placeholder="DSB, Hakrinbank, etc." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valuta</Label><Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
                <div><Label>Beginsaldo</Label><Input type="number" value={form.beginsaldo} onChange={(e) => setForm({...form, beginsaldo: parseFloat(e.target.value)})} /></div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Toevoegen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Totalen per valuta */}
      <div className="grid grid-cols-3 gap-4">
        {['SRD', 'USD', 'EUR'].map(valuta => (
          <Card key={valuta} className={totaalPerValuta[valuta] > 0 ? 'bg-emerald-50' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl">{valutaIcons[valuta]}</span>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{valuta}</p>
                  <p className="text-xl font-bold">{formatCurrency(totaalPerValuta[valuta] || 0, valuta)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rekeningen lijst */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rekeningen.map(r => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Building className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="font-semibold">{r.naam}</p><p className="text-sm text-muted-foreground">{r.bank_naam}</p></div>
                </div>
                <Badge>{r.valuta}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><CreditCard className="w-4 h-4" />{r.rekeningnummer}</div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm">Saldo</span>
                <span className={`text-xl font-bold ${r.huidig_saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.huidig_saldo, r.valuta)}</span>
              </div>
              <Button size="sm" variant="ghost" className="mt-2 w-full text-red-500 hover:text-red-700" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 mr-1" />Verwijderen</Button>
            </CardContent>
          </Card>
        ))}
        {rekeningen.length === 0 && <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground"><Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Nog geen bankrekeningen toegevoegd</p></CardContent></Card>}
      </div>
    </div>
  );
}
