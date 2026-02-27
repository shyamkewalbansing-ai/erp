import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Hash, Loader2, Save } from 'lucide-react';

const InstellingenPage = () => {
  const [bedrijf, setBedrijf] = useState({ naam: '', adres: '', stad: '', telefoon: '', email: '', btw_nummer: '', kvk_nummer: '' });
  const [nummering, setNummering] = useState({ factuur_prefix: 'F', factuur_nummer: 1, inkoop_prefix: 'IF', inkoop_nummer: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bedrijfRes, nummeringRes] = await Promise.all([
        settingsAPI.getBedrijf().catch(() => ({})),
        settingsAPI.getNummering().catch(() => ({}))
      ]);
      if (bedrijfRes) setBedrijf(prev => ({ ...prev, ...bedrijfRes }));
      if (nummeringRes) setNummering(prev => ({ ...prev, ...nummeringRes }));
    } catch (error) {
      toast.error('Fout bij laden instellingen');
    } finally { setLoading(false); }
  };

  const handleSaveBedrijf = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateBedrijf(bedrijf);
      toast.success('Bedrijfsgegevens opgeslagen');
    } catch (error) { toast.error(error.message || 'Fout bij opslaan'); }
    finally { setSaving(false); }
  };

  const handleSaveNummering = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateNummering(nummering);
      toast.success('Nummering opgeslagen');
    } catch (error) { toast.error(error.message || 'Fout bij opslaan'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6" data-testid="instellingen-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Instellingen</h1>
        <p className="text-slate-500 mt-1">Configureer bedrijfsgegevens en systeem instellingen</p>
      </div>

      <Tabs defaultValue="bedrijf">
        <TabsList>
          <TabsTrigger value="bedrijf" data-testid="tab-bedrijf"><Building2 className="w-4 h-4 mr-2" />Bedrijfsgegevens</TabsTrigger>
          <TabsTrigger value="nummering" data-testid="tab-nummering"><Hash className="w-4 h-4 mr-2" />Nummering</TabsTrigger>
        </TabsList>

        <TabsContent value="bedrijf" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Bedrijfsgegevens</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2"><Label>Bedrijfsnaam</Label><Input value={bedrijf.naam} onChange={(e) => setBedrijf({...bedrijf, naam: e.target.value})} placeholder="Uw bedrijfsnaam" /></div>
                <div className="space-y-2"><Label>BTW-nummer</Label><Input value={bedrijf.btw_nummer} onChange={(e) => setBedrijf({...bedrijf, btw_nummer: e.target.value})} placeholder="BTW123456" /></div>
                <div className="space-y-2 col-span-2"><Label>Adres</Label><Input value={bedrijf.adres} onChange={(e) => setBedrijf({...bedrijf, adres: e.target.value})} placeholder="Straat en nummer" /></div>
                <div className="space-y-2"><Label>Stad</Label><Input value={bedrijf.stad} onChange={(e) => setBedrijf({...bedrijf, stad: e.target.value})} placeholder="Paramaribo" /></div>
                <div className="space-y-2"><Label>Telefoon</Label><Input value={bedrijf.telefoon} onChange={(e) => setBedrijf({...bedrijf, telefoon: e.target.value})} placeholder="+597 123 4567" /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={bedrijf.email} onChange={(e) => setBedrijf({...bedrijf, email: e.target.value})} placeholder="info@bedrijf.sr" /></div>
                <div className="space-y-2"><Label>KvK-nummer</Label><Input value={bedrijf.kvk_nummer} onChange={(e) => setBedrijf({...bedrijf, kvk_nummer: e.target.value})} placeholder="12345678" /></div>
                <div className="col-span-2"><Button onClick={handleSaveBedrijf} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Opslaan</Button></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nummering" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Factuurnummering</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
                <div className="space-y-2"><Label>Verkoopfactuur Prefix</Label><Input value={nummering.factuur_prefix} onChange={(e) => setNummering({...nummering, factuur_prefix: e.target.value})} placeholder="F" /></div>
                <div className="space-y-2"><Label>Volgend nummer</Label><Input type="number" value={nummering.factuur_nummer} onChange={(e) => setNummering({...nummering, factuur_nummer: parseInt(e.target.value) || 1})} /></div>
                <div className="space-y-2"><Label>Inkoopfactuur Prefix</Label><Input value={nummering.inkoop_prefix} onChange={(e) => setNummering({...nummering, inkoop_prefix: e.target.value})} placeholder="IF" /></div>
                <div className="space-y-2"><Label>Volgend nummer</Label><Input type="number" value={nummering.inkoop_nummer} onChange={(e) => setNummering({...nummering, inkoop_nummer: parseInt(e.target.value) || 1})} /></div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-4">Voorbeeld verkoopfactuur: {nummering.factuur_prefix}{String(nummering.factuur_nummer).padStart(4, '0')}</p>
                  <Button onClick={handleSaveNummering} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Opslaan</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstellingenPage;
