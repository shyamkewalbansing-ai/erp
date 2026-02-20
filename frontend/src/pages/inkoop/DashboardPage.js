import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Building2, FileText, Package, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function InkoopDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/inkoop/dashboard`, {
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
          <h1 className="text-2xl font-bold">Inkoop Dashboard</h1>
          <p className="text-muted-foreground">Beheer uw inkoopprocessen</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leveranciers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.leveranciers_count || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/inkoop/leveranciers')}>
              Bekijk alle <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Openstaande Offertes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.open_offertes || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/inkoop/offertes')}>
              Bekijk alle <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Openstaande Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.open_orders || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/inkoop/orders')}>
              Bekijk alle <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Te Verwachten</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.orders_deze_week || 0}</div>
            <p className="text-xs text-muted-foreground">orders deze week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inkoop Deze Maand</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.inkoop_maand && Object.entries(dashboard.inkoop_maand).map(([valuta, bedrag]) => (
              <div key={valuta} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{valuta}</span>
                <span className="text-lg font-bold">{bedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {(!dashboard?.inkoop_maand || Object.keys(dashboard.inkoop_maand).length === 0) && (
              <p className="text-muted-foreground text-center py-4">Geen inkoop deze maand</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Openstaande Facturen</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.openstaande_facturen && Object.entries(dashboard.openstaande_facturen).map(([valuta, bedrag]) => (
              <div key={valuta} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{valuta}</span>
                <span className="text-lg font-bold text-orange-600">{bedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {(!dashboard?.openstaande_facturen || Object.keys(dashboard.openstaande_facturen).length === 0) && (
              <p className="text-muted-foreground text-center py-4">Geen openstaande facturen</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/inkoop/leveranciers')}>
          <Building2 className="mr-2 h-4 w-4" /> Leveranciers Beheren
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/inkoop/offertes')}>
          <FileText className="mr-2 h-4 w-4" /> Nieuwe Offerte
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/inkoop/orders')}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Nieuwe Order
        </Button>
      </div>
    </div>
  );
}
