import { useState, useEffect } from 'react';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee,
  deleteEmployee, 
  getSalaries,
  createSalary,
  deleteSalary,
  downloadPayslip,
  formatCurrency 
} from '../lib/api';
import { toast } from 'sonner';
import { 
  Users2, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Banknote,
  DollarSign,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maart' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Augustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function Werknemers() {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState('employee');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedSalary, setSelectedSalary] = useState(null);
  
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    salary: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  
  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, salariesRes] = await Promise.all([
        getEmployees(),
        getSalaries()
      ]);
      setEmployees(employeesRes.data);
      setSalaries(salariesRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...employeeForm,
        salary: parseFloat(employeeForm.salary),
      };

      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, data);
        toast.success('Werknemer bijgewerkt');
      } else {
        await createEmployee(data);
        toast.success('Werknemer toegevoegd');
      }
      setShowEmployeeModal(false);
      resetEmployeeForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...salaryForm,
        amount: parseFloat(salaryForm.amount),
        period_month: parseInt(salaryForm.period_month),
        period_year: parseInt(salaryForm.period_year),
      };

      await createSalary(data);
      toast.success('Salaris uitbetaald - bedrag afgetrokken van kasgeld');
      setShowSalaryModal(false);
      resetSalaryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      position: employee.position,
      phone: employee.phone || '',
      email: employee.email || '',
      salary: employee.salary.toString(),
      start_date: employee.start_date,
    });
    setShowEmployeeModal(true);
  };

  const handlePaySalary = (employee) => {
    setSalaryForm({
      employee_id: employee.id,
      amount: employee.salary.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      description: '',
    });
    setShowSalaryModal(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteType === 'employee') {
        await deleteEmployee(selectedEmployee.id);
        toast.success('Werknemer verwijderd');
      } else {
        await deleteSalary(selectedSalary.id);
        toast.success('Salarisbetaling verwijderd');
      }
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      setSelectedSalary(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const handleDownloadPayslip = async (salary) => {
    try {
      const response = await downloadPayslip(salary.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loonstrook_${salary.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Loonstrook gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden loonstrook');
    }
  };

  const resetEmployeeForm = () => {
    setSelectedEmployee(null);
    setEmployeeForm({
      name: '',
      position: '',
      phone: '',
      email: '',
      salary: '',
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  const resetSalaryForm = () => {
    setSalaryForm({
      employee_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      description: '',
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  );

  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalSalaryBudget = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const totalPaidThisMonth = salaries
    .filter(s => s.period_month === new Date().getMonth() + 1 && s.period_year === new Date().getFullYear())
    .reduce((sum, s) => sum + s.amount, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Werknemers laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="werknemers-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-purple-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-pink-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-purple-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Users2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{employees.length} werknemers</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Werknemers Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer werknemers en salarisbetalingen
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button 
              variant="outline"
              onClick={() => { resetSalaryForm(); setShowSalaryModal(true); }}
              className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
              data-testid="pay-salary-btn"
            >
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Salaris uitbetalen
            </Button>
            <Button 
              onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm"
              data-testid="add-employee-btn"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Werknemer toevoegen
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Active Employees - Featured */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-4 sm:p-6 text-white shadow-xl shadow-purple-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1">Actieve Werknemers</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{activeEmployees.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Salary Budget */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Maandelijks Budget</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatCurrency(totalSalaryBudget)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Betaald Deze Maand</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(totalPaidThisMonth)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="employees" className="rounded-lg text-xs sm:text-sm">Werknemers</TabsTrigger>
          <TabsTrigger value="salaries" className="rounded-lg text-xs sm:text-sm">Salarisbetalingen</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4 mt-4">
          {/* Search */}
          <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam of functie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
                data-testid="search-employees"
              />
            </div>
          </div>

          {/* Employees Grid */}
          {filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredEmployees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 hover:shadow-lg hover:border-purple-500/30 transition-all duration-300"
                  data-testid={`employee-card-${employee.id}`}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <span className="text-base sm:text-lg font-semibold text-purple-600">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">{employee.name}</h3>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                          <Briefcase className="w-3 h-3" />
                          <span>{employee.position}</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePaySalary(employee)}>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Salaris uitbetalen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => { 
                            setSelectedEmployee(employee); 
                            setDeleteType('employee');
                            setShowDeleteDialog(true); 
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Sinds {employee.start_date}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Maandloon</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(employee.salary)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Geen werknemers gevonden</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Probeer een andere zoekterm' : 'Voeg uw eerste werknemer toe'}
              </p>
              {!search && (
                <Button 
                  onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }}
                  className="rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Werknemer toevoegen
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="salaries">
          {salaries.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Werknemer</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {salary.payment_date}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{salary.employee_name}</TableCell>
                      <TableCell>
                        {MONTHS.find(m => m.value === salary.period_month)?.label} {salary.period_year}
                      </TableCell>
                      <TableCell>{salary.description || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-orange-600">
                        {formatCurrency(salary.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => handleDownloadPayslip(salary)}
                            title="Download loonstrook"
                            data-testid={`download-payslip-${salary.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { 
                              setSelectedSalary(salary); 
                              setDeleteType('salary');
                              setShowDeleteDialog(true); 
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Geen salarisbetalingen</h3>
              <p className="text-muted-foreground">Nog geen salarissen uitbetaald</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Employee Modal */}
      <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? 'Werknemer bewerken' : 'Nieuwe werknemer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEmployeeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="Volledige naam"
                required
                data-testid="employee-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Functie *</Label>
              <Input
                id="position"
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                placeholder="bijv. Schoonmaker, Tuinman"
                required
                data-testid="employee-position-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Maandloon (SRD) *</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                min="0"
                value={employeeForm.salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                placeholder="0.00"
                required
                data-testid="employee-salary-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="+597 123 4567"
                  data-testid="employee-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={employeeForm.start_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, start_date: e.target.value })}
                  required
                  data-testid="employee-start-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="email@voorbeeld.com"
                data-testid="employee-email-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-employee-btn">
                {selectedEmployee ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Modal */}
      <Dialog open={showSalaryModal} onOpenChange={setShowSalaryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salaris uitbetalen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalarySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Werknemer *</Label>
              <Select 
                value={salaryForm.employee_id} 
                onValueChange={(value) => {
                  const emp = employees.find(e => e.id === value);
                  setSalaryForm({ 
                    ...salaryForm, 
                    employee_id: value,
                    amount: emp ? emp.salary.toString() : salaryForm.amount
                  });
                }}
              >
                <SelectTrigger data-testid="salary-employee-select">
                  <SelectValue placeholder="Selecteer werknemer" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maand</Label>
                <Select 
                  value={salaryForm.period_month.toString()} 
                  onValueChange={(value) => setSalaryForm({ ...salaryForm, period_month: parseInt(value) })}
                >
                  <SelectTrigger data-testid="salary-month-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jaar</Label>
                <Select 
                  value={salaryForm.period_year.toString()} 
                  onValueChange={(value) => setSalaryForm({ ...salaryForm, period_year: parseInt(value) })}
                >
                  <SelectTrigger data-testid="salary-year-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Bedrag (SRD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={salaryForm.amount}
                onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="salary-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                Dit bedrag wordt van het kasgeld afgetrokken
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Betaaldatum *</Label>
              <Input
                id="payment_date"
                type="date"
                value={salaryForm.payment_date}
                onChange={(e) => setSalaryForm({ ...salaryForm, payment_date: e.target.value })}
                required
                data-testid="salary-date-input"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSalaryModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-salary-btn">
                Uitbetalen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'employee' ? 'Werknemer verwijderen?' : 'Salarisbetaling verwijderen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'employee' 
                ? `Weet u zeker dat u ${selectedEmployee?.name} wilt verwijderen?`
                : 'Weet u zeker dat u deze salarisbetaling wilt verwijderen? Het bedrag wordt niet automatisch teruggestort naar het kasgeld.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
