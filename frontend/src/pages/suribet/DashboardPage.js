import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Gamepad2, 
  TrendingUp, 
  TrendingDown, 
  Users2, 
  Wallet, 
  DollarSign,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Banknote,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuribetDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [wisselkoersen, setWisselkoersen] = useState({ eur_to_srd: 38.50, usd_to_srd: 35.50 });

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maart' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Augustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, koersenRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/dashboard/stats?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/suribet/wisselkoersen`, { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (koersenRes.ok) {
        const koersenData = await koersenRes.json();
        setWisselkoersen(koersenData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-dashboard">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Suribet Dashboard</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Retailer Management Systeem</p>
            </div>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(y => y - 1);
                } else {
                  setSelectedMonth(m => m - 1);
                }
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[110px] bg-transparent border-0 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[90px] bg-transparent border-0 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(y => y + 1);
                } else {
                  setSelectedMonth(m => m + 1);
                }
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Exchange Rates Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-card rounded-lg p-3 border">
        <Calculator className="w-4 h-4" />
        <span>Wisselkoersen:</span>
        <span className="font-medium">1 EUR = {wisselkoersen.eur_to_srd} SRD</span>
        <span>|</span>
        <span className="font-medium">1 USD = {wisselkoersen.usd_to_srd} SRD</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate('/app/suribet/instellingen')}>
          <Settings className="w-4 h-4 mr-1" />
          Aanpassen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Revenue - Featured */}
        <div className="sm:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Totale Omzet</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatCurrency(stats?.omzet?.total)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Jouw Commissie</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats?.omzet?.commissie)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Suribet Share */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Deel Suribet</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(stats?.omzet?.suribet_deel)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-500">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Netto Winst</p>
              <p className={`text-xl sm:text-2xl font-bold ${(stats?.netto_winst || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(stats?.netto_winst)}
              </p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${
              (stats?.netto_winst || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {(stats?.netto_winst || 0) >= 0 ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Machines */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Actieve Machines</p>
                <p className="text-xl sm:text-2xl font-bold">{stats?.machines?.active || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">van {stats?.machines?.total || 0} totaal</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Prestaties</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {stats?.prestaties?.winst_dagen || 0}
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-bold">
                    <XCircle className="w-4 h-4" />
                    {stats?.prestaties?.verlies_dagen || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.prestaties?.totaal_dagen || 0} dagen geregistreerd</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personnel */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Werknemers</p>
                <p className="text-xl sm:text-2xl font-bold">{stats?.personeel?.actief || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Loonkosten: {formatCurrency(stats?.personeel?.loonkosten)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kasboek */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Kas Saldo</p>
                <p className={`text-xl sm:text-2xl font-bold ${(stats?.kasboek?.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats?.kasboek?.saldo)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  In: {formatCurrency(stats?.kasboek?.inkomsten)} | Uit: {formatCurrency(stats?.kasboek?.uitgaven)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Snelle Acties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600"
              onClick={() => navigate('/app/suribet/machines')}
            >
              <Gamepad2 className="w-5 h-5" />
              <span className="text-xs sm:text-sm">Machines</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600"
              onClick={() => navigate('/app/suribet/kasboek')}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs sm:text-sm">Kasboek</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600"
              onClick={() => navigate('/app/suribet/werknemers')}
            >
              <Users2 className="w-5 h-5" />
              <span className="text-xs sm:text-sm">Werknemers</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600"
              onClick={() => navigate('/app/suribet/loonuitbetaling')}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs sm:text-sm">Loonuitbetaling</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warnings Section */}
      {(stats?.prestaties?.verlies_dagen || 0) > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Waarschuwingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Er zijn <span className="font-bold text-red-600">{stats?.prestaties?.verlies_dagen}</span> dagen met verlies geregistreerd deze maand.
              Bekijk de dagstaten voor meer details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
