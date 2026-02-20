import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Clipboard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  gepland: 'bg-gray-100 text-gray-800',
  in_uitvoering: 'bg-blue-100 text-blue-800',
  afgerond: 'bg-green-100 text-green-800'
};

export default function InventarisatiePage() {
  const [inventarisaties, setInventarisaties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventarisaties();
  }, []);

  const fetchInventarisaties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventarisaties(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen inventarisaties');
    } finally {
      setLoading(false);
    }
  };

  const createInventarisatie = async () => {
    const naam = prompt('Naam van de inventarisatie:');
    if (!naam) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          naam,
          geplande_datum: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        toast.success('Inventarisatie aangemaakt');
        fetchInventarisaties();
      }
    } catch (error) {
      toast.error('Fout bij aanmaken');
    }
  };

  const afrondenInventarisatie = async (id) => {
    if (!window.confirm('Wilt u deze inventarisatie afronden en de verschillen verwerken?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/inventarisaties/${id}/afronden?verwerk_verschillen=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Inventarisatie afgerond');
        fetchInventarisaties();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij afronden');
      }
    } catch (error) {
      toast.error('Fout bij afronden');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventarisatie</h1>
          <p className="text-muted-foreground">Voorraadtellingen en correcties</p>
        </div>
        <Button onClick={createInventarisatie}>
          <Plus className="mr-2 h-4 w-4" /> Nieuwe Inventarisatie
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventarisaties</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : inventarisaties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen inventarisaties gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {inventarisaties.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Clipboard className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.naam}</p>
                      <p className="text-sm text-muted-foreground">{inv.inventarisatienummer}</p>
                      <p className="text-xs text-muted-foreground">Gepland: {inv.geplande_datum}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">{inv.regels?.length || 0} artikelen geteld</p>
                      <Badge className={statusColors[inv.status] || 'bg-gray-100'}>
                        {inv.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {inv.status !== 'afgerond' && (
                      <Button size="sm" onClick={() => afrondenInventarisatie(inv.id)}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Afronden
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
