import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, Calculator, Users, Building2, Wallet, AlertCircle, ArrowUpRight, ArrowDownRight, TrendingUp, FileText, Receipt } from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (amount, currency = 'SRD') => {
  return `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

export default function BoekhoudingDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boekhouding/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Kon dashboard niet laden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <Button onClick={loadDashboard} variant="outline" size="sm">Opnieuw proberen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-600" />
            Boekhouding
          </h1>
          <p className="text-muted-foreground">Financieel overzicht en administratie</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/boekhouding/verkoopfacturen')} className="bg-emerald-600 hover:bg-emerald-700">
            <FileText className="w-4 h-4 mr-2" />
            Nieuwe Factuur
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Debiteuren */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/boekhouding/debiteuren')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Debiteuren</p>
                <p className="text-2xl font-bold">{data?.debiteuren_count || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Crediteuren */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/boekhouding/crediteuren')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crediteuren</p>
                <p className="text-2xl font-bold">{data?.crediteuren_count || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Vervallen Facturen */}
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${data?.vervallen_facturen > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vervallen Facturen</p>
                <p className={`text-2xl font-bold ${data?.vervallen_facturen > 0 ? 'text-red-600' : ''}`}>
                  {data?.vervallen_facturen || 0}
                </p>
              </div>
              <AlertCircle className={`w-8 h-8 ${data?.vervallen_facturen > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Bank Saldo */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/boekhouding/bankrekeningen')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bank Saldi</p>
                <div className="space-y-1">
                  {Object.entries(data?.bank_saldi || {}).map(([currency, amount]) => (
                    amount > 0 && (
                      <p key={currency} className="text-sm font-semibold">
                        {formatCurrency(amount, currency)}
                      </p>
                    )
                  ))}
                  {!Object.values(data?.bank_saldi || {}).some(v => v > 0) && (
                    <p className="text-sm text-muted-foreground">Geen saldo</p>
                  )}
                </div>
              </div>
              <Wallet className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Openstaande Bedragen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Te Ontvangen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
              Te Ontvangen (Debiteuren)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data?.openstaande_debiteuren || {}).map(([currency, amount]) => (
                <div key={currency} className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="font-medium">{currency}</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(amount, currency)}</span>
                </div>
              ))}
              {!Object.values(data?.openstaande_debiteuren || {}).some(v => v > 0) && (
                <p className="text-center text-muted-foreground py-4">Geen openstaande vorderingen</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Te Betalen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-red-500" />
              Te Betalen (Crediteuren)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data?.openstaande_crediteuren || {}).map(([currency, amount]) => (
                <div key={currency} className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span className="font-medium">{currency}</span>
                  <span className="text-red-600 font-semibold">{formatCurrency(amount, currency)}</span>
                </div>
              ))}
              {!Object.values(data?.openstaande_crediteuren || {}).some(v => v > 0) && (
                <p className="text-center text-muted-foreground py-4">Geen openstaande schulden</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Omzet Deze Maand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Omzet Deze Maand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(data?.omzet_maand || {}).map(([currency, amount]) => (
              <div key={currency} className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-muted-foreground">{currency}</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(amount, currency)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recente Transacties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-500" />
            Recente Transacties
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recente_transacties?.length > 0 ? (
            <div className="space-y-2">
              {data.recente_transacties.map((t, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{t.omschrijving}</p>
                    <p className="text-sm text-muted-foreground">{t.datum}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={t.type === 'inkomst' ? 'default' : 'destructive'}>
                      {t.type === 'inkomst' ? '+' : '-'}{formatCurrency(t.bedrag, t.valuta)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nog geen transacties</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/app/boekhouding/grootboek')}>
          <Calculator className="w-6 h-6 mb-2" />
          <span>Grootboek</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/app/boekhouding/verkoopfacturen')}>
          <FileText className="w-6 h-6 mb-2" />
          <span>Verkoopfacturen</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/app/boekhouding/btw')}>
          <Receipt className="w-6 h-6 mb-2" />
          <span>BTW Aangifte</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/app/boekhouding/rapportages')}>
          <TrendingUp className="w-6 h-6 mb-2" />
          <span>Rapportages</span>
        </Button>
      </div>
    </div>
  );
}
