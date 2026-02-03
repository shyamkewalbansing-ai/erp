import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2, Plus, FileText, Trash2, Search, Send, DollarSign, Mail } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import SendInvoiceEmailDialog from '../../components/SendInvoiceEmailDialog';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;
const statusColors = { concept: 'bg-gray-100 text-gray-800', verstuurd: 'bg-blue-100 text-blue-800', betaald: 'bg-green-100 text-green-800', gedeeltelijk_betaald: 'bg-yellow-100 text-yellow-800', vervallen: 'bg-red-100 text-red-800' };
const statusLabels = { concept: 'Concept', verstuurd: 'Verstuurd', betaald: 'Betaald', gedeeltelijk_betaald: 'Gedeeltelijk', vervallen: 'Vervallen' };

export default function VerkoopfacturenPage() {
  const [facturen, setFacturen] = useState([]);
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedFactuur, setSelectedFactuur] = useState(null);
  const [selectedDebiteur, setSelectedDebiteur] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ debiteur_id: '', factuurdatum: new Date().toISOString().split('T')[0], valuta: 'SRD', regels: [{ omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }], opmerkingen: '' });
  const [payForm, setPayForm] = useState({ bedrag: 0, betaaldatum: new Date().toISOString().split('T')[0], betaalmethode: 'bank' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [facturenRes, debRes] = await Promise.all([api.get('/boekhouding/verkoopfacturen'), api.get('/boekhouding/debiteuren')]);
      setFacturen(facturenRes.data);
      setDebiteuren(debRes.data);
    } catch (err) { toast.error('Kon data niet laden'); } finally { setLoading(false); }
  };

  const addRegel = () => setForm({...form, regels: [...form.regels, { omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }]});
  const removeRegel = (i) => setForm({...form, regels: form.regels.filter((_, idx) => idx !== i)});
  const updateRegel = (i, field, value) => { const newRegels = [...form.regels]; newRegels[i][field] = value; setForm({...form, regels: newRegels}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.debiteur_id) { toast.error('Selecteer een debiteur'); return; }
    if (form.regels.length === 0 || !form.regels[0].omschrijving) { toast.error('Voeg minimaal 1 regel toe'); return; }
    try {
      await api.post('/boekhouding/verkoopfacturen', form);
      toast.success('Factuur aangemaakt');
      setDialogOpen(false);
      setForm({ debiteur_id: '', factuurdatum: new Date().toISOString().split('T')[0], valuta: 'SRD', regels: [{ omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }], opmerkingen: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Fout bij aanmaken'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/boekhouding/verkoopfacturen/${id}/status?status=${status}`);
      toast.success('Status bijgewerkt');
      loadData();
    } catch (err) { toast.error('Fout bij bijwerken status'); }
  };

  const openPayDialog = (f) => { setSelectedFactuur(f); setPayForm({ bedrag: f.totaal - f.betaald_bedrag, betaaldatum: new Date().toISOString().split('T')[0], betaalmethode: 'bank' }); setPayDialogOpen(true); };

  const openEmailDialog = (f) => {
    const debiteur = debiteuren.find(d => d.id === f.debiteur_id);
    setSelectedFactuur(f);
    setSelectedDebiteur(debiteur);
    setEmailDialogOpen(true);
  };

  const handlePay = async () => {
    try {
      await api.post(`/boekhouding/verkoopfacturen/${selectedFactuur.id}/betaling`, payForm);
      toast.success('Betaling geregistreerd');
      setPayDialogOpen(false);
      loadData();
    } catch (err) { toast.error('Fout bij registreren betaling'); }
  };

  const filtered = facturen.filter(f => f.factuurnummer?.toLowerCase().includes(searchTerm.toLowerCase()) || f.debiteur_naam?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Verkoopfacturen</h1><p className="text-muted-foreground">Facturen aan klanten</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Nieuwe Factuur</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nieuwe Verkoopfactuur</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Debiteur *</Label><Select value={form.debiteur_id} onValueChange={(v) => setForm({...form, debiteur_id: v})}><SelectTrigger><SelectValue placeholder="Selecteer..." /></SelectTrigger><SelectContent>{debiteuren.map(d => <SelectItem key={d.id} value={d.id}>{d.naam}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Datum *</Label><Input type="date" value={form.factuurdatum} onChange={(e) => setForm({...form, factuurdatum: e.target.value})} /></div>
                <div><Label>Valuta *</Label><Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Regels</Label>
                {form.regels.map((r, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                    <div className="col-span-2"><Input placeholder="Omschrijving" value={r.omschrijving} onChange={(e) => updateRegel(i, 'omschrijving', e.target.value)} /></div>
                    <div><Input type="number" placeholder="Aantal" value={r.aantal} onChange={(e) => updateRegel(i, 'aantal', parseFloat(e.target.value))} /></div>
                    <div><Input type="number" placeholder="Prijs" value={r.prijs_per_stuk} onChange={(e) => updateRegel(i, 'prijs_per_stuk', parseFloat(e.target.value))} /></div>
                    <div className="flex gap-1">
                      <Select value={r.btw_tarief} onValueChange={(v) => updateRegel(i, 'btw_tarief', v)}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">0%</SelectItem><SelectItem value="10">10%</SelectItem><SelectItem value="25">25%</SelectItem></SelectContent></Select>
                      {form.regels.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeRegel(i)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRegel}><Plus className="w-4 h-4 mr-1" />Regel</Button>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Factuur Aanmaken</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><div className="flex items-center gap-4"><Search className="w-5 h-5" /><Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" /></div></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nummer</TableHead><TableHead>Debiteur</TableHead><TableHead>Datum</TableHead><TableHead>Vervaldatum</TableHead><TableHead>Totaal</TableHead><TableHead>Betaald</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono">{f.factuurnummer}</TableCell>
                  <TableCell>{f.debiteur_naam}</TableCell>
                  <TableCell>{f.factuurdatum}</TableCell>
                  <TableCell>{f.vervaldatum}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(f.totaal, f.valuta)}</TableCell>
                  <TableCell>{formatCurrency(f.betaald_bedrag, f.valuta)}</TableCell>
                  <TableCell><Badge className={statusColors[f.status]}>{statusLabels[f.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {f.status === 'concept' && <Button size="sm" variant="ghost" onClick={() => updateStatus(f.id, 'verstuurd')} title="Markeer als verstuurd"><Send className="w-4 h-4" /></Button>}
                      {f.status !== 'concept' && <Button size="sm" variant="ghost" onClick={() => openEmailDialog(f)} title="Verstuur per email"><Mail className="w-4 h-4 text-blue-500" /></Button>}
                      {['verstuurd', 'gedeeltelijk_betaald'].includes(f.status) && <Button size="sm" variant="ghost" onClick={() => openPayDialog(f)} title="Betaling registreren"><DollarSign className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen facturen gevonden</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Betaling Registreren</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Factuur: {selectedFactuur?.factuurnummer} - Openstaand: {formatCurrency(selectedFactuur?.totaal - selectedFactuur?.betaald_bedrag, selectedFactuur?.valuta)}</p>
            <div><Label>Bedrag</Label><Input type="number" value={payForm.bedrag} onChange={(e) => setPayForm({...payForm, bedrag: parseFloat(e.target.value)})} /></div>
            <div><Label>Datum</Label><Input type="date" value={payForm.betaaldatum} onChange={(e) => setPayForm({...payForm, betaaldatum: e.target.value})} /></div>
            <div><Label>Methode</Label><Select value={payForm.betaalmethode} onValueChange={(v) => setPayForm({...payForm, betaalmethode: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank">Bank</SelectItem><SelectItem value="kas">Kas</SelectItem><SelectItem value="pin">PIN</SelectItem></SelectContent></Select></div>
            <Button onClick={handlePay} className="w-full bg-emerald-600">Betaling Registreren</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
