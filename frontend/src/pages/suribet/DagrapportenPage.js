import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Users2,
  Banknote,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Calculator,
  DollarSign,
  Euro,
  Camera,
  Upload,
  QrCode,
  Loader2,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Biljet denominaties
const SRD_DENOMINATIES = [5, 10, 20, 50, 100, 200, 500];
const EUR_DENOMINATIES = [5, 10, 20, 50, 100, 200];
const USD_DENOMINATIES = [1, 5, 10, 20, 50, 100];

export default function DagrapportenPage() {
  const [loading, setLoading] = useState(true);
  const [dagrapporten, setDagrapporten] = useState([]);
  const [machines, setMachines] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [wisselkoersen, setWisselkoersen] = useState({ eur_to_srd: 38.5, usd_to_srd: 35.5 });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [scanningBon, setScanningBon] = useState(false);
  const [bonData, setBonData] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    machine_id: '',
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    beginsaldo_srd: 0,
    beginsaldo_eur: 0,
    beginsaldo_usd: 0,
    eindsaldo_srd: 0,
    eindsaldo_eur: 0,
    eindsaldo_usd: 0,
    biljetten_srd: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 },
    biljetten_eur: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0 },
    biljetten_usd: { b1: 0, b5: 0, b10: 0, b20: 0, b50: 0, b100: 0 },
    bon_data: null,
    suribet_percentage: 80,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [dagstatenRes, machinesRes, werknemersRes, koersenRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/dagstaten?date=${selectedDate}`, { headers }),
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers }),
        fetch(`${API_URL}/api/suribet/wisselkoersen`, { headers })
      ]);

      if (dagstatenRes.ok) setDagrapporten(await dagstatenRes.json());
      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
      if (koersenRes.ok) setWisselkoersen(await koersenRes.json());
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Bon scanner functie
  const handleBonUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningBon(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${API_URL}/api/suribet/parse-bon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const result = await response.json();
        setBonData(result.bon_data);
        setFormData(prev => ({
          ...prev,
          bon_data: result.bon_data
        }));
        toast.success('Bon succesvol gescand!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij scannen bon');
      }
    } catch (error) {
      console.error('Bon scan error:', error);
      toast.error('Fout bij scannen bon');
    } finally {
      setScanningBon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Bereken totaal biljetten in SRD
  const berekenBiljettenTotaal = (biljetten, denominaties, multiplier = 1) => {
    if (!biljetten) return 0;
    return denominaties.reduce((sum, denom) => {
      const key = `b${denom}`;
      return sum + (biljetten[key] || 0) * denom * multiplier;
    }, 0);
  };

  // Bereken totale omzet - nu ook met bon data
  const berekenTotaleOmzet = (rapport) => {
    // Als er bon data is, gebruik de balance daarvan
    if (rapport.bon_data?.balance) {
      return rapport.bon_data.balance;
    }
    // Anders bereken van biljetten
    const srd = berekenBiljettenTotaal(rapport.biljetten_srd, SRD_DENOMINATIES);
    const eur = berekenBiljettenTotaal(rapport.biljetten_eur, EUR_DENOMINATIES, wisselkoersen.eur_to_srd);
    const usd = berekenBiljettenTotaal(rapport.biljetten_usd, USD_DENOMINATIES, wisselkoersen.usd_to_srd);
    return srd + eur + usd;
  };

  // Bereken commissies - nu van bon data
  const berekenCommissies = (omzet, suribetPercentage, bonData = null) => {
    if (bonData?.total_pos_commission) {
      // Gebruik de commissie van de bon
      const totaleCommissie = bonData.total_pos_commission;
      // Retailer krijgt (100 - suribetPercentage)% van de commissie
      const jouwCommissie = totaleCommissie * ((100 - suribetPercentage) / 100);
      const suribetDeel = totaleCommissie * (suribetPercentage / 100);
      return { suribetDeel, jouwCommissie, totaleCommissie };
    }
    // Fallback naar oude berekening
    const suribetDeel = omzet * (suribetPercentage / 100);
    const jouwCommissie = omzet - suribetDeel;
    return { suribetDeel, jouwCommissie, totaleCommissie: omzet };
  };

  // Check of machine verlies draait
  const isVerlies = (rapport) => {
    const omzet = berekenTotaleOmzet(rapport);
    const beginsaldo = rapport.beginsaldo_srd + 
      (rapport.beginsaldo_eur * wisselkoersen.eur_to_srd) + 
      (rapport.beginsaldo_usd * wisselkoersen.usd_to_srd);
    const eindsaldo = rapport.eindsaldo_srd + 
      (rapport.eindsaldo_eur * wisselkoersen.eur_to_srd) + 
      (rapport.eindsaldo_usd * wisselkoersen.usd_to_srd);
    
    return omzet < beginsaldo || eindsaldo < beginsaldo;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Bereken omzet automatisch
      const omzet = berekenTotaleOmzet({
        biljetten_srd: formData.biljetten_srd,
        biljetten_eur: formData.biljetten_eur,
        biljetten_usd: formData.biljetten_usd
      });

      const response = await fetch(`${API_URL}/api/suribet/dagstaten`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          omzet
        })
      });

      if (response.ok) {
        toast.success('Dagrapport toegevoegd');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/dagstaten/${selectedRapport.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Dagrapport verwijderd');
        setShowDeleteDialog(false);
        setSelectedRapport(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: '',
      date: selectedDate,
      employee_id: '',
      beginsaldo_srd: 0,
      beginsaldo_eur: 0,
      beginsaldo_usd: 0,
      eindsaldo_srd: 0,
      eindsaldo_eur: 0,
      eindsaldo_usd: 0,
      biljetten_srd: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 },
      biljetten_eur: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0 },
      biljetten_usd: { b1: 0, b5: 0, b10: 0, b20: 0, b50: 0, b100: 0 },
      bon_data: null,
      suribet_percentage: 80,
      notes: ''
    });
  };

  const getMachineName = (id) => machines.find(m => m.id === id)?.machine_id || 'Onbekend';
  const getWerknemerName = (id) => werknemers.find(w => w.id === id)?.name || 'Onbekend';

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Stats berekenen
  const stats = {
    totaalOmzet: dagrapporten.reduce((sum, r) => sum + berekenTotaleOmzet(r), 0),
    totaalCommissie: dagrapporten.reduce((sum, r) => {
      const omzet = berekenTotaleOmzet(r);
      const { jouwCommissie } = berekenCommissies(omzet, r.suribet_percentage || 80);
      return sum + jouwCommissie;
    }, 0),
    aantalMachines: dagrapporten.length,
    verliesMachines: dagrapporten.filter(r => isVerlies(r)).length
  };

  // Bereken form totalen live
  const formOmzetSRD = berekenBiljettenTotaal(formData.biljetten_srd, SRD_DENOMINATIES);
  const formOmzetEUR = berekenBiljettenTotaal(formData.biljetten_eur, EUR_DENOMINATIES);
  const formOmzetUSD = berekenBiljettenTotaal(formData.biljetten_usd, USD_DENOMINATIES);
  const formTotaalOmzet = formOmzetSRD + (formOmzetEUR * wisselkoersen.eur_to_srd) + (formOmzetUSD * wisselkoersen.usd_to_srd);
  const formCommissies = berekenCommissies(formTotaalOmzet, formData.suribet_percentage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-dagrapporten-page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dagrapporten</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Machine omzet & biljetten registratie</p>
            </div>
          </div>
          
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/70" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-white w-[140px] text-center [color-scheme:dark]"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/20 text-xs bg-transparent border-0"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Vandaag
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Totale Omzet</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-600">{formatCurrency(stats.totaalOmzet)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Jouw Commissie</p>
                <p className="text-lg sm:text-xl font-bold text-blue-600">{formatCurrency(stats.totaalCommissie)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Machines</p>
                <p className="text-lg sm:text-xl font-bold">{stats.aantalMachines}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Gamepad2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-lg ${stats.verliesMachines > 0 ? 'ring-2 ring-red-500' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Verlies</p>
                <p className={`text-lg sm:text-xl font-bold ${stats.verliesMachines > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {stats.verliesMachines}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.verliesMachines > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Wisselkoersen: 1 EUR = {wisselkoersen.eur_to_srd} SRD | 1 USD = {wisselkoersen.usd_to_srd} SRD
            </div>
            <Button onClick={() => { resetForm(); setFormData(f => ({...f, date: selectedDate})); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuw Dagrapport
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dagrapporten List */}
      {dagrapporten.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {dagrapporten.map((rapport) => {
            const omzet = berekenTotaleOmzet(rapport);
            const { suribetDeel, jouwCommissie } = berekenCommissies(omzet, rapport.suribet_percentage || 80);
            const verlies = isVerlies(rapport);
            
            // Format tijd uit created_at
            const formatTime = (dateString) => {
              if (!dateString) return '';
              const date = new Date(dateString);
              return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            };

            return (
              <Card key={rapport.id} className={`border-0 shadow-lg hover:shadow-xl transition-shadow ${verlies ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Machine & Werknemer Info */}
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        verlies ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{getMachineName(rapport.machine_id)}</h3>
                          {verlies && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Verlies
                            </Badge>
                          )}
                          {!verlies && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Winst
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users2 className="w-3.5 h-3.5" />
                            {getWerknemerName(rapport.employee_id)}
                          </span>
                          {rapport.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatTime(rapport.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financiële Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Totale Omzet</p>
                        <p className="font-bold text-lg text-emerald-600">{formatCurrency(omzet)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Deel Suribet ({rapport.suribet_percentage}%)</p>
                        <p className="font-bold text-lg text-orange-600">{formatCurrency(suribetDeel)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Jouw Commissie</p>
                        <p className="font-bold text-lg text-blue-600">{formatCurrency(jouwCommissie)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Begin → Eind</p>
                        <p className="font-medium text-sm">
                          {formatCurrency(rapport.beginsaldo_srd)} → {formatCurrency(rapport.eindsaldo_srd)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setSelectedRapport(rapport); setShowDetailModal(true); }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => { setSelectedRapport(rapport); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Biljetten Breakdown */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <span className="font-bold">SRD</span>
                      </p>
                      <p className="font-semibold">{formatCurrency(berekenBiljettenTotaal(rapport.biljetten_srd, SRD_DENOMINATIES))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Euro className="w-3 h-3" /> EUR
                      </p>
                      <p className="font-semibold">€ {berekenBiljettenTotaal(rapport.biljetten_eur, EUR_DENOMINATIES).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> USD
                      </p>
                      <p className="font-semibold">$ {berekenBiljettenTotaal(rapport.biljetten_usd, USD_DENOMINATIES).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Geen dagrapporten</h3>
            <p className="text-muted-foreground text-center mb-4">
              Er zijn nog geen dagrapporten voor {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <Button onClick={() => { resetForm(); setFormData(f => ({...f, date: selectedDate})); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Eerste Dagrapport
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Nieuw Dagrapport
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basis Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Machine *</Label>
                <Select 
                  value={formData.machine_id} 
                  onValueChange={(v) => setFormData({...formData, machine_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.status === 'active').map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.machine_id} - {m.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Werknemer</Label>
                <Select 
                  value={formData.employee_id || "none"} 
                  onValueChange={(v) => setFormData({...formData, employee_id: v === "none" ? "" : v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen werknemer</SelectItem>
                    {werknemers.filter(w => w.status === 'active').map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Saldo's */}
            <div className="space-y-3">
              <h4 className="font-medium">Begin- en Eindsaldo</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Begin SRD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.beginsaldo_srd}
                    onChange={(e) => setFormData({...formData, beginsaldo_srd: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Begin EUR</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.beginsaldo_eur}
                    onChange={(e) => setFormData({...formData, beginsaldo_eur: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Begin USD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.beginsaldo_usd}
                    onChange={(e) => setFormData({...formData, beginsaldo_usd: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Eind SRD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.eindsaldo_srd}
                    onChange={(e) => setFormData({...formData, eindsaldo_srd: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Eind EUR</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.eindsaldo_eur}
                    onChange={(e) => setFormData({...formData, eindsaldo_eur: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Eind USD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.eindsaldo_usd}
                    onChange={(e) => setFormData({...formData, eindsaldo_usd: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            {/* Biljetten Tabs */}
            <Tabs defaultValue="srd" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="srd">SRD Biljetten</TabsTrigger>
                <TabsTrigger value="eur">EUR Biljetten</TabsTrigger>
                <TabsTrigger value="usd">USD Biljetten</TabsTrigger>
              </TabsList>
              
              <TabsContent value="srd" className="space-y-3">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {SRD_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">{denom} SRD</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_srd[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_srd: {
                            ...formData.biljetten_srd,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal SRD:</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(formOmzetSRD)}</p>
                </div>
              </TabsContent>

              <TabsContent value="eur" className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {EUR_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">€{denom}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_eur[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_eur: {
                            ...formData.biljetten_eur,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal EUR: € {formOmzetEUR.toFixed(2)} (= {formatCurrency(formOmzetEUR * wisselkoersen.eur_to_srd)} SRD)</p>
                </div>
              </TabsContent>

              <TabsContent value="usd" className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {USD_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">${denom}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_usd[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_usd: {
                            ...formData.biljetten_usd,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal USD: $ {formOmzetUSD.toFixed(2)} (= {formatCurrency(formOmzetUSD * wisselkoersen.usd_to_srd)} SRD)</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Commissie Percentage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Suribet Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.suribet_percentage}
                  onChange={(e) => setFormData({...formData, suribet_percentage: parseFloat(e.target.value) || 80})}
                />
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optionele notities"
                />
              </div>
            </div>

            {/* Totalen Preview */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Berekening
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Totale Omzet</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(formTotaalOmzet)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deel Suribet ({formData.suribet_percentage}%)</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(formCommissies.suribetDeel)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jouw Commissie ({100 - formData.suribet_percentage}%)</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(formCommissies.jouwCommissie)}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={!formData.machine_id}>
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" />
              Dagrapport Details
            </DialogTitle>
          </DialogHeader>
          {selectedRapport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Machine</p>
                  <p className="font-medium">{getMachineName(selectedRapport.machine_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Werknemer</p>
                  <p className="font-medium">{getWerknemerName(selectedRapport.employee_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">{new Date(selectedRapport.date).toLocaleDateString('nl-NL')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aangemaakt om</p>
                  <p className="font-medium">
                    {selectedRapport.created_at 
                      ? new Date(selectedRapport.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '-'}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Biljetten Telling</h4>
                
                {/* SRD */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">SRD Biljetten</p>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {SRD_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">{d}</div>
                        <div>{selectedRapport.biljetten_srd?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: {formatCurrency(berekenBiljettenTotaal(selectedRapport.biljetten_srd, SRD_DENOMINATIES))}
                  </p>
                </div>

                {/* EUR */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">EUR Biljetten</p>
                  <div className="grid grid-cols-6 gap-1 text-xs">
                    {EUR_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">€{d}</div>
                        <div>{selectedRapport.biljetten_eur?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: € {berekenBiljettenTotaal(selectedRapport.biljetten_eur, EUR_DENOMINATIES).toFixed(2)}
                  </p>
                </div>

                {/* USD */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">USD Biljetten</p>
                  <div className="grid grid-cols-6 gap-1 text-xs">
                    {USD_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">${d}</div>
                        <div>{selectedRapport.biljetten_usd?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: $ {berekenBiljettenTotaal(selectedRapport.biljetten_usd, USD_DENOMINATIES).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedRapport.notes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">Notities</p>
                  <p>{selectedRapport.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dagrapport Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit dagrapport wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
