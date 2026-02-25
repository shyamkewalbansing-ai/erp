import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, Search, Download, DollarSign, Clock, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-gray-100 text-gray-800',
  ontvangen: 'bg-blue-100 text-blue-800',
  open: 'bg-blue-100 text-blue-800',
  gedeeltelijk_betaald: 'bg-yellow-100 text-yellow-800',
  betaald: 'bg-green-100 text-green-800',
  vervallen: 'bg-red-100 text-red-800'
};

export default function InkoopfacturenPage() {
  const [facturen, setFacturen] = useState([]);
  const [bankrekeningen, setBankrekeningen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedFactuur, setSelectedFactuur] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bedrag: 0,
    betaaldatum: new Date().toISOString().split('T')[0],
    betaalmethode: 'bank',
    rekening_id: '',
    referentie: ''
  });
  const [stats, setStats] = useState({
    totaal_open: 0,
    totaal_betaald: 0,
    aantal_vervallen: 0
  });

  useEffect(() => {
    fetchFacturen();
    fetchBankrekeningen();
  }, []);

  const fetchFacturen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/inkoopfacturen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFacturen(data);
        
        // Bereken statistieken
        let totaalOpen = 0;
        let totaalBetaald = 0;
        let aantalVervallen = 0;
        
        data.forEach(f => {
          if (f.status === 'betaald') {
            totaalBetaald += f.totaal || 0;
          } else if (f.status === 'open' || f.status === 'ontvangen' || f.status === 'gedeeltelijk_betaald') {
            totaalOpen += (f.totaal || 0) - (f.betaald_bedrag || 0);
          }
          if (f.status === 'vervallen') {
            aantalVervallen++;
            totaalOpen += (f.totaal || 0) - (f.betaald_bedrag || 0);
          }
        });
        
        setStats({
          totaal_open: totaalOpen,
          totaal_betaald: totaalBetaald,
          aantal_vervallen: aantalVervallen
        });
      }
    } catch (error) {
      toast.error('Fout bij ophalen inkoopfacturen');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankrekeningen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/bankrekeningen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBankrekeningen(data);
      }
    } catch (error) {
      console.error('Fout bij ophalen bankrekeningen');
    }
  };

  const openPaymentDialog = (factuur) => {
    setSelectedFactuur(factuur);
    const openstaand = (factuur.totaal || 0) - (factuur.betaald_bedrag || 0);
    setPaymentForm({
      bedrag: openstaand,
      betaaldatum: new Date().toISOString().split('T')[0],
      betaalmethode: 'bank',
      rekening_id: bankrekeningen.find(b => b.valuta === factuur.valuta)?.id || '',
      referentie: `Betaling ${factuur.factuurnummer}`
    });
    setPaymentDialog(true);
  };

  const handlePayment = async () => {
    if (!selectedFactuur) return;
    
    if (paymentForm.bedrag <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/inkoopfacturen/${selectedFactuur.id}/betaling`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentForm)
      });
      
      if (res.ok) {
        toast.success('Betaling geregistreerd');
        setPaymentDialog(false);
        setSelectedFactuur(null);
        fetchFacturen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij registreren betaling');
      }
    } catch (error) {
      toast.error('Fout bij registreren betaling');
    }
  };

  const updateStatus = async (factuurId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/inkoopfacturen/${factuurId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        toast.success('Status bijgewerkt');
        fetchFacturen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij bijwerken status');
      }
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  const filteredFacturen = facturen.filter(f => 
    f.factuurnummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.crediteur_naam?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount, currency = 'SRD') => {
    return `${currency} ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Inkoopfacturen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inkoopfacturen</h1>
          <p className="text-muted-foreground">Overzicht van alle inkoopfacturen van crediteuren</p>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Openstaand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totaal_open)}</div>
            <p className="text-xs text-muted-foreground">Te betalen aan crediteuren</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Betaald</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totaal_betaald)}</div>
            <p className="text-xs text-muted-foreground">Totaal betaald deze periode</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vervallen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.aantal_vervallen}</div>
            <p className="text-xs text-muted-foreground">Facturen over vervaldatum</p>
          </CardContent>
        </Card>
      </div>

      {/* Zoeken */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op factuurnummer of crediteur..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Facturen lijst */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredFacturen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen inkoopfacturen gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFacturen.map((factuur) => {
                const openstaand = (factuur.totaal || 0) - (factuur.betaald_bedrag || 0);
                return (
                  <div key={factuur.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{factuur.factuurnummer}</p>
                        <p className="text-sm text-muted-foreground">{factuur.crediteur_naam}</p>
                        <p className="text-xs text-muted-foreground">
                          Datum: {factuur.factuurdatum} | Vervalt: {factuur.vervaldatum}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <p className="font-bold">{formatCurrency(factuur.totaal, factuur.valuta)}</p>
                        {factuur.betaald_bedrag > 0 && factuur.status !== 'betaald' && (
                          <p className="text-xs text-green-600">Betaald: {formatCurrency(factuur.betaald_bedrag, factuur.valuta)}</p>
                        )}
                        {openstaand > 0 && factuur.status !== 'betaald' && (
                          <p className="text-xs text-orange-600">Openstaand: {formatCurrency(openstaand, factuur.valuta)}</p>
                        )}
                        <Badge className={statusColors[factuur.status] || 'bg-gray-100'}>
                          {factuur.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(factuur.status === 'ontvangen' || factuur.status === 'open') && (
                          <Button 
                            size="sm" 
                            onClick={() => openPaymentDialog(factuur)}
                            className="bg-emerald-500 hover:bg-emerald-600"
                          >
                            <CreditCard className="w-4 h-4 mr-1" /> Betalen
                          </Button>
                        )}
                        {factuur.status === 'gedeeltelijk_betaald' && (
                          <Button 
                            size="sm" 
                            onClick={() => openPaymentDialog(factuur)}
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            <CreditCard className="w-4 h-4 mr-1" /> Rest Betalen
                          </Button>
                        )}
                        {factuur.status === 'concept' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStatus(factuur.id, 'ontvangen')}
                          >
                            Markeer Ontvangen
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Betaling Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling Registreren</DialogTitle>
          </DialogHeader>
          {selectedFactuur && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedFactuur.factuurnummer}</p>
                <p className="text-sm text-muted-foreground">{selectedFactuur.crediteur_naam}</p>
                <p className="text-sm">
                  Totaal: <span className="font-bold">{formatCurrency(selectedFactuur.totaal, selectedFactuur.valuta)}</span>
                </p>
                <p className="text-sm text-orange-600">
                  Openstaand: <span className="font-bold">{formatCurrency((selectedFactuur.totaal || 0) - (selectedFactuur.betaald_bedrag || 0), selectedFactuur.valuta)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bedrag ({selectedFactuur.valuta})</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={paymentForm.bedrag}
                  onChange={(e) => setPaymentForm({...paymentForm, bedrag: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label>Betaaldatum</Label>
                <Input 
                  type="date"
                  value={paymentForm.betaaldatum}
                  onChange={(e) => setPaymentForm({...paymentForm, betaaldatum: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Betaalmethode</Label>
                <Select value={paymentForm.betaalmethode} onValueChange={(v) => setPaymentForm({...paymentForm, betaalmethode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="kas">Kas</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bankrekening</Label>
                <Select value={paymentForm.rekening_id} onValueChange={(v) => setPaymentForm({...paymentForm, rekening_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecteer rekening" /></SelectTrigger>
                  <SelectContent>
                    {bankrekeningen.filter(b => b.valuta === selectedFactuur.valuta).map((rek) => (
                      <SelectItem key={rek.id} value={rek.id}>
                        {rek.naam} ({rek.valuta})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referentie</Label>
                <Input 
                  value={paymentForm.referentie}
                  onChange={(e) => setPaymentForm({...paymentForm, referentie: e.target.value})}
                  placeholder="Betalingsreferentie"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Annuleren</Button>
            <Button onClick={handlePayment} className="bg-emerald-500 hover:bg-emerald-600">
              <CreditCard className="w-4 h-4 mr-2" /> Betaling Registreren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
