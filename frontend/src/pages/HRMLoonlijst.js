import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { CreditCard, Plus, Check, DollarSign, Loader2, Edit, Download, User, Calendar } from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
};

export default function HRMLoonlijst() {
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  
  const [formData, setFormData] = useState({
    employee_id: '', period: '', basic_salary: '', currency: 'SRD',
    overtime_hours: 0, overtime_rate: 1.5, bonuses: 0, deductions: 0, tax_amount: 0
  });

  useEffect(() => { loadData(); }, [selectedPeriod]);

  const loadData = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        api.get(`/hrm/payroll?period=${selectedPeriod}`),
        api.get('/hrm/employees')
      ]);
      setPayroll(payrollRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.basic_salary) {
      toast.error('Werknemer en salaris zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...formData,
        period: formData.period || selectedPeriod,
        basic_salary: parseFloat(formData.basic_salary) || 0,
        overtime_hours: parseFloat(formData.overtime_hours) || 0,
        bonuses: parseFloat(formData.bonuses) || 0,
        deductions: parseFloat(formData.deductions) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0
      };
      if (editingPayroll) {
        await api.put(`/hrm/payroll/${editingPayroll.id}`, data);
        toast.success('Loonstrook bijgewerkt');
      } else {
        await api.post('/hrm/payroll', data);
        toast.success('Loonstrook aangemaakt');
      }
      setShowModal(false);
      resetForm();
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await api.post(`/hrm/payroll/generate?period=${selectedPeriod}`);
      toast.success(res.data.message);
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error('Fout bij genereren');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.put(`/hrm/payroll/${id}/${action}`);
      toast.success(action === 'approve' ? 'Loonstrook goedgekeurd' : 'Loonstrook uitbetaald');
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error('Fout bij actie');
    }
  };

  const resetForm = () => {
    setEditingPayroll(null);
    setFormData({
      employee_id: '', period: selectedPeriod, basic_salary: '', currency: 'SRD',
      overtime_hours: 0, overtime_rate: 1.5, bonuses: 0, deductions: 0, tax_amount: 0
    });
  };

  const openEdit = (p) => {
    setEditingPayroll(p);
    setFormData({
      employee_id: p.employee_id,
      period: p.period,
      basic_salary: p.basic_salary?.toString() || '',
      currency: p.currency || 'SRD',
      overtime_hours: p.overtime_hours || 0,
      overtime_rate: p.overtime_rate || 1.5,
      bonuses: p.bonuses || 0,
      deductions: p.deductions || 0,
      tax_amount: p.tax_amount || 0
    });
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700'
    };
    const labels = { draft: 'Concept', approved: 'Goedgekeurd', paid: 'Betaald' };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const totalGross = payroll.reduce((sum, p) => sum + (p.gross_salary || 0), 0);
  const totalNet = payroll.reduce((sum, p) => sum + (p.net_salary || 0), 0);
  const paidCount = payroll.filter(p => p.status === 'paid').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loonlijst</h1>
          <p className="text-muted-foreground mt-1">Beheer salarissen en loonstroken</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="month" 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)} 
            className="w-40"
          />
          <Button variant="outline" onClick={handleGenerate}>
            <Download className="w-4 h-4 mr-2" />Genereren
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />Loonstrook
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold">{payroll.length}</p>
          <p className="text-sm text-muted-foreground">Loonstroken</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalGross)}</p>
          <p className="text-sm text-muted-foreground">Totaal Bruto</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
          <p className="text-sm text-muted-foreground">Totaal Netto</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-600">{paidCount}/{payroll.length}</p>
          <p className="text-sm text-muted-foreground">Uitbetaald</p>
        </CardContent></Card>
      </div>

      {/* Payroll List */}
      {payroll.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Geen loonstroken</h3>
            <p className="text-muted-foreground mb-4">Genereer loonstroken voor periode {selectedPeriod}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleGenerate}><Download className="w-4 h-4 mr-2" />Automatisch Genereren</Button>
              <Button onClick={() => { resetForm(); setShowModal(true); }}><Plus className="w-4 h-4 mr-2" />Handmatig Toevoegen</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payroll.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {p.employee_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{p.employee_name}</h3>
                        {getStatusBadge(p.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Periode: {p.period}</span>
                        {p.overtime_hours > 0 && <span>Overwerk: {p.overtime_hours} uur</span>}
                        {p.bonuses > 0 && <span className="text-green-600">Bonus: {formatCurrency(p.bonuses, p.currency)}</span>}
                        {p.deductions > 0 && <span className="text-red-600">Inhouding: {formatCurrency(p.deductions, p.currency)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Bruto: {formatCurrency(p.gross_salary, p.currency)}</p>
                      <p className="text-xl font-bold text-primary">Netto: {formatCurrency(p.net_salary, p.currency)}</p>
                    </div>
                    <div className="flex gap-1">
                      {p.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(p.id, 'approve')}>
                          <Check className="w-4 h-4 mr-1" />Goedkeuren
                        </Button>
                      )}
                      {p.status === 'approved' && (
                        <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleAction(p.id, 'pay')}>
                          <DollarSign className="w-4 h-4 mr-1" />Uitbetalen
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
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
          <DialogHeader><DialogTitle>{editingPayroll ? 'Loonstrook Bewerken' : 'Nieuwe Loonstrook'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Werknemer *</Label>
              <Select value={formData.employee_id} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setFormData({ ...formData, employee_id: v, basic_salary: emp?.salary?.toString() || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecteer werknemer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({formatCurrency(e.salary)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Periode</Label><Input type="month" value={formData.period || selectedPeriod} onChange={(e) => setFormData({ ...formData, period: e.target.value })} /></div>
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
              <div><Label>Basissalaris *</Label><Input type="number" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} /></div>
              <div><Label>Overwerk Uren</Label><Input type="number" value={formData.overtime_hours} onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })} /></div>
              <div><Label>Bonussen</Label><Input type="number" value={formData.bonuses} onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })} /></div>
              <div><Label>Inhoudingen</Label><Input type="number" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} /></div>
              <div><Label>Belasting</Label><Input type="number" value={formData.tax_amount} onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingPayroll ? 'Bijwerken' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
