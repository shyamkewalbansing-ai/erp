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
import { Clock, Plus, Play, Check, User, Scissors, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function QueuePage() {
  const [queue, setQueue] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [form, setForm] = useState({ client_name: '', phone: '', treatment_id: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [queueRes, treatmentRes, staffRes] = await Promise.all([
        axios.get(`${API_URL}/beautyspa/queue`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/treatments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/staff`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setQueue(queueRes.data);
      setTreatments(treatmentRes.data);
      setStaff(staffRes.data);
    } catch (error) { toast.error('Fout bij laden'); }
    finally { setLoading(false); }
  };

  const handleAddToQueue = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams({
        client_name: form.client_name,
        treatment_id: form.treatment_id,
        ...(form.phone && { phone: form.phone })
      });
      const res = await axios.post(`${API_URL}/beautyspa/queue?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      setIsDialogOpen(false);
      setForm({ client_name: '', phone: '', treatment_id: '' });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Fout'); }
  };

  const startService = async (queueId, staffId) => {
    try {
      await axios.post(`${API_URL}/beautyspa/queue/${queueId}/start?staff_id=${staffId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Service gestart');
      fetchData();
    } catch (error) { toast.error('Fout'); }
  };

  const completeService = async (queueId) => {
    try {
      await axios.post(`${API_URL}/beautyspa/queue/${queueId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Service afgerond');
      fetchData();
    } catch (error) { toast.error('Fout'); }
  };

  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const inServiceQueue = queue.filter(q => q.status === 'in_service');

  return (
    <div className="max-w-5xl mx-auto" data-testid="beautyspa-queue-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Walk-in Wachtrij</h1>
          <p className="text-slate-600">Beheer walk-in klanten</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" /> Vernieuwen</Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600">
                <Plus className="w-4 h-4 mr-2" /> Walk-in Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Walk-in Toevoegen</DialogTitle></DialogHeader>
              <form onSubmit={handleAddToQueue} className="space-y-4">
                <div className="space-y-2">
                  <Label>Klantnaam *</Label>
                  <Input value={form.client_name} onChange={(e) => setForm({...form, client_name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon (optioneel)</Label>
                  <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Behandeling *</Label>
                  <Select value={form.treatment_id} onValueChange={(v) => setForm({...form, treatment_id: v})} required>
                    <SelectTrigger><SelectValue placeholder="Selecteer behandeling" /></SelectTrigger>
                    <SelectContent>
                      {treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name} - {t.duration_minutes}min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
                  Toevoegen aan Wachtrij
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Waiting */}
        <Card>
          <CardHeader className="bg-amber-50 border-b">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="w-5 h-5" /> Wachtend ({waitingQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="animate-pulse h-20 bg-slate-100 rounded"></div>
            ) : waitingQueue.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Geen wachtende klanten</p>
            ) : (
              waitingQueue.map((item) => (
                <div key={item.id} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                        #{item.queue_number}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.client_name}</p>
                        <p className="text-sm text-slate-500">{item.treatment_name}</p>
                      </div>
                    </div>
                  </div>
                  <Select onValueChange={(staffId) => startService(item.id, staffId)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Start met medewerker..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.filter(s => s.role === 'therapist').map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* In Service */}
        <Card>
          <CardHeader className="bg-purple-50 border-b">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Play className="w-5 h-5" /> In Behandeling ({inServiceQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="animate-pulse h-20 bg-slate-100 rounded"></div>
            ) : inServiceQueue.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Niemand in behandeling</p>
            ) : (
              inServiceQueue.map((item) => (
                <div key={item.id} className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        #{item.queue_number}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.client_name}</p>
                        <p className="text-sm text-slate-500">{item.treatment_name}</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => completeService(item.id)}>
                      <Check className="w-4 h-4 mr-1" /> Klaar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
