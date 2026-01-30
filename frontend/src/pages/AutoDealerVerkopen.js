import { useState, useEffect } from 'react';
import {
  getAutoDealerSales,
  getAutoDealerVehicles,
  getAutoDealerCustomers,
  createAutoDealerSale,
  updateAutoDealerSale,
  deleteAutoDealerSale
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
import { toast } from 'sonner';
import {
  ShoppingCart,
  Plus,
  Search,
  Edit,
  Trash2,
  Car,
  User,
  Loader2,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  const symbol = symbols[currency.toUpperCase()] || currency;
  return `${symbol} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

const emptySale = {
  vehicle_id: '',
  customer_id: '',
  sale_price: { srd: 0, eur: 0, usd: 0 },
  currency_used: 'srd',
  payment_method: 'cash',
  payment_status: 'pending',
  amount_paid: { srd: 0, eur: 0, usd: 0 },
  sale_date: new Date().toISOString().split('T')[0],
  delivery_date: '',
  notes: '',
  commission: 0,
  salesperson: ''
};

export default function AutoDealerVerkopen() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('srd');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [formData, setFormData] = useState(emptySale);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, vehiclesRes, customersRes] = await Promise.all([
        getAutoDealerSales(),
        getAutoDealerVehicles(),
        getAutoDealerCustomers()
      ]);
      setSales(salesRes.data);
      setVehicles(vehiclesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Kon gegevens niet laden');
    } finally {
      setLoading(false);
    }
  };

  // Get available vehicles (not sold, unless editing current sale)
  const availableVehicles = vehicles.filter(v => 
    v.status !== 'sold' || (selectedSale && v.id === selectedSale.vehicle_id)
  );

  const openNewSaleDialog = () => {
    setSelectedSale(null);
    setFormData(emptySale);
    setDialogOpen(true);
  };

  const openEditDialog = (sale) => {
    setSelectedSale(sale);
    setFormData({
      ...emptySale,
      ...sale,
      sale_price: sale.sale_price || { srd: 0, eur: 0, usd: 0 },
      amount_paid: sale.amount_paid || { srd: 0, eur: 0, usd: 0 },
      sale_date: sale.sale_date?.split('T')[0] || '',
      delivery_date: sale.delivery_date?.split('T')[0] || ''
    });
    setDialogOpen(true);
  };

  const handleVehicleSelect = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData({
        ...formData,
        vehicle_id: vehicleId,
        sale_price: vehicle.selling_price || { srd: 0, eur: 0, usd: 0 }
      });
    }
  };

  const handleSave = async () => {
    if (!formData.vehicle_id || !formData.customer_id) {
      toast.error('Voertuig en klant zijn verplicht');
      return;
    }

    setSaving(true);
    try {
      if (selectedSale) {
        await updateAutoDealerSale(selectedSale.id, formData);
        toast.success('Verkoop bijgewerkt');
      } else {
        await createAutoDealerSale(formData);
        toast.success('Verkoop toegevoegd');
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSale) return;
    
    try {
      await deleteAutoDealerSale(selectedSale.id);
      toast.success('Verkoop verwijderd');
      setDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  const getPaymentStatusBadge = (status) => {
    const config = {
      paid: { icon: CheckCircle, class: 'bg-green-100 text-green-700', label: 'Betaald' },
      partial: { icon: Clock, class: 'bg-yellow-100 text-yellow-700', label: 'Deelbetaling' },
      pending: { icon: AlertCircle, class: 'bg-red-100 text-red-700', label: 'Openstaand' }
    };
    const c = config[status] || config.pending;
    return (
      <Badge className={c.class}>
        <c.icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Contant',
      bank_transfer: 'Bankoverschrijving',
      financing: 'Financiering'
    };
    return labels[method] || method;
  };

  // Filter sales
  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.vehicle_info?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle_info?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_info?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.payment_status === statusFilter;
    
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
    <div className="space-y-6" data-testid="autodealer-sales-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary" />
            Verkopen
          </h1>
          <p className="text-muted-foreground">Beheer uw voertuig verkopen</p>
        </div>
        <Button onClick={openNewSaleDialog} data-testid="add-sale-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Verkoop
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op voertuig of klant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="sale-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Betaalstatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="paid">Betaald</SelectItem>
                <SelectItem value="partial">Deelbetaling</SelectItem>
                <SelectItem value="pending">Openstaand</SelectItem>
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

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Geen verkopen gevonden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Pas uw zoekopdracht of filters aan'
                : 'Registreer uw eerste verkoop om te beginnen'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={openNewSaleDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Verkoop
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Car className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {sale.vehicle_info?.brand} {sale.vehicle_info?.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {sale.vehicle_info?.year} • {sale.vehicle_info?.license_plate || 'Geen kenteken'}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.customer_info?.name || 'Onbekend'}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.customer_info?.phone || 'Geen telefoon'}
                      </p>
                    </div>
                  </div>

                  {/* Sale Details */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Verkoopprijs</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(sale.sale_price?.[selectedCurrency] || 0, selectedCurrency)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Datum</p>
                      <p className="font-medium">
                        {new Date(sale.sale_date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      {getPaymentStatusBadge(sale.payment_status)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(sale)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setSelectedSale(sale);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {selectedSale ? 'Verkoop Bewerken' : 'Nieuwe Verkoop'}
            </DialogTitle>
            <DialogDescription>
              {selectedSale ? 'Pas de verkoopgegevens aan' : 'Registreer een nieuwe voertuigverkoop'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vehicle Selection */}
            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Voertuig *</Label>
              <Select 
                value={formData.vehicle_id} 
                onValueChange={handleVehicleSelect}
              >
                <SelectTrigger id="vehicle_id">
                  <SelectValue placeholder="Selecteer een voertuig" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.year}) - {v.license_plate || 'Geen kenteken'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_id">Klant *</Label>
              <Select 
                value={formData.customer_id} 
                onValueChange={(v) => setFormData({...formData, customer_id: v})}
              >
                <SelectTrigger id="customer_id">
                  <SelectValue placeholder="Selecteer een klant" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sale Price */}
            <div className="space-y-2">
              <Label>Verkoopprijs</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">SRD</Label>
                  <Input
                    type="number"
                    value={formData.sale_price?.srd || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      sale_price: {...formData.sale_price, srd: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">EUR</Label>
                  <Input
                    type="number"
                    value={formData.sale_price?.eur || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      sale_price: {...formData.sale_price, eur: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">USD</Label>
                  <Input
                    type="number"
                    value={formData.sale_price?.usd || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      sale_price: {...formData.sale_price, usd: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency_used">Primaire Valuta</Label>
                <Select 
                  value={formData.currency_used} 
                  onValueChange={(v) => setFormData({...formData, currency_used: v})}
                >
                  <SelectTrigger id="currency_used">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="srd">SRD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Betaalmethode</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(v) => setFormData({...formData, payment_method: v})}
                >
                  <SelectTrigger id="payment_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Contant</SelectItem>
                    <SelectItem value="bank_transfer">Bankoverschrijving</SelectItem>
                    <SelectItem value="financing">Financiering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_status">Betaalstatus</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(v) => setFormData({...formData, payment_status: v})}
                >
                  <SelectTrigger id="payment_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Openstaand</SelectItem>
                    <SelectItem value="partial">Deelbetaling</SelectItem>
                    <SelectItem value="paid">Betaald</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_date">Verkoopdatum</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                />
              </div>
            </div>

            {/* Amount Paid (for partial payments) */}
            {formData.payment_status === 'partial' && (
              <div className="space-y-2">
                <Label>Betaald Bedrag</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">SRD</Label>
                    <Input
                      type="number"
                      value={formData.amount_paid?.srd || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        amount_paid: {...formData.amount_paid, srd: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">EUR</Label>
                    <Input
                      type="number"
                      value={formData.amount_paid?.eur || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        amount_paid: {...formData.amount_paid, eur: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">USD</Label>
                    <Input
                      type="number"
                      value={formData.amount_paid?.usd || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        amount_paid: {...formData.amount_paid, usd: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Leverdatum</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesperson">Verkoper</Label>
                <Input
                  id="salesperson"
                  value={formData.salesperson}
                  onChange={(e) => setFormData({...formData, salesperson: e.target.value})}
                  placeholder="Naam verkoper"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Extra informatie over deze verkoop..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-sale-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedSale ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verkoop Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze verkoop wilt verwijderen? Het voertuig wordt weer op &quot;Op Voorraad&quot; gezet.
              {selectedSale && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedSale.vehicle_info?.brand} {selectedSale.vehicle_info?.model}
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
