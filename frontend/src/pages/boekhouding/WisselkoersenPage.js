import React, { useState, useEffect } from 'react';
import { exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatNumber, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, ArrowLeftRight, Loader2, TrendingUp, DollarSign, Euro } from 'lucide-react';
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

  const [newRate, setNewRate] = useState({
    date: new Date().toISOString().split('T')[0],
    currency_from: 'USD',
    rate: 0,
    source: 'manual'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ratesRes, latestRes] = await Promise.all([
        exchangeRatesAPI.getAll(),
        exchangeRatesAPI.getLatest()
      ]);
      setRates(ratesRes.data);
      setLatestRates(latestRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRate = async () => {
    if (!newRate.rate || newRate.rate <= 0) {
      toast.error('Voer een geldige koers in');
      return;
    }
    setSaving(true);
    try {
      await exchangeRatesAPI.create(newRate);
      toast.success('Wisselkoers toegevoegd');
      setShowRateDialog(false);
      setNewRate({
        date: new Date().toISOString().split('T')[0],
        currency_from: 'USD',
        rate: 0,
        source: 'manual'
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
        <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-rate-btn">
              <Plus className="w-4 h-4 mr-2" />
              Koers Toevoegen
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
                    value={newRate.date}
                    onChange={(e) => setNewRate({...newRate, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newRate.currency_from} onValueChange={(v) => setNewRate({...newRate, currency_from: v})}>
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
                <Label>Koers (1 {newRate.currency_from} = ? SRD)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({...newRate, rate: parseFloat(e.target.value) || 0})}
                  placeholder="35.50"
                  data-testid="rate-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Bron</Label>
                <Select value={newRate.source} onValueChange={(v) => setNewRate({...newRate, source: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central_bank">Centrale Bank Suriname</SelectItem>
                    <SelectItem value="bank">Commerciële Bank</SelectItem>
                    <SelectItem value="manual">Handmatig</SelectItem>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">Datum</TableHead>
                <TableHead className="w-20">Valuta</TableHead>
                <TableHead className="text-right w-32">Koers</TableHead>
                <TableHead>Bron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(rate => (
                <TableRow key={rate.id}>
                  <TableCell>{formatDate(rate.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {rate.currency_from}/SRD
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatNumber(rate.rate, 4)}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      rate.source === 'central_bank' ? 'bg-blue-100 text-blue-700' :
                      rate.source === 'bank' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {rate.source === 'central_bank' ? 'Centrale Bank' : rate.source === 'bank' ? 'Bank' : 'Handmatig'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Geen wisselkoersen gevonden. Voeg uw eerste koers toe.
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
