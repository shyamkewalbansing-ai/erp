import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  CreditCard, 
  Building2, 
  Banknote, 
  Wallet,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Save,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function BetaalmethodesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('bank_transfer');

  // Form states for each payment method
  const [bankSettings, setBankSettings] = useState({
    is_enabled: true,
    is_default: true,
    bank_name: '',
    account_holder: '',
    account_number: '',
    iban: '',
    swift_bic: '',
    description: '',
    instructions: 'Maak het bedrag over naar onderstaande bankrekening met vermelding van het factuurnummer.'
  });

  const [mopeSettings, setMopeSettings] = useState({
    is_enabled: false,
    test_token: '',
    live_token: '',
    use_live_mode: false,
    merchant_id: '',
    instructions: 'Klik op de betaalknop om via Mope te betalen.'
  });

  const [cashSettings, setCashSettings] = useState({
    is_enabled: true,
    instructions: 'Betaal contant bij het kantoor.'
  });

  const [chequeSettings, setChequeSettings] = useState({
    is_enabled: false,
    instructions: 'Schrijf de cheque uit op naam van het bedrijf.'
  });

  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payment-methods/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSettings(response.data);
      
      // Parse settings into form states
      const methods = response.data.payment_methods || [];
      
      methods.forEach(method => {
        if (method.method_id === 'bank_transfer') {
          setBankSettings({
            is_enabled: method.is_enabled || false,
            is_default: method.is_default || false,
            bank_name: method.bank_settings?.bank_name || '',
            account_holder: method.bank_settings?.account_holder || '',
            account_number: method.bank_settings?.account_number || '',
            iban: method.bank_settings?.iban || '',
            swift_bic: method.bank_settings?.swift_bic || '',
            description: method.bank_settings?.description || '',
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'mope') {
          setMopeSettings({
            is_enabled: method.is_enabled || false,
            test_token: method.mope_settings?.test_token || '',
            live_token: method.mope_settings?.live_token || '',
            use_live_mode: method.mope_settings?.use_live_mode || false,
            merchant_id: method.mope_settings?.merchant_id || '',
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'cash') {
          setCashSettings({
            is_enabled: method.is_enabled || false,
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'cheque') {
          setChequeSettings({
            is_enabled: method.is_enabled || false,
            instructions: method.instructions || ''
          });
        }
      });
      
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Fout bij laden van betaalinstellingen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const paymentMethods = [
        {
          method_id: 'bank_transfer',
          name: 'Bankoverschrijving',
          is_enabled: bankSettings.is_enabled,
          is_default: bankSettings.is_default,
          description: 'Betalen via bankoverschrijving',
          instructions: bankSettings.instructions,
          bank_settings: {
            bank_name: bankSettings.bank_name,
            account_holder: bankSettings.account_holder,
            account_number: bankSettings.account_number,
            iban: bankSettings.iban,
            swift_bic: bankSettings.swift_bic,
            description: bankSettings.description
          }
        },
        {
          method_id: 'mope',
          name: 'Mope',
          is_enabled: mopeSettings.is_enabled,
          is_default: false,
          description: 'Online betalen via Mope',
          instructions: mopeSettings.instructions,
          mope_settings: {
            is_enabled: mopeSettings.is_enabled,
            test_token: mopeSettings.test_token,
            live_token: mopeSettings.live_token,
            use_live_mode: mopeSettings.use_live_mode,
            merchant_id: mopeSettings.merchant_id
          }
        },
        {
          method_id: 'cash',
          name: 'Contant',
          is_enabled: cashSettings.is_enabled,
          is_default: false,
          description: 'Contante betaling',
          instructions: cashSettings.instructions
        },
        {
          method_id: 'cheque',
          name: 'Cheque',
          is_enabled: chequeSettings.is_enabled,
          is_default: false,
          description: 'Betalen per cheque',
          instructions: chequeSettings.instructions
        }
      ];
      
      await axios.put(
        `${API_URL}/payment-methods/settings`,
        {
          payment_methods: paymentMethods,
          default_method: bankSettings.is_default ? 'bank_transfer' : 
                         (mopeSettings.is_enabled ? 'mope' : 'bank_transfer')
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Betaalinstellingen opgeslagen');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fout bij opslaan van instellingen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="betaalmethodes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Betaalmethodes</h1>
            <p className="text-muted-foreground">
              Configureer de betaalmethodes voor facturen en betalingen
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving} data-testid="save-btn">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Opslaan
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-start gap-4 pt-6">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                De geconfigureerde betaalmethodes worden automatisch beschikbaar in alle modules 
                (Vastgoed, HRM, Auto Dealer) voor facturen, kwitanties en andere betalingen.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="mope" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Mope</span>
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span className="hidden sm:inline">Contant</span>
            </TabsTrigger>
            <TabsTrigger value="cheque" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Cheque</span>
            </TabsTrigger>
          </TabsList>

          {/* Bank Transfer Tab */}
          <TabsContent value="bank_transfer">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Bankoverschrijving</CardTitle>
                      <CardDescription>Klanten betalen via bankoverschrijving</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {bankSettings.is_default && (
                      <Badge variant="secondary">Standaard</Badge>
                    )}
                    <Switch
                      checked={bankSettings.is_enabled}
                      onCheckedChange={(checked) => setBankSettings({...bankSettings, is_enabled: checked})}
                      data-testid="bank-enabled-switch"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Naam</Label>
                    <Input
                      placeholder="Bijv. Hakrinbank, De Surinaamsche Bank"
                      value={bankSettings.bank_name}
                      onChange={(e) => setBankSettings({...bankSettings, bank_name: e.target.value})}
                      data-testid="bank-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rekeninghouder</Label>
                    <Input
                      placeholder="Naam van de rekeninghouder"
                      value={bankSettings.account_holder}
                      onChange={(e) => setBankSettings({...bankSettings, account_holder: e.target.value})}
                      data-testid="account-holder-input"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rekeningnummer</Label>
                    <Input
                      placeholder="Bankrekening nummer"
                      value={bankSettings.account_number}
                      onChange={(e) => setBankSettings({...bankSettings, account_number: e.target.value})}
                      data-testid="account-number-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN (optioneel)</Label>
                    <Input
                      placeholder="Internationaal rekeningnummer"
                      value={bankSettings.iban}
                      onChange={(e) => setBankSettings({...bankSettings, iban: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Betaalinstructies</Label>
                  <Textarea
                    placeholder="Instructies die op de factuur verschijnen"
                    value={bankSettings.instructions}
                    onChange={(e) => setBankSettings({...bankSettings, instructions: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={bankSettings.is_default}
                    onCheckedChange={(checked) => setBankSettings({...bankSettings, is_default: checked})}
                  />
                  <Label>Instellen als standaard betaalmethode</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mope Tab */}
          <TabsContent value="mope">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle>Mope Betalingen</CardTitle>
                      <CardDescription>Online betalen via Mope payment gateway</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={mopeSettings.is_enabled}
                    onCheckedChange={(checked) => setMopeSettings({...mopeSettings, is_enabled: checked})}
                    data-testid="mope-enabled-switch"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mope Info */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Mope Account Nodig</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Om Mope betalingen te accepteren heeft u een Mope merchant account nodig. 
                        Bezoek <a href="https://mope.sr" target="_blank" rel="noopener noreferrer" className="underline">mope.sr</a> om 
                        een account aan te maken en uw API tokens te verkrijgen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Test Token</Label>
                  <Input
                    type="password"
                    placeholder="Mope test API token"
                    value={mopeSettings.test_token}
                    onChange={(e) => setMopeSettings({...mopeSettings, test_token: e.target.value})}
                    data-testid="mope-test-token-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gebruik de test token om betalingen te testen zonder echte transacties
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Live Token</Label>
                  <Input
                    type="password"
                    placeholder="Mope live API token"
                    value={mopeSettings.live_token}
                    onChange={(e) => setMopeSettings({...mopeSettings, live_token: e.target.value})}
                    data-testid="mope-live-token-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    De live token voor echte betalingen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Merchant ID (optioneel)</Label>
                  <Input
                    placeholder="Uw Mope merchant ID"
                    value={mopeSettings.merchant_id}
                    onChange={(e) => setMopeSettings({...mopeSettings, merchant_id: e.target.value})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Live Modus</p>
                    <p className="text-sm text-muted-foreground">
                      {mopeSettings.use_live_mode 
                        ? 'Echte betalingen worden verwerkt' 
                        : 'Test modus - geen echte transacties'}
                    </p>
                  </div>
                  <Switch
                    checked={mopeSettings.use_live_mode}
                    onCheckedChange={(checked) => setMopeSettings({...mopeSettings, use_live_mode: checked})}
                    data-testid="mope-live-mode-switch"
                  />
                </div>

                {mopeSettings.use_live_mode && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      Live modus is actief. Alle betalingen zijn echte transacties.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Betaalinstructies</Label>
                  <Textarea
                    placeholder="Instructies voor Mope betalingen"
                    value={mopeSettings.instructions}
                    onChange={(e) => setMopeSettings({...mopeSettings, instructions: e.target.value})}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Tab */}
          <TabsContent value="cash">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <CardTitle>Contant</CardTitle>
                      <CardDescription>Contante betalingen op kantoor</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={cashSettings.is_enabled}
                    onCheckedChange={(checked) => setCashSettings({...cashSettings, is_enabled: checked})}
                    data-testid="cash-enabled-switch"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Betaalinstructies</Label>
                  <Textarea
                    placeholder="Instructies voor contante betalingen"
                    value={cashSettings.instructions}
                    onChange={(e) => setCashSettings({...cashSettings, instructions: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cheque Tab */}
          <TabsContent value="cheque">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle>Cheque</CardTitle>
                      <CardDescription>Betaling per cheque</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={chequeSettings.is_enabled}
                    onCheckedChange={(checked) => setChequeSettings({...chequeSettings, is_enabled: checked})}
                    data-testid="cheque-enabled-switch"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Betaalinstructies</Label>
                  <Textarea
                    placeholder="Instructies voor cheque betalingen"
                    value={chequeSettings.instructions}
                    onChange={(e) => setChequeSettings({...chequeSettings, instructions: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actieve Betaalmethodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {bankSettings.is_enabled && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Bankoverschrijving</span>
                  {bankSettings.is_default && <Badge variant="secondary" className="text-xs">Standaard</Badge>}
                </div>
              )}
              {mopeSettings.is_enabled && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Mope</span>
                  {mopeSettings.use_live_mode ? (
                    <Badge className="bg-green-500 text-xs">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Test</Badge>
                  )}
                </div>
              )}
              {cashSettings.is_enabled && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg">
                  <Banknote className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Contant</span>
                </div>
              )}
              {chequeSettings.is_enabled && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-500/10 rounded-lg">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Cheque</span>
                </div>
              )}
              {!bankSettings.is_enabled && !mopeSettings.is_enabled && !cashSettings.is_enabled && !chequeSettings.is_enabled && (
                <p className="text-muted-foreground text-sm">Geen betaalmethodes actief</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
