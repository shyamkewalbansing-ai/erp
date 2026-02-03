import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Loader2, TrendingUp, FileBarChart, Scale, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;

export default function RapportagesPage() {
  const [loading, setLoading] = useState(false);
  const [valuta, setValuta] = useState('SRD');
  const [startDatum, setStartDatum] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [eindDatum, setEindDatum] = useState(new Date().toISOString().split('T')[0]);
  const [balans, setBalans] = useState(null);
  const [resultaat, setResultaat] = useState(null);
  const [btw, setBtw] = useState(null);
  const [debiteuren, setDebiteuren] = useState(null);

  const loadBalans = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/boekhouding/rapportages/balans?valuta=${valuta}`);
      setBalans(res.data);
    } catch (err) { toast.error('Kon balans niet laden'); } finally { setLoading(false); }
  };

  const loadResultaat = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/boekhouding/rapportages/resultaat?start_datum=${startDatum}&eind_datum=${eindDatum}&valuta=${valuta}`);
      setResultaat(res.data);
    } catch (err) { toast.error('Kon resultatenrekening niet laden'); } finally { setLoading(false); }
  };

  const loadBtw = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/boekhouding/btw/aangifte?start_datum=${startDatum}&eind_datum=${eindDatum}&valuta=${valuta}`);
      setBtw(res.data);
    } catch (err) { toast.error('Kon BTW overzicht niet laden'); } finally { setLoading(false); }
  };

  const loadDebiteuren = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/boekhouding/rapportages/openstaande-debiteuren?valuta=${valuta}`);
      setDebiteuren(res.data);
    } catch (err) { toast.error('Kon debiteurenoverzicht niet laden'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6" />Rapportages</h1><p className="text-muted-foreground">Financiële overzichten en analyses</p></div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div><Label>Van</Label><Input type="date" value={startDatum} onChange={(e) => setStartDatum(e.target.value)} className="w-40" /></div>
            <div><Label>Tot</Label><Input type="date" value={eindDatum} onChange={(e) => setEindDatum(e.target.value)} className="w-40" /></div>
            <div><Label>Valuta</Label><Select value={valuta} onValueChange={setValuta}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="balans">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balans"><Scale className="w-4 h-4 mr-2" />Balans</TabsTrigger>
          <TabsTrigger value="resultaat"><FileBarChart className="w-4 h-4 mr-2" />Resultaat</TabsTrigger>
          <TabsTrigger value="btw"><Receipt className="w-4 h-4 mr-2" />BTW</TabsTrigger>
          <TabsTrigger value="debiteuren"><TrendingUp className="w-4 h-4 mr-2" />Debiteuren</TabsTrigger>
        </TabsList>

        <TabsContent value="balans">
          <Card>
            <CardHeader><div className="flex justify-between items-center"><CardTitle>Balans</CardTitle><Button onClick={loadBalans} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Genereren'}</Button></div></CardHeader>
            <CardContent>
              {balans ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div><h3 className="font-semibold mb-2 text-blue-600">ACTIVA</h3><Table><TableBody>{balans.activa.map(a => <TableRow key={a.code}><TableCell>{a.code} - {a.naam}</TableCell><TableCell className="text-right font-mono">{formatCurrency(a.saldo, valuta)}</TableCell></TableRow>)}<TableRow className="font-bold bg-blue-50"><TableCell>Totaal Activa</TableCell><TableCell className="text-right">{formatCurrency(balans.totaal_activa, valuta)}</TableCell></TableRow></TableBody></Table></div>
                  <div><h3 className="font-semibold mb-2 text-red-600">PASSIVA</h3><Table><TableBody>{balans.passiva.map(p => <TableRow key={p.code}><TableCell>{p.code} - {p.naam}</TableCell><TableCell className="text-right font-mono">{formatCurrency(p.saldo, valuta)}</TableCell></TableRow>)}<TableRow className="bg-red-50"><TableCell className="font-semibold">Totaal Passiva</TableCell><TableCell className="text-right font-semibold">{formatCurrency(balans.totaal_passiva, valuta)}</TableCell></TableRow></TableBody></Table><h3 className="font-semibold mb-2 mt-4 text-purple-600">EIGEN VERMOGEN</h3><Table><TableBody>{balans.eigen_vermogen.map(e => <TableRow key={e.code}><TableCell>{e.code} - {e.naam}</TableCell><TableCell className="text-right font-mono">{formatCurrency(e.saldo, valuta)}</TableCell></TableRow>)}<TableRow className="font-bold bg-purple-50"><TableCell>Totaal Passiva + EV</TableCell><TableCell className="text-right">{formatCurrency(balans.totaal_passiva_ev, valuta)}</TableCell></TableRow></TableBody></Table></div>
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">Klik op Genereren om de balans te laden</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resultaat">
          <Card>
            <CardHeader><div className="flex justify-between items-center"><CardTitle>Winst & Verlies</CardTitle><Button onClick={loadResultaat} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Genereren'}</Button></div></CardHeader>
            <CardContent>
              {resultaat ? (
                <div className="space-y-6">
                  <div><h3 className="font-semibold mb-2 text-green-600">OPBRENGSTEN</h3><Table><TableBody>{resultaat.opbrengsten.map(o => <TableRow key={o.code}><TableCell>{o.code} - {o.naam}</TableCell><TableCell className="text-right font-mono">{formatCurrency(o.bedrag, valuta)}</TableCell></TableRow>)}<TableRow className="font-bold bg-green-50"><TableCell>Totaal Opbrengsten</TableCell><TableCell className="text-right">{formatCurrency(resultaat.totaal_opbrengsten, valuta)}</TableCell></TableRow></TableBody></Table></div>
                  <div><h3 className="font-semibold mb-2 text-red-600">KOSTEN</h3><Table><TableBody>{resultaat.kosten.map(k => <TableRow key={k.code}><TableCell>{k.code} - {k.naam}</TableCell><TableCell className="text-right font-mono">{formatCurrency(k.bedrag, valuta)}</TableCell></TableRow>)}<TableRow className="font-bold bg-red-50"><TableCell>Totaal Kosten</TableCell><TableCell className="text-right">{formatCurrency(resultaat.totaal_kosten, valuta)}</TableCell></TableRow></TableBody></Table></div>
                  <Card className={resultaat.resultaat >= 0 ? 'bg-green-50' : 'bg-red-50'}><CardContent className="py-4"><div className="flex justify-between items-center"><span className="text-lg font-semibold">{resultaat.resultaat_type === 'winst' ? 'WINST' : 'VERLIES'}</span><span className="text-2xl font-bold">{formatCurrency(Math.abs(resultaat.resultaat), valuta)}</span></div></CardContent></Card>
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">Klik op "Genereren" om de resultatenrekening te laden</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="btw">
          <Card>
            <CardHeader><div className="flex justify-between items-center"><CardTitle>BTW Aangifte</CardTitle><Button onClick={loadBtw} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Genereren'}</Button></div></CardHeader>
            <CardContent>
              {btw ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader><TableRow><TableHead>Omschrijving</TableHead><TableHead className="text-right">Omzet</TableHead><TableHead className="text-right">BTW</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow><TableCell>Hoog tarief (25%)</TableCell><TableCell className="text-right">{formatCurrency(btw.omzet_hoog_tarief, valuta)}</TableCell><TableCell className="text-right">{formatCurrency(btw.btw_hoog_tarief, valuta)}</TableCell></TableRow>
                      <TableRow><TableCell>Laag tarief (10%)</TableCell><TableCell className="text-right">{formatCurrency(btw.omzet_laag_tarief, valuta)}</TableCell><TableCell className="text-right">{formatCurrency(btw.btw_laag_tarief, valuta)}</TableCell></TableRow>
                      <TableRow><TableCell>Nul tarief (0%)</TableCell><TableCell className="text-right">{formatCurrency(btw.omzet_nul_tarief, valuta)}</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                      <TableRow className="font-semibold bg-blue-50"><TableCell>Totaal verschuldigde BTW</TableCell><TableCell></TableCell><TableCell className="text-right">{formatCurrency(btw.totaal_verschuldigde_btw, valuta)}</TableCell></TableRow>
                      <TableRow><TableCell>Voorbelasting (af)</TableCell><TableCell></TableCell><TableCell className="text-right text-green-600">-{formatCurrency(btw.voorbelasting, valuta)}</TableCell></TableRow>
                      <TableRow className="font-bold bg-yellow-50"><TableCell>TE BETALEN BTW</TableCell><TableCell></TableCell><TableCell className="text-right text-xl">{formatCurrency(btw.te_betalen_btw, valuta)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">Klik op "Genereren" om het BTW overzicht te laden</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debiteuren">
          <Card>
            <CardHeader><div className="flex justify-between items-center"><CardTitle>Openstaande Debiteuren</CardTitle><Button onClick={loadDebiteuren} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Genereren'}</Button></div></CardHeader>
            <CardContent>
              {debiteuren ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded"><p className="text-sm text-muted-foreground">0-30 dagen</p><p className="text-xl font-bold text-green-600">{formatCurrency(debiteuren.totalen['0-30'], valuta)}</p></div>
                    <div className="p-4 bg-yellow-50 rounded"><p className="text-sm text-muted-foreground">31-60 dagen</p><p className="text-xl font-bold text-yellow-600">{formatCurrency(debiteuren.totalen['31-60'], valuta)}</p></div>
                    <div className="p-4 bg-orange-50 rounded"><p className="text-sm text-muted-foreground">61-90 dagen</p><p className="text-xl font-bold text-orange-600">{formatCurrency(debiteuren.totalen['61-90'], valuta)}</p></div>
                    <div className="p-4 bg-red-50 rounded"><p className="text-sm text-muted-foreground">90+ dagen</p><p className="text-xl font-bold text-red-600">{formatCurrency(debiteuren.totalen['90+'], valuta)}</p></div>
                    <div className="p-4 bg-blue-50 rounded"><p className="text-sm text-muted-foreground">Totaal</p><p className="text-xl font-bold text-blue-600">{formatCurrency(debiteuren.totalen.totaal, valuta)}</p></div>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Factuur</TableHead><TableHead>Debiteur</TableHead><TableHead>Vervaldatum</TableHead><TableHead>Dagen over</TableHead><TableHead className="text-right">Openstaand</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {debiteuren.facturen.map(f => (<TableRow key={f.factuurnummer}><TableCell className="font-mono">{f.factuurnummer}</TableCell><TableCell>{f.debiteur_naam}</TableCell><TableCell>{f.vervaldatum}</TableCell><TableCell className={f.dagen_over > 30 ? 'text-red-600' : ''}>{f.dagen_over} dagen</TableCell><TableCell className="text-right font-semibold">{formatCurrency(f.openstaand, f.valuta)}</TableCell></TableRow>))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">Klik op "Genereren" om het debiteurenoverzicht te laden</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
