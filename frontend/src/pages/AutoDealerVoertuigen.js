import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getAutoDealerVehicles,
  createAutoDealerVehicle,
  updateAutoDealerVehicle,
  deleteAutoDealerVehicle
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  Car,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Fuel,
  Gauge,
  Calendar,
  DollarSign,
  Settings,
  Tag
} from 'lucide-react';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  const symbol = symbols[currency.toUpperCase()] || currency;
  return `${symbol} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

const emptyVehicle = {
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  license_plate: '',
  vin: '',
  mileage: 0,
  fuel_type: 'benzine',
  transmission: 'automaat',
  color: '',
  body_type: 'sedan',
  engine_size: '',
  doors: 4,
  seats: 5,
  description: '',
  features: [],
  images: [],
  purchase_price: { srd: 0, eur: 0, usd: 0 },
  selling_price: { srd: 0, eur: 0, usd: 0 },
  status: 'in_stock',
  condition: 'used',
  purchase_date: '',
  supplier_name: '',
  supplier_contact: ''
};

export default function AutoDealerVoertuigen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('srd');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState(emptyVehicle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVehicles();
    // Check if we should open the new vehicle dialog
    if (searchParams.get('new') === 'true') {
      openNewVehicleDialog();
      setSearchParams({});
    }
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await getAutoDealerVehicles();
      setVehicles(res.data);
    } catch (error) {
      toast.error('Kon voertuigen niet laden');
    } finally {
      setLoading(false);
    }
  };

  const openNewVehicleDialog = () => {
    setSelectedVehicle(null);
    setFormData(emptyVehicle);
    setDialogOpen(true);
  };

  const openEditDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      ...emptyVehicle,
      ...vehicle,
      purchase_price: vehicle.purchase_price || { srd: 0, eur: 0, usd: 0 },
      selling_price: vehicle.selling_price || { srd: 0, eur: 0, usd: 0 }
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.brand || !formData.model) {
      toast.error('Merk en model zijn verplicht');
      return;
    }

    setSaving(true);
    try {
      if (selectedVehicle) {
        await updateAutoDealerVehicle(selectedVehicle.id, formData);
        toast.success('Voertuig bijgewerkt');
      } else {
        await createAutoDealerVehicle(formData);
        toast.success('Voertuig toegevoegd');
      }
      setDialogOpen(false);
      loadVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    
    try {
      await deleteAutoDealerVehicle(selectedVehicle.id);
      toast.success('Voertuig verwijderd');
      setDeleteDialogOpen(false);
      loadVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      in_stock: 'bg-green-100 text-green-700 border-green-200',
      reserved: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      sold: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = {
      in_stock: 'Op Voorraad',
      reserved: 'Gereserveerd',
      sold: 'Verkocht'
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getConditionBadge = (condition) => {
    const styles = {
      new: 'bg-emerald-100 text-emerald-700',
      used: 'bg-gray-100 text-gray-700',
      certified: 'bg-purple-100 text-purple-700'
    };
    const labels = {
      new: 'Nieuw',
      used: 'Gebruikt',
      certified: 'Gecertificeerd'
    };
    return (
      <Badge variant="outline" className={styles[condition]}>
        {labels[condition] || condition}
      </Badge>
    );
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.license_plate?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="autodealer-vehicles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-7 h-7 text-primary" />
            Voertuigen
          </h1>
          <p className="text-muted-foreground">Beheer uw voertuigen inventaris</p>
        </div>
        <Button onClick={openNewVehicleDialog} data-testid="add-vehicle-btn">
          <Plus className="w-4 h-4 mr-2" />
          Voertuig Toevoegen
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op merk, model of kenteken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="vehicle-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="in_stock">Op Voorraad</SelectItem>
                <SelectItem value="reserved">Gereserveerd</SelectItem>
                <SelectItem value="sold">Verkocht</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {['srd', 'eur', 'usd'].map((curr) => (
                <Button
                  key={curr}
                  variant={selectedCurrency === curr ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCurrency(curr)}
                >
                  {curr.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Geen voertuigen gevonden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Pas uw zoekopdracht of filters aan'
                : 'Voeg uw eerste voertuig toe om te beginnen'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={openNewVehicleDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Voertuig Toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openEditDialog(vehicle)}
              data-testid={`vehicle-card-${vehicle.id}`}
            >
              <CardContent className="p-0">
                {/* Vehicle Image or Placeholder */}
                <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center rounded-t-lg">
                  {vehicle.images && vehicle.images[0] ? (
                    <img 
                      src={vehicle.images[0]} 
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <Car className="w-16 h-16 text-slate-400" />
                  )}
                </div>
                
                {/* Vehicle Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                      <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {getStatusBadge(vehicle.status)}
                      {getConditionBadge(vehicle.condition)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-4 h-4" />
                      {vehicle.mileage?.toLocaleString()} km
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="w-4 h-4" />
                      {vehicle.fuel_type}
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="w-4 h-4" />
                      {vehicle.transmission}
                    </div>
                    {vehicle.license_plate && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {vehicle.license_plate}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(vehicle.selling_price?.[selectedCurrency] || 0, selectedCurrency)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(vehicle);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(vehicle);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              {selectedVehicle ? 'Voertuig Bewerken' : 'Nieuw Voertuig'}
            </DialogTitle>
            <DialogDescription>
              {selectedVehicle ? 'Pas de gegevens van dit voertuig aan' : 'Voeg een nieuw voertuig toe aan uw inventaris'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basis</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="pricing">Prijzen</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Merk *</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    placeholder="Toyota"
                    data-testid="vehicle-brand-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    placeholder="Corolla"
                    data-testid="vehicle-model-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Bouwjaar *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    data-testid="vehicle-year-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_plate">Kenteken</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({...formData, license_plate: e.target.value.toUpperCase()})}
                    placeholder="AB-123-C"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilometerstand</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({...formData, status: v})}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">Op Voorraad</SelectItem>
                      <SelectItem value="reserved">Gereserveerd</SelectItem>
                      <SelectItem value="sold">Verkocht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Conditie</Label>
                  <Select 
                    value={formData.condition} 
                    onValueChange={(v) => setFormData({...formData, condition: v})}
                  >
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nieuw</SelectItem>
                      <SelectItem value="used">Gebruikt</SelectItem>
                      <SelectItem value="certified">Gecertificeerd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Brandstof</Label>
                  <Select 
                    value={formData.fuel_type} 
                    onValueChange={(v) => setFormData({...formData, fuel_type: v})}
                  >
                    <SelectTrigger id="fuel_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="benzine">Benzine</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="elektrisch">Elektrisch</SelectItem>
                      <SelectItem value="hybride">Hybride</SelectItem>
                      <SelectItem value="lpg">LPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transmission">Transmissie</Label>
                  <Select 
                    value={formData.transmission} 
                    onValueChange={(v) => setFormData({...formData, transmission: v})}
                  >
                    <SelectTrigger id="transmission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automaat">Automaat</SelectItem>
                      <SelectItem value="handgeschakeld">Handgeschakeld</SelectItem>
                      <SelectItem value="semi-automaat">Semi-automaat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="body_type">Carrosserie</Label>
                  <Select 
                    value={formData.body_type} 
                    onValueChange={(v) => setFormData({...formData, body_type: v})}
                  >
                    <SelectTrigger id="body_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="hatchback">Hatchback</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="mpv">MPV</SelectItem>
                      <SelectItem value="pickup">Pick-up</SelectItem>
                      <SelectItem value="coupe">Coupé</SelectItem>
                      <SelectItem value="cabrio">Cabrio</SelectItem>
                      <SelectItem value="station">Station</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doors">Deuren</Label>
                  <Input
                    id="doors"
                    type="number"
                    value={formData.doors}
                    onChange={(e) => setFormData({...formData, doors: parseInt(e.target.value) || 4})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Zitplaatsen</Label>
                  <Input
                    id="seats"
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({...formData, seats: parseInt(e.target.value) || 5})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Kleur</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    placeholder="Zwart"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engine_size">Motorinhoud</Label>
                  <Input
                    id="engine_size"
                    value={formData.engine_size}
                    onChange={(e) => setFormData({...formData, engine_size: e.target.value})}
                    placeholder="1.8L"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vin">VIN / Chassisnummer</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                  placeholder="1HGBH41JXMN109186"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Voeg een beschrijving toe..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Inkoopprijs</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>SRD</Label>
                    <Input
                      type="number"
                      value={formData.purchase_price?.srd || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        purchase_price: {...formData.purchase_price, srd: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EUR</Label>
                    <Input
                      type="number"
                      value={formData.purchase_price?.eur || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        purchase_price: {...formData.purchase_price, eur: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>USD</Label>
                    <Input
                      type="number"
                      value={formData.purchase_price?.usd || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        purchase_price: {...formData.purchase_price, usd: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Verkoopprijs</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>SRD</Label>
                    <Input
                      type="number"
                      value={formData.selling_price?.srd || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        selling_price: {...formData.selling_price, srd: parseFloat(e.target.value) || 0}
                      })}
                      data-testid="vehicle-price-srd-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EUR</Label>
                    <Input
                      type="number"
                      value={formData.selling_price?.eur || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        selling_price: {...formData.selling_price, eur: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>USD</Label>
                    <Input
                      type="number"
                      value={formData.selling_price?.usd || 0}
                      onChange={(e) => setFormData({
                        ...formData, 
                        selling_price: {...formData.selling_price, usd: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Aankoopdatum</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date?.split('T')[0] || ''}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Leverancier</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                    placeholder="Naam leverancier"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-vehicle-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedVehicle ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voertuig Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u dit voertuig wilt verwijderen?
              {selectedVehicle && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
