import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Calendar,
  Plus,
  Clock,
  User,
  Scissors,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Phone
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const statusColors = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Gepland' },
  confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Bevestigd' },
  in_progress: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Bezig' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Afgerond' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Geannuleerd' },
  no_show: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'No-show' },
  rescheduled: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Verzet' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    client_id: '',
    treatment_id: '',
    staff_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: '',
    is_walk_in: false
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptRes, clientRes, treatmentRes, staffRes] = await Promise.all([
        axios.get(`${API_URL}/beautyspa/appointments?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/beautyspa/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/beautyspa/treatments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/beautyspa/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAppointments(aptRes.data);
      setClients(clientRes.data);
      setTreatments(treatmentRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API_URL}/beautyspa/appointments`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Afspraak aangemaakt');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      await axios.put(`${API_URL}/beautyspa/appointments/${appointmentId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status bijgewerkt');
      fetchData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      await axios.post(`${API_URL}/beautyspa/appointments/${appointmentId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Afspraak afgerond');
      fetchData();
    } catch (error) {
      toast.error('Fout bij afronden');
    }
  };

  const markNoShow = async (appointmentId) => {
    try {
      await axios.post(`${API_URL}/beautyspa/appointments/${appointmentId}/no-show`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Gemarkeerd als no-show');
      fetchData();
    } catch (error) {
      toast.error('Fout bij markeren');
    }
  };

  const resetForm = () => {
    setForm({
      client_id: '',
      treatment_id: '',
      staff_id: '',
      appointment_date: selectedDate,
      appointment_time: '',
      notes: '',
      is_walk_in: false
    });
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().slice(0, 10));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Group appointments by time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-appointments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Afsprakenbeheer</h1>
          <p className="text-slate-600">Beheer en plan afspraken</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Afspraak
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nieuwe Afspraak</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Klant *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({...form, client_id: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer klant" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Behandeling *</Label>
                <Select value={form.treatment_id} onValueChange={(v) => setForm({...form, treatment_id: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer behandeling" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} - {t.duration_minutes} min - SRD {t.price_srd}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Medewerker *</Label>
                <Select value={form.staff_id} onValueChange={(v) => setForm({...form, staff_id: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer medewerker" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - {s.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Datum *</Label>
                  <Input
                    type="date"
                    value={form.appointment_date}
                    onChange={(e) => setForm({...form, appointment_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd *</Label>
                  <Select value={form.appointment_time} onValueChange={(v) => setForm({...form, appointment_time: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer tijd" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notities</Label>
                <textarea
                  className="w-full min-h-[60px] px-3 py-2 border rounded-lg resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Extra notities..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="walk_in"
                  checked={form.is_walk_in}
                  onChange={(e) => setForm({...form, is_walk_in: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="walk_in" className="cursor-pointer">Walk-in klant</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                  Afspraak Maken
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vorige
            </Button>
            <div className="flex items-center gap-4">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <h2 className="font-semibold text-slate-900 hidden md:block">
                {formatDate(selectedDate)}
              </h2>
            </div>
            <Button variant="outline" onClick={() => changeDate(1)}>
              Volgende
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today Button */}
      {selectedDate !== new Date().toISOString().slice(0, 10) && (
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Naar Vandaag
        </Button>
      )}

      {/* Appointments List */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen afspraken</h3>
            <p className="text-slate-500 mb-4">Er zijn geen afspraken voor deze dag</p>
            <Button onClick={() => { resetForm(); setForm(f => ({...f, appointment_date: selectedDate})); setIsDialogOpen(true); }} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Afspraak
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map((apt) => {
            const status = statusColors[apt.status] || statusColors.scheduled;
            return (
              <Card key={apt.id} className={`border-l-4 ${apt.status === 'completed' ? 'border-l-green-500' : apt.status === 'in_progress' ? 'border-l-teal-500' : 'border-l-emerald-500'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex flex-col items-center justify-center text-white">
                        <span className="text-lg font-bold">{apt.appointment_time}</span>
                        <span className="text-xs opacity-80">{apt.treatment_duration}min</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{apt.client_name}</h3>
                          <Badge className={`${status.bg} ${status.text}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-emerald-600 font-medium">{apt.treatment_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {apt.staff_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {apt.client_phone}
                          </span>
                          <span className="font-medium text-emerald-600">
                            SRD {apt.treatment_price?.toLocaleString()}
                          </span>
                        </div>
                        {apt.notes && (
                          <p className="mt-2 text-sm text-slate-500 italic">"{apt.notes}"</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      {apt.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateStatus(apt.id, 'confirmed')}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Bevestigen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Annuleren
                          </Button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => updateStatus(apt.id, 'in_progress')}
                          >
                            Start Behandeling
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => markNoShow(apt.id)}
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            No-show
                          </Button>
                        </>
                      )}
                      {apt.status === 'in_progress' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => completeAppointment(apt.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Afronden
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
