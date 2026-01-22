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
  Hammer
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="onderhoud-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Onderhoud</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer reparaties en onderhoud van appartementen
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-full bg-primary hover:bg-primary/90"
          data-testid="add-maintenance-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Onderhoud registreren
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Totale onderhoudskosten</p>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalCosts)}</p>
              <p className="text-xs text-blue-600 mt-1">
                {maintenanceRecords.length} onderhoudsrecords
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-blue-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op appartement of omschrijving..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-transparent"
            data-testid="search-maintenance"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="category-filter">
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

      {/* Maintenance Table */}
      {filteredRecords.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Appartement</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Omschrijving</TableHead>
                <TableHead>Status</TableHead>
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
                      <span className={`status-badge ${
                        record.status === 'completed' ? 'status-paid' :
                        record.status === 'in_progress' ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {statusInfo.label}
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
                            className="text-destructive"
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
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen onderhoudsrecords gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search || categoryFilter !== 'all' 
              ? 'Probeer andere filters' 
              : 'Registreer uw eerste onderhoudswerk'}
          </p>
          {!search && categoryFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Onderhoud registreren
            </Button>
          )}
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
              <p className="text-xs text-muted-foreground">
                Kosten worden automatisch van het kasgeld afgetrokken
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
