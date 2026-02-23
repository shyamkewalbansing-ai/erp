import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { 
  Loader2, Plus, Pencil, Trash2, Users, Search, UserPlus, 
  Mail, Phone, MapPin, FileText, Calendar, TrendingUp,
  DollarSign, Building2
} from 'lucide-react';
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
      toast.error(err.response?.data?.detail || 'Er ging iets mis');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet u zeker dat u deze debiteur wilt verwijderen?')) return;
    try {
      await api.delete(`/boekhouding/debiteuren/${id}`);
      toast.success('Debiteur verwijderd');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Kon debiteur niet verwijderen');
    }
  };

  const openEdit = (debiteur) => {
    setForm({
      naam: debiteur.naam || '',
      email: debiteur.email || '',
      telefoon: debiteur.telefoon || '',
      adres: debiteur.adres || '',
      btw_nummer: debiteur.btw_nummer || '',
      standaard_valuta: debiteur.standaard_valuta || 'SRD',
      betalingstermijn: debiteur.betalingstermijn || 30,
      notities: debiteur.notities || ''
    });
    setEditingId(debiteur.id);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({ naam: '', email: '', telefoon: '', adres: '', btw_nummer: '', standaard_valuta: 'SRD', betalingstermijn: 30, notities: '' });
    setEditingId(null);
  };

  const filteredDebiteuren = debiteuren.filter(d =>
    d.naam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.debiteur_nummer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalOpenstaand = debiteuren.reduce((sum, d) => sum + (d.openstaand_bedrag || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Debiteuren laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="debiteuren-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Boekhouding</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Debiteuren</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw klanten en openstaande vorderingen</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Debiteur
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{debiteuren.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Openstaand</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{formatCurrency(totalOpenstaand)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Facturen</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{debiteuren.reduce((s, d) => s + (d.facturen_count || 0), 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Gem. Termijn</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">30d</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam, email of nummer..."
          className="pl-10 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Debiteuren List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        {filteredDebiteuren.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen debiteuren gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Voeg uw eerste debiteur toe</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Debiteur
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDebiteuren.map((debiteur) => (
              <div key={debiteur.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base">{debiteur.naam}</p>
                      {debiteur.debiteur_nummer && (
                        <Badge variant="outline" className="text-xs">{debiteur.debiteur_nummer}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                      {debiteur.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {debiteur.email}
                        </span>
                      )}
                      {debiteur.telefoon && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {debiteur.telefoon}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Openstaand</p>
                    <p className={`font-bold text-base sm:text-lg ${(debiteur.openstaand_bedrag || 0) > 0 ? 'text-emerald-600' : ''}`}>
                      {formatCurrency(debiteur.openstaand_bedrag || 0, debiteur.standaard_valuta)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(debiteur)} className="rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(debiteur.id)} className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingId ? 'Debiteur Bewerken' : 'Nieuwe Debiteur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Naam *</Label>
              <Input 
                value={form.naam} 
                onChange={(e) => setForm({...form, naam: e.target.value})} 
                required 
                className="rounded-lg"
                placeholder="Bedrijfsnaam of naam"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})} 
                  className="rounded-lg"
                  placeholder="email@voorbeeld.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Telefoon</Label>
                <Input 
                  value={form.telefoon} 
                  onChange={(e) => setForm({...form, telefoon: e.target.value})} 
                  className="rounded-lg"
                  placeholder="+597 xxx xxxx"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Adres</Label>
              <Input 
                value={form.adres} 
                onChange={(e) => setForm({...form, adres: e.target.value})} 
                className="rounded-lg"
                placeholder="Straat, Stad"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">BTW Nummer</Label>
                <Input 
                  value={form.btw_nummer} 
                  onChange={(e) => setForm({...form, btw_nummer: e.target.value})} 
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Valuta</Label>
                <Select value={form.standaard_valuta} onValueChange={(v) => setForm({...form, standaard_valuta: v})}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Betalingstermijn (dagen)</Label>
              <Input 
                type="number" 
                value={form.betalingstermijn} 
                onChange={(e) => setForm({...form, betalingstermijn: parseInt(e.target.value) || 30})} 
                className="rounded-lg"
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">
                Annuleren
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 rounded-lg">
                {editingId ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
