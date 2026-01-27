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
import { FileSignature, Plus, Calendar, DollarSign, Loader2, Edit, Trash2, Clock, User } from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL').format(amount || 0)}`;
};

export default function HRMContracten() {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  
  const [formData, setFormData] = useState({
    employee_id: '', contract_type: 'permanent', start_date: '', end_date: '',
    salary: '', currency: 'SRD', working_hours: 40, position: '', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [contractsRes, employeesRes] = await Promise.all([
        api.get('/hrm/contracts'),
        api.get('/hrm/employees')
      ]);
      setContracts(contractsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.start_date) {
      toast.error('Werknemer en startdatum zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      const data = { ...formData, salary: parseFloat(formData.salary) || 0 };
      if (editingContract) {
        await api.put(`/hrm/contracts/${editingContract.id}`, data);
        toast.success('Contract bijgewerkt');
      } else {
        await api.post('/hrm/contracts', data);
        toast.success('Contract aangemaakt');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit contract wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/contracts/${id}`);
      toast.success('Contract verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingContract(null);
    setFormData({ employee_id: '', contract_type: 'permanent', start_date: '', end_date: '', salary: '', currency: 'SRD', working_hours: 40, position: '', notes: '' });
  };

  const openEdit = (contract) => {
    setEditingContract(contract);
    setFormData({
      employee_id: contract.employee_id,
      contract_type: contract.contract_type,
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      salary: contract.salary?.toString() || '',
      currency: contract.currency || 'SRD',
      working_hours: contract.working_hours || 40,
      position: contract.position || '',
      notes: contract.notes || ''
    });
    setShowModal(true);
  };

  const getContractTypeBadge = (type) => {
    const styles = {
      permanent: 'bg-green-100 text-green-700',
      temporary: 'bg-blue-100 text-blue-700',
      freelance: 'bg-purple-100 text-purple-700',
      internship: 'bg-orange-100 text-orange-700'
    };
    const labels = { permanent: 'Vast', temporary: 'Tijdelijk', freelance: 'Freelance', internship: 'Stage' };
    return <Badge className={styles[type]}>{labels[type] || type}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracten</h1>
          <p className="text-muted-foreground mt-1">Beheer arbeidscontracten van uw werknemers</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nieuw Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold">{contracts.length}</p>
          <p className="text-sm text-muted-foreground">Totaal Contracten</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{contracts.filter(c => c.contract_type === 'permanent').length}</p>
          <p className="text-sm text-muted-foreground">Vast</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-600">{contracts.filter(c => c.contract_type === 'temporary').length}</p>
          <p className="text-sm text-muted-foreground">Tijdelijk</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-orange-600">{contracts.filter(c => c.end_date && new Date(c.end_date) <= new Date(Date.now() + 30*24*60*60*1000)).length}</p>
          <p className="text-sm text-muted-foreground">Binnenkort Aflopend</p>
        </CardContent></Card>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <FileSignature className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Geen contracten</h3>
            <p className="text-muted-foreground mb-4">Maak uw eerste arbeidscontract aan</p>
            <Button onClick={() => { resetForm(); setShowModal(true); }}><Plus className="w-4 h-4 mr-2" />Contract Aanmaken</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map(contract => (
            <Card key={contract.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileSignature className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{contract.employee_name}</h3>
                        {getContractTypeBadge(contract.contract_type)}
                      </div>
                      <p className="text-muted-foreground">{contract.position || 'Geen functie'}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{contract.start_date} - {contract.end_date || 'Onbepaald'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{contract.working_hours} uur/week</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{formatCurrency(contract.salary, contract.currency)}</p>
                      <p className="text-xs text-muted-foreground">per maand</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(contract)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(contract.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingContract ? 'Contract Bewerken' : 'Nieuw Contract'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Werknemer *</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer werknemer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type Contract</Label>
                <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Vast</SelectItem>
                    <SelectItem value="temporary">Tijdelijk</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Functie</Label><Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} /></div>
              <div><Label>Startdatum *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
              <div><Label>Einddatum</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
              <div><Label>Salaris</Label><Input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} /></div>
              <div><Label>Valuta</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - Amerikaanse Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Werkuren/week</Label><Input type="number" value={formData.working_hours} onChange={(e) => setFormData({ ...formData, working_hours: parseInt(e.target.value) || 40 })} /></div>
            </div>
            <div><Label>Notities</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingContract ? 'Bijwerken' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
