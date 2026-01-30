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

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
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
  };

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
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
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
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwerken betaling');
    }
  };

  const handleUnpay = async (reading) => {
    try {
      await api.post(`/meter-readings/${reading.id}/unpay`);
      toast.success('Betaling ongedaan gemaakt');
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij ongedaan maken');
    }
  };

  const handleDelete = async (reading) => {
    if (!confirm('Weet u zeker dat u deze meterstand wilt verwijderen?')) return;
    
    try {
      await api.delete(`/meter-readings/${reading.id}`);
      toast.success('Meterstand verwijderd');
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meterstanden</h1>
          <p className="text-gray-500">EBS & SWM meterstanden beheren</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Tarieven
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Meterstand Toevoegen
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-lg p-4 shadow-sm border">
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center min-w-[200px]">
          <h2 className="text-xl font-semibold">{MONTHS[selectedMonth - 1]} {selectedYear}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ingediend</p>
                  <p className="text-xl font-bold">{summary.submitted_count} / {summary.total_apartments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">EBS Totaal</p>
                  <p className="text-xl font-bold">{summary.total_ebs_usage.toLocaleString()} kWh</p>
                  <p className="text-sm text-emerald-600">{formatCurrency(summary.total_ebs_cost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">SWM Totaal</p>
                  <p className="text-xl font-bold">{summary.total_swm_usage.toLocaleString()} m³</p>
                  <p className="text-sm text-emerald-600">{formatCurrency(summary.total_swm_cost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={summary.unpaid_count > 0 ? 'border-orange-300 bg-orange-50' : 'border-emerald-300 bg-emerald-50'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${summary.unpaid_count > 0 ? 'bg-orange-200' : 'bg-emerald-200'}`}>
                  <Receipt className={`w-5 h-5 ${summary.unpaid_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Totaal Kosten</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.total_cost)}</p>
                  <p className={`text-sm ${summary.unpaid_count > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {summary.paid_count} betaald, {summary.unpaid_count} openstaand
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Zoeken op appartement of huurder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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
