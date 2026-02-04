import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Plus, Pencil, Trash2, Users, Search, UserPlus, Mail, Phone, MapPin, FileText } from 'lucide-react';
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

  // Calculate totals
  const totalDebiteuren = debiteuren.length;
  const totalOpenstaand = debiteuren.reduce((sum, d) => sum + (d.openstaand_bedrag || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Debiteuren laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="page-title-icon bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            Debiteuren
          </h1>
          <p className="page-subtitle">Beheer uw klanten en openstaande vorderingen</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Debiteur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                {editingId ? 'Debiteur Bewerken' : 'Nieuwe Debiteur'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input value={form.naam} onChange={(e) => setForm({...form, naam: e.target.value})} required placeholder="Bedrijfsnaam" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@voorbeeld.com" />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon</Label>
                  <Input value={form.telefoon} onChange={(e) => setForm({...form, telefoon: e.target.value})} placeholder="+597 ..." />
                </div>
                <div className="space-y-2">
                  <Label>BTW Nummer</Label>
                  <Input value={form.btw_nummer} onChange={(e) => setForm({...form, btw_nummer: e.target.value})} placeholder="BTW nummer" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Adres</Label>
                  <Input value={form.adres} onChange={(e) => setForm({...form, adres: e.target.value})} placeholder="Straat, stad" />
                </div>
                <div className="space-y-2">
                  <Label>Standaard Valuta</Label>
                  <Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">🇸🇷 SRD</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Betalingstermijn</Label>
                  <Select value={String(form.betalingstermijn)} onValueChange={(v) => setForm({...form, betalingstermijn: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dagen</SelectItem>
                      <SelectItem value="14">14 dagen</SelectItem>
                      <SelectItem value="30">30 dagen</SelectItem>
                      <SelectItem value="60">60 dagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input value={form.notities} onChange={(e) => setForm({...form, notities: e.target.value})} placeholder="Interne notities..." />
              </div>
              <Button type="submit" className="w-full btn-primary-gradient">
                {editingId ? 'Bijwerken' : 'Debiteur Aanmaken'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card stat-blue">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Totaal Debiteuren</p>
              <p className="stat-card-value">{totalDebiteuren}</p>
            </div>
            <div className="stat-card-icon">
              <Users />
            </div>
          </div>
        </div>
        <div className="stat-card stat-emerald">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Openstaand (SRD)</p>
              <p className="stat-card-value currency-value currency-srd">{formatCurrency(totalOpenstaand, 'SRD')}</p>
            </div>
            <div className="stat-card-icon">
              <FileText />
            </div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Met Openstaand</p>
              <p className="stat-card-value">{debiteuren.filter(d => d.openstaand_bedrag > 0).length}</p>
            </div>
            <div className="stat-card-icon">
              <Users />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-card">
        <div className="content-card-header">
          <h3 className="content-card-title">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Debiteurenlijst
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Zoeken..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </div>
        <div className="content-card-body p-0">
          <div className="table-scroll-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th className="hidden sm:table-cell">Contact</th>
                  <th className="hidden md:table-cell">Valuta</th>
                  <th className="hidden lg:table-cell">Termijn</th>
                  <th>Openstaand</th>
                  <th className="text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm sm:text-base">{d.naam?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{d.naam}</p>
                          {d.btw_nummer && <p className="text-xs text-muted-foreground hidden sm:block">BTW: {d.btw_nummer}</p>}
                          {/* Mobile: show contact info */}
                          <p className="text-xs text-muted-foreground sm:hidden truncate">{d.email || d.telefoon}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="space-y-1">
                      {d.email && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          {d.email}
                        </div>
                      )}
                      {d.telefoon && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {d.telefoon}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline" className={`
                      ${d.standaard_valuta === 'SRD' ? 'border-emerald-500/30 text-emerald-600' : ''}
                      ${d.standaard_valuta === 'USD' ? 'border-blue-500/30 text-blue-600' : ''}
                      ${d.standaard_valuta === 'EUR' ? 'border-purple-500/30 text-purple-600' : ''}
                    `}>
                      {d.standaard_valuta}
                    </Badge>
                  </td>
                  <td>
                    <span className="text-sm">{d.betalingstermijn} dagen</span>
                  </td>
                  <td>
                    {d.openstaand_bedrag > 0 ? (
                      <span className={`font-semibold currency-value currency-${(d.openstaand_valuta || 'srd').toLowerCase()}`}>
                        {formatCurrency(d.openstaand_bedrag, d.openstaand_valuta || d.standaard_valuta)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(d)} className="hover:bg-blue-500/10 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state py-12">
                      <div className="empty-state-icon">
                        <Users />
                      </div>
                      <p className="empty-state-title">Geen debiteuren gevonden</p>
                      <p className="empty-state-description">
                        {searchTerm ? 'Probeer een andere zoekterm' : 'Voeg uw eerste debiteur toe om te beginnen'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
