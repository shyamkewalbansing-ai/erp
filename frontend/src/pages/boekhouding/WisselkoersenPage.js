import React, { useState, useEffect } from 'react';
import { exchangeRatesAPI } from '../../lib/boekhoudingApi';
import { formatNumber, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Plus, TrendingUp, DollarSign, Euro, Loader2 } from 'lucide-react';

const WisselkoersenPage = () => {
  const [rates, setRates] = useState([]);
  const [latestRates, setLatestRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newRate, setNewRate] = useState({
    datum: new Date().toISOString().split('T')[0],
    usd_srd: 0, eur_srd: 0, eur_usd: 0
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [ratesRes, latestRes] = await Promise.all([
        exchangeRatesAPI.getAll(),
        exchangeRatesAPI.getLatest().catch(() => null)
      ]);
      setRates(Array.isArray(ratesRes) ? ratesRes : ratesRes.data || []);
      setLatestRates(latestRes);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newRate.usd_srd || !newRate.eur_srd) { toast.error('Vul de wisselkoersen in'); return; }
    setSaving(true);
    try {
      await exchangeRatesAPI.create(newRate);
      toast.success('Wisselkoers toegevoegd');
      setShowDialog(false);
      setNewRate({ datum: new Date().toISOString().split('T')[0], usd_srd: 0, eur_srd: 0, eur_usd: 0 });
      fetchData();
    } catch (error) { toast.error(error.message || 'Fout bij opslaan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6" data-testid="wisselkoersen-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Wisselkoersen</h1>
          <p className="text-slate-500 mt-1">Beheer valutakoersen voor SRD, USD en EUR</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button data-testid="add-rate-btn"><Plus className="w-4 h-4 mr-2" />Nieuwe Koers</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuwe Wisselkoers</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Datum</Label><Input type="date" value={newRate.datum} onChange={(e) => setNewRate({...newRate, datum: e.target.value})} /></div>
              <div className="space-y-2"><Label>USD/SRD *</Label><Input type="number" step="0.0001" value={newRate.usd_srd} onChange={(e) => setNewRate({...newRate, usd_srd: parseFloat(e.target.value) || 0})} placeholder="36.50" /></div>
              <div className="space-y-2"><Label>EUR/SRD *</Label><Input type="number" step="0.0001" value={newRate.eur_srd} onChange={(e) => setNewRate({...newRate, eur_srd: parseFloat(e.target.value) || 0})} placeholder="39.50" /></div>
              <div className="space-y-2"><Label>EUR/USD</Label><Input type="number" step="0.0001" value={newRate.eur_usd} onChange={(e) => setNewRate({...newRate, eur_usd: parseFloat(e.target.value) || 0})} placeholder="1.08" /></div>
              <Button onClick={handleCreate} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">USD/SRD</p>
                <p className="text-3xl font-bold font-mono text-slate-900">{formatNumber(latestRates?.usd_srd || 0, 4)}</p>
                <p className="text-xs text-slate-400 mt-1">{latestRates?.datum ? formatDate(latestRates.datum) : '-'}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">EUR/SRD</p>
                <p className="text-3xl font-bold font-mono text-slate-900">{formatNumber(latestRates?.eur_srd || 0, 4)}</p>
                <p className="text-xs text-slate-400 mt-1">{latestRates?.datum ? formatDate(latestRates.datum) : '-'}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Euro className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">EUR/USD</p>
                <p className="text-3xl font-bold font-mono text-slate-900">{formatNumber(latestRates?.eur_usd || 0, 4)}</p>
                <p className="text-xs text-slate-400 mt-1">{latestRates?.datum ? formatDate(latestRates.datum) : '-'}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate History */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Koershistorie</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-32">Datum</TableHead>
                  <TableHead className="text-right">USD/SRD</TableHead>
                  <TableHead className="text-right">EUR/SRD</TableHead>
                  <TableHead className="text-right">EUR/USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{formatDate(rate.datum)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(rate.usd_srd, 4)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(rate.eur_srd, 4)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(rate.eur_usd, 4)}</TableCell>
                  </TableRow>
                ))}
                {rates.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Geen koershistorie gevonden</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WisselkoersenPage;
