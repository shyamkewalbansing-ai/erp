import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Search, MoreHorizontal, Mail, Phone, 
  Building2, Edit, Trash2, Briefcase, Calendar, Loader2
} from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
};

export default function HRMPersoneel() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', position: '', department: '',
    salary: '', hire_date: '', birth_date: '', address: '',
    id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, departmentsRes] = await Promise.all([
        api.get('/hrm/employees'),
        api.get('/hrm/departments')
      ]);
      setEmployees(employeesRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Naam is verplicht');
      return;
    }
    
    setSaving(true);
    try {
      const data = { ...formData, salary: parseFloat(formData.salary) || 0 };
      if (editingEmployee) {
        await api.put(`/hrm/employees/${editingEmployee.id}`, data);
        toast.success('Werknemer bijgewerkt');
      } else {
        await api.post('/hrm/employees', data);
        toast.success('Werknemer toegevoegd');
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

  const handleDelete = async () => {
    try {
      await api.delete(`/hrm/employees/${deleteEmployee.id}`);
      toast.success('Werknemer verwijderd');
      setShowDeleteDialog(false);
      setDeleteEmployee(null);
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: '', email: '', phone: '', position: '', department: '',
      salary: '', hire_date: '', birth_date: '', address: '',
      id_number: '', emergency_contact: '', emergency_phone: '', status: 'active'
    });
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
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
    setShowModal(true);
  };

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
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
      on_leave: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    const labels = { active: 'Actief', inactive: 'Inactief', on_leave: 'Met Verlof' };
    return <Badge variant="outline" className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personeel</h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw werknemers en hun gegevens
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} size="lg" className="shadow-lg">
          <UserPlus className="w-5 h-5 mr-2" />
          Nieuwe Werknemer
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op naam, email of functie..." 
                className="pl-10" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle afdelingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Alle statussen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
                <SelectItem value="on_leave">Met Verlof</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-sm text-muted-foreground">Totaal Werknemers</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{employees.filter(e => e.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Actief</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{employees.filter(e => e.status === 'on_leave').length}</p>
            <p className="text-sm text-muted-foreground">Met Verlof</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{formatCurrency(employees.reduce((sum, e) => sum + (e.salary || 0), 0))}</p>
            <p className="text-sm text-muted-foreground">Totaal Loonkosten</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Geen werknemers gevonden</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Probeer een andere zoekterm' : 'Voeg uw eerste werknemer toe om te beginnen'}
            </p>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Werknemer Toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmployees.map(emp => (
            <Card key={emp.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {emp.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{emp.name}</h3>
                        {getStatusBadge(emp.status)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-sm">{emp.position || 'Geen functie'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {emp.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {emp.email}
                          </span>
                        )}
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {emp.phone}
                          </span>
                        )}
                        {emp.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {emp.department}
                          </span>
                        )}
                        {emp.hire_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            In dienst: {new Date(emp.hire_date).toLocaleDateString('nl-NL')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {emp.salary > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xl font-bold text-primary">{formatCurrency(emp.salary)}</p>
                        <p className="text-xs text-muted-foreground">per maand</p>
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(emp)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600" 
                          onClick={() => { setDeleteEmployee(emp); setShowDeleteDialog(true); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Werknemer Bewerken' : 'Nieuwe Werknemer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2">
              <Label>Volledige Naam *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Voer de volledige naam in"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                placeholder="email@voorbeeld.com"
              />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                placeholder="+597 123-4567"
              />
            </div>
            <div>
              <Label>Functie</Label>
              <Input 
                value={formData.position} 
                onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                placeholder="Bijv. Manager, Developer"
              />
            </div>
            <div>
              <Label>Afdeling</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer afdeling" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Maandsalaris (SRD)</Label>
              <Input 
                type="number" 
                value={formData.salary} 
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })} 
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                  <SelectItem value="on_leave">Met Verlof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum Indiensttreding</Label>
              <Input 
                type="date" 
                value={formData.hire_date} 
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} 
              />
            </div>
            <div>
              <Label>Geboortedatum</Label>
              <Input 
                type="date" 
                value={formData.birth_date} 
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} 
              />
            </div>
            <div>
              <Label>ID/Paspoortnummer</Label>
              <Input 
                value={formData.id_number} 
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} 
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Adres</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                placeholder="Straat, Stad"
              />
            </div>
            <div>
              <Label>Noodcontact Naam</Label>
              <Input 
                value={formData.emergency_contact} 
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} 
              />
            </div>
            <div>
              <Label>Noodcontact Telefoon</Label>
              <Input 
                value={formData.emergency_phone} 
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingEmployee ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Werknemer Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u <strong>{deleteEmployee?.name}</strong> wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
