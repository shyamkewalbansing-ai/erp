import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Plus, ShoppingCart, ArrowRight, Trash2, Search, Loader2,
  Building2, Clock, CheckCircle, FileText, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  bevestigd: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  gedeeltelijk_ontvangen: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  volledig_ontvangen: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  geannuleerd: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
};

export default function InkoopOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [leveranciers, setLeveranciers] = useState([]);
  const [artikelen, setArtikelen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    leverancier_id: '',
    valuta: 'SRD',
    orderdatum: new Date().toISOString().split('T')[0],
    regels: [{ artikel_id: '', omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '10' }]
  });

  useEffect(() => {
    fetchOrders();
    fetchLeveranciers();
    fetchArtikelen();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeveranciers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/crediteuren`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeveranciers(data);
      }
    } catch (error) {
      console.error('Fout bij ophalen crediteuren');
    }
  };

  const fetchArtikelen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/artikelen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArtikelen(data);
      }
    } catch (error) {
      console.error('Fout bij ophalen artikelen');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/orders/${id}/status?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Status bijgewerkt');
        fetchOrders();
      }
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  const createFactuur = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/orders/${id}/naar-factuur`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Inkoopfactuur aangemaakt');
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij aanmaken factuur');
      }
    } catch (error) {
      toast.error('Fout bij aanmaken factuur');
    }
  };

  const handleSubmit = async () => {
    if (!form.leverancier_id) {
      toast.error('Selecteer een crediteur');
      return;
    }
    if (form.regels.length === 0 || !form.regels[0].omschrijving) {
      toast.error('Voeg minimaal één regel toe');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/orders`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Inkooporder aangemaakt');
        setDialogOpen(false);
        resetForm();
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij aanmaken order');
      }
    } catch (error) {
      toast.error('Fout bij aanmaken order');
    }
  };

  const resetForm = () => {
    setForm({
      leverancier_id: '',
      valuta: 'SRD',
      orderdatum: new Date().toISOString().split('T')[0],
      regels: [{ artikel_id: '', omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '10' }]
    });
  };

  const addRegel = () => {
    setForm({
      ...form,
      regels: [...form.regels, { artikel_id: '', omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '10' }]
    });
  };

  const removeRegel = (index) => {
    const newRegels = form.regels.filter((_, i) => i !== index);
    setForm({ ...form, regels: newRegels });
  };

  const updateRegel = (index, field, value) => {
    const newRegels = [...form.regels];
    newRegels[index][field] = value;
    
    if (field === 'artikel_id' && value) {
      const artikel = artikelen.find(a => a.id === value);
      if (artikel) {
        newRegels[index].omschrijving = artikel.naam;
        newRegels[index].prijs_per_stuk = artikel.inkoopprijs || 0;
      }
    }
    
    setForm({ ...form, regels: newRegels });
  };

  const calculateTotal = () => {
    return form.regels.reduce((sum, regel) => {
      const subtotal = regel.aantal * regel.prijs_per_stuk;
      const btw = subtotal * (parseInt(regel.btw_tarief) / 100);
      return sum + subtotal + btw;
    }, 0);
  };

  const filteredOrders = orders.filter(order =>
    order.ordernummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.leverancier_naam?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totaal: orders.length,
    concept: orders.filter(o => o.status === 'concept').length,
    bevestigd: orders.filter(o => o.status === 'bevestigd').length,
    ontvangen: orders.filter(o => o.status === 'volledig_ontvangen').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Orders laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="inkoop-orders-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Inkoop Module</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Inkooporders</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw inkooporders bij crediteuren</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-inkoop-order-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Concept</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.concept}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Bevestigd</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.bevestigd}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Ontvangen</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.ontvangen}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op ordernummer of crediteur..."
          className="pl-10 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Orders List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen inkooporders gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Maak uw eerste inkooporder aan</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Order
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{order.ordernummer}</p>
                    <p className="text-sm text-muted-foreground truncate">{order.leverancier_naam}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{order.orderdatum}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-base sm:text-lg">{order.valuta} {order.totaal?.toLocaleString()}</p>
                    <Badge className={`${statusColors[order.status]} text-xs`}>
                      {order.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {order.status === 'concept' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'bevestigd')} className="flex-1 sm:flex-none text-xs sm:text-sm">
                        Bevestigen
                      </Button>
                    )}
                    {(order.status === 'gedeeltelijk_ontvangen' || order.status === 'volledig_ontvangen') && !order.factuur_id && (
                      <Button size="sm" onClick={() => createFactuur(order.id)} className="flex-1 sm:flex-none bg-purple-500 hover:bg-purple-600 text-xs sm:text-sm">
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Factuur
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Nieuwe Inkooporder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Crediteur *</Label>
                <Select value={form.leverancier_id} onValueChange={(v) => setForm({...form, leverancier_id: v})}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Selecteer crediteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {leveranciers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.naam} {l.crediteur_nummer ? `(${l.crediteur_nummer})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Valuta</Label>
                <Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}>
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

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Orderregels</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRegel} className="rounded-lg">
                  <Plus className="h-4 w-4 mr-1" /> Regel
                </Button>
              </div>
              
              {form.regels.map((regel, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 sm:p-4 border rounded-xl bg-muted/30">
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Artikel</Label>
                    <Select 
                      value={regel.artikel_id} 
                      onValueChange={(v) => updateRegel(index, 'artikel_id', v)}
                    >
                      <SelectTrigger className="rounded-lg mt-1">
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {artikelen.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.naam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Omschrijving *</Label>
                    <Input 
                      value={regel.omschrijving} 
                      onChange={(e) => updateRegel(index, 'omschrijving', e.target.value)}
                      placeholder="Omschrijving"
                      className="rounded-lg mt-1"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Aantal</Label>
                    <Input 
                      type="number" 
                      value={regel.aantal} 
                      onChange={(e) => updateRegel(index, 'aantal', parseInt(e.target.value) || 1)}
                      min="1"
                      className="rounded-lg mt-1"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Prijs</Label>
                    <Input 
                      type="number" 
                      value={regel.prijs_per_stuk} 
                      onChange={(e) => updateRegel(index, 'prijs_per_stuk', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="rounded-lg mt-1"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">BTW</Label>
                    <Select 
                      value={regel.btw_tarief} 
                      onValueChange={(v) => updateRegel(index, 'btw_tarief', v)}
                    >
                      <SelectTrigger className="rounded-lg mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeRegel(index)}
                      disabled={form.regels.length === 1}
                      className="rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Totaal (incl. BTW)</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{form.valuta} {calculateTotal().toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">Annuleren</Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 rounded-lg">Order Aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
