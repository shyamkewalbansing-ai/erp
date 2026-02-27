import React, { useState, useEffect } from 'react';
import { fixedAssetsAPI } from '../lib/api';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Landmark, Building, Calculator, Loader2 } from 'lucide-react';
import { Progress } from '../components/ui/progress';

const ActivaPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAsset, setNewAsset] = useState({
    code: '',
    name: '',
    description: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_value: 0,
    residual_value: 0,
    useful_life_years: 5,
    depreciation_method: 'linear'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fixedAssetsAPI.getAll();
      setAssets(response.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.code || !newAsset.name || !newAsset.purchase_value) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      await fixedAssetsAPI.create(newAsset);
      toast.success('Activum aangemaakt');
      setShowAssetDialog(false);
      setNewAsset({
        code: '', name: '', description: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_value: 0, residual_value: 0,
        useful_life_years: 5, depreciation_method: 'linear'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleDepreciate = async (assetId) => {
    try {
      const response = await fixedAssetsAPI.depreciate(assetId);
      toast.success(`Afschrijving van ${formatCurrency(response.data.depreciation_amount)} uitgevoerd`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij afschrijven');
    }
  };

  const totalPurchaseValue = assets.reduce((sum, a) => sum + a.purchase_value, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.book_value, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);

  return (
    <div className="space-y-6" data-testid="activa-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Vaste Activa</h1>
          <p className="text-slate-500 mt-1">Beheer uw vaste activa en afschrijvingen</p>
        </div>
        <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-asset-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuw Activum
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuw Activum</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    value={newAsset.code}
                    onChange={(e) => setNewAsset({...newAsset, code: e.target.value})}
                    placeholder="VA001"
                    data-testid="asset-code-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aankoopdatum</Label>
                  <Input
                    type="date"
                    value={newAsset.purchase_date}
                    onChange={(e) => setNewAsset({...newAsset, purchase_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                  placeholder="Computer laptop"
                  data-testid="asset-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Omschrijving</Label>
                <Input
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                  placeholder="Beschrijving van het activum"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aankoopwaarde *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAsset.purchase_value}
                    onChange={(e) => setNewAsset({...newAsset, purchase_value: parseFloat(e.target.value) || 0})}
                    data-testid="asset-value-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Restwaarde</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAsset.residual_value}
                    onChange={(e) => setNewAsset({...newAsset, residual_value: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Levensduur (jaren)</Label>
                  <Input
                    type="number"
                    value={newAsset.useful_life_years}
                    onChange={(e) => setNewAsset({...newAsset, useful_life_years: parseInt(e.target.value) || 5})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Methode</Label>
                  <Select value={newAsset.depreciation_method} onValueChange={(v) => setNewAsset({...newAsset, depreciation_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Lineair</SelectItem>
                      <SelectItem value="degressive">Degressief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateAsset} className="w-full" disabled={saving} data-testid="save-asset-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Aankoopwaarde</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalPurchaseValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Boekwaarde</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalBookValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Afgeschreven</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalDepreciation)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Activaregister</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead className="w-28">Aankoopdatum</TableHead>
                <TableHead className="text-right w-28">Aankoopwaarde</TableHead>
                <TableHead className="text-right w-28">Afgeschreven</TableHead>
                <TableHead className="text-right w-28">Boekwaarde</TableHead>
                <TableHead className="w-32">Voortgang</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => {
                const depreciationProgress = (asset.accumulated_depreciation / (asset.purchase_value - asset.residual_value)) * 100;
                return (
                  <TableRow key={asset.id} data-testid={`asset-row-${asset.code}`}>
                    <TableCell className="font-mono">{asset.code}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(asset.purchase_value)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {formatCurrency(asset.accumulated_depreciation)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatCurrency(asset.book_value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(depreciationProgress, 100)} className="h-2" />
                        <span className="text-xs text-slate-500">{formatNumber(depreciationProgress, 0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        asset.status === 'active' ? 'bg-green-100 text-green-700' :
                        asset.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {asset.status === 'active' ? 'Actief' : asset.status === 'sold' ? 'Verkocht' : 'Afgeschreven'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDepreciate(asset.id)}
                          data-testid={`depreciate-${asset.code}`}
                        >
                          Afschrijven
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Geen vaste activa gevonden. Maak uw eerste activum aan.
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

export default ActivaPage;
