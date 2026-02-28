import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/boekhoudingApi';
import { formatDate, accountTypes } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { FileText, Scale, TrendingUp, Calculator, Download, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const RapportagesPage = () => {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [btwReport, setBtwReport] = useState(null);
  const [agingReceivables, setAgingReceivables] = useState(null);
  const [agingPayables, setAgingPayables] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const [balanceRes, plRes, btwRes, arRes, apRes] = await Promise.all([
        reportsAPI.balanceSheet(),
        reportsAPI.profitLoss(),
        reportsAPI.btw(),
        reportsAPI.aging('receivables'),
        reportsAPI.aging('payables')
      ]);
      setBalanceSheet(balanceRes.data);
      setProfitLoss(plRes.data);
      setBtwReport(btwRes.data);
      setAgingReceivables(arRes.data);
      setAgingPayables(apRes.data);
    } catch (error) {
      toast.error('Fout bij laden rapporten');
    } finally {
      setLoading(false);
    }
  };

  const agingChartData = agingReceivables?.aging ? [
    { name: 'Huidig', value: agingReceivables.aging.current || 0 },
    { name: '30 dagen', value: agingReceivables.aging['30_days'] || 0 },
    { name: '60 dagen', value: agingReceivables.aging['60_days'] || 0 },
    { name: '90 dagen', value: agingReceivables.aging['90_days'] || 0 },
    { name: '90+ dagen', value: agingReceivables.aging.over_90 || 0 },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="rapportages-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="rapportages-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rapportages</h1>
          <p className="text-slate-500 mt-0.5">Financiële rapporten en overzichten</p>
        </div>
      </div>

      <Tabs defaultValue="balance">
        <TabsList className="flex-wrap">
          <TabsTrigger value="balance" data-testid="tab-balance">
            <Scale className="w-4 h-4 mr-2" />
            Balans
          </TabsTrigger>
          <TabsTrigger value="pl" data-testid="tab-pl">
            <TrendingUp className="w-4 h-4 mr-2" />
            Winst & Verlies
          </TabsTrigger>
          <TabsTrigger value="btw" data-testid="tab-btw-report">
            <Calculator className="w-4 h-4 mr-2" />
            BTW Aangifte
          </TabsTrigger>
          <TabsTrigger value="aging" data-testid="tab-aging">
            <FileText className="w-4 h-4 mr-2" />
            Ouderdomsanalyse
          </TabsTrigger>
        </TabsList>

        {/* Balance Sheet */}
        <TabsContent value="balance" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Balans</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Activa</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-medium text-slate-500">Rekening</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(balanceSheet?.activa || balanceSheet?.assets?.accounts || []).map((acc, idx) => (
                        <TableRow key={acc.id || idx}>
                          <TableCell className="text-sm text-slate-600">{acc.code} - {acc.naam || acc.name}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-slate-900">
                            {formatAmount(acc.saldo || acc.balance, acc.valuta || acc.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100">
                        <TableCell className="text-sm font-semibold text-slate-900">Totaal Activa</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-900">
                          {formatAmount(balanceSheet?.totaal_activa || balanceSheet?.assets?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Passiva</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-medium text-slate-500">Rekening</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(balanceSheet?.passiva || balanceSheet?.liabilities?.accounts || []).map((acc, idx) => (
                        <TableRow key={acc.id || idx}>
                          <TableCell className="text-sm text-slate-600">{acc.code} - {acc.naam || acc.name}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-slate-900">
                            {formatAmount(acc.saldo || acc.balance, acc.valuta || acc.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell className="text-sm font-medium text-slate-700">Totaal Vreemd Vermogen</TableCell>
                        <TableCell className="text-right text-sm font-medium text-slate-700">
                          {formatAmount(balanceSheet?.totaal_passiva || balanceSheet?.liabilities?.total || 0)}
                        </TableCell>
                      </TableRow>
                      {(balanceSheet?.eigen_vermogen || balanceSheet?.equity?.accounts || []).map((acc, idx) => (
                        <TableRow key={acc.id || `ev-${idx}`}>
                          <TableCell className="text-sm text-slate-600">{acc.code} - {acc.naam || acc.name}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-slate-900">
                            {formatAmount(acc.saldo || acc.balance, acc.valuta || acc.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100">
                        <TableCell className="text-sm font-semibold text-slate-900">Totaal Passiva</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-900">
                          {formatAmount(balanceSheet?.totaal_passiva || ((balanceSheet?.liabilities?.total || 0) + (balanceSheet?.equity?.total || 0)))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pl" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Winst & Verliesrekening</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                {/* Revenue */}
                <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Omzet</h3>
                <Table>
                  <TableBody>
                    {profitLoss?.revenue?.accounts?.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell className="text-sm text-slate-600">{acc.code} - {acc.name}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-green-600">
                          {formatAmount(Math.abs(acc.balance), acc.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-50">
                      <TableCell className="text-sm font-semibold text-slate-900">Totaal Omzet</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-600">
                        {formatAmount(profitLoss?.revenue?.total || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Expenses */}
                <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b mt-8">Kosten</h3>
                <Table>
                  <TableBody>
                    {profitLoss?.expenses?.accounts?.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell className="text-sm text-slate-600">{acc.code} - {acc.name}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-red-600">
                          {formatAmount(Math.abs(acc.balance), acc.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-red-50">
                      <TableCell className="text-sm font-semibold text-slate-900">Totaal Kosten</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-600">
                        {formatAmount(profitLoss?.expenses?.total || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Net Profit */}
                <div className={`mt-8 p-5 rounded-xl ${(profitLoss?.net_profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-900">Netto Resultaat</span>
                    <span className={`text-xl font-semibold ${(profitLoss?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(profitLoss?.net_profit || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BTW Report */}
        <TabsContent value="btw" className="mt-4">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">BTW Aangifte Overzicht</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">BTW Aangifte Suriname</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">1a. Leveringen/diensten belast met BTW</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_sales || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">5a. Verschuldigde BTW</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_sales || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">5b. Voorbelasting</span>
                    <span className="text-sm font-medium text-slate-900">{formatAmount(btwReport?.btw_purchases || 0)}</span>
                  </div>
                  
                  <div className={`flex justify-between py-4 rounded-lg px-4 mt-4 ${(btwReport?.btw_to_pay || 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <span className="text-sm font-medium text-slate-700">
                      {(btwReport?.btw_to_pay || 0) > 0 ? '5c. Te betalen' : '5d. Te ontvangen'}
                    </span>
                    <span className={`text-sm font-semibold ${(btwReport?.btw_to_pay || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatAmount((btwReport?.btw_to_pay || 0) > 0 ? btwReport.btw_to_pay : (btwReport?.btw_to_claim || 0))}
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

        {/* Aging Report */}
        <TabsContent value="aging" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receivables */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Ouderdomsanalyse Debiteuren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => formatAmount(value)}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">Huidig (niet vervallen)</TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-600">
                        {formatAmount(agingReceivables?.aging?.current || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">1-30 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-amber-600">
                        {formatAmount(agingReceivables?.aging?.['30_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">31-60 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-orange-600">
                        {formatAmount(agingReceivables?.aging?.['60_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">61-90 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-500">
                        {formatAmount(agingReceivables?.aging?.['90_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">90+ dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-600">
                        {formatAmount(agingReceivables?.aging?.over_90 || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-100">
                      <TableCell className="text-sm font-semibold text-slate-900">Totaal</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-slate-900">
                        {formatAmount(agingReceivables?.total || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payables */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Ouderdomsanalyse Crediteuren</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">Huidig (niet vervallen)</TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-600">
                        {formatAmount(agingPayables?.aging?.current || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">1-30 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-amber-600">
                        {formatAmount(agingPayables?.aging?.['30_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">31-60 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-orange-600">
                        {formatAmount(agingPayables?.aging?.['60_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">61-90 dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-500">
                        {formatAmount(agingPayables?.aging?.['90_days'] || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm text-slate-600">90+ dagen vervallen</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-600">
                        {formatAmount(agingPayables?.aging?.over_90 || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-100">
                      <TableCell className="text-sm font-semibold text-slate-900">Totaal</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-slate-900">
                        {formatAmount(agingPayables?.total || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RapportagesPage;
