import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Package, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  gepland: 'bg-gray-100 text-gray-800',
  ontvangen: 'bg-blue-100 text-blue-800',
  gecontroleerd: 'bg-green-100 text-green-800',
  afgekeurd: 'bg-red-100 text-red-800'
};

export default function OntvangstenPage() {
  const [ontvangsten, setOntvangsten] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOntvangsten();
  }, []);

  const fetchOntvangsten = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/ontvangsten`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOntvangsten(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen ontvangsten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Goederenontvangst</h1>
          <p className="text-muted-foreground">Registreer en beheer ontvangen goederen</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Ontvangst
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : ontvangsten.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen goederenontvangsten gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {ontvangsten.map((ontvangst) => (
                <div key={ontvangst.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{ontvangst.ontvangstnummer}</p>
                      <p className="text-sm text-muted-foreground">Order: {ontvangst.ordernummer}</p>
                      <p className="text-sm text-muted-foreground">{ontvangst.leverancier_naam}</p>
                      <p className="text-xs text-muted-foreground">Datum: {ontvangst.ontvangstdatum}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">{ontvangst.regels?.length || 0} artikelen</p>
                      <Badge className={statusColors[ontvangst.status] || 'bg-gray-100'}>
                        {ontvangst.status}
                      </Badge>
                    </div>
                    {ontvangst.status === 'ontvangen' && (
                      <Button size="sm" variant="outline">
                        <CheckCircle className="mr-1 h-4 w-4" /> Controleren
                      </Button>
                    )}
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
