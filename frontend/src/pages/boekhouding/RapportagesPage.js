import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, FileText,
  Users, Building2, Package, Briefcase, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function RapportagesPage() {
  const [activeReport, setActiveReport] = useState('balans');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [kwartaal, setKwartaal] = useState('');

  useEffect(() => {
    loadReport();
  }, [activeReport, jaar, kwartaal]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeReport) {
        case 'balans':
          endpoint = '/rapportages/grootboek/balans';
          break;
        case 'resultaat':
          endpoint = `/rapportages/grootboek/resultaat?jaar=${jaar}`;
          break;
        case 'journaalposten':
          endpoint = '/rapportages/grootboek/journaalposten?limit=50';
          break;
        case 'debiteuren':
          endpoint = '/rapportages/debiteuren/openstaand';
          break;
        case 'crediteuren':
          endpoint = '/rapportages/crediteuren/openstaand';
          break;
        case 'voorraad':
          endpoint = '/rapportages/voorraad/waarde';
          break;
        case 'projecten':
          endpoint = '/rapportages/projecten/overzicht';
          break;
        case 'btw':
          endpoint = `/rapportages/btw/aangifte?jaar=${jaar}${kwartaal ? `&kwartaal=${kwartaal}` : ''}`;
          break;
        default:
          endpoint = '/rapportages/grootboek/balans';
      }
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (err) {
      toast.error('Fout bij laden rapport');
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { id: 'balans', name: 'Balans', icon: BarChart3 },
    { id: 'resultaat', name: 'Winst & Verlies', icon: TrendingUp },
    { id: 'journaalposten', name: 'Journaalposten', icon: FileText },
    { id: 'debiteuren', name: 'Openstaande Debiteuren', icon: Users },
    { id: 'crediteuren', name: 'Openstaande Crediteuren', icon: Building2 },
    { id: 'voorraad', name: 'Voorraadwaarde', icon: Package },
    { id: 'projecten', name: 'Projecten Overzicht', icon: Briefcase },
    { id: 'btw', name: 'BTW Aangifte', icon: Receipt },
  ];

  const formatCurrency = (amount) => `SRD ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="rapportages-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Boekhouding</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Rapportages</h1>
          <p className="text-slate-400 text-sm sm:text-base">Financiële overzichten en analyses</p>
        </div>
      </div>

      {/* Report Selector */}
      <div className="flex flex-wrap gap-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Button
              key={report.id}
              variant={activeReport === report.id ? 'default' : 'outline'}
              className={`rounded-xl ${activeReport === report.id ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
              onClick={() => setActiveReport(report.id)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {report.name}
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      {['resultaat', 'btw'].includes(activeReport) && (
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Jaar:</span>
            <Select value={jaar.toString()} onValueChange={(v) => setJaar(parseInt(v))}>
              <SelectTrigger className="w-24 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeReport === 'btw' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Kwartaal:</span>
              <Select value={kwartaal} onValueChange={setKwartaal}>
                <SelectTrigger className="w-28 rounded-lg"><SelectValue placeholder="Heel jaar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Heel jaar</SelectItem>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-muted-foreground">Rapport laden...</p>
          </div>
        </div>
      ) : data && (
        <div className="space-y-6">
          {/* Balans */}
          {activeReport === 'balans' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Activa</h3>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totaal_activa)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.activa?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{item.code} - {item.naam}</span>
                      <span className="font-mono font-medium">{formatCurrency(item.saldo)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Passiva</h3>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.totaal_passiva)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.passiva?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{item.code} - {item.naam}</span>
                      <span className="font-mono font-medium">{formatCurrency(item.saldo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resultaat */}
          {activeReport === 'resultaat' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Opbrengsten</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totaal_opbrengsten)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Kosten</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totaal_kosten)}</p>
                </div>
                <div className={`rounded-xl border p-4 ${data.resultaat >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
                  <p className="text-sm text-muted-foreground">Resultaat</p>
                  <p className={`text-2xl font-bold ${data.resultaat >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.resultaat)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-card border border-border/50 p-4 sm:p-5">
                  <h3 className="font-semibold mb-3">Opbrengsten</h3>
                  {data.opbrengsten?.length > 0 ? data.opbrengsten.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 mb-2">
                      <span className="text-sm">{item.code} - {item.naam}</span>
                      <span className="font-mono text-emerald-600">{formatCurrency(item.bedrag)}</span>
                    </div>
                  )) : <p className="text-muted-foreground text-sm">Geen opbrengsten</p>}
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4 sm:p-5">
                  <h3 className="font-semibold mb-3">Kosten</h3>
                  {data.kosten?.length > 0 ? data.kosten.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 mb-2">
                      <span className="text-sm">{item.code} - {item.naam}</span>
                      <span className="font-mono text-red-600">{formatCurrency(item.bedrag)}</span>
                    </div>
                  )) : <p className="text-muted-foreground text-sm">Geen kosten</p>}
                </div>
              </div>
            </div>
          )}

          {/* Journaalposten */}
          {activeReport === 'journaalposten' && (
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="divide-y divide-border">
                {data?.length > 0 ? data.map((post) => (
                  <div key={post.id} className="p-4 hover:bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono font-semibold">{post.post_nummer}</p>
                        <p className="text-sm text-muted-foreground">{post.datum}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                        {post.referentie_type || 'Handmatig'}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{post.omschrijving}</p>
                    <div className="space-y-1">
                      {post.regels?.map((regel, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 rounded bg-muted/30">
                          <span>{regel.rekening_code} - {regel.rekening_naam}</span>
                          <div className="flex gap-4">
                            <span className={regel.debet > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                              D: {formatCurrency(regel.debet)}
                            </span>
                            <span className={regel.credit > 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                              C: {formatCurrency(regel.credit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <p className="p-8 text-center text-muted-foreground">Geen journaalposten gevonden</p>}
              </div>
            </div>
          )}

          {/* Openstaande Debiteuren */}
          {activeReport === 'debiteuren' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Totaal Openstaand</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.totaal_openstaand)}</p>
                </div>
              </div>
              {data.per_debiteur?.map((deb, i) => (
                <div key={i} className="rounded-xl bg-card border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{deb.naam}</h3>
                    <span className="font-bold text-amber-600">{formatCurrency(deb.totaal_openstaand)}</span>
                  </div>
                  <div className="space-y-2">
                    {deb.facturen?.map((f, j) => (
                      <div key={j} className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/30">
                        <span className="font-mono">{f.factuurnummer}</span>
                        <span>{f.factuurdatum}</span>
                        <span className="text-amber-600 font-medium">{formatCurrency(f.openstaand)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Openstaande Crediteuren */}
          {activeReport === 'crediteuren' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Totaal Openstaand</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totaal_openstaand)}</p>
                </div>
              </div>
              {data.per_crediteur?.length > 0 ? data.per_crediteur.map((cred, i) => (
                <div key={i} className="rounded-xl bg-card border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{cred.naam}</h3>
                    <span className="font-bold text-red-600">{formatCurrency(cred.totaal_openstaand)}</span>
                  </div>
                </div>
              )) : <p className="text-center text-muted-foreground p-8">Geen openstaande crediteuren</p>}
            </div>
          )}

          {/* Voorraadwaarde */}
          {activeReport === 'voorraad' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Totale Waarde</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totaal_waarde)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Artikelen</p>
                  <p className="text-2xl font-bold">{data.totaal_artikelen}</p>
                </div>
                <div className={`rounded-xl border p-4 ${data.onder_minimum > 0 ? 'bg-amber-50 border-amber-200' : 'bg-card border-border/50'}`}>
                  <p className="text-sm text-muted-foreground">Onder Minimum</p>
                  <p className={`text-2xl font-bold ${data.onder_minimum > 0 ? 'text-amber-600' : ''}`}>{data.onder_minimum}</p>
                </div>
              </div>
              <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                <div className="divide-y divide-border">
                  {data.artikelen?.slice(0, 10).map((art, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{art.naam}</p>
                        <p className="text-sm text-muted-foreground">{art.artikelcode} • {art.aantal} {art.eenheid}</p>
                      </div>
                      <span className="font-bold">{formatCurrency(art.waarde)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BTW Aangifte */}
          {activeReport === 'btw' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Omzet</p>
                  <p className="text-xl font-bold">{formatCurrency(data.omzet_totaal)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">BTW Verkoop</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(data.btw_verkoop)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">BTW Voorbelasting</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.btw_voorbelasting)}</p>
                </div>
                <div className={`rounded-xl border p-4 ${data.btw_af_te_dragen > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-sm text-muted-foreground">Af te Dragen</p>
                  <p className={`text-xl font-bold ${data.btw_af_te_dragen > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(data.btw_af_te_dragen)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Projecten */}
          {activeReport === 'projecten' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Totaal Uren</p>
                  <p className="text-2xl font-bold">{data.totaal_uren?.toFixed(1)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Totaal Kosten</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.totaal_kosten)}</p>
                </div>
                <div className="rounded-xl bg-card border border-border/50 p-4">
                  <p className="text-sm text-muted-foreground">Projecten</p>
                  <p className="text-2xl font-bold">{data.aantal_projecten}</p>
                </div>
              </div>
              <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                <div className="divide-y divide-border">
                  {data.projecten?.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{p.naam}</p>
                        <p className="text-sm text-muted-foreground">{p.code} • {p.totaal_uren?.toFixed(1)} uren</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(p.kosten)}</p>
                        {p.budget > 0 && (
                          <p className={`text-xs ${p.budget_verbruik > 100 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {p.budget_verbruik}% budget
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
