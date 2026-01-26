import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Building2, Calendar, Clock, DollarSign, 
  Search, Filter, MoreVertical, Check, X, Edit, Trash2,
  Mail, Phone, MapPin, Briefcase, CalendarDays
} from 'lucide-react';
import api, { formatCurrency } from '../lib/api';

export default function HRM() {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  // Dialog states
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', phone: '', position: '', department: '',
    salary: '', hire_date: '', birth_date: '', address: '',
    id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
  });
  
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: ''
  });
  
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, employeesRes, departmentsRes, leaveRes] = await Promise.all([
        api.get('/hrm/stats'),
        api.get('/hrm/employees'),
        api.get('/hrm/departments'),
        api.get('/hrm/leave-requests')
      ]);
      setStats(statsRes.data);
      setEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setLeaveRequests(leaveRes.data);
    } catch (error) {
      console.error('Error loading HRM data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async () => {
    try {
      const data = {
        ...employeeForm,
        salary: employeeForm.salary ? parseFloat(employeeForm.salary) : null
      };
      
      if (editingEmployee) {
        await api.put(`/hrm/employees/${editingEmployee.id}`, data);
        toast.success('Werknemer bijgewerkt');
      } else {
        await api.post('/hrm/employees', data);
        toast.success('Werknemer toegevoegd');
      }
      
      setEmployeeDialogOpen(false);
      setEditingEmployee(null);
      setEmployeeForm({
        name: '', email: '', phone: '', position: '', department: '',
        salary: '', hire_date: '', birth_date: '', address: '',
        id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Weet u zeker dat u deze werknemer wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/employees/${id}`);
      toast.success('Werknemer verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || '',
      salary: employee.salary?.toString() || '',
      hire_date: employee.hire_date || '',
      birth_date: employee.birth_date || '',
      address: employee.address || '',
      id_number: employee.id_number || '',
      emergency_contact: employee.emergency_contact || '',
      emergency_phone: employee.emergency_phone || '',
      status: employee.status || 'active'
    });
    setEmployeeDialogOpen(true);
  };

  const handleSaveLeaveRequest = async () => {
    try {
      await api.post('/hrm/leave-requests', leaveForm);
      toast.success('Verlofaanvraag ingediend');
      setLeaveDialogOpen(false);
      setLeaveForm({ employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij indienen');
    }
  };

  const handleLeaveStatus = async (requestId, status) => {
    try {
      await api.put(`/hrm/leave-requests/${requestId}?status=${status}`);
      toast.success(status === 'approved' ? 'Verlof goedgekeurd' : 'Verlof afgewezen');
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken status');
    }
  };

  const handleSaveDepartment = async () => {
    try {
      await api.post('/hrm/departments', departmentForm);
      toast.success('Afdeling toegevoegd');
      setDepartmentDialogOpen(false);
      setDepartmentForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error('Fout bij toevoegen afdeling');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Weet u zeker dat u deze afdeling wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/departments/${id}`);
      toast.success('Afdeling verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Actief</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactief</Badge>;
      case 'on_leave': return <Badge className="bg-yellow-500">Met Verlof</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeName = (type) => {
    const types = {
      vacation: 'Vakantie',
      sick: 'Ziekte',
      personal: 'Persoonlijk',
      maternity: 'Zwangerschapsverlof',
      paternity: 'Vaderschapsverlof',
      unpaid: 'Onbetaald verlof'
    };
    return types[type] || type;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">HRM - Personeelsbeheer</h1>
          <p className="text-muted-foreground">Beheer uw werknemers, afdelingen en verlofaanvragen</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Building2 className="w-4 h-4 mr-2" />Afdeling</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Afdeling</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Naam</Label>
                  <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})} />
                </div>
                <div>
                  <Label>Beschrijving</Label>
                  <Textarea value={departmentForm.description} onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})} />
                </div>
                <Button onClick={handleSaveDepartment} className="w-full">Opslaan</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={employeeDialogOpen} onOpenChange={(open) => { setEmployeeDialogOpen(open); if (!open) setEditingEmployee(null); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Werknemer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Werknemer Bewerken' : 'Nieuwe Werknemer'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Volledige Naam *</Label>
                  <Input value={employeeForm.name} onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} />
                </div>
                <div>
                  <Label>Telefoon</Label>
                  <Input value={employeeForm.phone} onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})} />
                </div>
                <div>
                  <Label>Functie</Label>
                  <Input value={employeeForm.position} onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})} />
                </div>
                <div>
                  <Label>Afdeling</Label>
                  <Select value={employeeForm.department} onValueChange={(v) => setEmployeeForm({...employeeForm, department: v})}>
                    <SelectTrigger><SelectValue placeholder="Kies afdeling" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Maandsalaris (SRD)</Label>
                  <Input type="number" value={employeeForm.salary} onChange={(e) => setEmployeeForm({...employeeForm, salary: e.target.value})} />
                </div>
                <div>
                  <Label>Datum Indiensttreding</Label>
                  <Input type="date" value={employeeForm.hire_date} onChange={(e) => setEmployeeForm({...employeeForm, hire_date: e.target.value})} />
                </div>
                <div>
                  <Label>Geboortedatum</Label>
                  <Input type="date" value={employeeForm.birth_date} onChange={(e) => setEmployeeForm({...employeeForm, birth_date: e.target.value})} />
                </div>
                <div>
                  <Label>ID/Paspoortnummer</Label>
                  <Input value={employeeForm.id_number} onChange={(e) => setEmployeeForm({...employeeForm, id_number: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <Label>Adres</Label>
                  <Input value={employeeForm.address} onChange={(e) => setEmployeeForm({...employeeForm, address: e.target.value})} />
                </div>
                <div>
                  <Label>Noodcontact Naam</Label>
                  <Input value={employeeForm.emergency_contact} onChange={(e) => setEmployeeForm({...employeeForm, emergency_contact: e.target.value})} />
                </div>
                <div>
                  <Label>Noodcontact Telefoon</Label>
                  <Input value={employeeForm.emergency_phone} onChange={(e) => setEmployeeForm({...employeeForm, emergency_phone: e.target.value})} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={employeeForm.status} onValueChange={(v) => setEmployeeForm({...employeeForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actief</SelectItem>
                      <SelectItem value="inactive">Inactief</SelectItem>
                      <SelectItem value="on_leave">Met Verlof</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveEmployee} className="w-full mt-4">Opslaan</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_employees || 0}</p>
                <p className="text-xs text-muted-foreground">Werknemers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active_employees || 0}</p>
                <p className="text-xs text-muted-foreground">Actief</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.on_leave || 0}</p>
                <p className="text-xs text-muted-foreground">Met Verlof</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending_leave_requests || 0}</p>
                <p className="text-xs text-muted-foreground">Verlofaanvragen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.departments || 0}</p>
                <p className="text-xs text-muted-foreground">Afdelingen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats?.total_monthly_salary || 0)}</p>
                <p className="text-xs text-muted-foreground">Maandloon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Werknemers</TabsTrigger>
          <TabsTrigger value="leave">Verlofaanvragen</TabsTrigger>
          <TabsTrigger value="departments">Afdelingen</TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op naam, email of functie..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Alle afdelingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredEmployees.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Geen werknemers gevonden</p>
                  <Button className="mt-4" onClick={() => setEmployeeDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />Eerste werknemer toevoegen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredEmployees.map(emp => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {emp.name?.charAt(0)?.toUpperCase()}
                          </span>
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
                        {emp.salary && (
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatCurrency(emp.salary)}</p>
                            <p className="text-xs text-muted-foreground">/maand</p>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(emp)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(emp.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogTrigger asChild>
                <Button><CalendarDays className="w-4 h-4 mr-2" />Verlof Aanvragen</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuwe Verlofaanvraag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Werknemer</Label>
                    <Select value={leaveForm.employee_id} onValueChange={(v) => setLeaveForm({...leaveForm, employee_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecteer werknemer" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type Verlof</Label>
                    <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({...leaveForm, leave_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vakantie</SelectItem>
                        <SelectItem value="sick">Ziekte</SelectItem>
                        <SelectItem value="personal">Persoonlijk</SelectItem>
                        <SelectItem value="maternity">Zwangerschapsverlof</SelectItem>
                        <SelectItem value="paternity">Vaderschapsverlof</SelectItem>
                        <SelectItem value="unpaid">Onbetaald verlof</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Startdatum</Label>
                      <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Einddatum</Label>
                      <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label>Reden (optioneel)</Label>
                    <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} />
                  </div>
                  <Button onClick={handleSaveLeaveRequest} className="w-full">Indienen</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {leaveRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Geen verlofaanvragen</p>
                </CardContent>
              </Card>
            ) : (
              leaveRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{req.employee_name}</h3>
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {req.status === 'approved' ? 'Goedgekeurd' : req.status === 'rejected' ? 'Afgewezen' : 'In Afwachting'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getLeaveTypeName(req.leave_type)} • {req.days} dag{req.days > 1 ? 'en' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(req.start_date).toLocaleDateString('nl-NL')} - {new Date(req.end_date).toLocaleDateString('nl-NL')}
                        </p>
                        {req.reason && <p className="text-sm mt-1">{req.reason}</p>}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleLeaveStatus(req.id, 'approved')}>
                            <Check className="w-4 h-4 mr-1" />Goedkeuren
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleLeaveStatus(req.id, 'rejected')}>
                            <X className="w-4 h-4 mr-1" />Afwijzen
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Geen afdelingen aangemaakt</p>
                  <Button className="mt-4" onClick={() => setDepartmentDialogOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" />Eerste afdeling toevoegen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              departments.map(dept => {
                const deptEmployees = employees.filter(e => e.department === dept.name);
                return (
                  <Card key={dept.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{dept.name}</h3>
                          {dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}
                          <p className="text-sm mt-2">
                            <Badge variant="outline">{deptEmployees.length} werknemer{deptEmployees.length !== 1 ? 's' : ''}</Badge>
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDepartment(dept.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
