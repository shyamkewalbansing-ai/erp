import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Edit, Trash2, Eye, Loader2, X,
  UserPlus, Building2, Calendar, FileText, Clock, DollarSign,
  CheckCircle, XCircle, AlertCircle, Download, Printer,
  Briefcase, Phone, Mail, MapPin, CreditCard, TrendingUp,
  CalendarDays, ClipboardList, Settings, UserCheck, UserX, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  return new Intl.NumberFormat('nl-SR', { style: 'currency', currency }).format(amount || 0);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => (
  <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium">{title}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-600',
    paid: 'bg-emerald-100 text-emerald-700',
  };
  const labels = {
    active: 'Actief',
    inactive: 'Inactief',
    pending: 'In behandeling',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen',
    draft: 'Concept',
    paid: 'Betaald',
  };
  return (
    <Badge className={`${styles[status] || styles.pending} font-medium`}>
      {labels[status] || status}
    </Badge>
  );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
      active ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="font-medium text-sm">{label}</span>
    {count !== undefined && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
        {count}
      </span>
    )}
  </button>
);

const HRMPage = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', department: '',
    position: '', hire_date: '', salary: 0, status: 'active', address: '',
    emergency_contact: '', bank_account: '', notes: ''
  });
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', leave_type: 'vakantie', start_date: '', end_date: '', reason: ''
  });
  const [contractForm, setContractForm] = useState({
    employee_id: '', contract_type: 'vast', start_date: '', end_date: '', salary: 0, terms: ''
  });
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));

  // Stats calculations
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingLeave = leaveRequests.filter(l => l.status === 'pending').length;
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { ...getAuthHeader() };
      
      const [empRes, deptRes, leaveRes, contractRes, payRes, attRes] = await Promise.all([
        fetch(`${API_URL}/api/hrm/employees`, { headers }),
        fetch(`${API_URL}/api/hrm/departments`, { headers }),
        fetch(`${API_URL}/api/hrm/leave-requests`, { headers }),
        fetch(`${API_URL}/api/hrm/contracts`, { headers }),
        fetch(`${API_URL}/api/hrm/payroll`, { headers }),
        fetch(`${API_URL}/api/hrm/attendance`, { headers })
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (leaveRes.ok) setLeaveRequests(await leaveRes.json());
      if (contractRes.ok) setContracts(await contractRes.json());
      if (payRes.ok) setPayroll(await payRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
    } catch (error) {
      console.error('Error fetching HRM data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Employee CRUD
  const handleSaveEmployee = async () => {
    try {
      const url = editingItem 
        ? `${API_URL}/api/hrm/employees/${editingItem.id}`
        : `${API_URL}/api/hrm/employees`;
      
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(employeeForm)
      });

      if (response.ok) {
        toast.success(editingItem ? 'Medewerker bijgewerkt' : 'Medewerker toegevoegd');
        setShowEmployeeDialog(false);
        setEditingItem(null);
        resetEmployeeForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan medewerker');
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Weet u zeker dat u ${employee.first_name} ${employee.last_name} wilt verwijderen?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/hrm/employees/${employee.id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        toast.success('Medewerker verwijderd');
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      first_name: '', last_name: '', email: '', phone: '', department: '',
      position: '', hire_date: '', salary: 0, status: 'active', address: '',
      emergency_contact: '', bank_account: '', notes: ''
    });
  };

  const openEditEmployee = (employee) => {
    setEditingItem(employee);
    setEmployeeForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || '',
      position: employee.position || '',
      hire_date: employee.hire_date?.split('T')[0] || '',
      salary: employee.salary || 0,
      status: employee.status || 'active',
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      bank_account: employee.bank_account || '',
      notes: employee.notes || ''
    });
    setShowEmployeeDialog(true);
  };

  // Department CRUD
  const handleSaveDepartment = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(departmentForm)
      });

      if (response.ok) {
        toast.success('Afdeling toegevoegd');
        setShowDepartmentDialog(false);
        setDepartmentForm({ name: '', description: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij opslaan afdeling');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Weet u zeker dat u afdeling "${dept.name}" wilt verwijderen?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/hrm/departments/${dept.id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        toast.success('Afdeling verwijderd');
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  // Leave Request
  const handleSaveLeave = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(leaveForm)
      });

      if (response.ok) {
        toast.success('Verlofaanvraag ingediend');
        setShowLeaveDialog(false);
        setLeaveForm({ employee_id: '', leave_type: 'vakantie', start_date: '', end_date: '', reason: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij indienen verlofaanvraag');
    }
  };

  const handleLeaveStatus = async (request, status) => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/leave-requests/${request.id}/status?status=${status}`, {
        method: 'PUT',
        headers: getAuthHeader()
      });

      if (response.ok) {
        toast.success(`Verlofaanvraag ${status === 'approved' ? 'goedgekeurd' : 'afgewezen'}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  // Contract
  const handleSaveContract = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(contractForm)
      });

      if (response.ok) {
        toast.success('Contract toegevoegd');
        setShowContractDialog(false);
        setContractForm({ employee_id: '', contract_type: 'vast', start_date: '', end_date: '', salary: 0, terms: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij opslaan contract');
    }
  };

  // Payroll
  const handleGeneratePayroll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/payroll/generate?period=${payrollPeriod}`, {
        method: 'POST',
        headers: getAuthHeader()
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.count || 0} salarisrecords gegenereerd`);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij genereren salarisrun');
    }
  };

  const handlePayrollAction = async (record, action) => {
    try {
      const response = await fetch(`${API_URL}/api/hrm/payroll/${record.id}/${action}`, {
        method: 'PUT',
        headers: getAuthHeader()
      });

      if (response.ok) {
        toast.success(action === 'approve' ? 'Salaris goedgekeurd' : 'Salaris betaald');
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.department}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="hrm-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">HRM / Personeel</h1>
          <p className="text-sm text-gray-500">Beheer medewerkers, verlof, contracten en salarisadministratie</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { resetEmployeeForm(); setEditingItem(null); setShowEmployeeDialog(true); }}
          data-testid="add-employee-btn"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Nieuwe Medewerker
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Totaal Medewerkers" value={totalEmployees} icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard title="Actieve Medewerkers" value={activeEmployees} icon={UserCheck} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard title="Verlofaanvragen" value={pendingLeave} subtitle="In behandeling" icon={Calendar} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <StatCard title="Totaal Salariskosten" value={formatCurrency(totalSalary)} subtitle="Per maand" icon={DollarSign} iconBg="bg-purple-100" iconColor="text-purple-600" />
      </div>

      {/* Main Content Card */}
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 flex flex-wrap">
            <TabButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} icon={Users} label="Medewerkers" count={employees.length} />
            <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={Building2} label="Afdelingen" count={departments.length} />
            <TabButton active={activeTab === 'leave'} onClick={() => setActiveTab('leave')} icon={Calendar} label="Verlof" count={leaveRequests.length} />
            <TabButton active={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} icon={FileText} label="Contracten" count={contracts.length} />
            <TabButton active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} icon={DollarSign} label="Salarisadministratie" count={payroll.length} />
            <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={Clock} label="Aanwezigheid" />
          </div>

          {/* Search & Actions */}
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1" /> Vernieuwen
              </Button>
              {activeTab === 'departments' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowDepartmentDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Afdeling
                </Button>
              )}
              {activeTab === 'leave' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowLeaveDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Verlofaanvraag
                </Button>
              )}
              {activeTab === 'contracts' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowContractDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Contract
                </Button>
              )}
              {activeTab === 'payroll' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowPayrollDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Salarisrun
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Employees Tab */}
                {activeTab === 'employees' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="text-xs font-medium text-gray-500">Medewerker</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Afdeling</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Functie</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Contact</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Salaris</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                              <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                              <p>Geen medewerkers gevonden</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEmployees.map(emp => (
                            <TableRow key={emp.id} className="hover:bg-gray-50/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                                    {(emp.first_name || 'M').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                                    <p className="text-xs text-gray-500">{emp.employee_id}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">{emp.department || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-600">{emp.position || '-'}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {emp.email && <p className="text-gray-600">{emp.email}</p>}
                                  {emp.phone && <p className="text-gray-400">{emp.phone}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-gray-900">
                                {formatCurrency(emp.salary)}
                              </TableCell>
                              <TableCell><StatusBadge status={emp.status} /></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setDetailItem(emp); setShowDetail(true); }}>
                                    <Eye className="w-4 h-4 text-gray-400" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openEditEmployee(emp)}>
                                    <Edit className="w-4 h-4 text-gray-400" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => handleDeleteEmployee(emp)}>
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Departments Tab */}
                {activeTab === 'departments' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p>Geen afdelingen gevonden</p>
                      </div>
                    ) : (
                      departments.map(dept => (
                        <Card key={dept.id} className="bg-white border border-gray-200 rounded-xl">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{dept.description || 'Geen beschrijving'}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {employees.filter(e => e.department === dept.name).length} medewerkers
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => handleDeleteDepartment(dept)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}

                {/* Leave Requests Tab */}
                {activeTab === 'leave' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="text-xs font-medium text-gray-500">Medewerker</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Type</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Van</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Tot</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Reden</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                          <TableHead className="w-32"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                              <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                              <p>Geen verlofaanvragen</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          leaveRequests.map(req => (
                            <TableRow key={req.id} className="hover:bg-gray-50/50">
                              <TableCell className="font-medium text-gray-900">{req.employee_name || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-600 capitalize">{req.leave_type}</TableCell>
                              <TableCell className="text-sm text-gray-600">{formatDate(req.start_date)}</TableCell>
                              <TableCell className="text-sm text-gray-600">{formatDate(req.end_date)}</TableCell>
                              <TableCell className="text-sm text-gray-500 max-w-xs truncate">{req.reason || '-'}</TableCell>
                              <TableCell><StatusBadge status={req.status} /></TableCell>
                              <TableCell>
                                {req.status === 'pending' && (
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-emerald-50" onClick={() => handleLeaveStatus(req, 'approved')}>
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-red-50" onClick={() => handleLeaveStatus(req, 'rejected')}>
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Contracts Tab */}
                {activeTab === 'contracts' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="text-xs font-medium text-gray-500">Medewerker</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Type</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Startdatum</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Einddatum</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Salaris</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                              <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                              <p>Geen contracten</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          contracts.map(contract => (
                            <TableRow key={contract.id} className="hover:bg-gray-50/50">
                              <TableCell className="font-medium text-gray-900">{contract.employee_name || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-600 capitalize">{contract.contract_type}</TableCell>
                              <TableCell className="text-sm text-gray-600">{formatDate(contract.start_date)}</TableCell>
                              <TableCell className="text-sm text-gray-600">{formatDate(contract.end_date) || 'Onbepaald'}</TableCell>
                              <TableCell className="text-right text-sm font-medium text-gray-900">{formatCurrency(contract.salary)}</TableCell>
                              <TableCell><StatusBadge status={contract.status} /></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Payroll Tab */}
                {activeTab === 'payroll' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="text-xs font-medium text-gray-500">Medewerker</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Periode</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Bruto</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Toeslagen</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Inhoudingen</TableHead>
                          <TableHead className="text-right text-xs font-medium text-gray-500">Netto</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payroll.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                              <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                              <p>Geen salarisrecords</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          payroll.map(pay => (
                            <TableRow key={pay.id} className="hover:bg-gray-50/50">
                              <TableCell className="font-medium text-gray-900">{pay.employee_name || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-600">{pay.period}</TableCell>
                              <TableCell className="text-right text-sm text-gray-900">{formatCurrency(pay.basic_salary)}</TableCell>
                              <TableCell className="text-right text-sm text-emerald-600">+{formatCurrency(pay.allowances)}</TableCell>
                              <TableCell className="text-right text-sm text-red-600">-{formatCurrency(pay.deductions)}</TableCell>
                              <TableCell className="text-right text-sm font-medium text-gray-900">{formatCurrency(pay.net_salary)}</TableCell>
                              <TableCell><StatusBadge status={pay.status} /></TableCell>
                              <TableCell>
                                {pay.status === 'draft' && (
                                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg bg-emerald-50 text-emerald-700" onClick={() => handlePayrollAction(pay, 'approve')}>
                                    Goedkeuren
                                  </Button>
                                )}
                                {pay.status === 'approved' && (
                                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg bg-blue-50 text-blue-700" onClick={() => handlePayrollAction(pay, 'pay')}>
                                    Uitbetalen
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="text-xs font-medium text-gray-500">Datum</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Medewerker</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Ingeklokt</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Uitgeklokt</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Gewerkte uren</TableHead>
                          <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                              <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                              <p>Geen aanwezigheidsregistraties</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          attendance.map(att => (
                            <TableRow key={att.id} className="hover:bg-gray-50/50">
                              <TableCell className="text-sm text-gray-900">{formatDate(att.date)}</TableCell>
                              <TableCell className="text-sm text-gray-600">{att.employee_id}</TableCell>
                              <TableCell className="text-sm text-gray-600">{att.clock_in || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-600">{att.clock_out || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-900">{att.hours_worked ? `${att.hours_worked}u` : '-'}</TableCell>
                              <TableCell><StatusBadge status={att.status === 'present' ? 'active' : 'inactive'} /></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Voornaam *</Label>
              <Input value={employeeForm.first_name} onChange={(e) => setEmployeeForm({...employeeForm, first_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Achternaam *</Label>
              <Input value={employeeForm.last_name} onChange={(e) => setEmployeeForm({...employeeForm, last_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Telefoon</Label>
              <Input value={employeeForm.phone} onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Afdeling</Label>
              <Select value={employeeForm.department} onValueChange={(v) => setEmployeeForm({...employeeForm, department: v})}>
                <SelectTrigger><SelectValue placeholder="Selecteer afdeling" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Functie</Label>
              <Input value={employeeForm.position} onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={employeeForm.hire_date} onChange={(e) => setEmployeeForm({...employeeForm, hire_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Maandsalaris (SRD)</Label>
              <Input type="number" value={employeeForm.salary} onChange={(e) => setEmployeeForm({...employeeForm, salary: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={employeeForm.status} onValueChange={(v) => setEmployeeForm({...employeeForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bankrekening</Label>
              <Input value={employeeForm.bank_account} onChange={(e) => setEmployeeForm({...employeeForm, bank_account: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Adres</Label>
              <Input value={employeeForm.address} onChange={(e) => setEmployeeForm({...employeeForm, address: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Noodcontact</Label>
              <Input value={employeeForm.emergency_contact} onChange={(e) => setEmployeeForm({...employeeForm, emergency_contact: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>Annuleren</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveEmployee}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Afdeling</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Input value={departmentForm.description} onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentDialog(false)}>Annuleren</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveDepartment}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Verlofaanvraag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medewerker *</Label>
              <Select value={leaveForm.employee_id} onValueChange={(v) => setLeaveForm({...leaveForm, employee_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type verlof *</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({...leaveForm, leave_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vakantie">Vakantie</SelectItem>
                  <SelectItem value="ziekte">Ziekte</SelectItem>
                  <SelectItem value="bijzonder">Bijzonder verlof</SelectItem>
                  <SelectItem value="onbetaald">Onbetaald verlof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Einddatum *</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reden</Label>
              <Input value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Annuleren</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveLeave}>Indienen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medewerker *</Label>
              <Select value={contractForm.employee_id} onValueChange={(v) => setContractForm({...contractForm, employee_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contract type *</Label>
              <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm({...contractForm, contract_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vast">Vast contract</SelectItem>
                  <SelectItem value="tijdelijk">Tijdelijk contract</SelectItem>
                  <SelectItem value="oproep">Oproepcontract</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({...contractForm, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Einddatum</Label>
                <Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({...contractForm, end_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maandsalaris (SRD) *</Label>
              <Input type="number" value={contractForm.salary} onChange={(e) => setContractForm({...contractForm, salary: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Annuleren</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveContract}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salarisrun Genereren</DialogTitle>
            <DialogDescription>Genereer salarisrecords voor alle actieve medewerkers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Periode *</Label>
              <Input type="month" value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Er worden salarisrecords aangemaakt voor {activeEmployees} actieve medewerker(s)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayrollDialog(false)}>Annuleren</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGeneratePayroll}>Genereren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Sidebar */}
      {showDetail && detailItem && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setShowDetail(false)} />
          <div className="w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Medewerker Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowDetail(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                  {(detailItem.first_name || 'M').charAt(0)}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{detailItem.first_name} {detailItem.last_name}</h3>
                <p className="text-sm text-gray-500">{detailItem.position || 'Geen functie'}</p>
                <StatusBadge status={detailItem.status} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Afdeling</p>
                    <p className="font-medium">{detailItem.department || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">E-mail</p>
                    <p className="font-medium">{detailItem.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Telefoon</p>
                    <p className="font-medium">{detailItem.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">In dienst sinds</p>
                    <p className="font-medium">{formatDate(detailItem.hire_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-600">Maandsalaris</p>
                    <p className="font-bold text-emerald-700">{formatCurrency(detailItem.salary)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Bankrekening</p>
                    <p className="font-medium font-mono">{detailItem.bank_account || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Adres</p>
                    <p className="font-medium">{detailItem.address || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => { setShowDetail(false); openEditEmployee(detailItem); }}>
                  <Edit className="w-4 h-4 mr-2" /> Bewerken
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRMPage;
