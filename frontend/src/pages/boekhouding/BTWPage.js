import React, { useState, useEffect } from 'react';
import { btwAPI, reportsAPI } from '../../lib/boekhoudingApi';
import { formatPercentage } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calculator, FileText, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const BTWPage = () => {
  const [btwCodes, setBtwCodes] = useState([]);
  const [btwReport, setBtwReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newCode, setNewCode] = useState({
    code: '',
    name: '',
    percentage: 0,
    type: 'both'
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [codesRes, reportRes] = await Promise.all([
        btwAPI.getAll(),
        reportsAPI.btw()
      ]);
      setBtwCodes(codesRes.data);
      setBtwReport(reportRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code || !newCode.name) {
      toast.error('Vul code en naam in');
      return;
    }
    setSaving(true);
    try {
      const btwData = {
        code: newCode.code,
        naam: newCode.name,
        percentage: newCode.percentage,
        type: newCode.type
      };
      await btwAPI.create(btwData);
      toast.success('BTW-code aangemaakt');
      setShowCodeDialog(false);
      setNewCode({ code: '', name: '', percentage: 0, type: 'both' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCode = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze BTW-code wilt verwijderen?')) return;
    try {
      await btwAPI.delete(id);
      toast.success('BTW-code verwijderd');
      fetchData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const btwBalance = (btwReport?.btw_sales || 0) - (btwReport?.btw_purchases || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="btw-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="btw-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">BTW</h1>
          <p className="text-slate-500 mt-0.5">Beheer BTW-tarieven en bekijk aangifteoverzicht</p>
        </div>
        <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-btw-code-btn">
              <Plus className="w-4 h-4 mr-2" />
              BTW-code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe BTW-code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    value={newCode.code}
                    onChange={(e) => setNewCode({...newCode, code: e.target.value})}
                    placeholder="BTW21"
                    data-testid="btw-code-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentage *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newCode.percentage}
                    onChange={(e) => setNewCode({...newCode, percentage: parseFloat(e.target.value) || 0})}
                    data-testid="btw-percentage-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={newCode.name}
                  onChange={(e) => setNewCode({...newCode, name: e.target.value})}
                  placeholder="Standaard tarief (21%)"
                  data-testid="btw-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newCode.type} onValueChange={(v) => setNewCode({...newCode, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Beide (Verkoop & Inkoop)</SelectItem>
                    <SelectItem value="sales">Alleen Verkoop</SelectItem>
                    <SelectItem value="purchase">Alleen Inkoop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateCode} className="w-full" disabled={saving} data-testid="save-btw-code-btn">
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
                <p className="text-sm text-slate-500 mb-2">BTW Verkoop</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatAmount(btwReport?.btw_sales || 0)}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">BTW Inkoop</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatAmount(btwReport?.btw_purchases || 0)}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-white border border-slate-100 shadow-sm ${btwBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">
                  {btwBalance > 0 ? 'BTW Te Betalen' : 'BTW Te Vorderen'}
                </p>
                <p className={`text-2xl font-semibold ${btwBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatAmount(Math.abs(btwBalance))}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${btwBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <Calculator className={`w-5 h-5 ${btwBalance > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes" data-testid="tab-btw-codes">
            <Calculator className="w-4 h-4 mr-2" />
            BTW-codes
          </TabsTrigger>
          <TabsTrigger value="declaration" data-testid="tab-declaration">
            <FileText className="w-4 h-4 mr-2" />
            Aangifte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">BTW-codes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Code</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Percentage</TableHead>
                    <TableHead className="w-32 text-xs font-medium text-slate-500">Type</TableHead>
                    <TableHead className="w-20 text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {btwCodes.map(code => (
                    <TableRow key={code.id} data-testid={`btw-code-row-${code.code}`}>
                      <TableCell className="text-sm font-medium text-slate-900">{code.code}</TableCell>
                      <TableCell className="text-sm text-slate-600">{code.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{formatPercentage(code.percentage)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {code.type === 'both' ? 'Beide' : code.type === 'sales' ? 'Verkoop' : 'Inkoop'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${code.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {code.active ? 'Actief' : 'Inactief'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                          onClick={() => handleDeleteCode(code.id)}
                        >
                          Verwijder
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {btwCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen BTW-codes gevonden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declaration" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">BTW Aangifte Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
                <h3 className="font-semibold text-lg text-slate-900 mb-6">BTW Aangifte</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">1a. Leveringen/diensten belast met hoog tarief</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_sales || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">5a. Verschuldigde BTW (rubriek 1 t/m 4)</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_sales || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">5b. Voorbelasting</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_purchases || 0)}</span>
                  </div>
                  
                  <div className={`flex justify-between py-4 rounded-lg px-4 mt-4 ${btwBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <span className="text-sm font-medium text-slate-700">
                      {btwBalance > 0 ? '5c. Te betalen' : '5d. Te ontvangen'}
                    </span>
                    <span className={`text-sm font-semibold ${btwBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatAmount(Math.abs(btwBalance))}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Dit is een indicatief overzicht. Raadpleeg uw accountant voor de officiële BTW-aangifte.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BTWPage;
