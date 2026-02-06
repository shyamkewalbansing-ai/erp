import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
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
  Calculator,
  FileText,
  Euro,
  PieChart,
  BarChart3,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuribetDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dagrapporten, setDagrapporten] = useState([]);
  const [machines, setMachines] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [wisselkoersen, setWisselkoersen] = useState({ eur_to_srd: 38.5, usd_to_srd: 35.5 });
  const [kasboek, setKasboek] = useState([]);
  const [loonbetalingen, setLoonbetalingen] = useState([]);
  // Nu gebruiken we een enkele datum in plaats van maand/jaar
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showKoersenModal, setShowKoersenModal] = useState(false);
  const [koersenForm, setKoersenForm] = useState({ eur_to_srd: 38.5, usd_to_srd: 35.5 });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Get dates for the selected month
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const [machinesRes, werknemersRes, koersenRes, kasboekRes, loonRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers }),
        fetch(`${API_URL}/api/suribet/wisselkoersen`, { headers }),
        fetch(`${API_URL}/api/suribet/kasboek?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/suribet/loonbetalingen?month=${selectedMonth}&year=${selectedYear}`, { headers })
      ]);

      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
      if (koersenRes.ok) {
        const data = await koersenRes.json();
        setWisselkoersen(data);
        setKoersenForm(data);
      }
      if (kasboekRes.ok) setKasboek(await kasboekRes.json());
      if (loonRes.ok) setLoonbetalingen(await loonRes.json());

      // Fetch dagrapporten for each day of the month
      const dagrapportenPromises = [];
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dagrapportenPromises.push(
          fetch(`${API_URL}/api/suribet/dagstaten?date=${date}`, { headers }).then(r => r.ok ? r.json() : [])
        );
      }
      const allDagrapporten = await Promise.all(dagrapportenPromises);
      setDagrapporten(allDagrapporten.flat());
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKoersen = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/wisselkoersen`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(koersenForm)
      });

      if (response.ok) {
        toast.success('Wisselkoersen bijgewerkt');
        setWisselkoersen(koersenForm);
        setShowKoersenModal(false);
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  // Bereken totaal biljetten
  const berekenBiljettenTotaal = (biljetten, denominaties, multiplier = 1) => {
    if (!biljetten) return 0;
    return denominaties.reduce((sum, denom) => {
      const key = `b${denom}`;
      return sum + (biljetten[key] || 0) * denom * multiplier;
    }, 0);
  };

  // Bereken totale omzet voor een rapport
  const berekenRapportOmzet = (rapport) => {
    const srd = berekenBiljettenTotaal(rapport.biljetten_srd, SRD_DENOMINATIES);
    const eur = berekenBiljettenTotaal(rapport.biljetten_eur, EUR_DENOMINATIES, wisselkoersen.eur_to_srd);
    const usd = berekenBiljettenTotaal(rapport.biljetten_usd, USD_DENOMINATIES, wisselkoersen.usd_to_srd);
    return srd + eur + usd;
  };

  // Check of machine verlies draait
  const isVerlies = (rapport) => {
    const omzet = berekenRapportOmzet(rapport);
    const beginsaldo = rapport.beginsaldo_srd + 
      (rapport.beginsaldo_eur * wisselkoersen.eur_to_srd) + 
      (rapport.beginsaldo_usd * wisselkoersen.usd_to_srd);
    return omzet < beginsaldo;
  };

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Bereken statistieken
  const stats = {
    // Omzet & Commissie
    totaleOmzet: dagrapporten.reduce((sum, r) => sum + berekenRapportOmzet(r), 0),
    suribetDeel: dagrapporten.reduce((sum, r) => {
      const omzet = berekenRapportOmzet(r);
      return sum + (omzet * ((r.suribet_percentage || 80) / 100));
    }, 0),
    jouwCommissie: dagrapporten.reduce((sum, r) => {
      const omzet = berekenRapportOmzet(r);
      return sum + (omzet * ((100 - (r.suribet_percentage || 80)) / 100));
    }, 0),
    
    // Machines
    totaalMachines: machines.length,
    actieveMachines: machines.filter(m => m.status === 'active').length,
    
    // Prestaties
    winstDagen: dagrapporten.filter(r => !isVerlies(r)).length,
    verliesDagen: dagrapporten.filter(r => isVerlies(r)).length,
    totaalDagen: dagrapporten.length,
    
    // Personeel
    actiefPersoneel: werknemers.filter(w => w.status === 'active').length,
    loonkosten: loonbetalingen.reduce((sum, l) => sum + (l.net_amount || 0), 0),
    
    // Kasboek
    inkomsten: kasboek.filter(k => k.transaction_type === 'income').reduce((sum, k) => sum + k.amount, 0),
    uitgaven: kasboek.filter(k => k.transaction_type === 'expense').reduce((sum, k) => sum + k.amount, 0)
  };
  stats.kasSaldo = stats.inkomsten - stats.uitgaven;
  stats.nettoWinst = stats.jouwCommissie - stats.loonkosten;

  // Machines met verlies
  const verliesMachines = dagrapporten.filter(r => isVerlies(r));

  // Groepeer dagrapporten per machine voor overzichtstabel
  const machineOverzicht = machines.map(machine => {
    const machineRapporten = dagrapporten.filter(r => r.machine_id === machine.id);
    const totaleOmzet = machineRapporten.reduce((sum, r) => sum + berekenRapportOmzet(r), 0);
    const commissie = machineRapporten.reduce((sum, r) => {
      const omzet = berekenRapportOmzet(r);
      return sum + (omzet * ((100 - (r.suribet_percentage || 80)) / 100));
    }, 0);
    const verliesDagen = machineRapporten.filter(r => isVerlies(r)).length;
    
    return {
      ...machine,
      totaleOmzet,
      commissie,
      aantalRapporten: machineRapporten.length,
      verliesDagen,
      status: verliesDagen > 0 ? 'verlies' : machineRapporten.length > 0 ? 'winst' : 'geen_data'
    };
  });

  // Biljettenanalyse
  const biljettenAnalyse = {
    srd: SRD_DENOMINATIES.reduce((acc, denom) => {
      acc[denom] = dagrapporten.reduce((sum, r) => sum + (r.biljetten_srd?.[`b${denom}`] || 0), 0);
      return acc;
    }, {}),
    eur: EUR_DENOMINATIES.reduce((acc, denom) => {
      acc[denom] = dagrapporten.reduce((sum, r) => sum + (r.biljetten_eur?.[`b${denom}`] || 0), 0);
      return acc;
    }, {}),
    usd: USD_DENOMINATIES.reduce((acc, denom) => {
      acc[denom] = dagrapporten.reduce((sum, r) => sum + (r.biljetten_usd?.[`b${denom}`] || 0), 0);
      return acc;
    }, {})
  };

  const getMachineName = (id) => machines.find(m => m.id === id)?.machine_id || 'Onbekend';
  const getWerknemerName = (id) => werknemers.find(w => w.id === id)?.name || 'Onbekend';

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

      {/* Wisselkoersen Bar */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">1 EUR = {wisselkoersen.eur_to_srd} SRD</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">1 USD = {wisselkoersen.usd_to_srd} SRD</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowKoersenModal(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Aanpassen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Totale Omzet */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs sm:text-sm">Totale Omzet</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totaleOmzet)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jouw Commissie */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">Jouw Commissie</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.jouwCommissie)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deel Suribet */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm">Deel Suribet</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.suribetDeel)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Netto Winst */}
        <Card className={`border-0 shadow-lg text-white ${stats.nettoWinst >= 0 ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs sm:text-sm ${stats.nettoWinst >= 0 ? 'text-purple-100' : 'text-red-100'}`}>Netto Winst</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.nettoWinst)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Actieve Machines */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Actieve Machines</p>
                <p className="text-lg sm:text-xl font-bold">{stats.actieveMachines} <span className="text-muted-foreground text-sm font-normal">van {stats.totaalMachines}</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Gamepad2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prestaties */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Prestaties</p>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">{stats.winstDagen} winst</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-600 font-bold">{stats.verliesDagen} verlies</span>
                </div>
                <p className="text-xs text-muted-foreground">{stats.totaalDagen} dagen geregistreerd</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Werknemers */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Werknemers</p>
                <p className="text-lg sm:text-xl font-bold">{stats.actiefPersoneel}</p>
                <p className="text-xs text-muted-foreground">Loonkosten: {formatCurrency(stats.loonkosten)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Users2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kas Saldo */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Kas Saldo</p>
                <p className={`text-lg sm:text-xl font-bold ${stats.kasSaldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.kasSaldo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  In: {formatCurrency(stats.inkomsten)} | Uit: {formatCurrency(stats.uitgaven)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.kasSaldo >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verlies Machines Alert */}
      {verliesMachines.length > 0 && (
        <Card className="border-0 shadow-lg ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Machines met Verlies Vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {verliesMachines.slice(0, 5).map((rapport, idx) => {
                const omzet = berekenRapportOmzet(rapport);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{getMachineName(rapport.machine_id)}</p>
                        <p className="text-xs text-muted-foreground">{getWerknemerName(rapport.employee_id)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">{formatCurrency(omzet)}</p>
                      <p className="text-xs text-muted-foreground">
                        Begin: {formatCurrency(rapport.beginsaldo_srd)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Machine Overzicht Tabel */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-500" />
            Machine Overzicht - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {machineOverzicht.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="pb-3 font-medium">Machine</th>
                    <th className="pb-3 font-medium">Locatie</th>
                    <th className="pb-3 font-medium text-right">Totale Omzet</th>
                    <th className="pb-3 font-medium text-right">Jouw Commissie</th>
                    <th className="pb-3 font-medium text-center">Rapporten</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {machineOverzicht.map((machine) => (
                    <tr key={machine.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{machine.machine_id}</td>
                      <td className="py-3 text-muted-foreground">{machine.location}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(machine.totaleOmzet)}</td>
                      <td className="py-3 text-right font-medium text-blue-600">{formatCurrency(machine.commissie)}</td>
                      <td className="py-3 text-center">{machine.aantalRapporten}</td>
                      <td className="py-3 text-center">
                        {machine.status === 'verlies' && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {machine.verliesDagen}x Verlies
                          </Badge>
                        )}
                        {machine.status === 'winst' && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Winst
                          </Badge>
                        )}
                        {machine.status === 'geen_data' && (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                            Geen data
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Geen machines geregistreerd</p>
          )}
        </CardContent>
      </Card>

      {/* Biljetten Analyse */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            Biljetten Analyse - {months.find(m => m.value === selectedMonth)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SRD */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                SRD Biljetten
              </h4>
              <div className="space-y-2">
                {SRD_DENOMINATIES.map(denom => {
                  const count = biljettenAnalyse.srd[denom] || 0;
                  const totaal = count * denom;
                  return (
                    <div key={denom} className="flex items-center justify-between text-sm">
                      <span>{denom} SRD</span>
                      <span className="text-muted-foreground">{count}x</span>
                      <span className="font-medium">{formatCurrency(totaal)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>Totaal SRD</span>
                  <span className="text-emerald-600">
                    {formatCurrency(SRD_DENOMINATIES.reduce((sum, d) => sum + (biljettenAnalyse.srd[d] || 0) * d, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* EUR */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                EUR Biljetten
              </h4>
              <div className="space-y-2">
                {EUR_DENOMINATIES.map(denom => {
                  const count = biljettenAnalyse.eur[denom] || 0;
                  const totaal = count * denom;
                  return (
                    <div key={denom} className="flex items-center justify-between text-sm">
                      <span>€{denom}</span>
                      <span className="text-muted-foreground">{count}x</span>
                      <span className="font-medium">€ {totaal.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>Totaal EUR</span>
                  <span className="text-blue-600">
                    € {EUR_DENOMINATIES.reduce((sum, d) => sum + (biljettenAnalyse.eur[d] || 0) * d, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* USD */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                USD Biljetten
              </h4>
              <div className="space-y-2">
                {USD_DENOMINATIES.map(denom => {
                  const count = biljettenAnalyse.usd[denom] || 0;
                  const totaal = count * denom;
                  return (
                    <div key={denom} className="flex items-center justify-between text-sm">
                      <span>${denom}</span>
                      <span className="text-muted-foreground">{count}x</span>
                      <span className="font-medium">$ {totaal.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>Totaal USD</span>
                  <span className="text-green-600">
                    $ {USD_DENOMINATIES.reduce((sum, d) => sum + (biljettenAnalyse.usd[d] || 0) * d, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Snelle Acties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/app/suribet/dagrapporten')}
            >
              <FileText className="w-5 h-5 text-emerald-500" />
              <span className="text-xs">Dagrapporten</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/app/suribet/machines')}
            >
              <Gamepad2 className="w-5 h-5 text-blue-500" />
              <span className="text-xs">Machines</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/app/suribet/kasboek')}
            >
              <Wallet className="w-5 h-5 text-purple-500" />
              <span className="text-xs">Kasboek</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/app/suribet/werknemers')}
            >
              <Users2 className="w-5 h-5 text-orange-500" />
              <span className="text-xs">Werknemers</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/app/suribet/loonuitbetaling')}
            >
              <Banknote className="w-5 h-5 text-pink-500" />
              <span className="text-xs">Loonuitbetaling</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wisselkoersen Modal */}
      <Dialog open={showKoersenModal} onOpenChange={setShowKoersenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              Wisselkoersen Aanpassen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                1 EUR = ... SRD
              </Label>
              <Input
                type="number"
                step="0.01"
                value={koersenForm.eur_to_srd}
                onChange={(e) => setKoersenForm({...koersenForm, eur_to_srd: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                1 USD = ... SRD
              </Label>
              <Input
                type="number"
                step="0.01"
                value={koersenForm.usd_to_srd}
                onChange={(e) => setKoersenForm({...koersenForm, usd_to_srd: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKoersenModal(false)}>Annuleren</Button>
            <Button onClick={handleUpdateKoersen} className="bg-emerald-500 hover:bg-emerald-600">Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
