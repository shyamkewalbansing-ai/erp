import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;

export default function CrediterenPage() {
  const [crediteuren, setCrediteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', adres: '', btw_nummer: '', standaard_valuta: 'SRD', betalingstermijn: 30, notities: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/boekhouding/crediteuren');
      setCrediteuren(res.data);
    } catch (err) {
      toast.error('Kon crediteuren niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/boekhouding/crediteuren/${editingId}`, form);
        toast.success('Crediteur bijgewerkt');
      } else {
        await api.post('/boekhouding/crediteuren', form);
        toast.success('Crediteur aangemaakt');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEdit = (c) => { setForm(c); setEditingId(c.id); setDialogOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Weet u zeker dat u deze crediteur wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/crediteuren/${id}`);
      toast.success('Crediteur verwijderd');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kan niet verwijderen');
    }
  };

  const resetForm = () => { setForm({ naam: '', email: '', telefoon: '', adres: '', btw_nummer: '', standaard_valuta: 'SRD', betalingstermijn: 30, notities: '' }); setEditingId(null); };

  const filtered = crediteuren.filter(c => c.naam?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" />Crediteuren</h1><p className="text-muted-foreground">Beheer uw leveranciers</p></div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Nieuwe Crediteur</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? 'Crediteur Bewerken' : 'Nieuwe Crediteur'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Naam *</Label><Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} required /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Telefoon</Label><Input value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} /></div>
                <div><Label>BTW Nummer</Label><Input value={form.btw_nummer} onChange={(e) => setForm({...form, btw_nummer: e.target.value})} /></div>
                <div className="col-span-2"><Label>Adres</Label><Input value={form.adres} onChange={(e) => setForm({...form, adres: e.target.value})} /></div>
                <div><Label>Standaard Valuta</Label><Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
                <div><Label>Betalingstermijn (dagen)</Label><Input type="number" value={form.betalingstermijn} onChange={(e) => setForm({...form, betalingstermijn: parseInt(e.target.value)})} /></div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">{editingId ? 'Bijwerken' : 'Aanmaken'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader className="pb-3"><div className="flex items-center gap-4"><Search className="w-5 h-5 text-muted-foreground" /><Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" /></div></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Naam</TableHead><TableHead>Email</TableHead><TableHead>Telefoon</TableHead><TableHead>Valuta</TableHead><TableHead>Openstaand</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.naam}</TableCell><TableCell>{c.email}</TableCell><TableCell>{c.telefoon}</TableCell><TableCell>{c.standaard_valuta}</TableCell><TableCell className={c.openstaand_bedrag > 0 ? 'text-red-600 font-semibold' : ''}>{formatCurrency(c.openstaand_bedrag, c.openstaand_valuta)}</TableCell><TableCell><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Geen crediteuren gevonden</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
