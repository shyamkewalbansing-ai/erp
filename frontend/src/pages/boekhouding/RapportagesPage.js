import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { FileText, Calculator, BarChart3, Download, Loader2 } from 'lucide-react';

const RapportagesPage = () => {
  const [balans, setBalans] = useState(null);
  const [winstVerlies, setWinstVerlies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodeVan, setPeriodeVan] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [periodeTot, setPeriodeTot] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [balansRes, wvRes] = await Promise.all([
        reportsAPI.balans(reportDate).catch(() => ({ activa: [], passiva: [], totaal_activa: 0, totaal_passiva: 0 })),
        reportsAPI.winstVerlies(periodeVan, periodeTot).catch(() => ({ omzet: [], kosten: [], totaal_omzet: 0, totaal_kosten: 0, resultaat: 0 }))
      ]);
      setBalans(balansRes);
      setWinstVerlies(wvRes);
    } catch (error) {
      toast.error('Fout bij laden rapportages');
    } finally { setLoading(false); }
  };

  const BalansSection = ({ title, items, total }) => (
    <div className="mb-6">
      <h3 className="font-bold text-lg mb-3 text-slate-800">{title}</h3>
      <Table>
        <TableBody>
          {(items || []).map((item, idx) => (
            <TableRow key={idx}>
              <TableCell className="py-2">{item.rekening_code} - {item.rekening_naam}</TableCell>
              <TableCell className="text-right font-mono py-2">{formatCurrency(item.saldo || 0)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 border-slate-300">
            <TableCell className="font-bold py-2">Totaal {title}</TableCell>
            <TableCell className="text-right font-mono font-bold py-2">{formatCurrency(total || 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="rapportages-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Rapportages</h1>
          <p className="text-slate-500 mt-1">Financiële overzichten en rapportages</p>
        </div>
      </div>

      <Tabs defaultValue="balans">
        <TabsList>
          <TabsTrigger value="balans" data-testid="tab-balans"><FileText className="w-4 h-4 mr-2" />Balans</TabsTrigger>
          <TabsTrigger value="wv" data-testid="tab-winst-verlies"><Calculator className="w-4 h-4 mr-2" />Winst & Verlies</TabsTrigger>
        </TabsList>

        <TabsContent value="balans" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Balans</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Datum:</Label>
                    <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-40" />
                  </div>
                  <Button onClick={fetchReports} variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vernieuwen'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <BalansSection title="Activa" items={balans?.activa} total={balans?.totaal_activa} />
                  </div>
                  <div>
                    <BalansSection title="Passiva" items={balans?.passiva} total={balans?.totaal_passiva} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wv" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Winst & Verlies</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Van:</Label>
                    <Input type="date" value={periodeVan} onChange={(e) => setPeriodeVan(e.target.value)} className="w-36" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Tot:</Label>
                    <Input type="date" value={periodeTot} onChange={(e) => setPeriodeTot(e.target.value)} className="w-36" />
                  </div>
                  <Button onClick={fetchReports} variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vernieuwen'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
                <div className="max-w-2xl">
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3 text-slate-800">Omzet</h3>
                    <Table>
                      <TableBody>
                        {(winstVerlies?.omzet || []).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="py-2">{item.rekening_code} - {item.rekening_naam}</TableCell>
                            <TableCell className="text-right font-mono py-2 text-green-600">{formatCurrency(item.bedrag || 0)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t border-slate-200">
                          <TableCell className="font-medium py-2">Totaal Omzet</TableCell>
                          <TableCell className="text-right font-mono font-medium py-2 text-green-600">{formatCurrency(winstVerlies?.totaal_omzet || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3 text-slate-800">Kosten</h3>
                    <Table>
                      <TableBody>
                        {(winstVerlies?.kosten || []).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="py-2">{item.rekening_code} - {item.rekening_naam}</TableCell>
                            <TableCell className="text-right font-mono py-2 text-red-600">{formatCurrency(item.bedrag || 0)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t border-slate-200">
                          <TableCell className="font-medium py-2">Totaal Kosten</TableCell>
                          <TableCell className="text-right font-mono font-medium py-2 text-red-600">{formatCurrency(winstVerlies?.totaal_kosten || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className={`p-4 rounded-lg ${(winstVerlies?.resultaat || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Resultaat</span>
                      <span className={`font-mono font-bold text-xl ${(winstVerlies?.resultaat || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(winstVerlies?.resultaat || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RapportagesPage;
