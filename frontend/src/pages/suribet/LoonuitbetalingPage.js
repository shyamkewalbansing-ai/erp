import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { 
  Banknote, 
  Plus, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users2,
  Calculator,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LoonuitbetalingPage() {
  const [loading, setLoading] = useState(true);
  const [betalingen, setBetalingen] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBetaling, setSelectedBetaling] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    hours_worked: '',
    days_worked: '',
    base_amount: '',
    bonus: '0',
    deductions: '0',
    advance_payment: '0',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [betalingenRes, werknemersRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/loonbetalingen?date=${selectedDate}`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers })
      ]);

      if (betalingenRes.ok) setBetalingen(await betalingenRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const calculateNetAmount = () => {
    const base = parseFloat(formData.base_amount) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const advance = parseFloat(formData.advance_payment) || 0;
    return base + bonus - deductions - advance;
  };

  // Get selected employee's rates
  const getSelectedEmployee = () => {
    return werknemers.find(w => w.id === formData.employee_id);
  };

  // Auto-calculate base amount based on hours or days worked
  const calculateBaseAmount = (hours, days, employeeId) => {
    const employee = werknemers.find(w => w.id === employeeId);
    if (!employee) return 0;
    
    const hoursAmount = (parseFloat(hours) || 0) * (employee.hourly_rate || 0);
    const daysAmount = (parseFloat(days) || 0) * (employee.daily_rate || 0);
    
    return hoursAmount + daysAmount;
  };

  // Handle form field changes with auto-calculation
  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate base amount when hours, days, or employee changes
    if (field === 'hours_worked' || field === 'days_worked' || field === 'employee_id') {
      const hours = field === 'hours_worked' ? value : newFormData.hours_worked;
      const days = field === 'days_worked' ? value : newFormData.days_worked;
      const employeeId = field === 'employee_id' ? value : newFormData.employee_id;
      
      const calculatedBase = calculateBaseAmount(hours, days, employeeId);
      if (calculatedBase > 0) {
        newFormData.base_amount = calculatedBase.toFixed(2);
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/loonbetalingen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          hours_worked: parseFloat(formData.hours_worked) || 0,
          days_worked: parseFloat(formData.days_worked) || 0,
          base_amount: parseFloat(formData.base_amount) || 0,
          bonus: parseFloat(formData.bonus) || 0,
          deductions: parseFloat(formData.deductions) || 0,
          advance_payment: parseFloat(formData.advance_payment) || 0
        })
      });

      if (response.ok) {
        toast.success('Loonbetaling geregistreerd');
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
      const response = await fetch(`${API_URL}/api/suribet/loonbetalingen/${selectedBetaling.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Loonbetaling verwijderd');
        setShowDeleteDialog(false);
        setSelectedBetaling(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      period_start: '',
      period_end: '',
      hours_worked: '',
      days_worked: '',
      base_amount: '',
      bonus: '0',
      deductions: '0',
      advance_payment: '0',
      notes: ''
    });
  };

  const getWerknemerName = (id) => {
    const werknemer = werknemers.find(w => w.id === id);
    return werknemer?.name || 'Onbekend';
  };

  const stats = {
    total: betalingen.reduce((sum, b) => sum + (b.net_amount || 0), 0),
    count: betalingen.length,
    avgPayment: betalingen.length > 0 
      ? betalingen.reduce((sum, b) => sum + (b.net_amount || 0), 0) / betalingen.length 
      : 0
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-loonuitbetaling-page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Banknote className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Loonuitbetaling</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Salarissen en betalingen beheer</p>
            </div>
          </div>
          
          {/* Date Selector - Per dag */}
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
                className="w-[140px] bg-transparent border-0 text-white text-sm [color-scheme:dark]"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Totaal Uitbetaald</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.total)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Aantal Betalingen</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.count}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Gemiddelde Betaling</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.avgPayment)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <p className="text-muted-foreground text-sm">
              {betalingen.length} betalingen op {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Betaling
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Betalingen List */}
      {betalingen.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {betalingen.map((betaling) => (
            <Card key={betaling.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                      <span className="text-lg font-bold text-emerald-600">
                        {getWerknemerName(betaling.employee_id).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{getWerknemerName(betaling.employee_id)}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(betaling.date)}</span>
                        {betaling.period_start && betaling.period_end && (
                          <span className="text-xs">
                            (Periode: {formatDate(betaling.period_start)} - {formatDate(betaling.period_end)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(betaling.net_amount)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {betaling.hours_worked > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {betaling.hours_worked} uur
                          </span>
                        )}
                        {betaling.days_worked > 0 && (
                          <span>{betaling.days_worked} dagen</span>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { setSelectedBetaling(betaling); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Details Row */}
                <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Basisbedrag</p>
                    <p className="font-medium">{formatCurrency(betaling.base_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bonus</p>
                    <p className="font-medium text-emerald-600">+{formatCurrency(betaling.bonus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Inhoudingen</p>
                    <p className="font-medium text-red-600">-{formatCurrency(betaling.deductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Voorschot</p>
                    <p className="font-medium text-orange-600">-{formatCurrency(betaling.advance_payment)}</p>
                  </div>
                </div>

                {betaling.notes && (
                  <p className="mt-3 text-sm text-muted-foreground">{betaling.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-lg border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Geen betalingen gevonden</h3>
            <p className="text-muted-foreground text-center mb-4">
              Er zijn nog geen loonbetalingen geregistreerd voor deze maand.
            </p>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Eerste Betaling Registreren
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Nieuwe Loonbetaling
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Werknemer *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(v) => handleFormChange('employee_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer werknemer..." />
                </SelectTrigger>
                <SelectContent>
                  {werknemers.filter(w => w.status === 'active').map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.hourly_rate > 0 || w.daily_rate > 0 ? `(${w.hourly_rate > 0 ? `${formatCurrency(w.hourly_rate)}/uur` : ''}${w.hourly_rate > 0 && w.daily_rate > 0 ? ', ' : ''}${w.daily_rate > 0 ? `${formatCurrency(w.daily_rate)}/dag` : ''})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show selected employee's rates */}
              {formData.employee_id && getSelectedEmployee() && (
                <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                  {getSelectedEmployee().hourly_rate > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Uurloon: {formatCurrency(getSelectedEmployee().hourly_rate)}
                    </span>
                  )}
                  {getSelectedEmployee().daily_rate > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dagloon: {formatCurrency(getSelectedEmployee().daily_rate)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Betaaldatum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Periode Start</Label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => handleFormChange('period_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Periode Einde</Label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => handleFormChange('period_end', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gewerkte Uren</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.hours_worked}
                  onChange={(e) => handleFormChange('hours_worked', e.target.value)}
                  placeholder="0"
                />
                {formData.hours_worked && getSelectedEmployee()?.hourly_rate > 0 && (
                  <p className="text-xs text-emerald-600">
                    = {formatCurrency(parseFloat(formData.hours_worked) * getSelectedEmployee().hourly_rate)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gewerkte Dagen</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.days_worked}
                  onChange={(e) => handleFormChange('days_worked', e.target.value)}
                  placeholder="0"
                />
                {formData.days_worked && getSelectedEmployee()?.daily_rate > 0 && (
                  <p className="text-xs text-emerald-600">
                    = {formatCurrency(parseFloat(formData.days_worked) * getSelectedEmployee().daily_rate)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basisbedrag (SRD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_amount}
                  onChange={(e) => handleFormChange('base_amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">Automatisch berekend op basis van uren/dagen</p>
              </div>
              <div className="space-y-2">
                <Label>Bonus (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bonus}
                  onChange={(e) => handleFormChange('bonus', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inhoudingen (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => handleFormChange('deductions', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Voorschot (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.advance_payment}
                  onChange={(e) => handleFormChange('advance_payment', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Net Amount Preview */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Netto Uitbetaling:</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(calculateNetAmount())}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notities</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optionele notities"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={!formData.employee_id || !formData.base_amount}>
                Registreren
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loonbetaling Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze loonbetaling wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt en de bijbehorende kasboek entry wordt ook verwijderd.
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
