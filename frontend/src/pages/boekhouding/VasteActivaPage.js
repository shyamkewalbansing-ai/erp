import React, { useState, useEffect } from 'react';
import { fixedAssetsAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Landmark, Building, Calculator, Loader2 } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

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

  // Format number with Dutch locale
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const formatNumber = (num, decimals = 0) => {
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num || 0);
  };

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
      const assetData = {
        code: newAsset.code,
        naam: newAsset.name,
        omschrijving: newAsset.description,
        aankoopdatum: newAsset.purchase_date,
        aankoopwaarde: newAsset.purchase_value,
        restwaarde: newAsset.residual_value,
        levensduur_jaren: newAsset.useful_life_years,
        afschrijvingsmethode: newAsset.depreciation_method
      };
      await fixedAssetsAPI.create(assetData);
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
      toast.success(`Afschrijving van ${formatAmount(response.data.depreciation_amount)} uitgevoerd`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij afschrijven');
    }
  };

  const totalPurchaseValue = assets.reduce((sum, a) => sum + a.purchase_value, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.book_value, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="activa-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="activa-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vaste Activa</h1>
          <p className="text-slate-500 mt-0.5">Beheer uw vaste activa en afschrijvingen</p>
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
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Aankoopwaarde</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalPurchaseValue)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Boekwaarde</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalBookValue)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Afgeschreven</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalDepreciation)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Activaregister</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24 text-xs font-medium text-slate-500">Code</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Aankoopdatum</TableHead>
                <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Aankoopwaarde</TableHead>
                <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Afgeschreven</TableHead>
                <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Boekwaarde</TableHead>
                <TableHead className="w-32 text-xs font-medium text-slate-500">Voortgang</TableHead>
                <TableHead className="w-24 text-xs font-medium text-slate-500">Status</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => {
                const depreciationProgress = (asset.accumulated_depreciation / (asset.purchase_value - asset.residual_value)) * 100;
                return (
                  <TableRow key={asset.id} data-testid={`asset-row-${asset.code}`}>
                    <TableCell className="text-sm text-slate-600">{asset.code}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">{asset.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(asset.purchase_date)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-900">{formatAmount(asset.purchase_value)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-amber-600">
                      {formatAmount(asset.accumulated_depreciation)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-600">
                      {formatAmount(asset.book_value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(depreciationProgress, 100)} className="h-2" />
                        <span className="text-xs text-slate-500">{formatNumber(depreciationProgress, 0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${
                        asset.status === 'active' ? 'bg-green-100 text-green-700' :
                        asset.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
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
