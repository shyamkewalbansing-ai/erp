import React, { useState, useEffect } from 'react';
import { exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatNumber, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, ArrowLeftRight, Loader2, TrendingUp, DollarSign, Euro, RefreshCw, ExternalLink, CheckCircle, Building2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const WisselkoersenPage = () => {
  const [rates, setRates] = useState([]);
  const [latestRates, setLatestRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showCMEDialog, setShowCMEDialog] = useState(false);
  const [cmePreview, setCmePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [newRate, setNewRate] = useState({
    datum: new Date().toISOString().split('T')[0],
    valuta_van: 'USD',
    valuta_naar: 'SRD',
    koers: 0,
    bron: 'handmatig'
  });

  useEffect(() => {
    fetchData();
    // Auto-sync CME koersen bij openen van de pagina
    handleAutoSync();
  }, []);

  const fetchData = async () => {
    try {
      const [ratesRes, latestRes] = await Promise.all([
        exchangeRatesAPI.getAll(),
        exchangeRatesAPI.getLatest()
      ]);
      setRates(ratesRes.data || []);
      setLatestRates(latestRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSync = async () => {
    // Controleer of er vandaag al koersen van CME zijn
    const today = new Date().toISOString().split('T')[0];
    try {
      const ratesRes = await exchangeRatesAPI.getAll();
      const todaysCMERates = (ratesRes.data || []).filter(
        r => r.datum === today && r.bron === 'CME.sr'
      );
      
      // Als er nog geen CME koersen van vandaag zijn, sync automatisch
      if (todaysCMERates.length === 0) {
        await handleSyncCME(true); // silent mode
      }
    } catch (error) {
      console.log('Auto-sync check failed:', error);
    }
  };

  const handleSyncCME = async (silent = false) => {
    setSyncing(true);
    try {
      const response = await exchangeRatesAPI.syncCME();
      if (!silent) {
        toast.success(response.data?.message || 'Wisselkoersen gesynchroniseerd van CME.sr');
      }
      fetchData();
      setShowCMEDialog(false);
    } catch (error) {
      const message = error?.response?.data?.detail || 'Fout bij synchroniseren met CME.sr';
      if (!silent) {
        toast.error(message);
      }
      console.error('CME sync error:', message);
    } finally {
      setSyncing(false);
    }
  };

  const handlePreviewCME = async () => {
    setLoadingPreview(true);
    setCmePreview(null);
    try {
      const response = await exchangeRatesAPI.previewCME();
      setCmePreview(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Kon CME koersen niet ophalen');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreateRate = async () => {
    if (!newRate.koers || newRate.koers <= 0) {
      toast.error('Voer een geldige koers in');
      return;
    }
    setSaving(true);
    try {
      await exchangeRatesAPI.create(newRate);
      toast.success('Wisselkoers toegevoegd');
      setShowRateDialog(false);
      setNewRate({
        datum: new Date().toISOString().split('T')[0],
        valuta_van: 'USD',
        valuta_naar: 'SRD',
        koers: 0,
        bron: 'handmatig'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setSaving(false);
    }
  };

  const usdRates = rates.filter(r => r.valuta_van === 'USD').slice(0, 30).reverse();
  const eurRates = rates.filter(r => r.valuta_van === 'EUR').slice(0, 30).reverse();

  const chartData = usdRates.map((r, i) => ({
    date: formatDate(r.datum, 'short'),
    USD: r.koers,
    EUR: eurRates[i]?.koers || null
  }));

  return (
    <div className="space-y-6" data-testid="wisselkoersen-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Wisselkoersen</h1>
          <p className="text-slate-500 mt-1">Beheer valutakoersen voor SRD</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* CME.sr Sync Button */}
          <Dialog open={showCMEDialog} onOpenChange={(open) => { setShowCMEDialog(open); if (open) handlePreviewCME(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="sync-cme-btn">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync CME.sr
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  CME.sr Wisselkoersen
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-500">Koersen ophalen van CME.sr...</span>
                  </div>
                ) : cmePreview ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Bron: Central Money Exchange</span>
                      <a 
                        href="https://www.cme.sr" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        cme.sr <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    {cmePreview.cme_last_updated && (
                      <p className="text-xs text-slate-400">
                        CME laatste update: {cmePreview.cme_last_updated}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      {/* USD Koersen */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">USD → SRD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-green-600 uppercase">Inkoop (CME koopt)</span>
                            <p className="text-xl font-bold text-green-900">
                              {cmePreview.rates?.USD_SRD?.inkoop?.toFixed(2) || '-'} SRD
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-green-600 uppercase">Verkoop (CME verkoopt)</span>
                            <p className="text-xl font-bold text-green-900">
                              {cmePreview.rates?.USD_SRD?.verkoop?.toFixed(2) || '-'} SRD
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* EUR Koersen */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Euro className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">EUR → SRD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-blue-600 uppercase">Inkoop</span>
                            <p className="text-xl font-bold text-blue-900">
                              {cmePreview.rates?.EUR_SRD?.inkoop?.toFixed(2) || '-'} SRD
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-blue-600 uppercase">Verkoop</span>
                            <p className="text-xl font-bold text-blue-900">
                              {cmePreview.rates?.EUR_SRD?.verkoop?.toFixed(2) || '-'} SRD
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">
                    Kon koersen niet ophalen
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCMEDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={() => handleSyncCME(false)} 
                  disabled={syncing || !cmePreview}
                  data-testid="confirm-sync-cme-btn"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Koersen Opslaan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Handmatig Toevoegen */}
          <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-rate-btn">
                <Plus className="w-4 h-4 mr-2" />
                Handmatig
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Wisselkoers Toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newRate.datum}
                    onChange={(e) => setNewRate({...newRate, datum: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newRate.valuta_van} onValueChange={(v) => setNewRate({...newRate, valuta_van: v})}>
                    <SelectTrigger data-testid="rate-currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Koers (1 {newRate.valuta_van} = ? SRD)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newRate.koers}
                  onChange={(e) => setNewRate({...newRate, koers: parseFloat(e.target.value) || 0})}
                  placeholder="35.50"
                  data-testid="rate-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Bron</Label>
                <Select value={newRate.bron} onValueChange={(v) => setNewRate({...newRate, bron: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central_bank">Centrale Bank Suriname</SelectItem>
                    <SelectItem value="bank">Commerciële Bank</SelectItem>
                    <SelectItem value="handmatig">Handmatig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateRate} className="w-full" disabled={saving} data-testid="save-rate-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">USD / SRD</p>
                <p className="text-3xl font-bold font-mono text-slate-900">
                  {latestRates?.USD_SRD ? formatNumber(latestRates.USD_SRD.koers, 4) : '-'}
                </p>
                {latestRates?.USD_SRD && (
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(latestRates.USD_SRD.datum)} - {latestRates.USD_SRD.bron === 'central_bank' ? 'Centrale Bank' : latestRates.USD_SRD.bron === 'bank' ? 'Bank' : 'Handmatig'}
                  </p>
                )}
              </div>
              <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">EUR / SRD</p>
                <p className="text-3xl font-bold font-mono text-slate-900">
                  {latestRates?.EUR_SRD ? formatNumber(latestRates.EUR_SRD.koers, 4) : '-'}
                </p>
                {latestRates?.EUR_SRD && (
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(latestRates.EUR_SRD.datum)} - {latestRates.EUR_SRD.bron === 'central_bank' ? 'Centrale Bank' : latestRates.EUR_SRD.bron === 'bank' ? 'Bank' : 'Handmatig'}
                  </p>
                )}
              </div>
              <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                <Euro className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Koersontwikkeling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="USD"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e' }}
                    name="USD/SRD"
                  />
                  <Line
                    type="monotone"
                    dataKey="EUR"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                    name="EUR/SRD"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Koershistorie</CardTitle>
          <CardDescription>
            Koersen worden automatisch gesynchroniseerd bij openen van de boekhouding module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">Datum</TableHead>
                <TableHead className="w-20">Valuta</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="text-right w-32">Koers</TableHead>
                <TableHead>Bron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(rate => (
                <TableRow key={rate.id}>
                  <TableCell>{formatDate(rate.datum)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {rate.valuta_van}/{rate.valuta_naar || 'SRD'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rate.koers_type ? (
                      <Badge variant="secondary" className={
                        rate.koers_type === 'inkoop' ? 'bg-orange-100 text-orange-700' :
                        rate.koers_type === 'verkoop' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {rate.koers_type === 'inkoop' ? 'Inkoop' : rate.koers_type === 'verkoop' ? 'Verkoop' : rate.koers_type}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatNumber(rate.koers, 4)}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      rate.bron === 'CME.sr' ? 'bg-green-100 text-green-700' :
                      rate.bron === 'central_bank' ? 'bg-blue-100 text-blue-700' :
                      rate.bron === 'bank' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {rate.bron === 'CME.sr' ? 'CME.sr' :
                       rate.bron === 'central_bank' ? 'Centrale Bank' : 
                       rate.bron === 'bank' ? 'Bank' : 'Handmatig'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Geen wisselkoersen gevonden. Klik op "Sync CME.sr" om actuele koersen op te halen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WisselkoersenPage;
