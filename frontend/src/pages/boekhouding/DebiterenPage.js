import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  return `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

export default function DebiterenPage() {
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    naam: '', email: '', telefoon: '', adres: '', btw_nummer: '',
    standaard_valuta: 'SRD', betalingstermijn: 30, notities: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/boekhouding/debiteuren');
      setDebiteuren(res.data);
    } catch (err) {
      toast.error('Kon debiteuren niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/boekhouding/debiteuren/${editingId}`, form);
        toast.success('Debiteur bijgewerkt');
      } else {
        await api.post('/boekhouding/debiteuren', form);
        toast.success('Debiteur aangemaakt');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEdit = (d) => {
    setForm(d);
    setEditingId(d.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet u zeker dat u deze debiteur wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/debiteuren/${id}`);
      toast.success('Debiteur verwijderd');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kan niet verwijderen');
    }
  };

  const resetForm = () => {
    setForm({ naam: '', email: '', telefoon: '', adres: '', btw_nummer: '', standaard_valuta: 'SRD', betalingstermijn: 30, notities: '' });
    setEditingId(null);
  };

  const filtered = debiteuren.filter(d => 
    d.naam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />Debiteuren</h1>
          <p className="text-muted-foreground">Beheer uw klanten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Nieuwe Debiteur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? 'Debiteur Bewerken' : 'Nieuwe Debiteur'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Naam *</Label><Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} required /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Telefoon</Label><Input value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} /></div>
                <div><Label>BTW Nummer</Label><Input value={form.btw_nummer} onChange={(e) => setForm({...form, btw_nummer: e.target.value})} /></div>
                <div className="col-span-2"><Label>Adres</Label><Input value={form.adres} onChange={(e) => setForm({...form, adres: e.target.value})} /></div>
                <div><Label>Standaard Valuta</Label>
                  <Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Betalingstermijn (dagen)</Label><Input type="number" value={form.betalingstermijn} onChange={(e) => setForm({...form, betalingstermijn: parseInt(e.target.value)})} /></div>
              </div>
              <div><Label>Notities</Label><Input value={form.notities} onChange={(e) => setForm({...form, notities: e.target.value})} /></div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">{editingId ? 'Bijwerken' : 'Aanmaken'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead>Valuta</TableHead>
                <TableHead>Openstaand</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.naam}</TableCell>
                  <TableCell>{d.email}</TableCell>
                  <TableCell>{d.telefoon}</TableCell>
                  <TableCell>{d.standaard_valuta}</TableCell>
                  <TableCell className={d.openstaand_bedrag > 0 ? 'text-orange-600 font-semibold' : ''}>
                    {formatCurrency(d.openstaand_bedrag, d.openstaand_valuta)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Geen debiteuren gevonden</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
