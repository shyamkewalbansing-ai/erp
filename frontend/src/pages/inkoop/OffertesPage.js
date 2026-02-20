import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Eye, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-gray-100 text-gray-800',
  verzonden: 'bg-blue-100 text-blue-800',
  geaccepteerd: 'bg-green-100 text-green-800',
  afgewezen: 'bg-red-100 text-red-800',
  verlopen: 'bg-orange-100 text-orange-800'
};

export default function InkoopOffertesPage() {
  const [offertes, setOffertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffertes();
  }, []);

  const fetchOffertes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/offertes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOffertes(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen offertes');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/offertes/${id}/status?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Status bijgewerkt');
        fetchOffertes();
      }
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  const convertToOrder = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/offertes/${id}/naar-order`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Offerte omgezet naar order');
        fetchOffertes();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij omzetten');
      }
    } catch (error) {
      toast.error('Fout bij omzetten naar order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inkoopoffertes</h1>
          <p className="text-muted-foreground">Beheer offertes van leveranciers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Offerte
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : offertes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen inkoopoffertes gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {offertes.map((offerte) => (
                <div key={offerte.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{offerte.offertenummer}</p>
                      <p className="text-sm text-muted-foreground">{offerte.leverancier_naam}</p>
                      <p className="text-xs text-muted-foreground">Datum: {offerte.offertedatum} | Geldig tot: {offerte.geldig_tot}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{offerte.valuta} {offerte.totaal?.toLocaleString()}</p>
                      <Badge className={statusColors[offerte.status] || 'bg-gray-100'}>
                        {offerte.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {offerte.status === 'concept' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(offerte.id, 'verzonden')}>
                          Verzenden
                        </Button>
                      )}
                      {offerte.status === 'verzonden' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(offerte.id, 'geaccepteerd')}>
                          Accepteren
                        </Button>
                      )}
                      {offerte.status === 'geaccepteerd' && (
                        <Button size="sm" onClick={() => convertToOrder(offerte.id)}>
                          <ArrowRight className="mr-1 h-4 w-4" /> Naar Order
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
    </div>
  );
}
