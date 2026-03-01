import React, { useState, useEffect } from 'react';
import { exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, DollarSign, Euro, RefreshCw, ExternalLink, CheckCircle, Building2 } from 'lucide-react';
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
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  const [newRate, setNewRate] = useState({
    datum: new Date().toISOString().split('T')[0],
    valuta_van: 'USD',
    valuta_naar: 'SRD',
    koers: 0,
    bron: 'handmatig'
  });

  // Format number with Dutch locale
  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num || 0);
  };

  useEffect(() => {
    fetchData();
    fetchSchedulerStatus();
    handleAutoSync();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const res = await exchangeRatesAPI.getSchedulerStatus();
      setSchedulerStatus(res.data);
    } catch (error) {
      console.log('Could not fetch scheduler status');
    }
  };

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
    const today = new Date().toISOString().split('T')[0];
    try {
      const ratesRes = await exchangeRatesAPI.getAll();
      const todaysCMERates = (ratesRes.data || []).filter(
        r => r.datum === today && r.bron === 'CME.sr'
      );
      
      if (todaysCMERates.length === 0) {
        await handleSyncCME(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="wisselkoersen-page">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="wisselkoersen-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Wisselkoersen</h1>
          <p className="text-gray-500 mt-0.5">Beheer valutakoersen voor SRD</p>
          {schedulerStatus?.scheduler?.running && (
            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Auto-sync actief: {schedulerStatus.sync_times?.join(', ')}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Koersen ophalen van CME.sr...</span>
                  </div>
                ) : cmePreview ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
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
                      <p className="text-xs text-gray-400">
                        CME laatste update: {cmePreview.cme_last_updated}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">USD → SRD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-green-600 uppercase">Inkoop</span>
                            <p className="text-xl font-semibold text-green-900">
                              {formatNumber(cmePreview.rates?.USD_SRD?.inkoop, 2)} SRD
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-green-600 uppercase">Verkoop</span>
                            <p className="text-xl font-semibold text-green-900">
                              {formatNumber(cmePreview.rates?.USD_SRD?.verkoop, 2)} SRD
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Euro className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">EUR → SRD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-blue-600 uppercase">Inkoop</span>
                            <p className="text-xl font-semibold text-blue-900">
                              {formatNumber(cmePreview.rates?.EUR_SRD?.inkoop, 2)} SRD
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-blue-600 uppercase">Verkoop</span>
                            <p className="text-xl font-semibold text-blue-900">
                              {formatNumber(cmePreview.rates?.EUR_SRD?.verkoop, 2)} SRD
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
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
      </div>

      {/* Current Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">USD / SRD</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {latestRates?.USD_SRD ? formatNumber(latestRates.USD_SRD.koers, 4) : '-'}
                </p>
                {latestRates?.USD_SRD && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(latestRates.USD_SRD.datum)} - {latestRates.USD_SRD.bron === 'central_bank' ? 'Centrale Bank' : latestRates.USD_SRD.bron === 'bank' ? 'Bank' : 'Handmatig'}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">EUR / SRD</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {latestRates?.EUR_SRD ? formatNumber(latestRates.EUR_SRD.koers, 4) : '-'}
                </p>
                {latestRates?.EUR_SRD && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(latestRates.EUR_SRD.datum)} - {latestRates.EUR_SRD.bron === 'central_bank' ? 'Centrale Bank' : latestRates.EUR_SRD.bron === 'bank' ? 'Bank' : 'Handmatig'}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Euro className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">Koersontwikkeling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="USD"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                    name="USD/SRD"
                  />
                  <Line
                    type="monotone"
                    dataKey="EUR"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                    name="EUR/SRD"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">Koershistorie</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Koersen worden automatisch gesynchroniseerd bij openen van de boekhouding module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                <TableHead className="w-20 text-xs font-medium text-gray-500">Valuta</TableHead>
                <TableHead className="w-24 text-xs font-medium text-gray-500">Type</TableHead>
                <TableHead className="text-right w-32 text-xs font-medium text-gray-500">Koers</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Bron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(rate => (
                <TableRow key={rate.id}>
                  <TableCell className="text-sm text-gray-600">{formatDate(rate.datum)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {rate.valuta_van}/{rate.valuta_naar || 'SRD'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rate.koers_type ? (
                      <Badge className={`text-xs ${
                        rate.koers_type === 'inkoop' ? 'bg-orange-100 text-orange-700' :
                        rate.koers_type === 'verkoop' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-gray-700'
                      }`}>
                        {rate.koers_type === 'inkoop' ? 'Inkoop' : rate.koers_type === 'verkoop' ? 'Verkoop' : rate.koers_type}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-gray-900">
                    {formatNumber(rate.koers, 4)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${
                      rate.bron === 'CME.sr' ? 'bg-green-100 text-green-700' :
                      rate.bron === 'central_bank' ? 'bg-blue-100 text-blue-700' :
                      rate.bron === 'bank' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-slate-100 text-gray-700'
                    }`}>
                      {rate.bron === 'CME.sr' ? 'CME.sr' :
                       rate.bron === 'central_bank' ? 'Centrale Bank' : 
                       rate.bron === 'bank' ? 'Bank' : 'Handmatig'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
