import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown,
  Droplets, 
  Users, 
  ShoppingCart, 
  AlertTriangle,
  Clock,
  DollarSign,
  Zap,
  Package,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PompstationDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kon dashboard niet laden');
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Fuel className="w-8 h-8 text-orange-500" />
            Pompstation Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van uw tankstation operaties
          </p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Omzet Vandaag</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboard?.sales?.today?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboard?.sales?.today?.transactions || 0} transacties
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Liters Vandaag</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(dashboard?.sales?.today?.fuel_liters || 0).toLocaleString('nl-NL')} L
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Brandstof verkocht
                </p>
              </div>
              <Droplets className="w-10 h-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actieve Pompen</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard?.operations?.pumps_active || 0} / {dashboard?.operations?.pumps_total || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboard?.operations?.active_shifts || 0} actieve diensten
                </p>
              </div>
              <Zap className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Omzet Week</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboard?.sales?.week?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboard?.sales?.week?.transactions || 0} transacties
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(dashboard?.alerts?.low_tanks?.length > 0 || 
        dashboard?.alerts?.low_stock_products > 0 || 
        dashboard?.alerts?.open_incidents > 0) && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Waarschuwingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboard?.alerts?.low_tanks?.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                  <Droplets className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600">Lage Tankstanden</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.alerts.low_tanks.length} tank(s) onder minimum
                    </p>
                  </div>
                </div>
              )}
              {dashboard?.alerts?.low_stock_products > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg">
                  <Package className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="font-medium text-orange-600">Lage Voorraad</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.alerts.low_stock_products} product(en) bijbestellen
                    </p>
                  </div>
                </div>
              )}
              {dashboard?.alerts?.open_incidents > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-600">Open Incidenten</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.alerts.open_incidents} incident(en) openstaand
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tank Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                Brandstoftanks
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/app/pompstation/tanks')}
              >
                Bekijk alle <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
            <CardDescription>
              {dashboard?.tanks?.total || 0} tanks - {dashboard?.tanks?.low_level || 0} met lage stand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.tanks?.details?.slice(0, 4).map((tank) => {
                const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
                const isLow = tank.current_level_liters <= tank.min_level_alert;
                
                return (
                  <div key={tank.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{tank.name}</span>
                      <span className={isLow ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                        {tank.current_level_liters.toLocaleString('nl-NL')} / {tank.capacity_liters.toLocaleString('nl-NL')} L
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          percentage < 20 ? 'bg-red-500' : 
                          percentage < 40 ? 'bg-orange-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!dashboard?.tanks?.details || dashboard.tanks.details.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Nog geen tanks geconfigureerd
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Snelle Acties
            </CardTitle>
            <CardDescription>Veelgebruikte functies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/app/pompstation/kassa')}
              >
                <ShoppingCart className="w-6 h-6" />
                <span>Nieuwe Verkoop</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/app/pompstation/leveringen')}
              >
                <Fuel className="w-6 h-6" />
                <span>Levering Registreren</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/app/pompstation/diensten')}
              >
                <Clock className="w-6 h-6" />
                <span>Dienst Starten</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/app/pompstation/rapportages')}
              >
                <TrendingUp className="w-6 h-6" />
                <span>Dag Afsluiten</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Maandoverzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboard?.sales?.month?.total || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Totale Omzet</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {dashboard?.sales?.month?.transactions || 0}
              </p>
              <p className="text-sm text-muted-foreground">Transacties</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {((dashboard?.sales?.month?.total || 0) / Math.max(dashboard?.sales?.month?.transactions || 1, 1)).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Gem. Transactie</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {dashboard?.operations?.pumps_total || 0}
              </p>
              <p className="text-sm text-muted-foreground">Actieve Pompen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
