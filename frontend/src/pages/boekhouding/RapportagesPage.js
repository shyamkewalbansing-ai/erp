import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../lib/api';
import { formatCurrency, formatDate, accountTypes } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { FileText, Scale, TrendingUp, Calculator, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
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

  const agingChartData = agingReceivables ? [
    { name: 'Huidig', value: agingReceivables.aging.current },
    { name: '30 dagen', value: agingReceivables.aging['30_days'] },
    { name: '60 dagen', value: agingReceivables.aging['60_days'] },
    { name: '90 dagen', value: agingReceivables.aging['90_days'] },
    { name: '90+ dagen', value: agingReceivables.aging.over_90 },
  ] : [];

  return (
    <div className="space-y-6" data-testid="rapportages-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Rapportages</h1>
          <p className="text-slate-500 mt-1">Financiële rapporten en overzichten</p>
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
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Balans</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Assets */}
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-4 pb-2 border-b">Activa</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Rekening</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceSheet?.assets?.accounts?.map(acc => (
                          <TableRow key={acc.id}>
                            <TableCell>{acc.code} - {acc.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(acc.balance, acc.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-bold">
                          <TableCell>Totaal Activa</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(balanceSheet?.assets?.total || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-4 pb-2 border-b">Passiva</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Rekening</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceSheet?.liabilities?.accounts?.map(acc => (
                          <TableRow key={acc.id}>
                            <TableCell>{acc.code} - {acc.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(acc.balance, acc.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50">
                          <TableCell className="font-medium">Totaal Vreemd Vermogen</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(balanceSheet?.liabilities?.total || 0)}
                          </TableCell>
                        </TableRow>
                        {balanceSheet?.equity?.accounts?.map(acc => (
                          <TableRow key={acc.id}>
                            <TableCell>{acc.code} - {acc.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(acc.balance, acc.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-bold">
                          <TableCell>Totaal Passiva</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency((balanceSheet?.liabilities?.total || 0) + (balanceSheet?.equity?.total || 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pl" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Winst & Verliesrekening</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <div className="max-w-2xl">
                  {/* Revenue */}
                  <h3 className="font-heading font-bold text-lg mb-4 pb-2 border-b">Omzet</h3>
                  <Table>
                    <TableBody>
                      {profitLoss?.revenue?.accounts?.map(acc => (
                        <TableRow key={acc.id}>
                          <TableCell>{acc.code} - {acc.name}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(Math.abs(acc.balance), acc.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-green-50 font-bold">
                        <TableCell>Totaal Omzet</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrency(profitLoss?.revenue?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Expenses */}
                  <h3 className="font-heading font-bold text-lg mb-4 pb-2 border-b mt-8">Kosten</h3>
                  <Table>
                    <TableBody>
                      {profitLoss?.expenses?.accounts?.map(acc => (
                        <TableRow key={acc.id}>
                          <TableCell>{acc.code} - {acc.name}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {formatCurrency(Math.abs(acc.balance), acc.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-red-50 font-bold">
                        <TableCell>Totaal Kosten</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {formatCurrency(profitLoss?.expenses?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Net Profit */}
                  <div className={`mt-8 p-6 rounded-xl ${(profitLoss?.net_profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-heading font-bold text-xl">Netto Resultaat</span>
                      <span className={`font-mono font-bold text-2xl ${(profitLoss?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(profitLoss?.net_profit || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BTW Report */}
        <TabsContent value="btw" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">BTW Aangifte Overzicht</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-8">
                  <h3 className="font-heading font-bold text-xl mb-6">BTW Aangifte Suriname</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-600">1a. Leveringen/diensten belast met BTW</span>
                      <span className="font-mono font-medium">{formatCurrency(btwReport?.btw_sales || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-600">5a. Verschuldigde BTW</span>
                      <span className="font-mono font-medium">{formatCurrency(btwReport?.btw_sales || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-600">5b. Voorbelasting</span>
                      <span className="font-mono font-medium">{formatCurrency(btwReport?.btw_purchases || 0)}</span>
                    </div>
                    
                    <div className={`flex justify-between py-4 rounded-lg px-4 mt-4 ${(btwReport?.btw_to_pay || 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <span className="font-medium">
                        {(btwReport?.btw_to_pay || 0) > 0 ? '5c. Te betalen' : '5d. Te ontvangen'}
                      </span>
                      <span className={`font-mono font-bold ${(btwReport?.btw_to_pay || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency((btwReport?.btw_to_pay || 0) > 0 ? btwReport.btw_to_pay : (btwReport?.btw_to_claim || 0))}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                      Dit is een indicatief overzicht. Raadpleeg uw accountant voor de officiële BTW-aangifte.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Report */}
        <TabsContent value="aging" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receivables */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Ouderdomsanalyse Debiteuren</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Laden...</div>
                ) : (
                  <>
                    <div className="h-[250px] mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agingChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Huidig (niet vervallen)</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(agingReceivables?.aging?.current || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>1-30 dagen vervallen</TableCell>
                          <TableCell className="text-right font-mono text-amber-600">
                            {formatCurrency(agingReceivables?.aging?.['30_days'] || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>31-60 dagen vervallen</TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {formatCurrency(agingReceivables?.aging?.['60_days'] || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>61-90 dagen vervallen</TableCell>
                          <TableCell className="text-right font-mono text-red-500">
                            {formatCurrency(agingReceivables?.aging?.['90_days'] || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>90+ dagen vervallen</TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {formatCurrency(agingReceivables?.aging?.over_90 || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100 font-bold">
                          <TableCell>Totaal</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(agingReceivables?.total || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payables */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Ouderdomsanalyse Crediteuren</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Laden...</div>
                ) : (
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Huidig (niet vervallen)</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrency(agingPayables?.aging?.current || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1-30 dagen vervallen</TableCell>
                        <TableCell className="text-right font-mono text-amber-600">
                          {formatCurrency(agingPayables?.aging?.['30_days'] || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>31-60 dagen vervallen</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          {formatCurrency(agingPayables?.aging?.['60_days'] || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>61-90 dagen vervallen</TableCell>
                        <TableCell className="text-right font-mono text-red-500">
                          {formatCurrency(agingPayables?.aging?.['90_days'] || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>90+ dagen vervallen</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {formatCurrency(agingPayables?.aging?.over_90 || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell>Totaal</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(agingPayables?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RapportagesPage;
