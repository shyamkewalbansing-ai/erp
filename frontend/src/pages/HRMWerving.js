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
import { Target, Plus, Users, Briefcase, MapPin, Calendar, Loader2, Edit, Trash2, Mail, Phone } from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL').format(amount || 0)}`;
};

export default function HRMWerving() {
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVacancyModal, setShowVacancyModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);
  
  const [vacancyForm, setVacancyForm] = useState({
    title: '', department: '', description: '', requirements: '',
    salary_min: '', salary_max: '', currency: 'SRD', employment_type: 'fulltime',
    location: '', deadline: '', status: 'open'
  });
  
  const [applicationForm, setApplicationForm] = useState({
    vacancy_id: '', applicant_name: '', applicant_email: '', applicant_phone: '', cover_letter: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vacanciesRes, applicationsRes, departmentsRes] = await Promise.all([
        api.get('/hrm/vacancies'),
        api.get('/hrm/applications'),
        api.get('/hrm/departments')
      ]);
      setVacancies(vacanciesRes.data || []);
      setApplications(applicationsRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVacancy = async () => {
    if (!vacancyForm.title) { toast.error('Titel is verplicht'); return; }
    setSaving(true);
    try {
      const data = {
        ...vacancyForm,
        salary_min: parseFloat(vacancyForm.salary_min) || null,
        salary_max: parseFloat(vacancyForm.salary_max) || null
      };
      if (editingVacancy) {
        await api.put(`/hrm/vacancies/${editingVacancy.id}`, data);
        toast.success('Vacature bijgewerkt');
      } else {
        await api.post('/hrm/vacancies', data);
        toast.success('Vacature aangemaakt');
      }
      setShowVacancyModal(false);
      setEditingVacancy(null);
      setVacancyForm({ title: '', department: '', description: '', requirements: '', salary_min: '', salary_max: '', currency: 'SRD', employment_type: 'fulltime', location: '', deadline: '', status: 'open' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApplication = async () => {
    if (!applicationForm.applicant_name || !applicationForm.vacancy_id) {
      toast.error('Naam en vacature zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      await api.post('/hrm/applications', applicationForm);
      toast.success('Sollicitatie toegevoegd');
      setShowApplicationModal(false);
      setApplicationForm({ vacancy_id: '', applicant_name: '', applicant_email: '', applicant_phone: '', cover_letter: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleApplicationStatus = async (id, status) => {
    try {
      await api.put(`/hrm/applications/${id}/status?status=${status}`);
      toast.success('Status bijgewerkt');
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleDeleteVacancy = async (id) => {
    try {
      await api.delete(`/hrm/vacancies/${id}`);
      toast.success('Vacature verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-700', on_hold: 'bg-yellow-100 text-yellow-700',
      new: 'bg-blue-100 text-blue-700', reviewing: 'bg-yellow-100 text-yellow-700', interview: 'bg-purple-100 text-purple-700',
      offered: 'bg-orange-100 text-orange-700', hired: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700'
    };
    const labels = {
      open: 'Open', closed: 'Gesloten', on_hold: 'On Hold',
      new: 'Nieuw', reviewing: 'In Review', interview: 'Interview', offered: 'Aangeboden', hired: 'Aangenomen', rejected: 'Afgewezen'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Werving & Selectie</h1>
          <p className="text-muted-foreground mt-1">Beheer vacatures en sollicitaties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowApplicationModal(true)}>
            <Users className="w-4 h-4 mr-2" />Sollicitatie Toevoegen
          </Button>
          <Button onClick={() => { setEditingVacancy(null); setShowVacancyModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />Nieuwe Vacature
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{vacancies.filter(v => v.status === 'open').length}</p>
          <p className="text-sm text-muted-foreground">Open Vacatures</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-600">{applications.filter(a => a.status === 'new').length}</p>
          <p className="text-sm text-muted-foreground">Nieuwe Sollicitaties</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-purple-600">{applications.filter(a => a.status === 'interview').length}</p>
          <p className="text-sm text-muted-foreground">In Interview Fase</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-emerald-600">{applications.filter(a => a.status === 'hired').length}</p>
          <p className="text-sm text-muted-foreground">Aangenomen</p>
        </CardContent></Card>
      </div>

      {/* Vacancies */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Vacatures ({vacancies.length})</CardTitle></CardHeader>
        <CardContent>
          {vacancies.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Geen vacatures. Maak uw eerste vacature aan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vacancies.map(v => (
                <div key={v.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{v.title}</h3>
                      {getStatusBadge(v.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {v.department && <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{v.department}</span>}
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{v.applications_count || 0} sollicitaties</span>
                      {v.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{v.location}</span>}
                      {v.deadline && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Deadline: {new Date(v.deadline).toLocaleDateString('nl-NL')}</span>}
                    </div>
                    {(v.salary_min || v.salary_max) && (
                      <p className="text-primary font-medium mt-2">{formatCurrency(v.salary_min, v.currency)} - {formatCurrency(v.salary_max, v.currency)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingVacancy(v); setVacancyForm(v); setShowVacancyModal(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteVacancy(v.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications */}
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Sollicitaties ({applications.length})</CardTitle></CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Geen sollicitaties ontvangen</div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{app.applicant_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{app.applicant_name}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{app.vacancy_title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        {app.applicant_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.applicant_email}</span>}
                        {app.applicant_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{app.applicant_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <Select value={app.status} onValueChange={(v) => handleApplicationStatus(app.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nieuw</SelectItem>
                      <SelectItem value="reviewing">In Review</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="offered">Aangeboden</SelectItem>
                      <SelectItem value="hired">Aangenomen</SelectItem>
                      <SelectItem value="rejected">Afgewezen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vacancy Modal */}
      <Dialog open={showVacancyModal} onOpenChange={setShowVacancyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingVacancy ? 'Vacature Bewerken' : 'Nieuwe Vacature'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Titel *</Label><Input value={vacancyForm.title} onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Afdeling</Label>
                <Select value={vacancyForm.department} onValueChange={(v) => setVacancyForm({ ...vacancyForm, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={vacancyForm.employment_type} onValueChange={(v) => setVacancyForm({ ...vacancyForm, employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Fulltime</SelectItem>
                    <SelectItem value="parttime">Parttime</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Min. Salaris</Label><Input type="number" value={vacancyForm.salary_min} onChange={(e) => setVacancyForm({ ...vacancyForm, salary_min: e.target.value })} /></div>
              <div><Label>Max. Salaris</Label><Input type="number" value={vacancyForm.salary_max} onChange={(e) => setVacancyForm({ ...vacancyForm, salary_max: e.target.value })} /></div>
            </div>
            <div><Label>Beschrijving</Label><Textarea value={vacancyForm.description} onChange={(e) => setVacancyForm({ ...vacancyForm, description: e.target.value })} rows={3} /></div>
            <div><Label>Deadline</Label><Input type="date" value={vacancyForm.deadline} onChange={(e) => setVacancyForm({ ...vacancyForm, deadline: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVacancyModal(false)}>Annuleren</Button>
            <Button onClick={handleSaveVacancy} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sollicitatie Toevoegen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vacature *</Label>
              <Select value={applicationForm.vacancy_id} onValueChange={(v) => setApplicationForm({ ...applicationForm, vacancy_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>{vacancies.filter(v => v.status === 'open').map(v => <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Naam *</Label><Input value={applicationForm.applicant_name} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>E-mail</Label><Input type="email" value={applicationForm.applicant_email} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_email: e.target.value })} /></div>
              <div><Label>Telefoon</Label><Input value={applicationForm.applicant_phone} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_phone: e.target.value })} /></div>
            </div>
            <div><Label>Motivatie</Label><Textarea value={applicationForm.cover_letter} onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplicationModal(false)}>Annuleren</Button>
            <Button onClick={handleSaveApplication} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
