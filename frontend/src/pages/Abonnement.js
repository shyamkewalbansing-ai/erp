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

const features = [
  { icon: Users, text: 'Onbeperkt huurders beheren' },
  { icon: Building2, text: 'Onbeperkt appartementen' },
  { icon: Banknote, text: 'Kasgeld & financieel beheer' },
  { icon: FileText, text: 'PDF facturen & kwitanties' },
  { icon: Wrench, text: 'Onderhoudsbeheer' },
  { icon: BarChart3, text: 'Dashboard & rapportages' },
  { icon: Shield, text: 'Veilige data opslag' },
  { icon: Zap, text: 'Snelle updates & support' },
];

export default function Abonnement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showBankDetails, setShowBankDetails] = useState(false);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await getSubscriptionStatus();
      setSubscriptionData(response.data);
    } catch (error) {
      toast.error('Fout bij het laden van abonnementsstatus');
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
          {isActive ? 'Uw abonnement is actief' : isTrial ? 'Proefperiode' : 'Kies uw plan'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {isActive ? 'Abonnementsbeheer' : 'Activeer Facturatie N.V.'}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          De complete oplossing voor verhuurbeheer in Suriname. Beheer al uw huurders, appartementen en betalingen op één plek.
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
              Populair
            </Badge>
          </div>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Price */}
              <div>
                <p className="text-muted-foreground text-sm uppercase tracking-wider font-medium">Maandelijks</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-bold text-foreground">SRD 3.500</span>
                  <span className="text-muted-foreground">/maand</span>
                </div>
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

              {/* CTA Button */}
              {!isActive && (
                <Button 
                  size="lg"
                  className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20 mt-4"
                  onClick={() => setShowBankDetails(true)}
                  data-testid="show-payment-btn"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Nu Activeren
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}

              {isActive && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">Uw abonnement is actief</p>
                    <p className="text-sm text-muted-foreground">Geniet van alle functies van Facturatie N.V.</p>
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

      {/* Bank Details Section */}
      {(showBankDetails || !isActive) && !isActive && (
        <Card className="border-border/50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Betaalgegevens
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Maak een bankoverschrijving naar onderstaande rekening
            </p>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Bank Info */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-semibold text-foreground">Hakrinbank</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rekeningnummer</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">205911044</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => copyToClipboard('205911044')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Naam</span>
                    <span className="font-semibold text-foreground">Facturatie N.V.</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-muted-foreground">Bedrag</span>
                    <span className="text-xl font-bold text-primary">SRD 3.500,00</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Belangrijk
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Vermeld bij uw overschrijving uw telefoonnummer als omschrijving, zodat wij uw betaling kunnen koppelen.
                  </p>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span className="text-muted-foreground">Omschrijving</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">+5978934982</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      onClick={() => copyToClipboard('+5978934982')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleRequestSubscription}
                  disabled={requesting}
                  className="w-full h-12 rounded-xl"
                  data-testid="request-subscription-btn"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Bezig met verzenden...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Ik heb betaald - Activatie aanvragen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {subscriptionData?.history && subscriptionData.history.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Betalingsgeschiedenis
            </h3>
            <div className="space-y-3">
              {subscriptionData.history.map((payment, index) => (
                <div 
                  key={payment.id || index}
                  className="flex justify-between items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {payment.payment_method}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
