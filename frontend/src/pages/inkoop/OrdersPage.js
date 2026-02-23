import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, ShoppingCart, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-gray-100 text-gray-800',
  bevestigd: 'bg-blue-100 text-blue-800',
  gedeeltelijk_ontvangen: 'bg-yellow-100 text-yellow-800',
  volledig_ontvangen: 'bg-green-100 text-green-800',
  geannuleerd: 'bg-red-100 text-red-800'
};

export default function InkoopOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [leveranciers, setLeveranciers] = useState([]);
  const [artikelen, setArtikelen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      const res = await fetch(`${API_URL}/api/inkoop/leveranciers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeveranciers(data);
      }
    } catch (error) {
      console.error('Fout bij ophalen leveranciers');
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
      toast.error('Selecteer een leverancier');
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
      regels: [{ artikel_id: '', omschrijving: '', aantal: 1, prijs: 0, btw_percentage: 10 }]
    });
  };

  const addRegel = () => {
    setForm({
      ...form,
      regels: [...form.regels, { artikel_id: '', omschrijving: '', aantal: 1, prijs: 0, btw_percentage: 10 }]
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
        newRegels[index].prijs = artikel.inkoopprijs || 0;
      }
    }
    
    setForm({ ...form, regels: newRegels });
  };

  const calculateTotal = () => {
    return form.regels.reduce((sum, regel) => {
      const subtotal = regel.aantal * regel.prijs;
      const btw = subtotal * (regel.btw_percentage / 100);
      return sum + subtotal + btw;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inkooporders</h1>
          <p className="text-muted-foreground">Beheer uw inkooporders</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="nieuwe-inkoop-order-btn">
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Order
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen inkooporders gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{order.ordernummer}</p>
                      <p className="text-sm text-muted-foreground">{order.leverancier_naam}</p>
                      <p className="text-xs text-muted-foreground">Datum: {order.orderdatum}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{order.valuta} {order.totaal?.toLocaleString()}</p>
                      <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                        {order.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'concept' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'bevestigd')}>
                          Bevestigen
                        </Button>
                      )}
                      {(order.status === 'gedeeltelijk_ontvangen' || order.status === 'volledig_ontvangen') && !order.factuur_id && (
                        <Button size="sm" onClick={() => createFactuur(order.id)}>
                          <ArrowRight className="mr-1 h-4 w-4" /> Factuur
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nieuwe Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Inkooporder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leverancier *</Label>
                <Select value={form.leverancier_id} onValueChange={(v) => setForm({...form, leverancier_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer leverancier" />
                  </SelectTrigger>
                  <SelectContent>
                    {leveranciers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.naam} ({l.leveranciersnummer})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}>
                  <SelectTrigger>
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
              <div className="flex justify-between items-center">
                <Label>Orderregels</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRegel}>
                  <Plus className="h-4 w-4 mr-1" /> Regel
                </Button>
              </div>
              
              {form.regels.map((regel, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30">
                  <div className="col-span-3">
                    <Label className="text-xs">Artikel</Label>
                    <Select 
                      value={regel.artikel_id} 
                      onValueChange={(v) => updateRegel(index, 'artikel_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {artikelen.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.naam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Omschrijving *</Label>
                    <Input 
                      value={regel.omschrijving} 
                      onChange={(e) => updateRegel(index, 'omschrijving', e.target.value)}
                      placeholder="Omschrijving"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Aantal</Label>
                    <Input 
                      type="number" 
                      value={regel.aantal} 
                      onChange={(e) => updateRegel(index, 'aantal', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Prijs</Label>
                    <Input 
                      type="number" 
                      value={regel.prijs} 
                      onChange={(e) => updateRegel(index, 'prijs', parseFloat(e.target.value) || 0)}
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">BTW %</Label>
                    <Select 
                      value={regel.btw_percentage.toString()} 
                      onValueChange={(v) => updateRegel(index, 'btw_percentage', parseInt(v))}
                    >
                      <SelectTrigger>
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
                <p className="text-2xl font-bold">{form.valuta} {calculateTotal().toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit}>Order Aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
