import { useState, useEffect, useMemo, useCallback } from 'react';
import api, { formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { 
  Zap, 
  Droplets, 
  Plus, 
  Search,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Settings,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  Receipt,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export default function Meterstanden() {
  const [readings, setReadings] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedApartment, setSelectedApartment] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    apartment_id: '',
    tenant_id: '',
    reading_date: new Date().toISOString().split('T')[0],
    ebs_reading: '',
    swm_reading: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [readingsRes, apartmentsRes, tenantsRes, summaryRes, settingsRes] = await Promise.all([
        api.get(`/meter-readings?month=${selectedMonth}&year=${selectedYear}`),
        api.get('/apartments'),
        api.get('/tenants'),
        api.get(`/meter-readings/summary?month=${selectedMonth}&year=${selectedYear}`),
        api.get('/meter-settings')
      ]);
      
      setReadings(readingsRes.data);
      setApartments(apartmentsRes.data);
      setTenants(tenantsRes.data);
      setSummary(summaryRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Fout bij laden van meterstanden');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReadings = useMemo(() => {
    return readings.filter(reading => {
      if (selectedApartment !== 'all' && reading.apartment_id !== selectedApartment) return false;
      if (paymentFilter !== 'all' && reading.payment_status !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!reading.apartment_name?.toLowerCase().includes(query) &&
            !reading.tenant_name?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [readings, selectedApartment, paymentFilter, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.apartment_id) {
      toast.error('Selecteer een appartement');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/meter-readings', {
        ...formData,
        ebs_reading: formData.ebs_reading ? parseFloat(formData.ebs_reading) : null,
        swm_reading: formData.swm_reading ? parseFloat(formData.swm_reading) : null
      });
      
      toast.success('Meterstand toegevoegd!');
      setAddDialogOpen(false);
      setFormData({
        apartment_id: '',
        tenant_id: '',
        reading_date: new Date().toISOString().split('T')[0],
        ebs_reading: '',
        swm_reading: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedReading) return;
    
    try {
      await api.post(`/meter-readings/${selectedReading.id}/pay`);
      toast.success(`Betaling van ${formatCurrency(selectedReading.total_cost)} verwerkt en afgetrokken van kasgeld`);
      setPayConfirmOpen(false);
      setSelectedReading(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwerken betaling');
    }
  };

  const handleUnpay = async (reading) => {
    try {
      await api.post(`/meter-readings/${reading.id}/unpay`);
      toast.success('Betaling ongedaan gemaakt');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij ongedaan maken');
    }
  };

  const handleDelete = async (reading) => {
    if (!confirm('Weet u zeker dat u deze meterstand wilt verwijderen?')) return;
    
    try {
      await api.delete(`/meter-readings/${reading.id}`);
      toast.success('Meterstand verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Get apartment's current tenant
  const getApartmentTenant = (apartmentId) => {
    const apt = apartments.find(a => a.id === apartmentId);
    return apt?.tenant_id || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="meterstanden-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-yellow-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-yellow-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-amber-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-yellow-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>EBS & SWM Beheer</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Meterstanden
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              EBS & SWM meterstanden beheren
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Tarieven
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Meterstand Toevoegen
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-center gap-4 rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 sm:h-10 sm:w-10">
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <div className="text-center min-w-[150px] sm:min-w-[200px]">
          <h2 className="text-base sm:text-xl font-semibold text-foreground">{MONTHS[selectedMonth - 1]} {selectedYear}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8 sm:h-10 sm:w-10">
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Ingediend - Featured */}
          <div className="col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-600 p-4 sm:p-6 text-white shadow-xl shadow-yellow-500/20">
            <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs sm:text-sm font-medium mb-1">Ingediend</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{summary.submitted_count} / {summary.total_apartments}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          
          {/* EBS */}
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">EBS Totaal</p>
                <p className="text-lg sm:text-xl font-bold text-foreground">{summary.total_ebs_usage.toLocaleString()} kWh</p>
                <p className="text-xs sm:text-sm text-emerald-600">{formatCurrency(summary.total_ebs_cost)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          
          {/* SWM */}
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">SWM Totaal</p>
                <p className="text-lg sm:text-xl font-bold text-foreground">{summary.total_swm_usage.toLocaleString()} m³</p>
                <p className="text-xs sm:text-sm text-emerald-600">{formatCurrency(summary.total_swm_cost)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Droplets className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          
          {/* Totaal Kosten */}
          <div className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 ${
            summary.unpaid_count > 0 
              ? 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30' 
              : 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Totaal Kosten</p>
                <p className="text-lg sm:text-xl font-bold text-foreground">{formatCurrency(summary.total_cost)}</p>
                <p className={`text-xs sm:text-sm ${summary.unpaid_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {summary.paid_count} betaald, {summary.unpaid_count} openstaand
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                summary.unpaid_count > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'
              }`}>
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken op appartement of huurder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
            />
          </div>
        
        <Select value={selectedApartment} onValueChange={setSelectedApartment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Appartement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Appartementen</SelectItem>
            {apartments.map(apt => (
              <SelectItem key={apt.id} value={apt.id}>{apt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Openstaand</SelectItem>
            <SelectItem value="paid">Betaald</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Readings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appartement</TableHead>
                <TableHead>Huurder</TableHead>
                <TableHead className="text-right">EBS (kWh)</TableHead>
                <TableHead className="text-right">EBS Kosten</TableHead>
                <TableHead className="text-right">SWM (m³)</TableHead>
                <TableHead className="text-right">SWM Kosten</TableHead>
                <TableHead className="text-right">Totaal</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Geen meterstanden gevonden voor deze periode
                  </TableCell>
                </TableRow>
              ) : (
                filteredReadings.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell className="font-medium">{reading.apartment_name}</TableCell>
                    <TableCell>{reading.tenant_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {reading.ebs_reading !== null ? (
                        <div>
                          <span className="font-medium">{reading.ebs_reading?.toLocaleString()}</span>
                          {reading.ebs_usage !== null && (
                            <span className="text-xs text-gray-500 block">
                              (+{reading.ebs_usage?.toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {reading.ebs_cost ? formatCurrency(reading.ebs_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {reading.swm_reading !== null ? (
                        <div>
                          <span className="font-medium">{reading.swm_reading?.toLocaleString()}</span>
                          {reading.swm_usage !== null && (
                            <span className="text-xs text-gray-500 block">
                              (+{reading.swm_usage?.toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {reading.swm_cost ? formatCurrency(reading.swm_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {reading.total_cost ? formatCurrency(reading.total_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {reading.payment_status === 'paid' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Betaald
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Openstaand
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {reading.payment_status === 'pending' && reading.total_cost > 0 && (
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => {
                              setSelectedReading(reading);
                              setPayConfirmOpen(true);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {reading.payment_status === 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnpay(reading)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(reading)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Unpaid Summary */}
      {summary && summary.unpaid_count > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Openstaande Betalingen</p>
                  <p className="text-sm text-orange-600">
                    {summary.unpaid_count} meterstanden nog niet betaald
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.unpaid_total)}</p>
                <p className="text-sm text-orange-600">Totaal openstaand</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Reading Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meterstand Toevoegen</DialogTitle>
            <DialogDescription>
              Voer de meterstanden in voor een appartement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Appartement *</Label>
              <Select 
                value={formData.apartment_id} 
                onValueChange={(value) => {
                  setFormData({
                    ...formData, 
                    apartment_id: value,
                    tenant_id: getApartmentTenant(value) || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer appartement" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map(apt => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name} {apt.tenant_name ? `(${apt.tenant_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={formData.reading_date}
                onChange={(e) => setFormData({...formData, reading_date: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  EBS Stand (kWh)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="bijv. 12345"
                  value={formData.ebs_reading}
                  onChange={(e) => setFormData({...formData, ebs_reading: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  SWM Stand (m³)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="bijv. 234"
                  value={formData.swm_reading}
                  onChange={(e) => setFormData({...formData, swm_reading: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notities (optioneel)</Label>
              <Input
                placeholder="Extra opmerkingen..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tarieven Instellingen</DialogTitle>
            <DialogDescription>
              Huidige EBS en SWM tarieven voor Suriname
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="ebs">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ebs" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                EBS Tarieven
              </TabsTrigger>
              <TabsTrigger value="swm" className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                SWM Tarieven
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ebs" className="space-y-4 mt-4">
              <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
                {settings?.ebs_tariffs?.map((tier, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-0">
                    <span className="text-gray-700">
                      {tier.min} - {tier.max === Infinity || tier.max > 10000 ? '∞' : tier.max} kWh
                    </span>
                    <span className="font-semibold text-yellow-700">
                      SRD {tier.rate.toFixed(2)} / kWh
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                * Tarieven zijn gebaseerd op officiële EBS tarieven Suriname 2024
              </p>
            </TabsContent>
            
            <TabsContent value="swm" className="space-y-4 mt-4">
              <div className="bg-cyan-50 rounded-lg p-4 space-y-2">
                {settings?.swm_tariffs?.map((tier, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-cyan-200 last:border-0">
                    <span className="text-gray-700">
                      {tier.min} - {tier.max === Infinity || tier.max > 10000 ? '∞' : tier.max} m³
                    </span>
                    <span className="font-semibold text-cyan-700">
                      SRD {tier.rate.toFixed(2)} / m³
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                * Tarieven zijn gebaseerd op officiële SWM tarieven Suriname 2024
              </p>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Betaling Bevestigen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze meterstand als betaald wilt markeren?
              <br /><br />
              <strong>{selectedReading?.apartment_name}</strong>
              <br />
              Bedrag: <strong className="text-emerald-600">{formatCurrency(selectedReading?.total_cost || 0)}</strong>
              <br /><br />
              Dit bedrag wordt automatisch afgetrokken van het kasgeld.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayment} className="bg-emerald-500 hover:bg-emerald-600">
              Betaling Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
