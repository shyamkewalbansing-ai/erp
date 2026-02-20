import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Package, Building2, ArrowUpDown, Clipboard, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VoorraadDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/voorraad/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Voorraad Dashboard</h1>
          <p className="text-muted-foreground">Beheer uw voorraad en logistiek</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal Artikelen</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.artikelen_count || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/boekhouding/voorraad/artikelen')}>
              Bekijk alle <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className={dashboard?.lage_voorraad_count > 0 ? 'border-orange-300' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lage Voorraad</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${dashboard?.lage_voorraad_count > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboard?.lage_voorraad_count > 0 ? 'text-orange-500' : ''}`}>
              {dashboard?.lage_voorraad_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">artikelen onder minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Magazijnen</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.magazijnen_count || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/boekhouding/voorraad/magazijnen')}>
              Beheren <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Voorraadwaarde</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              SRD {dashboard?.totale_voorraad_waarde?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">totale waarde</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recente Mutaties</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.recente_mutaties?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recente_mutaties.slice(0, 5).map((mutatie) => (
                  <div key={mutatie.id} className="flex justify-between items-center p-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{mutatie.artikel_naam || mutatie.artikelcode}</p>
                      <p className="text-xs text-muted-foreground">{mutatie.type} - {mutatie.datum}</p>
                    </div>
                    <span className={`font-bold ${mutatie.aantal_wijziging > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mutatie.aantal_wijziging > 0 ? '+' : ''}{mutatie.aantal_wijziging}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Geen recente mutaties</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Artikelen (Waarde)</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.top_artikelen_waarde?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.top_artikelen_waarde.map((artikel, index) => (
                  <div key={artikel.id} className="flex justify-between items-center p-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{artikel.naam}</p>
                        <p className="text-xs text-muted-foreground">{artikel.artikelcode} - {artikel.voorraad_aantal} stuks</p>
                      </div>
                    </div>
                    <span className="font-bold">SRD {artikel.waarde?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Geen artikelen</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/boekhouding/voorraad/artikelen')}>
          <Package className="mr-2 h-4 w-4" /> Artikelen Beheren
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/boekhouding/voorraad/mutaties')}>
          <ArrowUpDown className="mr-2 h-4 w-4" /> Voorraadmutatie
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/boekhouding/voorraad/inventarisatie')}>
          <Clipboard className="mr-2 h-4 w-4" /> Inventarisatie
        </Button>
      </div>
    </div>
  );
}
