import { useState, useEffect } from 'react';
import { 
  getMaintenance, 
  createMaintenance, 
  updateMaintenance,
  deleteMaintenance, 
  getApartments,
  formatCurrency 
} from '../lib/api';
import { toast } from 'sonner';
import { 
  Wrench, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Home,
  Droplets,
  ChefHat,
  PaintBucket,
  DoorOpen,
  Hammer,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const MAINTENANCE_CATEGORIES = [
  { value: 'wc', label: 'WC / Toilet', icon: DoorOpen },
  { value: 'kraan', label: 'Kraan', icon: Droplets },
  { value: 'douche', label: 'Douche', icon: Droplets },
  { value: 'keuken', label: 'Keuken', icon: ChefHat },
  { value: 'kasten', label: 'Kasten', icon: DoorOpen },
  { value: 'verven', label: 'Verven', icon: PaintBucket },
  { value: 'overig', label: 'Overig', icon: Hammer },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'In afwachting' },
  { value: 'in_progress', label: 'Bezig' },
  { value: 'completed', label: 'Voltooid' },
];

export default function Onderhoud() {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    apartment_id: '',
    category: 'overig',
    description: '',
    cost: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    status: 'completed',
    cost_type: 'kasgeld', // 'kasgeld' or 'tenant'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [maintenanceRes, apartmentsRes] = await Promise.all([
        getMaintenance(),
        getApartments()
      ]);
      setMaintenanceRecords(maintenanceRes.data);
      setApartments(apartmentsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost),
      };

      if (selectedRecord) {
        await updateMaintenance(selectedRecord.id, data);
        toast.success('Onderhoudsrecord bijgewerkt');
      } else {
        await createMaintenance(data);
        toast.success('Onderhoud geregistreerd - kosten verrekend met kasgeld');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      apartment_id: record.apartment_id,
      category: record.category,
      description: record.description,
      cost: record.cost.toString(),
      maintenance_date: record.maintenance_date,
      status: record.status,
      cost_type: record.cost_type || 'kasgeld',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteMaintenance(selectedRecord.id);
      toast.success('Onderhoudsrecord verwijderd');
      setShowDeleteDialog(false);
      setSelectedRecord(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setSelectedRecord(null);
    setFormData({
      apartment_id: '',
      category: 'overig',
      description: '',
      cost: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      status: 'completed',
      cost_type: 'kasgeld',
    });
  };

  const getCategoryInfo = (category) => {
    return MAINTENANCE_CATEGORIES.find(c => c.value === category) || MAINTENANCE_CATEGORIES[6];
  };

  const getStatusInfo = (status) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch = 
      record.apartment_name?.toLowerCase().includes(search.toLowerCase()) ||
      record.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate total costs
  const totalCosts = maintenanceRecords.reduce((sum, r) => sum + r.cost, 0);
  const completedCount = maintenanceRecords.filter(r => r.status === 'completed').length;
  const pendingCount = maintenanceRecords.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
  const kasgeldCosts = maintenanceRecords.filter(r => r.cost_type === 'kasgeld').reduce((sum, r) => sum + r.cost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Onderhoud laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="onderhoud-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-blue-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-cyan-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-blue-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Wrench className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{maintenanceRecords.length} onderhoudsrecords</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Onderhoud Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer reparaties en onderhoud van appartementen
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            size="sm"
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm"
            data-testid="add-maintenance-btn"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Onderhoud Registreren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Costs - Featured */}
        <div className="col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 p-4 sm:p-6 text-white shadow-xl shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Totale Kosten</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{formatCurrency(totalCosts)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Voltooid</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">In Behandeling</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Kasgeld Costs */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Van Kasgeld</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(kasgeldCosts)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op appartement of omschrijving..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="search-maintenance"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" data-testid="category-filter">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              {MAINTENANCE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Maintenance Table */}
      {filteredRecords.length > 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-border/50">
            {filteredRecords.map((record) => {
              const categoryInfo = getCategoryInfo(record.category);
              const CategoryIcon = categoryInfo.icon;
              const statusInfo = getStatusInfo(record.status);
              return (
                <div key={record.id} className="p-4" data-testid={`maintenance-row-${record.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <CategoryIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{record.apartment_name}</p>
                        <p className="text-xs text-muted-foreground">{categoryInfo.label}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      record.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                      record.status === 'in_progress' ? 'bg-orange-500/10 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{record.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(record.cost)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      record.cost_type === 'tenant' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {record.cost_type === 'tenant' ? 'Huurder' : 'Kasgeld'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Appartement</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kosten voor</TableHead>
                  <TableHead className="text-right">Kosten</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const categoryInfo = getCategoryInfo(record.category);
                  const CategoryIcon = categoryInfo.icon;
                  const statusInfo = getStatusInfo(record.status);
                  return (
                    <TableRow key={record.id} data-testid={`maintenance-row-${record.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {record.maintenance_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          {record.apartment_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-4 h-4 text-blue-600" />
                          {categoryInfo.label}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.description}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                          record.status === 'in_progress' ? 'bg-orange-500/10 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.cost_type === 'tenant' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          {record.cost_type === 'tenant' ? 'Huurder' : 'Kasgeld'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(record.cost)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setSelectedRecord(record); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 border-dashed">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
              <Wrench className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">
              {search || categoryFilter !== 'all' ? 'Geen onderhoudsrecords gevonden' : 'Nog geen onderhoud'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm">
              {search || categoryFilter !== 'all' 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Registreer uw eerste onderhoudswerk om te beginnen'}
            </p>
            {!search && categoryFilter === 'all' && (
              <Button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="shadow-lg shadow-blue-500/20 bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Eerste Onderhoud Registreren
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? 'Onderhoud bewerken' : 'Nieuw onderhoud'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Appartement *</Label>
              <Select 
                value={formData.apartment_id} 
                onValueChange={(value) => setFormData({ ...formData, apartment_id: value })}
              >
                <SelectTrigger data-testid="maintenance-apartment-select">
                  <SelectValue placeholder="Selecteer appartement" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="maintenance-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bijv. Lekkende kraan gerepareerd..."
                rows={3}
                required
                data-testid="maintenance-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Kosten (SRD) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
                required
                data-testid="maintenance-cost-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Kosten voor *</Label>
              <Select 
                value={formData.cost_type} 
                onValueChange={(value) => setFormData({ ...formData, cost_type: value })}
              >
                <SelectTrigger data-testid="maintenance-cost-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasgeld">Kasgeld (wordt afgetrokken)</SelectItem>
                  <SelectItem value="tenant">Huurder (niet van kasgeld)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.cost_type === 'kasgeld' 
                  ? 'Kosten worden van het kasgeld afgetrokken'
                  : 'Kosten zijn voor rekening van de huurder'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance_date">Datum *</Label>
                <Input
                  id="maintenance_date"
                  type="date"
                  value={formData.maintenance_date}
                  onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                  required
                  data-testid="maintenance-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="maintenance-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-maintenance-btn">
                {selectedRecord ? 'Opslaan' : 'Registreren'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Onderhoudsrecord verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit onderhoudsrecord wilt verwijderen? 
              De kosten worden niet automatisch teruggestort naar het kasgeld.
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
