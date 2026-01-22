import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSubscriptionStatus, requestSubscription, formatCurrency } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Building2,
  Copy,
  Loader2
} from 'lucide-react';

export default function Abonnement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);

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
      const response = await requestSubscription();
      toast.success('Abonnementsverzoek verzonden!');
      setSubscriptionData(prev => ({
        ...prev,
        request_pending: true,
        bank_info: response.data.bank_info
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

  const getStatusBadge = (status, isTrial) => {
    if (status === 'active' && !isTrial) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actief</Badge>;
    } else if (status === 'trial' || (status === 'active' && isTrial)) {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Proefperiode</Badge>;
    } else if (status === 'expired') {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Verlopen</Badge>;
    }
    return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Geen abonnement</Badge>;
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

  return (
    <div className="space-y-6" data-testid="subscription-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Abonnement</h1>
        <p className="text-muted-foreground">Beheer uw Facturatie N.V. abonnement</p>
      </div>

      {/* Warning banner for expired subscriptions */}
      {isExpired && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-500">Abonnement Verlopen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Uw abonnement is verlopen. Activeer uw abonnement om weer toegang te krijgen tot alle functies van Facturatie N.V.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial banner */}
      {isTrial && !isExpired && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-500">Proefperiode Actief</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  U heeft nog {subscriptionData?.days_remaining} dag(en) in uw gratis proefperiode. 
                  Activeer uw abonnement voordat de proefperiode eindigt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Huidige Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              {getStatusBadge(subscriptionData?.status, subscriptionData?.is_trial)}
            </div>
            
            {subscriptionData?.end_date && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Geldig tot</span>
                <span className="font-medium">
                  {new Date(subscriptionData.end_date).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Dagen resterend</span>
              <span className="font-medium">{subscriptionData?.days_remaining || 0} dagen</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Abonnementspakket
            </CardTitle>
            <CardDescription>Volledige toegang tot Facturatie N.V.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-primary">
                {formatCurrency(subscriptionData?.price_per_month || 3500)}
              </div>
              <p className="text-muted-foreground mt-1">per maand</p>
            </div>
            
            <ul className="space-y-2 mt-4">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Onbeperkt huurders beheren
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Onbeperkt appartementen
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Kasgeld & onderhoudsbeheer
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                PDF kwitanties genereren
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Werknemersbeheer & salarissen
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnement Activeren</CardTitle>
          <CardDescription>
            Betaal via bankoverschrijving om uw abonnement te activeren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold">Betaalgegevens</h4>
            
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">De Surinaamsche Bank</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Rekeningnummer</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">123456789</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard('123456789')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Naam</span>
                <span className="font-medium">Facturatie N.V.</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bedrag</span>
                <span className="font-medium text-primary">{formatCurrency(3500)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Omschrijving</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">Abonnement {user?.email}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(`Abonnement ${user?.email}`)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Na betaling, klik op de knop hieronder om uw verzoek in te dienen. 
              De beheerder zal uw abonnement binnen 24 uur activeren.
            </p>
            
            <Button 
              onClick={handleRequestSubscription}
              disabled={requesting}
              className="w-full sm:w-auto"
              data-testid="request-subscription-btn"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Activatie Aanvragen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {subscriptionData?.history && subscriptionData.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Betalingsgeschiedenis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptionData.history.map((payment, index) => (
                <div 
                  key={payment.id || index}
                  className="flex justify-between items-center p-3 bg-accent/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('nl-NL')}
                    </p>
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
