import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSubscriptionStatus, requestSubscription, formatCurrency, getAddons, getMyAddons, requestAddonActivation } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Copy,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  Users,
  FileText,
  Banknote,
  Wrench,
  BarChart3,
  ArrowRight,
  Phone,
  Mail,
  ExternalLink,
  Package,
  Puzzle,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

// Platform features (basis account)
const features = [
  { icon: Shield, text: 'Veilige data opslag' },
  { icon: Zap, text: 'Snelle updates & support' },
  { icon: BarChart3, text: 'Modulair systeem' },
  { icon: Package, text: 'Kies uw eigen modules' },
];

export default function Abonnement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  
  // Add-ons state
  const [addons, setAddons] = useState([]);
  const [myAddons, setMyAddons] = useState([]);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [addonRequestDialogOpen, setAddonRequestDialogOpen] = useState(false);
  const [addonNotes, setAddonNotes] = useState('');
  const [requestingAddon, setRequestingAddon] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, addonsRes, myAddonsRes] = await Promise.all([
        getSubscriptionStatus(),
        getAddons(),
        getMyAddons()
      ]);
      setSubscriptionData(statusRes.data);
      setAddons(addonsRes.data);
      setMyAddons(myAddonsRes.data);
    } catch (error) {
      toast.error('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubscription = async () => {
    setRequesting(true);
    try {
      await requestSubscription();
      toast.success('Abonnementsverzoek verzonden!');
      setSubscriptionData(prev => ({
        ...prev,
        request_pending: true
      }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het aanvragen');
    } finally {
      setRequesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const handleRequestAddon = async () => {
    if (!selectedAddon) return;
    
    setRequestingAddon(true);
    try {
      await requestAddonActivation({
        addon_id: selectedAddon.id,
        notes: addonNotes || undefined
      });
      toast.success('Add-on verzoek verzonden! De beheerder zal uw verzoek beoordelen.');
      setAddonRequestDialogOpen(false);
      setSelectedAddon(null);
      setAddonNotes('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het aanvragen');
    } finally {
      setRequestingAddon(false);
    }
  };

  const isAddonActive = (addonId) => {
    return myAddons.some(ma => ma.addon_id === addonId && ma.status === 'active');
  };

  const getAddonEndDate = (addonId) => {
    const addon = myAddons.find(ma => ma.addon_id === addonId && ma.status === 'active');
    return addon?.end_date;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isExpired = subscriptionData?.status === 'expired' || subscriptionData?.status === 'none';
  const isTrial = subscriptionData?.is_trial;
  const isActive = subscriptionData?.status === 'active' && !isTrial;
  const daysRemaining = subscriptionData?.days_remaining || 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto" data-testid="subscription-page">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          {isActive ? 'Uw account is actief' : isTrial ? 'Proefperiode' : 'Activeer uw account'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {isActive ? 'Account & Modules' : 'Facturatie N.V. Platform'}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Modulaire bedrijfssoftware voor ondernemers. Activeer de modules die u nodig heeft en betaal alleen voor wat u gebruikt.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Status Card */}
        <Card className={`relative overflow-hidden ${isActive ? 'border-green-500/30 bg-green-500/5' : isTrial ? 'border-blue-500/30 bg-blue-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-500/20' : isTrial ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                {isActive ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : isTrial ? (
                  <Clock className="w-6 h-6 text-blue-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-lg font-bold ${isActive ? 'text-green-500' : isTrial ? 'text-blue-500' : 'text-orange-500'}`}>
                  {isActive ? 'Actief' : isTrial ? 'Proefperiode' : 'Verlopen'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Remaining Card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dagen resterend</p>
                <p className="text-lg font-bold text-foreground">{daysRemaining} dagen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valid Until Card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geldig tot</p>
                <p className="text-lg font-bold text-foreground">
                  {subscriptionData?.end_date 
                    ? new Date(subscriptionData.end_date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Pricing Card */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Pricing Card */}
        <Card className="lg:col-span-3 relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-white px-3 py-1">
              Basis Account
            </Badge>
          </div>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Price */}
              <div>
                <p className="text-muted-foreground text-sm uppercase tracking-wider font-medium">Platform Toegang</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-bold text-foreground">Gratis</span>
                  <span className="text-muted-foreground">+ modules</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Betaal alleen voor de modules die u gebruikt
                </p>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-border/50">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>

              {isActive && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">Uw account is actief</p>
                    <p className="text-sm text-muted-foreground">Activeer modules hieronder om te beginnen</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="lg:col-span-2 border-border/50">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Hulp nodig?</h3>
                <p className="text-muted-foreground text-sm">
                  Ons team staat klaar om u te helpen met al uw vragen over Facturatie N.V.
                </p>
              </div>

              <div className="space-y-4">
                <a 
                  href="tel:+5978934982" 
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefoon</p>
                    <p className="font-medium text-foreground">+597 893 4982</p>
                  </div>
                </a>

                <a 
                  href="mailto:info@facturatie.sr" 
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium text-foreground">info@facturatie.sr</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Payment pending notice */}
            {subscriptionData?.request_pending && (
              <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-500 font-medium mb-1">
                  <Clock className="w-4 h-4" />
                  Verzoek in behandeling
                </div>
                <p className="text-sm text-muted-foreground">
                  Uw activatieverzoek wordt binnen 24 uur verwerkt.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add-ons Section */}
      {addons.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-primary" />
              <CardTitle>Beschikbare Add-ons</CardTitle>
            </div>
            <CardDescription>
              Breid uw account uit met extra modules en functionaliteiten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map((addon) => {
                const isActive = isAddonActive(addon.id);
                const endDate = getAddonEndDate(addon.id);
                
                return (
                  <div 
                    key={addon.id} 
                    className={`relative p-6 rounded-xl border-2 transition-all ${
                      isActive 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-border hover:border-primary/30 hover:bg-primary/5'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-green-500 text-white">
                          <Check className="w-3 h-3 mr-1" />
                          Actief
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-green-500/20' : 'bg-primary/10'
                      }`}>
                        <Package className={`w-6 h-6 ${isActive ? 'text-green-500' : 'text-primary'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{addon.name}</h3>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(addon.price)}
                          <span className="text-sm text-muted-foreground font-normal">/maand</span>
                        </p>
                      </div>
                    </div>
                    
                    {addon.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {addon.description}
                      </p>
                    )}
                    
                    {isActive ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Add-on is geactiveerd</span>
                        </div>
                        {endDate && (
                          <p className="text-xs text-muted-foreground">
                            Geldig tot: {new Date(endDate).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setSelectedAddon(addon);
                          setAddonRequestDialogOpen(true);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Activeren Aanvragen
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Active Add-ons */}
      {myAddons.filter(a => a.status === 'active').length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <CardTitle>Mijn Actieve Add-ons</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAddons.filter(a => a.status === 'active').map((addon) => (
                <div 
                  key={addon.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{addon.addon_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Geactiveerd op: {new Date(addon.start_date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 text-white">Actief</Badge>
                    {addon.end_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tot: {new Date(addon.end_date).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-on Request Dialog */}
      <Dialog open={addonRequestDialogOpen} onOpenChange={setAddonRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add-on Activeren Aanvragen</DialogTitle>
            <DialogDescription>
              Vraag activatie aan voor "{selectedAddon?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{selectedAddon?.name}</h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedAddon?.price || 0)}
                    <span className="text-sm text-muted-foreground font-normal">/maand</span>
                  </p>
                </div>
              </div>
              {selectedAddon?.description && (
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedAddon.description}
                </p>
              )}
            </div>

            <div className="p-4 bg-muted rounded-xl">
              <h4 className="font-medium text-sm mb-2">Betaalinstructies</h4>
              <p className="text-sm text-muted-foreground">
                Maak het bedrag over naar ons rekeningnummer en dien daarna uw verzoek in. 
                De beheerder zal uw add-on activeren zodra de betaling is ontvangen.
              </p>
              <div className="mt-3 p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground">Rekeningnummer</p>
                <p className="font-mono font-medium">001.907.657</p>
                <p className="text-xs text-muted-foreground mt-1">De Surinaamsche Bank N.V.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerking (optioneel)</Label>
              <Textarea
                placeholder="Eventuele opmerkingen bij uw verzoek..."
                value={addonNotes}
                onChange={(e) => setAddonNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
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
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verzoek Indienen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
