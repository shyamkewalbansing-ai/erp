import React, { useState, useEffect, useMemo } from 'react';
import { fixedAssetsAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Landmark, Building, Calculator, Loader2, BookOpen, TrendingDown, Info, Car, Monitor, Package, Home, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

const VasteActivaPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showDepreciateDialog, setShowDepreciateDialog] = useState(false);
  const [depreciatingAsset, setDepreciatingAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [newAsset, setNewAsset] = useState({
    code: '',
    naam: '',
    omschrijving: '',
    categorie: 'inventaris',
    aankoopdatum: new Date().toISOString().split('T')[0],
    aankoopwaarde: '',
    restwaarde: '',
    levensduur_jaren: 5,
    afschrijvings_methode: 'lineair'
  });

  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fixedAssetsAPI.getAll();
      setAssets(response.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.code || !newAsset.naam || !newAsset.aankoopwaarde) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    setSaving(true);
    try {
      // Map frontend field names to backend field names
      const assetData = {
        naam: newAsset.naam,
        categorie: newAsset.categorie,
        aanschafdatum: newAsset.aankoopdatum,  // Backend expects aanschafdatum
        aanschafwaarde: parseFloat(newAsset.aankoopwaarde) || 0,  // Backend expects aanschafwaarde
        restwaarde: parseFloat(newAsset.restwaarde) || 0,
        levensduur_jaren: parseInt(newAsset.levensduur_jaren) || 5,
        afschrijvingsmethode: newAsset.afschrijvings_methode,  // Backend expects afschrijvingsmethode
        locatie: '',
        serienummer: newAsset.code  // Use code as serial number
      };
      await fixedAssetsAPI.create(assetData);
      toast.success('Activum aangemaakt');
      setShowAssetDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewAsset({
      code: '', naam: '', omschrijving: '', categorie: 'inventaris',
      aankoopdatum: new Date().toISOString().split('T')[0],
      aankoopwaarde: '', restwaarde: '',
      levensduur_jaren: 5, afschrijvings_methode: 'lineair'
    });
  };

  const handleDepreciate = async () => {
    if (!depreciatingAsset) return;
    setSaving(true);
    try {
      const response = await fixedAssetsAPI.depreciate(depreciatingAsset.id);
      toast.success(`Afschrijving van ${formatAmount(response.data.depreciation_amount)} geboekt in grootboek`);
      setShowDepreciateDialog(false);
      setDepreciatingAsset(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij afschrijven');
    } finally {
      setSaving(false);
    }
  };

  const openDepreciateDialog = (asset) => {
    setDepreciatingAsset(asset);
    setShowDepreciateDialog(true);
  };

  // Calculate totals
  const totals = useMemo(() => ({
    aankoopwaarde: assets.reduce((sum, a) => sum + (a.aankoopwaarde || a.purchase_value || 0), 0),
    boekwaarde: assets.reduce((sum, a) => sum + (a.boekwaarde || a.book_value || 0), 0),
    afgeschreven: assets.reduce((sum, a) => sum + (a.totaal_afgeschreven || a.accumulated_depreciation || 0), 0),
    actief: assets.filter(a => (a.status || 'actief') === 'actief').length,
    afgeschrevenCount: assets.filter(a => a.status === 'volledig_afgeschreven').length
  }), [assets]);

  // Get years for filter
  const years = useMemo(() => {
    const yearSet = new Set(assets.map(a => new Date(a.aankoopdatum || a.purchase_date).getFullYear()));
    return ['alle', ...Array.from(yearSet).sort((a, b) => b - a).map(String)];
  }, [assets]);

  // Filter assets by year
  const filteredAssets = useMemo(() => {
    if (selectedYear === 'alle') return assets;
    return assets.filter(a => new Date(a.aankoopdatum || a.purchase_date).getFullYear().toString() === selectedYear);
  }, [assets, selectedYear]);

  const getCategoryIcon = (cat) => {
    const icons = {
      gebouwen: <Home className="w-4 h-4" />,
      machines: <Package className="w-4 h-4" />,
      inventaris: <Package className="w-4 h-4" />,
      voertuigen: <Car className="w-4 h-4" />,
      computers: <Monitor className="w-4 h-4" />,
      software: <Monitor className="w-4 h-4" />
    };
    return icons[(cat || '').toLowerCase()] || <Package className="w-4 h-4" />;
  };

  const getAccountsForCategory = (cat) => {
    const mapping = {
      gebouwen: { activum: '1010', afschr: '1011', kosten: '4810' },
      machines: { activum: '1020', afschr: '1021', kosten: '4820' },
      inventaris: { activum: '1030', afschr: '1031', kosten: '4830' },
      voertuigen: { activum: '1040', afschr: '1041', kosten: '4840' },
      computers: { activum: '1050', afschr: '1051', kosten: '4850' },
      software: { activum: '1050', afschr: '1051', kosten: '4850' }
    };
    return mapping[(cat || 'inventaris').toLowerCase()] || mapping.inventaris;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center" data-testid="activa-page">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="activa-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vaste Activa</h1>
          <p className="text-gray-500 mt-0.5">Beheer uw vaste activa en afschrijvingen met grootboek integratie</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32" data-testid="year-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y === 'alle' ? 'Alle jaren' : y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-asset-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Activum
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nieuw Vast Activum</DialogTitle>
                <DialogDescription>
                  Bij aanmaken wordt het activum automatisch geregistreerd op de juiste grootboekrekening.
                </DialogDescription>
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
                    <Label>Categorie *</Label>
                    <Select value={newAsset.categorie} onValueChange={(v) => setNewAsset({...newAsset, categorie: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gebouwen">Gebouwen (1010)</SelectItem>
                        <SelectItem value="machines">Machines & Installaties (1020)</SelectItem>
                        <SelectItem value="inventaris">Inventaris (1030)</SelectItem>
                        <SelectItem value="voertuigen">Voertuigen (1040)</SelectItem>
                        <SelectItem value="computers">Computers & Software (1050)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    value={newAsset.naam}
                    onChange={(e) => setNewAsset({...newAsset, naam: e.target.value})}
                    placeholder="Bijv. Bedrijfsauto Toyota"
                    data-testid="asset-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving</Label>
                  <Input
                    value={newAsset.omschrijving}
                    onChange={(e) => setNewAsset({...newAsset, omschrijving: e.target.value})}
                    placeholder="Extra details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aankoopdatum</Label>
                    <Input
                      type="date"
                      value={newAsset.aankoopdatum}
                      onChange={(e) => setNewAsset({...newAsset, aankoopdatum: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Afschrijvingsmethode</Label>
                    <Select value={newAsset.afschrijvings_methode} onValueChange={(v) => setNewAsset({...newAsset, afschrijvings_methode: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lineair">Lineair</SelectItem>
                        <SelectItem value="degressief">Degressief (25%)</SelectItem>
                        <SelectItem value="geen">Geen (bijv. grond)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Aankoopwaarde *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newAsset.aankoopwaarde}
                      onChange={(e) => setNewAsset({...newAsset, aankoopwaarde: e.target.value})}
                      placeholder="0.00"
                      data-testid="asset-value-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Restwaarde</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newAsset.restwaarde}
                      onChange={(e) => setNewAsset({...newAsset, restwaarde: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Levensduur (jr)</Label>
                    <Input
                      type="number"
                      value={newAsset.levensduur_jaren}
                      onChange={(e) => setNewAsset({...newAsset, levensduur_jaren: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Grootboek Preview */}
                {newAsset.aankoopwaarde && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>Grootboek boeking bij aanschaf:</strong>
                      <div className="mt-1 font-mono text-xs">
                        <div>Debet {getAccountsForCategory(newAsset.categorie).activum}: {formatAmount(parseFloat(newAsset.aankoopwaarde) || 0)}</div>
                        <div>Credit 1500 Bank: {formatAmount(parseFloat(newAsset.aankoopwaarde) || 0)}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssetDialog(false)}>Annuleren</Button>
                <Button onClick={handleCreateAsset} disabled={saving} data-testid="save-asset-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Opslaan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grootboek Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <BookOpen className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Grootboek Koppeling:</strong> Afschrijvingen worden automatisch geboekt:
          <span className="ml-2 text-sm">
            4800-4850 (Afschrijvingskosten) | 1011-1051 (Cum. afschrijvingen)
          </span>
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overzicht" data-testid="tab-overzicht">
            <Building className="w-4 h-4 mr-2" />Overzicht
          </TabsTrigger>
          <TabsTrigger value="afschrijvingen" data-testid="tab-afschrijvingen">
            <TrendingDown className="w-4 h-4 mr-2" />Afschrijvingen
          </TabsTrigger>
          <TabsTrigger value="grootboek" data-testid="tab-grootboek">
            <BookOpen className="w-4 h-4 mr-2" />Grootboek Info
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overzicht */}
        <TabsContent value="overzicht" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{filteredAssets.length}</p>
                <p className="text-sm text-muted-foreground">Activa</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-blue-600">{formatAmount(totals.aankoopwaarde)}</p>
                <p className="text-sm text-muted-foreground">Aankoopwaarde</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-amber-600">{formatAmount(totals.afgeschreven)}</p>
                <p className="text-sm text-muted-foreground">Afgeschreven</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">{formatAmount(totals.boekwaarde)}</p>
                <p className="text-sm text-muted-foreground">Boekwaarde</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{totals.actief}</p>
                <p className="text-sm text-muted-foreground">Actief</p>
              </CardContent>
            </Card>
          </div>

          {/* Assets Table */}
          <Card className="bg-white border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Activaregister</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="w-28">Categorie</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead className="text-right w-28">Aankoopwaarde</TableHead>
                    <TableHead className="text-right w-28">Boekwaarde</TableHead>
                    <TableHead className="w-32">Voortgang</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map(asset => {
                    // Map backend field names to frontend display
                    const aankoopwaarde = asset.aanschafwaarde || asset.aankoopwaarde || asset.purchase_value || 0;
                    const boekwaarde = asset.boekwaarde || asset.book_value || aankoopwaarde;
                    const restwaarde = asset.restwaarde || asset.residual_value || 0;
                    const afgeschreven = asset.totaal_afgeschreven || asset.accumulated_depreciation || 0;
                    const afTeschrijven = aankoopwaarde - restwaarde;
                    const progress = afTeschrijven > 0 ? (afgeschreven / afTeschrijven) * 100 : 0;
                    const status = asset.status || 'actief';
                    const accounts = getAccountsForCategory(asset.categorie);
                    const displayCode = asset.serienummer || asset.activum_nummer || asset.code || 'N/A';
                    const displayDate = asset.aanschafdatum || asset.aankoopdatum || asset.purchase_date;
                    
                    return (
                      <React.Fragment key={asset.id}>
                        <TableRow 
                          className="hover:bg-gray-50 cursor-pointer" 
                          onClick={() => setExpandedRow(expandedRow === asset.id ? null : asset.id)}
                          data-testid={`asset-row-${asset.code}`}
                        >
                          <TableCell className="font-mono text-sm">{asset.code}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(asset.categorie)}
                              <span className="font-medium">{asset.naam || asset.name}</span>
                              {expandedRow === asset.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{asset.categorie || 'inventaris'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{formatDate(asset.aankoopdatum || asset.purchase_date)}</TableCell>
                          <TableCell className="text-right font-medium">{formatAmount(aankoopwaarde)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{formatAmount(boekwaarde)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(progress, 100)} className="h-2" />
                              <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              status === 'actief' ? 'bg-green-100 text-green-700' :
                              status === 'volledig_afgeschreven' ? 'bg-amber-100 text-amber-700' :
                              status === 'verkocht' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {status === 'actief' ? 'Actief' : 
                               status === 'volledig_afgeschreven' ? 'Afgeschreven' : 
                               status === 'verkocht' ? 'Verkocht' : status}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {status === 'actief' && boekwaarde > restwaarde && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDepreciateDialog(asset)}
                                data-testid={`depreciate-${asset.code}`}
                              >
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Afschrijven
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Details */}
                        {expandedRow === asset.id && (
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={9} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Restwaarde</p>
                                  <p className="font-semibold">{formatAmount(restwaarde)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Totaal Afgeschreven</p>
                                  <p className="font-semibold text-amber-600">{formatAmount(afgeschreven)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Levensduur</p>
                                  <p className="font-semibold">{asset.levensduur_jaren || asset.useful_life_years || 5} jaar</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Methode</p>
                                  <p className="font-semibold capitalize">{asset.afschrijvings_methode || asset.depreciation_method || 'lineair'}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">Grootboekrekeningen</p>
                                  <p className="font-mono text-xs">
                                    Activum: {accounts.activum} | Cum. afschr.: {accounts.afschr} | Kosten: {accounts.kosten}
                                  </p>
                                </div>
                                {asset.omschrijving && (
                                  <div className="col-span-2">
                                    <p className="text-muted-foreground">Omschrijving</p>
                                    <p>{asset.omschrijving}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Geen vaste activa gevonden</p>
                        <Button variant="outline" className="mt-3" onClick={() => setShowAssetDialog(true)}>
                          <Plus className="w-4 h-4 mr-2" />Eerste Activum Toevoegen
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Afschrijvingen */}
        <TabsContent value="afschrijvingen" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Afschrijvingsoverzicht
              </CardTitle>
              <CardDescription>
                Overzicht van jaarlijkse en maandelijkse afschrijvingen per activum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Activum</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead className="text-right">Af te schrijven</TableHead>
                    <TableHead className="text-right">Per Jaar</TableHead>
                    <TableHead className="text-right">Per Maand</TableHead>
                    <TableHead className="text-right">Nog te gaan</TableHead>
                    <TableHead>Methode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.filter(a => (a.status || 'actief') === 'actief').map(asset => {
                    const aankoopwaarde = asset.aankoopwaarde || asset.purchase_value || 0;
                    const restwaarde = asset.restwaarde || asset.residual_value || 0;
                    const boekwaarde = asset.boekwaarde || asset.book_value || aankoopwaarde;
                    const afTeschrijven = aankoopwaarde - restwaarde;
                    const levensduur = asset.levensduur_jaren || asset.useful_life_years || 5;
                    const jaarlijks = asset.afschrijvings_methode === 'geen' ? 0 : afTeschrijven / levensduur;
                    const maandelijks = jaarlijks / 12;
                    const nogTeGaan = boekwaarde - restwaarde;
                    
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.naam || asset.name}</TableCell>
                        <TableCell className="capitalize">{asset.categorie || 'inventaris'}</TableCell>
                        <TableCell className="text-right">{formatAmount(afTeschrijven)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatAmount(jaarlijks)}</TableCell>
                        <TableCell className="text-right">{formatAmount(maandelijks)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatAmount(nogTeGaan)}</TableCell>
                        <TableCell className="capitalize">{asset.afschrijvings_methode || 'lineair'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Grootboek Info */}
        <TabsContent value="grootboek" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Grootboek Koppeling - Vaste Activa
              </CardTitle>
              <CardDescription>
                Hoe vaste activa en afschrijvingen worden geboekt in het grootboek
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Explanation */}
              <div className="prose prose-sm max-w-none">
                <p>
                  Bij het afschrijven van vaste activa worden automatisch journaalposten aangemaakt 
                  in het grootboek. De afschrijvingskosten worden als kosten geboekt en de 
                  cumulatieve afschrijving vermindert de boekwaarde van het activum.
                </p>
              </div>

              {/* Journal Entry Example */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Voorbeeld Journaalpost (Afschrijving Voertuig)</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 text-left">Rekening</th>
                      <th className="p-2 text-left">Omschrijving</th>
                      <th className="p-2 text-right">Debet</th>
                      <th className="p-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-mono">4840</td>
                      <td className="p-2">Afschrijving voertuigen (Kosten)</td>
                      <td className="p-2 text-right text-blue-600">SRD 500,00</td>
                      <td className="p-2 text-right">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">1041</td>
                      <td className="p-2">Cum. afschrijving voertuigen</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right text-green-600">SRD 500,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Account Codes */}
              <div>
                <h4 className="font-semibold mb-3">Grootboekrekeningen per Categorie</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="w-4 h-4" />
                        <span className="font-semibold">Gebouwen</span>
                      </div>
                      <div className="font-mono text-xs space-y-1">
                        <p>1010 - Gebouwen (activum)</p>
                        <p>1011 - Cum. afschrijving gebouwen</p>
                        <p>4810 - Afschrijvingskosten gebouwen</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4" />
                        <span className="font-semibold">Machines & Inventaris</span>
                      </div>
                      <div className="font-mono text-xs space-y-1">
                        <p>1020/1030 - Machines/Inventaris</p>
                        <p>1021/1031 - Cum. afschrijving</p>
                        <p>4820/4830 - Afschrijvingskosten</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="w-4 h-4" />
                        <span className="font-semibold">Voertuigen</span>
                      </div>
                      <div className="font-mono text-xs space-y-1">
                        <p>1040 - Voertuigen (activum)</p>
                        <p>1041 - Cum. afschrijving voertuigen</p>
                        <p>4840 - Afschrijvingskosten voertuigen</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-4 h-4" />
                        <span className="font-semibold">Computers & Software</span>
                      </div>
                      <div className="font-mono text-xs space-y-1">
                        <p>1050 - Computers & software</p>
                        <p>1051 - Cum. afschrijving</p>
                        <p>4850 - Afschrijvingskosten</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Depreciate Dialog */}
      <Dialog open={showDepreciateDialog} onOpenChange={setShowDepreciateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              Afschrijving Boeken
            </DialogTitle>
            <DialogDescription>
              Boek de maandelijkse afschrijving voor dit activum. Er wordt automatisch een journaalpost aangemaakt.
            </DialogDescription>
          </DialogHeader>
          
          {depreciatingAsset && (() => {
            const aankoopwaarde = depreciatingAsset.aankoopwaarde || depreciatingAsset.purchase_value || 0;
            const restwaarde = depreciatingAsset.restwaarde || depreciatingAsset.residual_value || 0;
            const boekwaarde = depreciatingAsset.boekwaarde || depreciatingAsset.book_value || aankoopwaarde;
            const afTeschrijven = aankoopwaarde - restwaarde;
            const levensduur = depreciatingAsset.levensduur_jaren || depreciatingAsset.useful_life_years || 5;
            const maandelijks = afTeschrijven / levensduur / 12;
            const accounts = getAccountsForCategory(depreciatingAsset.categorie);
            
            return (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activum:</span>
                    <span className="font-semibold">{depreciatingAsset.naam || depreciatingAsset.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Huidige Boekwaarde:</span>
                    <span>{formatAmount(boekwaarde)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Afschrijving:</span>
                    <span>- {formatAmount(maandelijks)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Nieuwe Boekwaarde:</span>
                    <span className="text-green-600">{formatAmount(Math.max(restwaarde, boekwaarde - maandelijks))}</span>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Journaalpost:</strong>
                    <div className="mt-1 font-mono text-xs">
                      <div>Debet {accounts.kosten}: {formatAmount(maandelijks)}</div>
                      <div>Credit {accounts.afschr}: {formatAmount(maandelijks)}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            );
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepreciateDialog(false)}>Annuleren</Button>
            <Button onClick={handleDepreciate} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <BookOpen className="w-4 h-4 mr-2" />
              Afschrijven & Boeken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VasteActivaPage;
