import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, getAddons, getMyAddons, getModulePaymentStatus } from '../lib/api';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  AlertTriangle,
  Clock, 
  Loader2,
  Package,
  Puzzle,
  Check,
  ArrowRight,
  Calendar,
  CreditCard,
  Building2,
  Users,
  Car,
  Calculator,
  Fuel,
  Scissors,
  MessageSquare,
  Plus,
  Copy,
  Banknote,
  ShoppingCart
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';

// Module icons mapping
const MODULE_ICONS = {
  'hrm': Users,
  'vastgoed_beheer': Building2,
  'autodealer': Car,
  'boekhouding': Calculator,
  'pompstation': Fuel,
  'beautyspa': Scissors,
  'ai-chatbot': MessageSquare,
  'chatbot': MessageSquare,
  'default': Package
};

const getModuleIcon = (slug) => MODULE_ICONS[slug] || MODULE_ICONS['default'];

export default function MijnModules() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Modules state
  const [allAddons, setAllAddons] = useState([]);
  const [myAddons, setMyAddons] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Order dialog state
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderStep, setOrderStep] = useState(1); // 1 = confirm, 2 = payment info
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [addonsRes, myAddonsRes, paymentRes, methodsRes] = await Promise.all([
        getAddons(),
        getMyAddons(),
        getModulePaymentStatus(),
        api.get('/user/modules/payment-methods').catch(() => ({ data: { payment_methods: [] } }))
      ]);
      setAllAddons(addonsRes.data || []);
      setMyAddons(myAddonsRes.data || []);
      setPaymentStatus(paymentRes.data);
      setPaymentMethods(methodsRes.data?.payment_methods || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAddon = async () => {
    if (!selectedAddon) return;
    
    setOrdering(true);
    try {
      const response = await api.post('/user/modules/order', {
        modules: [selectedAddon.id]
      });
      setOrderResult(response.data);
      setOrderStep(2);
      toast.success('Module geactiveerd met 3 dagen proefperiode!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het bestellen');
    } finally {
      setOrdering(false);
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const getModuleStatus = (addonId) => {
    const myAddon = myAddons.find(ma => ma.addon_id === addonId);
    if (!myAddon) return null;
    return myAddon.status;
  };

  const getModuleEndDate = (addonId) => {
    const myAddon = myAddons.find(ma => ma.addon_id === addonId);
    return myAddon?.end_date;
  };

  const isModuleActive = (addonId) => {
    const status = getModuleStatus(addonId);
    return status === 'active' || status === 'trial';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Separate active and available modules
  const activeModules = myAddons.filter(ma => ma.status === 'active' || ma.status === 'trial');
  const expiredModules = myAddons.filter(ma => ma.status === 'expired' || ma.status === 'trial_expired');
  const availableAddons = allAddons.filter(addon => 
    !myAddons.some(ma => ma.addon_id === addon.id)
  );

  // Calculate totals
  const monthlyTotal = activeModules.reduce((sum, ma) => {
    const addon = allAddons.find(a => a.id === ma.addon_id);
    return sum + (addon?.price || 0);
  }, 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto" data-testid="modules-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Mijn Modules</h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw actieve modules en bekijk beschikbare opties
          </p>
        </div>
        <Button onClick={() => navigate('/prijzen')} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Module
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actieve Modules</p>
                <p className="text-2xl font-bold text-foreground">{activeModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maandelijks Totaal</p>
                <p className="text-2xl font-bold text-foreground">SRD {monthlyTotal.toLocaleString('nl-NL')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Beschikbaar</p>
                <p className="text-2xl font-bold text-foreground">{availableAddons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expired Modules Warning */}
      {expiredModules.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">Verlopen Modules</h3>
                <p className="text-sm text-orange-700 mb-3">
                  U heeft {expiredModules.length} module(s) waarvan de proefperiode is verlopen. Betaal om deze te blijven gebruiken.
                </p>
                <div className="flex flex-wrap gap-2">
                  {expiredModules.map(ma => {
                    const addon = allAddons.find(a => a.id === ma.addon_id);
                    return (
                      <Badge key={ma.id} variant="outline" className="bg-white text-orange-700 border-orange-300">
                        {addon?.name || ma.addon_slug}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Modules */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Actieve Modules
        </h2>
        
        {activeModules.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeModules.map(myAddon => {
              const addon = allAddons.find(a => a.id === myAddon.addon_id);
              if (!addon) return null;
              
              const IconComponent = getModuleIcon(addon.slug);
              const isTrial = myAddon.status === 'trial';
              const isFree = addon.is_free || addon.price === 0;
              const endDate = myAddon.end_date ? new Date(myAddon.end_date) : null;
              const daysLeft = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <Card key={myAddon.id} className={`relative ${isTrial ? 'border-blue-200' : 'border-emerald-200'}`}>
                  <CardContent className="p-5">
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isFree ? (
                        <Badge className="bg-emerald-100 text-emerald-700">GRATIS</Badge>
                      ) : isTrial ? (
                        <Badge className="bg-blue-100 text-blue-700">PROEF</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">ACTIEF</Badge>
                      )}
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      isTrial ? 'bg-blue-100' : 'bg-emerald-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${isTrial ? 'text-blue-600' : 'text-emerald-600'}`} />
                    </div>
                    
                    {/* Info */}
                    <h3 className="font-semibold text-foreground mb-1">{addon.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {isFree ? 'Altijd gratis' : `SRD ${addon.price?.toLocaleString('nl-NL')}/mnd`}
                    </p>
                    
                    {/* Trial/End Date */}
                    {!isFree && endDate && (
                      <div className={`flex items-center gap-2 text-xs ${
                        daysLeft && daysLeft <= 3 ? 'text-orange-600' : 'text-muted-foreground'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {isTrial ? (
                          <span>Proefperiode eindigt: {endDate.toLocaleDateString('nl-NL')} ({daysLeft} dagen)</span>
                        ) : (
                          <span>Geldig tot: {endDate.toLocaleDateString('nl-NL')}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">U heeft nog geen actieve modules</p>
              <Button onClick={() => navigate('/prijzen')} className="mt-4">
                Bekijk Modules
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Available Modules */}
      {availableAddons.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-purple-600" />
            Beschikbare Modules
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAddons.filter(a => a.is_active).map(addon => {
              const IconComponent = getModuleIcon(addon.slug);
              const isFree = addon.is_free || addon.price === 0;
              
              return (
                <Card key={addon.id} className="border-slate-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-5">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                      <IconComponent className="w-6 h-6 text-slate-600" />
                    </div>
                    
                    {/* Info */}
                    <h3 className="font-semibold text-foreground mb-1">{addon.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {addon.description?.split('.')[0] || 'Module voor uw bedrijf'}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isFree ? 'text-emerald-600' : 'text-foreground'}`}>
                        {isFree ? 'Gratis' : `SRD ${addon.price?.toLocaleString('nl-NL')}/mnd`}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAddon(addon);
                          setOrderStep(1);
                          setOrderResult(null);
                          setOrderDialogOpen(true);
                        }}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Bestellen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={addonRequestDialogOpen} onOpenChange={setAddonRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Module Aanvragen</DialogTitle>
            <DialogDescription>
              Vraag toegang aan tot {selectedAddon?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAddon && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const IconComponent = getModuleIcon(selectedAddon.slug);
                      return <IconComponent className="w-5 h-5 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-medium">{selectedAddon.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAddon.is_free || selectedAddon.price === 0 
                        ? 'Gratis' 
                        : `SRD ${selectedAddon.price?.toLocaleString('nl-NL')}/maand`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Laat ons weten als u specifieke wensen heeft..."
                  value={addonNotes}
                  onChange={(e) => setAddonNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonRequestDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleRequestAddon} disabled={requestingAddon}>
              {requestingAddon ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Aanvragen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
