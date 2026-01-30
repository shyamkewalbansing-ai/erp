import { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Building2, Calendar, Clock, DollarSign, 
  Search, Filter, Check, X, Edit, Trash2, Plus, Loader2,
  Mail, Phone, Briefcase, CalendarDays, FileText, Settings,
  TrendingUp, AlertTriangle, Download, Upload, Play, Square,
  CreditCard, BarChart3, PieChart, Target, UserCheck, ClipboardList
} from 'lucide-react';
import api from '../lib/api';

// Currency formatting helper
const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, color = 'emerald', onClick }) => (
  <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${onClick ? 'hover:border-primary' : ''}`} onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 bg-${color}-100 rounded-xl`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold truncate">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function HRM() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  
  // Dialog states
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [contractDialog, setContractDialog] = useState(false);
  const [vacancyDialog, setVacancyDialog] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [payrollDialog, setPayrollDialog] = useState(false);
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [applicationDialog, setApplicationDialog] = useState(false);
  const [accountDialog, setAccountDialog] = useState(false);
  
  // Employee accounts state
  const [employeeAccounts, setEmployeeAccounts] = useState([]);
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', phone: '', position: '', department: '',
    salary: '', hire_date: '', birth_date: '', address: '',
    id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
  });
  
  const [contractForm, setContractForm] = useState({
    employee_id: '', contract_type: 'permanent', start_date: '', end_date: '',
    salary: '', currency: 'SRD', working_hours: 40, position: '', notes: ''
  });
  
  const [vacancyForm, setVacancyForm] = useState({
    title: '', department: '', description: '', requirements: '',
    salary_min: '', salary_max: '', currency: 'SRD', employment_type: 'fulltime',
    location: '', deadline: '', status: 'open'
  });
  
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: ''
  });
  
  const [payrollForm, setPayrollForm] = useState({
    employee_id: '', period: selectedPeriod, basic_salary: '', currency: 'SRD',
    overtime_hours: 0, overtime_rate: 1.5, bonuses: 0, deductions: 0, tax_amount: 0
  });
  
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });
  
  const [documentForm, setDocumentForm] = useState({
    employee_id: '', name: '', document_type: 'other', file_url: '', notes: '', expiry_date: ''
  });
  
  const [applicationForm, setApplicationForm] = useState({
    vacancy_id: '', applicant_name: '', applicant_email: '', applicant_phone: '',
    cover_letter: '', status: 'new'
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        dashboardRes, employeesRes, departmentsRes, contractsRes,
        vacanciesRes, applicationsRes, leaveRes, attendanceRes,
        payrollRes, documentsRes, settingsRes
      ] = await Promise.all([
        api.get('/hrm/dashboard').catch(() => ({ data: null })),
        api.get('/hrm/employees').catch(() => ({ data: [] })),
        api.get('/hrm/departments').catch(() => ({ data: [] })),
        api.get('/hrm/contracts').catch(() => ({ data: [] })),
        api.get('/hrm/vacancies').catch(() => ({ data: [] })),
        api.get('/hrm/applications').catch(() => ({ data: [] })),
        api.get('/hrm/leave-requests').catch(() => ({ data: [] })),
        api.get('/hrm/attendance').catch(() => ({ data: [] })),
        api.get('/hrm/payroll').catch(() => ({ data: [] })),
        api.get('/hrm/documents').catch(() => ({ data: [] })),
        api.get('/hrm/settings').catch(() => ({ data: {} }))
      ]);
      
      setDashboard(dashboardRes.data);
      setEmployees(employeesRes.data || []);
      setDepartments(departmentsRes.data || []);
      setContracts(contractsRes.data || []);
      setVacancies(vacanciesRes.data || []);
      setApplications(applicationsRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setAttendance(attendanceRes.data || []);
      setPayroll(payrollRes.data || []);
      setDocuments(documentsRes.data || []);
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading HRM data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleSaveEmployee = async () => {
    setSaving(true);
    try {
      const data = { ...employeeForm, salary: parseFloat(employeeForm.salary) || 0 };
      if (editingItem) {
        await api.put(`/hrm/employees/${editingItem.id}`, data);
        toast.success('Werknemer bijgewerkt');
      } else {
        await api.post('/hrm/employees', data);
        toast.success('Werknemer toegevoegd');
      }
      setEmployeeDialog(false);
      resetEmployeeForm();
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze werknemer wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/employees/${id}`);
      toast.success('Werknemer verwijderd');
      loadAllData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleSaveContract = async () => {
    setSaving(true);
    try {
      const data = { ...contractForm, salary: parseFloat(contractForm.salary) || 0 };
      if (editingItem) {
        await api.put(`/hrm/contracts/${editingItem.id}`, data);
        toast.success('Contract bijgewerkt');
      } else {
        await api.post('/hrm/contracts', data);
        toast.success('Contract toegevoegd');
      }
      setContractDialog(false);
      setEditingItem(null);
      setContractForm({ employee_id: '', contract_type: 'permanent', start_date: '', end_date: '', salary: '', currency: 'SRD', working_hours: 40, position: '', notes: '' });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVacancy = async () => {
    setSaving(true);
    try {
      const data = {
        ...vacancyForm,
        salary_min: parseFloat(vacancyForm.salary_min) || null,
        salary_max: parseFloat(vacancyForm.salary_max) || null
      };
      if (editingItem) {
        await api.put(`/hrm/vacancies/${editingItem.id}`, data);
        toast.success('Vacature bijgewerkt');
      } else {
        await api.post('/hrm/vacancies', data);
        toast.success('Vacature toegevoegd');
      }
      setVacancyDialog(false);
      setEditingItem(null);
      setVacancyForm({ title: '', department: '', description: '', requirements: '', salary_min: '', salary_max: '', currency: 'SRD', employment_type: 'fulltime', location: '', deadline: '', status: 'open' });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeave = async () => {
    setSaving(true);
    try {
      await api.post('/hrm/leave-requests', leaveForm);
      toast.success('Verlofaanvraag ingediend');
      setLeaveDialog(false);
      setLeaveForm({ employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij indienen');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveStatus = async (id, status) => {
    try {
      await api.put(`/hrm/leave-requests/${id}?status=${status}`);
      toast.success(status === 'approved' ? 'Verlof goedgekeurd' : 'Verlof afgewezen');
      loadAllData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleSaveDepartment = async () => {
    setSaving(true);
    try {
      await api.post('/hrm/departments', departmentForm);
      toast.success('Afdeling toegevoegd');
      setDepartmentDialog(false);
      setDepartmentForm({ name: '', description: '' });
      loadAllData();
    } catch (error) {
      toast.error('Fout bij toevoegen');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayroll = async () => {
    setSaving(true);
    try {
      const data = {
        ...payrollForm,
        basic_salary: parseFloat(payrollForm.basic_salary) || 0,
        overtime_hours: parseFloat(payrollForm.overtime_hours) || 0,
        bonuses: parseFloat(payrollForm.bonuses) || 0,
        deductions: parseFloat(payrollForm.deductions) || 0,
        tax_amount: parseFloat(payrollForm.tax_amount) || 0
      };
      if (editingItem) {
        await api.put(`/hrm/payroll/${editingItem.id}`, data);
        toast.success('Loonstrook bijgewerkt');
      } else {
        await api.post('/hrm/payroll', data);
        toast.success('Loonstrook toegevoegd');
      }
      setPayrollDialog(false);
      setEditingItem(null);
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      const res = await api.post(`/hrm/payroll/generate?period=${selectedPeriod}`);
      toast.success(res.data.message);
      loadAllData();
    } catch (error) {
      toast.error('Fout bij genereren loonlijst');
    }
  };

  const handlePayrollAction = async (id, action) => {
    try {
      await api.put(`/hrm/payroll/${id}/${action}`);
      toast.success(action === 'approve' ? 'Goedgekeurd' : 'Uitbetaald');
      loadAllData();
    } catch (error) {
      toast.error('Fout bij actie');
    }
  };

  const handleClockIn = async (employeeId) => {
    try {
      const res = await api.post(`/hrm/attendance/clock-in?employee_id=${employeeId}`);
      toast.success(res.data.message);
      loadAllData();
    } catch (error) {
      toast.error('Fout bij inklokken');
    }
  };

  const handleClockOut = async (employeeId) => {
    try {
      const res = await api.post(`/hrm/attendance/clock-out?employee_id=${employeeId}`);
      toast.success(res.data.message);
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij uitklokken');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/hrm/settings', settings);
      toast.success('Instellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApplication = async () => {
    setSaving(true);
    try {
      await api.post('/hrm/applications', applicationForm);
      toast.success('Sollicitatie toegevoegd');
      setApplicationDialog(false);
      setApplicationForm({ vacancy_id: '', applicant_name: '', applicant_email: '', applicant_phone: '', cover_letter: '', status: 'new' });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setSaving(false);
    }
  };

  const handleApplicationStatus = async (id, status) => {
    try {
      await api.put(`/hrm/applications/${id}/status?status=${status}`);
      toast.success('Status bijgewerkt');
      loadAllData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleSaveDocument = async () => {
    setSaving(true);
    try {
      await api.post('/hrm/documents', documentForm);
      toast.success('Document toegevoegd');
      setDocumentDialog(false);
      setDocumentForm({ employee_id: '', name: '', document_type: 'other', file_url: '', notes: '', expiry_date: '' });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions
  const resetEmployeeForm = () => {
    setEditingItem(null);
    setEmployeeForm({
      name: '', email: '', phone: '', position: '', department: '',
      salary: '', hire_date: '', birth_date: '', address: '',
      id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
    });
  };

  const openEditEmployee = (emp) => {
    setEditingItem(emp);
    setEmployeeForm({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position || '',
      department: emp.department || '',
      salary: emp.salary?.toString() || '',
      hire_date: emp.hire_date || '',
      birth_date: emp.birth_date || '',
      address: emp.address || '',
      id_number: emp.id_number || '',
      emergency_contact: emp.emergency_contact || '',
      emergency_phone: emp.emergency_phone || '',
      status: emp.status || 'active'
    });
    setEmployeeDialog(true);
  };

  // Filtered data
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, filterDepartment, filterStatus]);

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      on_leave: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      open: 'bg-blue-100 text-blue-700',
      closed: 'bg-gray-100 text-gray-700',
      draft: 'bg-gray-100 text-gray-700',
      paid: 'bg-green-100 text-green-700',
      new: 'bg-blue-100 text-blue-700',
      reviewing: 'bg-yellow-100 text-yellow-700',
      interview: 'bg-purple-100 text-purple-700',
      offered: 'bg-orange-100 text-orange-700',
      hired: 'bg-green-100 text-green-700'
    };
    const labels = {
      active: 'Actief', inactive: 'Inactief', on_leave: 'Met Verlof',
      pending: 'In Afwachting', approved: 'Goedgekeurd', rejected: 'Afgewezen',
      open: 'Open', closed: 'Gesloten', draft: 'Concept', paid: 'Betaald',
      new: 'Nieuw', reviewing: 'In Review', interview: 'Interview', offered: 'Aangeboden', hired: 'Aangenomen'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">HRM - Personeelsbeheer</h1>
          <p className="text-muted-foreground">Beheer uw werknemers, contracten, verlof en loonlijst</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white"><BarChart3 className="w-4 h-4 mr-1.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-white"><Users className="w-4 h-4 mr-1.5" />Personeel</TabsTrigger>
          <TabsTrigger value="recruitment" className="data-[state=active]:bg-white"><Target className="w-4 h-4 mr-1.5" />Werving</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-white"><FileText className="w-4 h-4 mr-1.5" />Contracten</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white"><ClipboardList className="w-4 h-4 mr-1.5" />Documenten</TabsTrigger>
          <TabsTrigger value="leave" className="data-[state=active]:bg-white"><Calendar className="w-4 h-4 mr-1.5" />Verlof</TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-white"><Clock className="w-4 h-4 mr-1.5" />Aanwezigheid</TabsTrigger>
          <TabsTrigger value="payroll" className="data-[state=active]:bg-white"><CreditCard className="w-4 h-4 mr-1.5" />Loonlijst</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white"><Settings className="w-4 h-4 mr-1.5" />Instellingen</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Werknemers" value={dashboard?.employees?.total || 0} subValue={`${dashboard?.employees?.active || 0} actief`} color="blue" onClick={() => setActiveTab('employees')} />
            <StatCard icon={UserCheck} label="Aanwezig Vandaag" value={dashboard?.employees?.present_today || 0} color="green" onClick={() => setActiveTab('attendance')} />
            <StatCard icon={Calendar} label="Met Verlof" value={dashboard?.employees?.on_leave || 0} color="yellow" onClick={() => setActiveTab('leave')} />
            <StatCard icon={Target} label="Open Vacatures" value={dashboard?.recruitment?.open_vacancies || 0} subValue={`${dashboard?.recruitment?.new_applications || 0} nieuwe`} color="purple" onClick={() => setActiveTab('recruitment')} />
            <StatCard icon={FileText} label="Aflopend Contract" value={dashboard?.contracts?.expiring_soon || 0} color="orange" onClick={() => setActiveTab('contracts')} />
            <StatCard icon={DollarSign} label="Maandloon" value={formatCurrency(dashboard?.salary?.total_monthly || 0)} color="emerald" onClick={() => setActiveTab('payroll')} />
          </div>

          {/* Department Breakdown */}
          {dashboard?.department_breakdown?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Afdelingen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {dashboard.department_breakdown.map((dept, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{dept.count}</p>
                      <p className="text-sm text-muted-foreground truncate">{dept.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => { resetEmployeeForm(); setEmployeeDialog(true); }}><UserPlus className="w-4 h-4 mr-2" />Werknemer Toevoegen</Button>
              <Button variant="outline" onClick={() => setVacancyDialog(true)}><Plus className="w-4 h-4 mr-2" />Vacature Plaatsen</Button>
              <Button variant="outline" onClick={() => setLeaveDialog(true)}><Calendar className="w-4 h-4 mr-2" />Verlof Aanvragen</Button>
              <Button variant="outline" onClick={handleGeneratePayroll}><CreditCard className="w-4 h-4 mr-2" />Loonlijst Genereren</Button>
            </CardContent>
          </Card>

          {/* Pending Leave Requests */}
          {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" />Wachtende Verlofaanvragen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaveRequests.filter(r => r.status === 'pending').slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{req.employee_name}</p>
                      <p className="text-sm text-muted-foreground">{req.leave_type} • {req.days} dag(en)</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleLeaveStatus(req.id, 'approved')}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleLeaveStatus(req.id, 'rejected')}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Zoek werknemer..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Afdeling" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle afdelingen</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                  <SelectItem value="on_leave">Met Verlof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDepartmentDialog(true)}><Building2 className="w-4 h-4 mr-2" />Afdeling</Button>
              <Button onClick={() => { resetEmployeeForm(); setEmployeeDialog(true); }}><UserPlus className="w-4 h-4 mr-2" />Werknemer</Button>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Geen werknemers gevonden</p>
                <Button className="mt-4" onClick={() => { resetEmployeeForm(); setEmployeeDialog(true); }}><UserPlus className="w-4 h-4 mr-2" />Eerste werknemer toevoegen</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredEmployees.map(emp => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{emp.name}</h3>
                            {getStatusBadge(emp.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{emp.position || 'Geen functie'}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                            {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                            {emp.department && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{emp.department}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {emp.salary > 0 && (
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatCurrency(emp.salary)}</p>
                            <p className="text-xs text-muted-foreground">/maand</p>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditEmployee(emp)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Werving & Selectie</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setApplicationDialog(true)}><UserPlus className="w-4 h-4 mr-2" />Sollicitatie</Button>
              <Button onClick={() => { setEditingItem(null); setVacancyDialog(true); }}><Plus className="w-4 h-4 mr-2" />Vacature</Button>
            </div>
          </div>

          {/* Vacancies */}
          <Card>
            <CardHeader><CardTitle>Vacatures ({vacancies.length})</CardTitle></CardHeader>
            <CardContent>
              {vacancies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Geen vacatures</p>
              ) : (
                <div className="space-y-3">
                  {vacancies.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{v.title}</h3>
                          {getStatusBadge(v.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{v.department} • {v.employment_type} • {v.applications_count || 0} sollicitaties</p>
                        {(v.salary_min || v.salary_max) && (
                          <p className="text-sm text-primary">{formatCurrency(v.salary_min, v.currency)} - {formatCurrency(v.salary_max, v.currency)}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingItem(v); setVacancyForm(v); setVacancyDialog(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => api.delete(`/hrm/vacancies/${v.id}`).then(() => { toast.success('Verwijderd'); loadAllData(); })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader><CardTitle>Sollicitaties ({applications.length})</CardTitle></CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Geen sollicitaties</p>
              ) : (
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{app.applicant_name}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{app.vacancy_title} • {app.applicant_email}</p>
                      </div>
                      <Select value={app.status} onValueChange={(v) => handleApplicationStatus(app.id, v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Arbeidscontracten</h2>
            <Button onClick={() => { setEditingItem(null); setContractDialog(true); }}><Plus className="w-4 h-4 mr-2" />Contract</Button>
          </div>

          {contracts.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Geen contracten</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {contracts.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{c.employee_name}</h3>
                          <Badge variant="outline">{c.contract_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.position} • {c.working_hours} uur/week</p>
                        <p className="text-sm">{c.start_date} - {c.end_date || 'Onbepaald'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatCurrency(c.salary, c.currency)}</p>
                        <p className="text-xs text-muted-foreground">/maand</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Documenten</h2>
            <Button onClick={() => setDocumentDialog(true)}><Upload className="w-4 h-4 mr-2" />Document Toevoegen</Button>
          </div>

          {documents.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Geen documenten</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {documents.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">{doc.employee_name} • {doc.document_type}</p>
                        {doc.expiry_date && <p className="text-xs text-orange-500">Verloopt: {doc.expiry_date}</p>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => api.delete(`/hrm/documents/${doc.id}`).then(() => { toast.success('Verwijderd'); loadAllData(); })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leave Tab */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Verlofbeheer</h2>
            <Button onClick={() => setLeaveDialog(true)}><CalendarDays className="w-4 h-4 mr-2" />Verlof Aanvragen</Button>
          </div>

          <div className="space-y-3">
            {leaveRequests.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">Geen verlofaanvragen</CardContent></Card>
            ) : (
              leaveRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{req.employee_name}</h3>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{req.leave_type} • {req.days} dag(en)</p>
                        <p className="text-sm">{new Date(req.start_date).toLocaleDateString('nl-NL')} - {new Date(req.end_date).toLocaleDateString('nl-NL')}</p>
                        {req.reason && <p className="text-sm mt-1 italic">"{req.reason}"</p>}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleLeaveStatus(req.id, 'approved')}><Check className="w-4 h-4 mr-1" />Goedkeuren</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleLeaveStatus(req.id, 'rejected')}><X className="w-4 h-4 mr-1" />Afwijzen</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Aanwezigheid & Tijdregistratie</h2>
          </div>

          <Card>
            <CardHeader><CardTitle>Werknemers Inklokken</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.filter(e => e.status === 'active').map(emp => {
                  const todayRecord = attendance.find(a => a.employee_id === emp.id && a.date === new Date().toISOString().slice(0, 10));
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        {todayRecord ? (
                          <p className="text-xs text-muted-foreground">
                            In: {todayRecord.clock_in || '-'} | Uit: {todayRecord.clock_out || '-'}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Niet ingeklokt</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleClockIn(emp.id)} disabled={todayRecord?.clock_in}><Play className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleClockOut(emp.id)} disabled={!todayRecord?.clock_in || todayRecord?.clock_out}><Square className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Attendance */}
          <Card>
            <CardHeader><CardTitle>Recente Aanwezigheid</CardTitle></CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Geen records</p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 20).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{a.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{a.date}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{a.clock_in || '-'} - {a.clock_out || '-'}</p>
                        {a.worked_hours && <p className="text-xs text-muted-foreground">{a.worked_hours} uur</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold">Loonlijst</h2>
            <div className="flex gap-2">
              <Input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-40" />
              <Button variant="outline" onClick={handleGeneratePayroll}><Download className="w-4 h-4 mr-2" />Genereren</Button>
              <Button onClick={() => { setEditingItem(null); setPayrollForm({ ...payrollForm, period: selectedPeriod }); setPayrollDialog(true); }}><Plus className="w-4 h-4 mr-2" />Loonstrook</Button>
            </div>
          </div>

          {payroll.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Geen loonstroken voor deze periode</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {payroll.filter(p => !selectedPeriod || p.period === selectedPeriod).map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{p.employee_name}</h3>
                          {getStatusBadge(p.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">Periode: {p.period}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Bruto: {formatCurrency(p.gross_salary, p.currency)}</p>
                          <p className="font-semibold text-primary">Netto: {formatCurrency(p.net_salary, p.currency)}</p>
                        </div>
                        <div className="flex gap-1">
                          {p.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handlePayrollAction(p.id, 'approve')}><Check className="w-4 h-4" /></Button>
                          )}
                          {p.status === 'approved' && (
                            <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handlePayrollAction(p.id, 'pay')}><DollarSign className="w-4 h-4" /></Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setEditingItem(p); setPayrollForm(p); setPayrollDialog(true); }}><Edit className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>HRM Instellingen</CardTitle>
              <CardDescription>Configureer uw HR-systeem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Standaard Valuta</Label>
                  <Select value={settings.default_currency || 'SRD'} onValueChange={(v) => setSettings({ ...settings, default_currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - Amerikaanse Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Werkuren per dag</Label>
                  <Input type="number" value={settings.work_hours_per_day || 8} onChange={(e) => setSettings({ ...settings, work_hours_per_day: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Werkdagen per week</Label>
                  <Input type="number" value={settings.work_days_per_week || 5} onChange={(e) => setSettings({ ...settings, work_days_per_week: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Overwerk tarief (x)</Label>
                  <Input type="number" step="0.1" value={settings.overtime_rate || 1.5} onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Vakantiedagen per jaar</Label>
                  <Input type="number" value={settings.vacation_days_per_year || 20} onChange={(e) => setSettings({ ...settings, vacation_days_per_year: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Ziektedagen per jaar</Label>
                  <Input type="number" value={settings.sick_days_per_year || 10} onChange={(e) => setSettings({ ...settings, sick_days_per_year: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Belastingtarief (%)</Label>
                  <Input type="number" step="0.1" value={(settings.tax_rate || 0) * 100} onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) / 100 })} />
                </div>
              </div>
              
              <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Thuiswerken toestaan</Label>
                    <p className="text-sm text-muted-foreground">Werknemers kunnen op afstand werken</p>
                  </div>
                  <Switch checked={settings.allow_remote_work !== false} onCheckedChange={(v) => setSettings({ ...settings, allow_remote_work: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verplicht inklokken</Label>
                    <p className="text-sm text-muted-foreground">Werknemers moeten dagelijks in- en uitklokken</p>
                  </div>
                  <Switch checked={settings.require_clock_in === true} onCheckedChange={(v) => setSettings({ ...settings, require_clock_in: v })} />
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="mt-4">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Instellingen Opslaan
              </Button>
            </CardContent>
          </Card>

          {/* Departments Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Afdelingen</CardTitle>
                <Button size="sm" onClick={() => setDepartmentDialog(true)}><Plus className="w-4 h-4 mr-2" />Toevoegen</Button>
              </div>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Geen afdelingen</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {departments.map(dept => (
                    <div key={dept.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        {dept.description && <p className="text-xs text-muted-foreground">{dept.description}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => api.delete(`/hrm/departments/${dept.id}`).then(() => { toast.success('Verwijderd'); loadAllData(); })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={employeeDialog} onOpenChange={(open) => { setEmployeeDialog(open); if (!open) resetEmployeeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Werknemer Bewerken' : 'Nieuwe Werknemer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Volledige Naam *</Label>
              <Input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Functie</Label>
              <Input value={employeeForm.position} onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })} />
            </div>
            <div>
              <Label>Afdeling</Label>
              <Select value={employeeForm.department} onValueChange={(v) => setEmployeeForm({ ...employeeForm, department: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Maandsalaris</Label>
              <Input type="number" value={employeeForm.salary} onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })} />
            </div>
            <div>
              <Label>Datum Indiensttreding</Label>
              <Input type="date" value={employeeForm.hire_date} onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })} />
            </div>
            <div>
              <Label>Geboortedatum</Label>
              <Input type="date" value={employeeForm.birth_date} onChange={(e) => setEmployeeForm({ ...employeeForm, birth_date: e.target.value })} />
            </div>
            <div>
              <Label>ID/Paspoortnummer</Label>
              <Input value={employeeForm.id_number} onChange={(e) => setEmployeeForm({ ...employeeForm, id_number: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Adres</Label>
              <Input value={employeeForm.address} onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Noodcontact Naam</Label>
              <Input value={employeeForm.emergency_contact} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact: e.target.value })} />
            </div>
            <div>
              <Label>Noodcontact Telefoon</Label>
              <Input value={employeeForm.emergency_phone} onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_phone: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={employeeForm.status} onValueChange={(v) => setEmployeeForm({ ...employeeForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                  <SelectItem value="on_leave">Met Verlof</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveEmployee} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Contract Bewerken' : 'Nieuw Contract'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werknemer *</Label>
              <Select value={contractForm.employee_id} onValueChange={(v) => setContractForm({ ...contractForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm({ ...contractForm, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Vast</SelectItem>
                    <SelectItem value="temporary">Tijdelijk</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Functie</Label>
                <Input value={contractForm.position} onChange={(e) => setContractForm({ ...contractForm, position: e.target.value })} />
              </div>
              <div>
                <Label>Startdatum</Label>
                <Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Einddatum</Label>
                <Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Salaris</Label>
                <Input type="number" value={contractForm.salary} onChange={(e) => setContractForm({ ...contractForm, salary: e.target.value })} />
              </div>
              <div>
                <Label>Valuta</Label>
                <Select value={contractForm.currency} onValueChange={(v) => setContractForm({ ...contractForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveContract} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacancy Dialog */}
      <Dialog open={vacancyDialog} onOpenChange={setVacancyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? 'Vacature Bewerken' : 'Nieuwe Vacature'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input value={vacancyForm.title} onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Afdeling</Label>
                <Select value={vacancyForm.department} onValueChange={(v) => setVacancyForm({ ...vacancyForm, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
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
              <div>
                <Label>Min. Salaris</Label>
                <Input type="number" value={vacancyForm.salary_min} onChange={(e) => setVacancyForm({ ...vacancyForm, salary_min: e.target.value })} />
              </div>
              <div>
                <Label>Max. Salaris</Label>
                <Input type="number" value={vacancyForm.salary_max} onChange={(e) => setVacancyForm({ ...vacancyForm, salary_max: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea value={vacancyForm.description} onChange={(e) => setVacancyForm({ ...vacancyForm, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={vacancyForm.deadline} onChange={(e) => setVacancyForm({ ...vacancyForm, deadline: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacancyDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveVacancy} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verlofaanvraag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werknemer *</Label>
              <Select value={leaveForm.employee_id} onValueChange={(v) => setLeaveForm({ ...leaveForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type Verlof</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vakantie</SelectItem>
                  <SelectItem value="sick">Ziekte</SelectItem>
                  <SelectItem value="personal">Persoonlijk</SelectItem>
                  <SelectItem value="maternity">Zwangerschapsverlof</SelectItem>
                  <SelectItem value="paternity">Vaderschapsverlof</SelectItem>
                  <SelectItem value="unpaid">Onbetaald</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Startdatum</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Einddatum</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Reden</Label>
              <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveLeave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Indienen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={payrollDialog} onOpenChange={setPayrollDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Loonstrook Bewerken' : 'Nieuwe Loonstrook'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werknemer *</Label>
              <Select value={payrollForm.employee_id} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setPayrollForm({ ...payrollForm, employee_id: v, basic_salary: emp?.salary || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Periode</Label>
                <Input type="month" value={payrollForm.period} onChange={(e) => setPayrollForm({ ...payrollForm, period: e.target.value })} />
              </div>
              <div>
                <Label>Valuta</Label>
                <Select value={payrollForm.currency} onValueChange={(v) => setPayrollForm({ ...payrollForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Basissalaris</Label>
                <Input type="number" value={payrollForm.basic_salary} onChange={(e) => setPayrollForm({ ...payrollForm, basic_salary: e.target.value })} />
              </div>
              <div>
                <Label>Overwerk Uren</Label>
                <Input type="number" value={payrollForm.overtime_hours} onChange={(e) => setPayrollForm({ ...payrollForm, overtime_hours: e.target.value })} />
              </div>
              <div>
                <Label>Bonussen</Label>
                <Input type="number" value={payrollForm.bonuses} onChange={(e) => setPayrollForm({ ...payrollForm, bonuses: e.target.value })} />
              </div>
              <div>
                <Label>Inhoudingen</Label>
                <Input type="number" value={payrollForm.deductions} onChange={(e) => setPayrollForm({ ...payrollForm, deductions: e.target.value })} />
              </div>
              <div>
                <Label>Belasting</Label>
                <Input type="number" value={payrollForm.tax_amount} onChange={(e) => setPayrollForm({ ...payrollForm, tax_amount: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayrollDialog(false)}>Annuleren</Button>
            <Button onClick={handleSavePayroll} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={departmentDialog} onOpenChange={setDepartmentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe Afdeling</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naam *</Label>
              <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveDepartment} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Document Toevoegen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werknemer</Label>
              <Select value={documentForm.employee_id} onValueChange={(v) => setDocumentForm({ ...documentForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer (optioneel)" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Naam *</Label>
              <Input value={documentForm.name} onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={documentForm.document_type} onValueChange={(v) => setDocumentForm({ ...documentForm, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="id">ID/Paspoort</SelectItem>
                    <SelectItem value="certificate">Certificaat</SelectItem>
                    <SelectItem value="other">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verloopt</Label>
                <Input type="date" value={documentForm.expiry_date} onChange={(e) => setDocumentForm({ ...documentForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notities</Label>
              <Textarea value={documentForm.notes} onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveDocument} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Dialog */}
      <Dialog open={applicationDialog} onOpenChange={setApplicationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sollicitatie Toevoegen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vacature *</Label>
              <Select value={applicationForm.vacancy_id} onValueChange={(v) => setApplicationForm({ ...applicationForm, vacancy_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>{vacancies.filter(v => v.status === 'open').map(v => <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Naam *</Label>
              <Input value={applicationForm.applicant_name} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail *</Label>
                <Input type="email" value={applicationForm.applicant_email} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_email: e.target.value })} />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input value={applicationForm.applicant_phone} onChange={(e) => setApplicationForm({ ...applicationForm, applicant_phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Motivatie</Label>
              <Textarea value={applicationForm.cover_letter} onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicationDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveApplication} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
