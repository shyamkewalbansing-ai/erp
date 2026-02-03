import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Loader2, Package, Clock, Check, X, AlertCircle } from 'lucide-react';
import api, { formatCurrency } from '../lib/api';

export default function MijnModules() {
  const [addonRequests, setAddonRequests] = useState([]);
  const [activeAddons, setActiveAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, activeRes] = await Promise.all([
        api.get('/my-addon-requests'),
        api.get('/my-active-addons')
      ]);
      setAddonRequests(requestsRes.data || []);
      setActiveAddons(activeRes.data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />In Afwachting</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Goedgekeurd</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Afgewezen</Badge>;
      case 'active':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Actief</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const pendingRequests = addonRequests.filter(r => r.status === 'pending');
  const processedRequests = addonRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mijn Modules</h1>
        <p className="text-muted-foreground">Bekijk uw actieve modules en aanvragen</p>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {pendingRequests.length} module{pendingRequests.length > 1 ? 's' : ''} in afwachting van goedkeuring
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Uw aanvraag wordt zo snel mogelijk verwerkt door de beheerder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Actieve Modules</h2>
        {activeAddons.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>U heeft nog geen actieve modules.</p>
              <p className="text-sm mt-2">Uw aangevraagde modules verschijnen hier zodra ze zijn goedgekeurd.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAddons.map((addon) => (
              <Card key={addon.id} className={`${addon.is_free ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-green-200'} dark:border-green-800`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{addon.addon_name}</h3>
                        {addon.is_free && (
                          <Badge className="bg-emerald-500 text-white text-xs">GRATIS</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {addon.is_free ? 'Altijd beschikbaar' : `Actief tot: ${addon.end_date ? new Date(addon.end_date).toLocaleDateString('nl-NL') : 'Onbeperkt'}`}
                      </p>
                    </div>
                    {getStatusBadge('active')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Aanvragen in Afwachting</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{request.addon_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Prijs: {formatCurrency(request.addon_price)}/maand
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aangevraagd op: {new Date(request.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Verwerkte Aanvragen</h2>
          <div className="space-y-2">
            {processedRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{request.addon_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No requests at all */}
      {addonRequests.length === 0 && activeAddons.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>U heeft nog geen modules aangevraagd.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/modules'}>
              Bekijk beschikbare modules
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
