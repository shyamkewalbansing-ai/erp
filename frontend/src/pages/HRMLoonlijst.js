import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  CreditCard, Plus, Check, DollarSign, Loader2, Edit, Download, 
  Calendar, BookOpen, Calculator, FileText, Info, ChevronDown, 
  ChevronUp, Building2, Percent, Users
} from 'lucide-react';
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
  const [taxReport, setTaxReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [payingPayroll, setPayingPayroll] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('loonstroken');
  const [expandedRow, setExpandedRow] = useState(null);
  
  const [formData, setFormData] = useState({
    employee_id: '', period: '', basic_salary: '', currency: 'SRD',
    overtime_hours: 0, overtime_rate: 1.5, bonuses: 0, deductions: 0, tax_amount: 0
  });

  const loadData = useCallback(async () => {
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
  }, [selectedPeriod]);

  const loadTaxReport = async () => {
    try {
      const res = await api.get('/hrm/payroll/tax-report');
      setTaxReport(res.data);
    } catch (error) {
      console.error('Error loading tax report:', error);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (activeTab === 'belasting') loadTaxReport(); }, [activeTab]);

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
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      // Use the tax-aware generation endpoint
      const res = await api.post(`/hrm/payroll/generate-with-tax?period=${selectedPeriod}`);
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      // Fallback to regular generation
      try {
        const res = await api.post(`/hrm/payroll/generate?period=${selectedPeriod}`);
        toast.success(res.data.message);
        loadData();
      } catch (e) {
        toast.error('Fout bij genereren');
      }
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.put(`/hrm/payroll/${id}/${action}`);
      toast.success(action === 'approve' ? 'Loonstrook goedgekeurd' : 'Loonstrook uitbetaald');
      loadData();
    } catch (error) {
      toast.error('Fout bij actie');
    }
  };

  // Pay with journal entry (grootboek koppeling)
  const handlePayWithJournal = async () => {
    if (!payingPayroll) return;
    setSaving(true);
    try {
      const res = await api.put(`/hrm/payroll/${payingPayroll.id}/pay-with-journal?create_journal=true`);
      toast.success('Salaris uitbetaald en geboekt in grootboek!');
      setShowPayModal(false);
      setPayingPayroll(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij uitbetalen');
    } finally {
      setSaving(false);
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

  const openPayModal = (p) => {
    setPayingPayroll(p);
    setShowPayModal(true);
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

  // Calculate totals
  const totals = useMemo(() => {
    return {
      gross: payroll.reduce((sum, p) => sum + (p.gross_salary || p.basic_salary || 0), 0),
      net: payroll.reduce((sum, p) => sum + (p.net_salary || 0), 0),
      incomeTax: payroll.reduce((sum, p) => sum + (p.income_tax || 0), 0),
      aov: payroll.reduce((sum, p) => sum + (p.aov_contribution || 0), 0),
      paidCount: payroll.filter(p => p.status === 'paid').length
    };
  }, [payroll]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loonlijst</h1>
          <p className="text-muted-foreground mt-1">Beheer salarissen, belastingen en grootboek koppelingen</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="month" 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)} 
            className="w-40"
            data-testid="period-selector"
          />
          <Button variant="outline" onClick={handleGenerate} data-testid="generate-payroll-btn">
            <Calculator className="w-4 h-4 mr-2" />Genereren
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-payroll-btn">
            <Plus className="w-4 h-4 mr-2" />Loonstrook
          </Button>
        </div>
      </div>

      {/* Grootboek Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <BookOpen className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Grootboek Koppeling:</strong> Bij uitbetaling worden automatisch journaalposten aangemaakt:
          <span className="ml-2 text-sm">
            6000 (Salarissen) | 2360 (Loonbelasting) | 2380 (AOV-premie) | 1500 (Bank)
          </span>
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="loonstroken" data-testid="tab-loonstroken">
            <CreditCard className="w-4 h-4 mr-2" />Loonstroken
          </TabsTrigger>
          <TabsTrigger value="belasting" data-testid="tab-belasting">
            <Percent className="w-4 h-4 mr-2" />Belasting Overzicht
          </TabsTrigger>
          <TabsTrigger value="grootboek" data-testid="tab-grootboek">
            <BookOpen className="w-4 h-4 mr-2" />Grootboek Info
          </TabsTrigger>
        </TabsList>

        {/* Tab: Loonstroken */}
        <TabsContent value="loonstroken" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{payroll.length}</p>
                <p className="text-sm text-muted-foreground">Loonstroken</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-primary">{formatCurrency(totals.gross)}</p>
                <p className="text-sm text-muted-foreground">Totaal Bruto</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.incomeTax)}</p>
                <p className="text-sm text-muted-foreground">Loonbelasting</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.aov)}</p>
                <p className="text-sm text-muted-foreground">AOV Premie</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.net)}</p>
                <p className="text-sm text-muted-foreground">Totaal Netto</p>
              </CardContent>
            </Card>
          </div>

          {/* Payroll List */}
          {payroll.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Geen loonstroken</h3>
                <p className="text-muted-foreground mb-4">Genereer loonstroken voor periode {selectedPeriod}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleGenerate}>
                    <Calculator className="w-4 h-4 mr-2" />Met Belastingberekening
                  </Button>
                  <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Handmatig Toevoegen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {payroll.map(p => (
                <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow" data-testid={`payroll-card-${p.id}`}>
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
                            {p.journal_entry_id && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <BookOpen className="w-3 h-3 mr-1" />Geboekt
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />Periode: {p.period}
                            </span>
                            {(p.income_tax > 0 || p.aov_contribution > 0) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs"
                                onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                              >
                                {expandedRow === p.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                                Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Bruto: {formatCurrency(p.gross_salary || p.basic_salary, p.currency)}
                          </p>
                          <p className="text-xl font-bold text-primary">
                            Netto: {formatCurrency(p.net_salary, p.currency)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {p.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handleAction(p.id, 'approve')} data-testid={`approve-btn-${p.id}`}>
                              <Check className="w-4 h-4 mr-1" />Goedkeuren
                            </Button>
                          )}
                          {p.status === 'approved' && (
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600" 
                              onClick={() => openPayModal(p)}
                              data-testid={`pay-btn-${p.id}`}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />Uitbetalen
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-btn-${p.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedRow === p.id && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Bruto Salaris</p>
                          <p className="font-semibold">{formatCurrency(p.gross_salary || p.basic_salary, p.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Loonbelasting</p>
                          <p className="font-semibold text-orange-600">- {formatCurrency(p.income_tax || 0, p.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">AOV Premie (4%)</p>
                          <p className="font-semibold text-purple-600">- {formatCurrency(p.aov_contribution || 0, p.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Netto Salaris</p>
                          <p className="font-semibold text-green-600">{formatCurrency(p.net_salary, p.currency)}</p>
                        </div>
                        {p.taxable_income > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Belastbaar Inkomen</p>
                            <p className="font-semibold">{formatCurrency(p.taxable_income, p.currency)}</p>
                            <p className="text-xs text-muted-foreground">(Na aftrek belastingvrije som van SRD 9.000)</p>
                          </div>
                        )}
                        {p.effective_tax_rate > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Effectief Belastingtarief</p>
                            <p className="font-semibold">{p.effective_tax_rate}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Belasting Overzicht */}
        <TabsContent value="belasting" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Belasting Rapport
              </CardTitle>
              <CardDescription>
                Overzicht van loonbelasting en AOV-premies per periode
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taxReport ? (
                <div className="space-y-6">
                  {/* Tax Rates Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Suriname Belastingtarieven (2024)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Schijf 1 (0-3.500)</p>
                        <p className="font-medium">8%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Schijf 2 (3.501-7.000)</p>
                        <p className="font-medium">18%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Schijf 3 (7.001-10.500)</p>
                        <p className="font-medium">28%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Schijf 4 (boven 10.500)</p>
                        <p className="font-medium">38%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Belastingvrije som</p>
                        <p className="font-medium">SRD 9.000/maand</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AOV Premie</p>
                        <p className="font-medium">4%</p>
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(taxReport.totals?.total_gross || 0)}</p>
                        <p className="text-sm text-blue-600">Totaal Bruto</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4">
                        <p className="text-2xl font-bold text-orange-700">{formatCurrency(taxReport.totals?.total_income_tax || 0)}</p>
                        <p className="text-sm text-orange-600">Totaal Loonbelasting</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4">
                        <p className="text-2xl font-bold text-purple-700">{formatCurrency(taxReport.totals?.total_aov || 0)}</p>
                        <p className="text-sm text-purple-600">Totaal AOV Premie</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(taxReport.totals?.total_net || 0)}</p>
                        <p className="text-sm text-green-600">Totaal Netto</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Period Breakdown */}
                  {taxReport.periods && taxReport.periods.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Per Periode</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-3 text-left">Periode</th>
                              <th className="p-3 text-right">Werknemers</th>
                              <th className="p-3 text-right">Bruto</th>
                              <th className="p-3 text-right">Loonbelasting</th>
                              <th className="p-3 text-right">AOV</th>
                              <th className="p-3 text-right">Netto</th>
                              <th className="p-3 text-right">Betaald</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taxReport.periods.map((period, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{period.period}</td>
                                <td className="p-3 text-right">{period.employee_count}</td>
                                <td className="p-3 text-right">{formatCurrency(period.gross_salary)}</td>
                                <td className="p-3 text-right text-orange-600">{formatCurrency(period.income_tax)}</td>
                                <td className="p-3 text-right text-purple-600">{formatCurrency(period.aov_contribution)}</td>
                                <td className="p-3 text-right text-green-600">{formatCurrency(period.net_salary)}</td>
                                <td className="p-3 text-right">
                                  <Badge variant={period.paid_count === period.employee_count ? 'default' : 'secondary'}>
                                    {period.paid_count}/{period.employee_count}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  Belastingrapport laden...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Grootboek Info */}
        <TabsContent value="grootboek" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Grootboek Koppeling - Salarisadministratie
              </CardTitle>
              <CardDescription>
                Hoe salarisbetalingen worden geboekt in het grootboek
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Explanation */}
              <div className="prose prose-sm max-w-none">
                <p>
                  Bij het uitbetalen van een loonstrook worden automatisch journaalposten aangemaakt 
                  in het grootboek. Dit zorgt voor een correcte financiële administratie waarbij 
                  loonbelasting en AOV-premie als schulden worden geboekt.
                </p>
              </div>

              {/* Journal Entry Example */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Voorbeeld Journaalpost (Salarisbetaling)</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 text-left">Rekening</th>
                      <th className="p-2 text-left">Omschrijving</th>
                      <th className="p-2 text-right">Debet</th>
                      <th className="p-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-mono">6000</td>
                      <td className="p-2">Salarissen (Kosten)</td>
                      <td className="p-2 text-right text-blue-600">SRD 15.000,00</td>
                      <td className="p-2 text-right">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">2360</td>
                      <td className="p-2">Loonbelasting te betalen</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right text-orange-600">SRD 1.200,00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">2380</td>
                      <td className="p-2">AOV-premie te betalen</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right text-purple-600">SRD 600,00</td>
                    </tr>
                    <tr className="border-b bg-green-50">
                      <td className="p-2 font-mono">1500</td>
                      <td className="p-2">Bank (Netto uitbetaling)</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right text-green-600">SRD 13.200,00</td>
                    </tr>
                    <tr className="font-semibold bg-gray-100">
                      <td className="p-2" colSpan="2">Totaal</td>
                      <td className="p-2 text-right">SRD 15.000,00</td>
                      <td className="p-2 text-right">SRD 15.000,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Account Codes */}
              <div>
                <h4 className="font-semibold mb-3">Gebruikte Grootboekrekeningen</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono bg-blue-200 px-2 py-1 rounded text-sm">6000</span>
                        <span className="font-semibold">Salarissen</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Kostenrekening voor bruto salarissen. Wordt gedebiteerd bij uitbetaling.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono bg-orange-200 px-2 py-1 rounded text-sm">2360</span>
                        <span className="font-semibold">Loonbelasting te betalen</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Schuld aan de Belastingdienst. Wordt gecrediteerd bij inhouding.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono bg-purple-200 px-2 py-1 rounded text-sm">2380</span>
                        <span className="font-semibold">AOV-premie te betalen</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Schuld voor AOV (Algemene Ouderdomsvoorziening). 4% van bruto salaris.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono bg-green-200 px-2 py-1 rounded text-sm">1500</span>
                        <span className="font-semibold">Bank</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Bankrekening. Wordt gecrediteerd voor de netto uitbetaling.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPayroll ? 'Loonstrook Bewerken' : 'Nieuwe Loonstrook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werknemer *</Label>
              <Select value={formData.employee_id} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setFormData({ ...formData, employee_id: v, basic_salary: emp?.salary?.toString() || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecteer werknemer" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name || `${e.first_name} ${e.last_name}`} ({formatCurrency(e.salary)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Periode</Label>
                <Input type="month" value={formData.period || selectedPeriod} onChange={(e) => setFormData({ ...formData, period: e.target.value })} />
              </div>
              <div>
                <Label>Valuta</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - Amerikaanse Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Basissalaris *</Label>
                <Input type="number" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} />
              </div>
              <div>
                <Label>Overwerk Uren</Label>
                <Input type="number" value={formData.overtime_hours} onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })} />
              </div>
              <div>
                <Label>Bonussen</Label>
                <Input type="number" value={formData.bonuses} onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })} />
              </div>
              <div>
                <Label>Inhoudingen</Label>
                <Input type="number" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPayroll ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay with Journal Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Salaris Uitbetalen
            </DialogTitle>
            <DialogDescription>
              Bij uitbetaling wordt automatisch een journaalpost aangemaakt in het grootboek.
            </DialogDescription>
          </DialogHeader>
          
          {payingPayroll && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Werknemer:</span>
                  <span className="font-semibold">{payingPayroll.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periode:</span>
                  <span>{payingPayroll.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bruto Salaris:</span>
                  <span>{formatCurrency(payingPayroll.gross_salary || payingPayroll.basic_salary, payingPayroll.currency)}</span>
                </div>
                {payingPayroll.income_tax > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Loonbelasting:</span>
                    <span>- {formatCurrency(payingPayroll.income_tax, payingPayroll.currency)}</span>
                  </div>
                )}
                {payingPayroll.aov_contribution > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>AOV Premie:</span>
                    <span>- {formatCurrency(payingPayroll.aov_contribution, payingPayroll.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Netto Uitbetaling:</span>
                  <span className="text-green-600">{formatCurrency(payingPayroll.net_salary, payingPayroll.currency)}</span>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  De volgende grootboekrekeningen worden bijgewerkt:
                  <ul className="mt-1 list-disc list-inside">
                    <li>6000 Salarissen (Debet)</li>
                    <li>2360 Loonbelasting te betalen (Credit)</li>
                    <li>2380 AOV-premie te betalen (Credit)</li>
                    <li>1500 Bank (Credit)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>Annuleren</Button>
            <Button onClick={handlePayWithJournal} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <BookOpen className="w-4 h-4 mr-2" />
              Uitbetalen & Boeken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
