import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  BarChart3, 
  RefreshCw,
  Calendar,
  TrendingUp,
  Fuel,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RapportagesPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/reports/daily?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kon rapport niet laden');
      const data = await res.json();
      setReport(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-rapportages">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-500" />
            Dagrapportage
          </h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van dagelijkse verkoop en prestaties
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={fetchReport} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* Date Header */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold capitalize">{formatDate(selectedDate)}</h2>
            <p className="text-muted-foreground">Dagafsluiting Rapport</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totale Omzet</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(report?.total_sales || 0)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Brandstof Omzet</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(report?.total_fuel_sales || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(report?.total_fuel_liters || 0).toLocaleString('nl-NL')} liters
                </p>
              </div>
              <Fuel className="w-10 h-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Winkel Omzet</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(report?.total_shop_sales || 0)}
                </p>
              </div>
              <ShoppingCart className="w-10 h-10 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transacties</p>
                <p className="text-2xl font-bold">
                  {report?.transactions_count || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gem: {formatCurrency(report?.average_transaction || 0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Betaling Uitsplitsing</CardTitle>
          <CardDescription>Overzicht per betaalmethode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contant</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(report?.payment_breakdown?.cash || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PIN/Kaart</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(report?.payment_breakdown?.card || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-purple-500/10 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overig (QR/E-wallet)</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(report?.payment_breakdown?.other || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Dienst Overzicht</CardTitle>
          <CardDescription>
            {report?.shifts_count || 0} dienst(en) op deze dag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{report?.shifts_count || 0}</p>
              <p className="text-sm text-muted-foreground">Diensten</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{report?.transactions_count || 0}</p>
              <p className="text-sm text-muted-foreground">Transacties</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {(report?.total_fuel_liters || 0).toLocaleString('nl-NL')}
              </p>
              <p className="text-sm text-muted-foreground">Liters Verkocht</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(report?.average_transaction || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Gem. Transactie</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Button */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          Rapport Afdrukken
        </Button>
      </div>
    </div>
  );
}
