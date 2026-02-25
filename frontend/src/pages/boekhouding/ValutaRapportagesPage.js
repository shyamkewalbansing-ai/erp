import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ModulePageLayout, StatsGrid, ContentSection, PageCard } from '../../components/ModulePageLayout';
import { 
  DollarSign, Euro, TrendingUp, TrendingDown, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Minus, Download
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ValutaRapportagesPage() {
  const [loading, setLoading] = useState(true);
  const [overzicht, setOverzicht] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [jaar, setJaar] = useState(new Date().getFullYear());
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [jaar]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overzichtRes, exposureRes] = await Promise.all([
        fetch(`${API_URL}/api/rapportages/valuta/overzicht?jaar=${jaar}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/rapportages/valuta/exposure`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (overzichtRes.ok) setOverzicht(await overzichtRes.json());
      if (exposureRes.ok) setExposure(await exposureRes.json());
    } catch (error) {
      toast.error('Fout bij laden rapportages');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, valuta = 'SRD') => {
    const symbols = { SRD: 'SRD', USD: '$', EUR: '€', GYD: 'GYD', BRL: 'R$' };
    return `${symbols[valuta] || valuta} ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  const getValutaIcon = (valuta) => {
    if (valuta === 'EUR') return Euro;
    return DollarSign;
  };

  const getTrendIcon = (value) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Stats data
  const statsData = overzicht ? [
    { 
      icon: TrendingUp, 
      label: 'Totaal Verkoop', 
      value: formatCurrency(overzicht.totalen?.verkoop_srd), 
      color: 'emerald' 
    },
    { 
      icon: TrendingDown, 
      label: 'Totaal Inkoop', 
      value: formatCurrency(overzicht.totalen?.inkoop_srd), 
      color: 'red' 
    },
    { 
      icon: DollarSign, 
      label: 'Saldo', 
      value: formatCurrency(overzicht.totalen?.saldo_srd), 
      color: overzicht.totalen?.saldo_srd >= 0 ? 'emerald' : 'red' 
    },
    { 
      icon: RefreshCw, 
      label: 'Netto Exposure', 
      value: formatCurrency(exposure?.totaal_netto_exposure_srd), 
      color: 'blue' 
    }
  ] : [];

  // Header actions
  const headerActions = (
    <div className="flex gap-3">
      <Select value={jaar.toString()} onValueChange={(v) => setJaar(parseInt(v))}>
        <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2024">2024</SelectItem>
          <SelectItem value="2025">2025</SelectItem>
          <SelectItem value="2026">2026</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={fetchData}
        className="bg-white text-emerald-600 hover:bg-emerald-50"
        data-testid="refresh-btn"
      >
        <RefreshCw className="w-4 h-4 mr-2" /> Vernieuwen
      </Button>
    </div>
  );

  return (
    <ModulePageLayout
      title="Multi-Valuta Rapportages"
      subtitle="Overzicht van transacties in verschillende valuta met SRD equivalenten"
      actions={headerActions}
      loading={loading}
      loadingText="Rapportages laden..."
      testId="valuta-rapportages-page"
    >
      {/* Stats Cards */}
      <StatsGrid stats={statsData} columns={4} overlapping={true} />

      {/* Omzet per Valuta */}
      <ContentSection>
        <PageCard title={`Omzet per Valuta - ${jaar}`}>
          {overzicht?.per_valuta?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Valuta</th>
                    <th className="text-right py-3 px-4">Verkoop Origineel</th>
                    <th className="text-right py-3 px-4">Verkoop SRD</th>
                    <th className="text-right py-3 px-4"># Verkoop</th>
                    <th className="text-right py-3 px-4">Inkoop Origineel</th>
                    <th className="text-right py-3 px-4">Inkoop SRD</th>
                    <th className="text-right py-3 px-4"># Inkoop</th>
                  </tr>
                </thead>
                <tbody>
                  {overzicht.per_valuta.map((item) => {
                    const Icon = getValutaIcon(item.valuta);
                    return (
                      <tr key={item.valuta} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">{item.valuta}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{formatCurrency(item.verkoop_origineel, item.valuta)}</td>
                        <td className="text-right py-3 px-4 text-emerald-600 font-medium">{formatCurrency(item.verkoop_srd)}</td>
                        <td className="text-right py-3 px-4">{item.verkoop_aantal}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(item.inkoop_origineel, item.valuta)}</td>
                        <td className="text-right py-3 px-4 text-red-600 font-medium">{formatCurrency(item.inkoop_srd)}</td>
                        <td className="text-right py-3 px-4">{item.inkoop_aantal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Geen transacties gevonden voor {jaar}
            </div>
          )}
        </PageCard>
      </ContentSection>

      {/* Valuta Exposure */}
      <ContentSection className="pb-6">
        <PageCard title="Openstaande Valuta Posities (Exposure)">
          {exposure?.per_valuta?.length > 0 ? (
            <div className="space-y-4">
              {exposure.per_valuta.map((item) => {
                const Icon = getValutaIcon(item.valuta);
                return (
                  <div key={item.valuta} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.valuta}</h4>
                          <p className="text-xs text-muted-foreground">Openstaande posities</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {getTrendIcon(item.netto)}
                          <span className={`text-xl font-bold ${item.netto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(item.netto, item.valuta)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">= {formatCurrency(item.netto_srd)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                        <p className="text-muted-foreground mb-1">Te Ontvangen</p>
                        <p className="text-lg font-semibold text-emerald-600">{formatCurrency(item.te_ontvangen, item.valuta)}</p>
                        {item.details_te_ontvangen?.slice(0, 2).map((d, i) => (
                          <p key={i} className="text-xs text-muted-foreground mt-1">
                            {d.factuurnummer} - {d.relatie}
                          </p>
                        ))}
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <p className="text-muted-foreground mb-1">Te Betalen</p>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(item.te_betalen, item.valuta)}</p>
                        {item.details_te_betalen?.slice(0, 2).map((d, i) => (
                          <p key={i} className="text-xs text-muted-foreground mt-1">
                            {d.factuurnummer} - {d.relatie}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Geen openstaande posities in vreemde valuta
            </div>
          )}
          
          {/* Huidige Koersen */}
          {exposure?.koersen_gebruikt && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-3">Gebruikte Wisselkoersen</h4>
              <div className="flex flex-wrap gap-4">
                {Object.entries(exposure.koersen_gebruikt).map(([valuta, koers]) => (
                  <div key={valuta} className="px-3 py-2 bg-white dark:bg-slate-700 rounded border">
                    <span className="text-muted-foreground">1 {valuta}</span>
                    <span className="mx-2">=</span>
                    <span className="font-medium">{koers} SRD</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PageCard>
      </ContentSection>
    </ModulePageLayout>
  );
}
