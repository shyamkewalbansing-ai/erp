import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAutoDealerStats,
  getAutoDealerVehicles,
  getAutoDealerCustomers,
  getAutoDealerSales
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Car,
  Users,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  Package,
  Plus,
  ArrowUpRight,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Currency formatter for multiple currencies
const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  const symbol = symbols[currency.toUpperCase()] || currency;
  return `${symbol} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

export default function AutoDealerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentVehicles, setRecentVehicles] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('srd');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, vehiclesRes] = await Promise.all([
        getAutoDealerStats(),
        getAutoDealerVehicles()
      ]);
      setStats(statsRes.data);
      setRecentVehicles(vehiclesRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      in_stock: 'bg-green-100 text-green-700 border-green-200',
      reserved: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      sold: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = {
      in_stock: 'Op Voorraad',
      reserved: 'Gereserveerd',
      sold: 'Verkocht'
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="autodealer-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-7 h-7 text-primary" />
            Auto Dealer Dashboard
          </h1>
          <p className="text-muted-foreground">Beheer uw voertuigen, klanten en verkopen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/autodealer/voertuigen')}>
            <Package className="w-4 h-4 mr-2" />
            Voertuigen
          </Button>
          <Button onClick={() => navigate('/app/autodealer/voertuigen?new=true')}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Voertuig
          </Button>
        </div>
      </div>

      {/* Currency Selector */}
      <div className="flex gap-2">
        {['srd', 'eur', 'usd'].map((curr) => (
          <Button
            key={curr}
            variant={selectedCurrency === curr ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCurrency(curr)}
          >
            {curr.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Totaal Voertuigen</CardTitle>
            <Car className="w-5 h-5 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_vehicles || 0}</div>
            <p className="text-xs text-blue-200 mt-1">
              {stats?.vehicles_in_stock || 0} op voorraad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Op Voorraad</CardTitle>
            <Package className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.vehicles_in_stock || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.vehicles_reserved || 0} gereserveerd
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Klanten</CardTitle>
            <Users className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Geregistreerde klanten</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">Omzet</CardTitle>
            <TrendingUp className="w-5 h-5 text-emerald-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.revenue?.[selectedCurrency] || 0, selectedCurrency)}
            </div>
            <p className="text-xs text-emerald-200 mt-1">
              {stats?.total_sales || 0} verkopen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Vehicles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Recente Voertuigen
                </CardTitle>
                <CardDescription>Laatst toegevoegde voertuigen</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/autodealer/voertuigen')}>
                Alles bekijken
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentVehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen voertuigen toegevoegd</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => navigate('/app/autodealer/voertuigen?new=true')}
                >
                  Voeg uw eerste voertuig toe
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/autodealer/voertuigen/${vehicle.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.year} • {vehicle.mileage?.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(vehicle.status)}
                      <p className="text-sm font-medium mt-1">
                        {formatCurrency(vehicle.selling_price?.[selectedCurrency] || 0, selectedCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Recente Verkopen
                </CardTitle>
                <CardDescription>Laatst gemaakte verkopen</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/autodealer/verkopen')}>
                Alles bekijken
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.recent_sales || stats.recent_sales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen verkopen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{sale.vehicle}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {formatCurrency(sale.price?.[selectedCurrency] || 0, selectedCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Brands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Populaire Merken
            </CardTitle>
            <CardDescription>Meest voorkomende merken in uw inventaris</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.popular_brands || stats.popular_brands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen data beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.popular_brands.map((brand, index) => (
                  <div key={brand.brand} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{brand.brand}</span>
                        <span className="text-sm text-muted-foreground">{brand.count} voertuigen</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(brand.count / stats.total_vehicles) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Openstaande Betalingen
            </CardTitle>
            <CardDescription>Nog te ontvangen bedragen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.pending_payments?.srd || 0, 'SRD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">SRD</p>
                </div>
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats?.pending_payments?.eur || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">EUR</p>
                </div>
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.pending_payments?.usd || 0, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">USD</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
