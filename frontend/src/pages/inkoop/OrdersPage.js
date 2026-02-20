import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, ShoppingCart, ArrowRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inkooporders</h1>
          <p className="text-muted-foreground">Beheer uw inkooporders</p>
        </div>
        <Button>
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
    </div>
  );
}
