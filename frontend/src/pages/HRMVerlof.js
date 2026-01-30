import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calendar, Plus, Check, X, Loader2, CalendarDays, User, Clock } from 'lucide-react';
import api from '../lib/api';

export default function HRMVerlof() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [leaveRes, employeesRes] = await Promise.all([
        api.get('/hrm/leave-requests'),
        api.get('/hrm/employees')
      ]);
      setLeaveRequests(leaveRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      toast.error('Alle velden zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      await api.post('/hrm/leave-requests', formData);
      toast.success('Verlofaanvraag ingediend');
      setShowModal(false);
      setFormData({ employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij indienen');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/hrm/leave-requests/${id}?status=${status}`);
      toast.success(status === 'approved' ? 'Verlof goedgekeurd' : 'Verlof afgewezen');
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/hrm/leave-requests/${id}`);
      toast.success('Aanvraag verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200'
    };
    const labels = { pending: 'In Afwachting', approved: 'Goedgekeurd', rejected: 'Afgewezen' };
    return <Badge variant="outline" className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const getLeaveTypeBadge = (type) => {
    const styles = {
      vacation: 'bg-blue-100 text-blue-700',
      sick: 'bg-red-100 text-red-700',
      personal: 'bg-purple-100 text-purple-700',
      maternity: 'bg-pink-100 text-pink-700',
      paternity: 'bg-cyan-100 text-cyan-700',
      unpaid: 'bg-gray-100 text-gray-700'
    };
    const labels = { vacation: 'Vakantie', sick: 'Ziekte', personal: 'Persoonlijk', maternity: 'Zwangerschap', paternity: 'Vaderschap', unpaid: 'Onbetaald' };
    return <Badge className={styles[type]}>{labels[type] || type}</Badge>;
  };

  const filteredRequests = filterStatus === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(r => r.status === filterStatus);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verlofbeheer</h1>
          <p className="text-muted-foreground mt-1">Beheer verlofaanvragen van uw werknemers</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />Verlof Aanvragen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold">{leaveRequests.length}</p>
          <p className="text-sm text-muted-foreground">Totaal Aanvragen</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-yellow-500"><CardContent className="p-4">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">In Afwachting</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{leaveRequests.filter(r => r.status === 'approved').length}</p>
          <p className="text-sm text-muted-foreground">Goedgekeurd</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-red-600">{leaveRequests.filter(r => r.status === 'rejected').length}</p>
          <p className="text-sm text-muted-foreground">Afgewezen</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Statussen</SelectItem>
              <SelectItem value="pending">In Afwachting</SelectItem>
              <SelectItem value="approved">Goedgekeurd</SelectItem>
              <SelectItem value="rejected">Afgewezen</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      {filteredRequests.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Geen verlofaanvragen</h3>
            <p className="text-muted-foreground mb-4">Er zijn geen verlofaanvragen met deze status</p>
            <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Verlof Aanvragen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map(req => (
            <Card key={req.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {req.employee_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{req.employee_name}</h3>
                        {getStatusBadge(req.status)}
                        {getLeaveTypeBadge(req.leave_type)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(req.start_date).toLocaleDateString('nl-NL')} - {new Date(req.end_date).toLocaleDateString('nl-NL')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {req.days} dag(en)
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-sm mt-2 italic text-muted-foreground">&quot;{req.reason}&quot;</p>
                      )}
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleStatus(req.id, 'approved')}
                      >
                        <Check className="w-4 h-4 mr-2" />Goedkeuren
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleStatus(req.id, 'rejected')}
                      >
                        <X className="w-4 h-4 mr-2" />Afwijzen
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verlof Aanvragen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Werknemer *</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer werknemer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type Verlof</Label>
              <Select value={formData.leave_type} onValueChange={(v) => setFormData({ ...formData, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vakantie</SelectItem>
                  <SelectItem value="sick">Ziekte</SelectItem>
                  <SelectItem value="personal">Persoonlijk</SelectItem>
                  <SelectItem value="maternity">Zwangerschapsverlof</SelectItem>
                  <SelectItem value="paternity">Vaderschapsverlof</SelectItem>
                  <SelectItem value="unpaid">Onbetaald Verlof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Startdatum *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
              <div><Label>Einddatum *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Reden</Label><Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} placeholder="Optionele toelichting..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Indienen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
