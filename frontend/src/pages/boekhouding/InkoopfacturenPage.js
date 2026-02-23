import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { FileText, Search, Download, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  concept: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  gedeeltelijk_betaald: 'bg-yellow-100 text-yellow-800',
  betaald: 'bg-green-100 text-green-800',
  vervallen: 'bg-red-100 text-red-800'
};

export default function InkoopfacturenPage() {
  const [facturen, setFacturen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totaal_open: 0,
    totaal_betaald: 0,
    aantal_vervallen: 0
  });

  useEffect(() => {
    fetchFacturen();
  }, []);

  const fetchFacturen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/inkoopfacturen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFacturen(data);
        
        // Bereken statistieken
        let totaalOpen = 0;
        let totaalBetaald = 0;
        let aantalVervallen = 0;
        
        data.forEach(f => {
          if (f.status === 'betaald') {
            totaalBetaald += f.totaal || 0;
          } else if (f.status === 'open' || f.status === 'gedeeltelijk_betaald') {
            totaalOpen += (f.totaal || 0) - (f.betaald_bedrag || 0);
          }
          if (f.status === 'vervallen') {
            aantalVervallen++;
          }
        });
        
        setStats({
          totaal_open: totaalOpen,
          totaal_betaald: totaalBetaald,
          aantal_vervallen: aantalVervallen
        });
      }
    } catch (error) {
      toast.error('Fout bij ophalen inkoopfacturen');
    } finally {
      setLoading(false);
    }
  };

  const filteredFacturen = facturen.filter(f => 
    f.factuurnummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.crediteur_naam?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount, currency = 'SRD') => {
    return `${currency} ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inkoopfacturen</h1>
          <p className="text-muted-foreground">Overzicht van alle inkoopfacturen van crediteuren</p>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Openstaand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totaal_open)}</div>
            <p className="text-xs text-muted-foreground">Te betalen aan crediteuren</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Betaald</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totaal_betaald)}</div>
            <p className="text-xs text-muted-foreground">Totaal betaald deze periode</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vervallen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.aantal_vervallen}</div>
            <p className="text-xs text-muted-foreground">Facturen over vervaldatum</p>
          </CardContent>
        </Card>
      </div>

      {/* Zoeken */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op factuurnummer of crediteur..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Facturen lijst */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredFacturen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen inkoopfacturen gevonden
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFacturen.map((factuur) => (
                <div key={factuur.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{factuur.factuurnummer}</p>
                      <p className="text-sm text-muted-foreground">{factuur.crediteur_naam}</p>
                      <p className="text-xs text-muted-foreground">
                        Datum: {factuur.factuurdatum} | Vervalt: {factuur.vervaldatum}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(factuur.totaal, factuur.valuta)}</p>
                      {factuur.betaald_bedrag > 0 && factuur.status !== 'betaald' && (
                        <p className="text-xs text-green-600">Betaald: {formatCurrency(factuur.betaald_bedrag, factuur.valuta)}</p>
                      )}
                      <Badge className={statusColors[factuur.status] || 'bg-gray-100'}>
                        {factuur.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
