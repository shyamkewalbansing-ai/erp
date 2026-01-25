import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminLandingSections, 
  createLandingSection, 
  updateLandingSection, 
  deleteLandingSection,
  getAdminLandingSettings,
  updateLandingSettings,
  getAdminOrders,
  updateOrderStatus,
  deleteOrder,
  formatCurrency,
  getMopeSettings,
  updateMopeSettings
} from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Save,
  Eye,
  EyeOff,
  GripVertical,
  Settings,
  FileText,
  ShoppingCart,
  Layout,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  CreditCard,
  Shield
} from 'lucide-react';

const sectionTypes = [
  { value: 'hero', label: 'Hero Sectie' },
  { value: 'features', label: 'Features' },
  { value: 'pricing', label: 'Prijzen' },
  { value: 'about', label: 'Over Ons' },
  { value: 'terms', label: 'Algemene Voorwaarden' },
  { value: 'privacy', label: 'Privacybeleid' },
  { value: 'contact', label: 'Contact' },
  { value: 'custom', label: 'Aangepast' },
];

const orderStatusColors = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  contacted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  converted: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const orderStatusLabels = {
  pending: 'In Afwachting',
  contacted: 'Gecontacteerd',
  converted: 'Omgezet naar Klant',
  rejected: 'Afgewezen',
};

export default function LandingEditor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    logo_url: '',
    footer_text: '',
    social_links: {},
    login_image_url: '',
    register_image_url: ''
  });
  const [orders, setOrders] = useState([]);
  
  // Mope payment settings
  const [mopeSettings, setMopeSettings] = useState({
    is_enabled: false,
    use_live_mode: false,
    test_token: '',
    live_token: '',
    webhook_secret: ''
  });
  const [savingMope, setSavingMope] = useState(false);
  const [showTestToken, setShowTestToken] = useState(false);
  const [showLiveToken, setShowLiveToken] = useState(false);
  
  // Dialog states
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  
  // Section form
  const [sectionForm, setSectionForm] = useState({
    section_type: 'custom',
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    button_text: '',
    button_link: '',
    is_active: true,
    order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsRes, settingsRes, ordersRes, mopeRes] = await Promise.all([
        getAdminLandingSections(),
        getAdminLandingSettings(),
        getAdminOrders(),
        getMopeSettings()
      ]);
      setSections(sectionsRes.data);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
      setOrders(ordersRes.data);
      if (mopeRes.data) {
        setMopeSettings({
          is_enabled: mopeRes.data.is_enabled || false,
          use_live_mode: mopeRes.data.use_live_mode || false,
          test_token: mopeRes.data.test_token || '',
          live_token: mopeRes.data.live_token || '',
          webhook_secret: mopeRes.data.webhook_secret || ''
        });
      }
    } catch (error) {
      toast.error('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateLandingSettings(settings);
      toast.success('Instellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMopeSettings = async () => {
    setSavingMope(true);
    try {
      await updateMopeSettings(mopeSettings);
      toast.success('Betaalinstellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan van betaalinstellingen');
    } finally {
      setSavingMope(false);
    }
  };

  const handleCreateSection = () => {
    setEditingSection(null);
    setSectionForm({
      section_type: 'custom',
      title: '',
      subtitle: '',
      content: '',
      image_url: '',
      button_text: '',
      button_link: '',
      is_active: true,
      order: sections.length
    });
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section) => {
    setEditingSection(section);
    setSectionForm({
      section_type: section.section_type,
      title: section.title || '',
      subtitle: section.subtitle || '',
      content: section.content || '',
      image_url: section.image_url || '',
      button_text: section.button_text || '',
      button_link: section.button_link || '',
      is_active: section.is_active,
      order: section.order
    });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title) {
      toast.error('Titel is verplicht');
      return;
    }
    
    setSavingSection(true);
    try {
      if (editingSection) {
        await updateLandingSection(editingSection.id, sectionForm);
        toast.success('Sectie bijgewerkt');
      } else {
        await createLandingSection(sectionForm);
        toast.success('Sectie aangemaakt');
      }
      setSectionDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Weet u zeker dat u deze sectie wilt verwijderen?')) return;
    
    try {
      await deleteLandingSection(sectionId);
      toast.success('Sectie verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleToggleSectionActive = async (section) => {
    try {
      await updateLandingSection(section.id, { is_active: !section.is_active });
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success('Status bijgewerkt');
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Weet u zeker dat u deze bestelling wilt verwijderen?')) return;
    
    try {
      await deleteOrder(orderId);
      toast.success('Bestelling verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Landingspagina Beheer</h1>
          <p className="text-muted-foreground">Beheer de inhoud van uw publieke website</p>
        </div>
        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Bekijk Website
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">
            <Layout className="w-4 h-4 mr-2" />
            Secties
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Instellingen
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Bestellingen
            {pendingOrders > 0 && (
              <Badge className="ml-2 bg-orange-500 text-white">{pendingOrders}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Betalingen
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pagina Secties</CardTitle>
                  <CardDescription>Beheer de secties op uw landingspagina</CardDescription>
                </div>
                <Button onClick={handleCreateSection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Sectie
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nog geen secties aangemaakt
                  </p>
                ) : (
                  sections.map((section) => (
                    <div 
                      key={section.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        section.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{section.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {sectionTypes.find(t => t.value === section.section_type)?.label || section.section_type}
                            </Badge>
                            {!section.is_active && (
                              <Badge variant="secondary" className="text-xs">Verborgen</Badge>
                            )}
                          </div>
                          {section.subtitle && (
                            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleSectionActive(section)}
                          title={section.is_active ? 'Verbergen' : 'Tonen'}
                        >
                          {section.is_active ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Instellingen</CardTitle>
              <CardDescription>Algemene instellingen voor uw landingspagina</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Bedrijfsnaam</Label>
                  <Input 
                    value={settings.company_name}
                    onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                    placeholder="Facturatie N.V."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input 
                    value={settings.logo_url}
                    onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mailadres</Label>
                  <Input 
                    type="email"
                    value={settings.company_email}
                    onChange={(e) => setSettings({...settings, company_email: e.target.value})}
                    placeholder="info@bedrijf.sr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefoonnummer</Label>
                  <Input 
                    value={settings.company_phone}
                    onChange={(e) => setSettings({...settings, company_phone: e.target.value})}
                    placeholder="+597 ..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Adres</Label>
                  <Input 
                    value={settings.company_address}
                    onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                    placeholder="Paramaribo, Suriname"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer Tekst</Label>
                  <Textarea 
                    value={settings.footer_text}
                    onChange={(e) => setSettings({...settings, footer_text: e.target.value})}
                    placeholder="Korte beschrijving van uw bedrijf..."
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Login & Register Afbeeldingen */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-medium mb-4">Login & Registratie Afbeeldingen</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Login Pagina Afbeelding URL</Label>
                    <Input 
                      value={settings.login_image_url || ''}
                      onChange={(e) => setSettings({...settings, login_image_url: e.target.value})}
                      placeholder="https://... (laat leeg voor standaard)"
                    />
                    {settings.login_image_url && (
                      <img src={settings.login_image_url} alt="Login preview" className="h-32 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Registratie Pagina Afbeelding URL</Label>
                    <Input 
                      value={settings.register_image_url || ''}
                      onChange={(e) => setSettings({...settings, register_image_url: e.target.value})}
                      placeholder="https://... (laat leeg voor standaard)"
                    />
                    {settings.register_image_url && (
                      <img src={settings.register_image_url} alt="Register preview" className="h-32 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bestellingen</CardTitle>
              <CardDescription>Bestellingen via de landingspagina</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen bestellingen ontvangen
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div 
                      key={order.id}
                      className="p-4 rounded-lg border bg-background"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg">{order.name}</span>
                            <Badge className={orderStatusColors[order.status]}>
                              {orderStatusLabels[order.status]}
                            </Badge>
                          </div>
                          {order.company_name && (
                            <p className="text-muted-foreground">{order.company_name}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <a href={`mailto:${order.email}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="w-4 h-4" />
                              {order.email}
                            </a>
                            <a href={`tel:${order.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="w-4 h-4" />
                              {order.phone}
                            </a>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {order.addon_names?.map((name, i) => (
                              <Badge key={i} variant="outline">{name}</Badge>
                            ))}
                          </div>
                          {order.message && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {order.message}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Totaal per maand</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(order.total_price || 0)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Select 
                              value={order.status} 
                              onValueChange={(status) => handleUpdateOrderStatus(order.id, status)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                    In Afwachting
                                  </div>
                                </SelectItem>
                                <SelectItem value="contacted">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    Gecontacteerd
                                  </div>
                                </SelectItem>
                                <SelectItem value="converted">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Omgezet
                                  </div>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    Afgewezen
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="destructive" 
                              size="icon"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments (Mope) Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Mope Betaalinstellingen</CardTitle>
                  <CardDescription>Configureer uw Mope betaalgateway integratie</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Betalingen Inschakelen</Label>
                  <p className="text-sm text-muted-foreground">
                    Schakel online betalingen via Mope in voor bestellingen
                  </p>
                </div>
                <Switch 
                  checked={mopeSettings.is_enabled}
                  onCheckedChange={(checked) => setMopeSettings({...mopeSettings, is_enabled: checked})}
                />
              </div>

              {/* Live Mode Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Live Modus</Label>
                  <p className="text-sm text-muted-foreground">
                    {mopeSettings.use_live_mode 
                      ? 'Live betalingen zijn actief - echte transacties!' 
                      : 'Test modus actief - geen echte transacties'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {mopeSettings.use_live_mode ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Shield className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                      Test
                    </Badge>
                  )}
                  <Switch 
                    checked={mopeSettings.use_live_mode}
                    onCheckedChange={(checked) => setMopeSettings({...mopeSettings, use_live_mode: checked})}
                  />
                </div>
              </div>

              {/* API Tokens */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  API Tokens
                </h3>
                
                {/* Test Token */}
                <div className="space-y-2">
                  <Label>Test API Token</Label>
                  <div className="relative">
                    <Input 
                      type={showTestToken ? "text" : "password"}
                      value={mopeSettings.test_token}
                      onChange={(e) => setMopeSettings({...mopeSettings, test_token: e.target.value})}
                      placeholder="Voer uw Mope test token in"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestToken(!showTestToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showTestToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gebruik dit token voor test transacties (geen echt geld)
                  </p>
                </div>

                {/* Live Token */}
                <div className="space-y-2">
                  <Label>Live API Token</Label>
                  <div className="relative">
                    <Input 
                      type={showLiveToken ? "text" : "password"}
                      value={mopeSettings.live_token}
                      onChange={(e) => setMopeSettings({...mopeSettings, live_token: e.target.value})}
                      placeholder="Voer uw Mope live token in"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveToken(!showLiveToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLiveToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gebruik dit token voor echte transacties (live modus)
                  </p>
                </div>

                {/* Webhook Secret (optional) */}
                <div className="space-y-2">
                  <Label>Webhook Secret (optioneel)</Label>
                  <Input 
                    type="password"
                    value={mopeSettings.webhook_secret}
                    onChange={(e) => setMopeSettings({...mopeSettings, webhook_secret: e.target.value})}
                    placeholder="Voer uw webhook secret in"
                  />
                  <p className="text-xs text-muted-foreground">
                    Voor het verifiëren van webhook callbacks van Mope
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-medium text-blue-600 mb-2">Hoe werkt het?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Registreer bij <a href="https://mope.sr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">mope.sr</a> voor uw API tokens</li>
                  <li>• Gebruik de test token voor het testen van de integratie</li>
                  <li>• Schakel over naar live modus wanneer u klaar bent voor echte betalingen</li>
                </ul>
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSaveMopeSettings} 
                disabled={savingMope}
                className="w-full"
              >
                {savingMope ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Betaalinstellingen Opslaan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Section Edit Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Sectie Bewerken' : 'Nieuwe Sectie'}
            </DialogTitle>
            <DialogDescription>
              {editingSection ? 'Pas de inhoud van deze sectie aan' : 'Voeg een nieuwe sectie toe aan uw landingspagina'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type Sectie</Label>
                <Select 
                  value={sectionForm.section_type} 
                  onValueChange={(value) => setSectionForm({...sectionForm, section_type: value})}
                  disabled={editingSection}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volgorde</Label>
                <Input 
                  type="number"
                  value={sectionForm.order}
                  onChange={(e) => setSectionForm({...sectionForm, order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input 
                value={sectionForm.title}
                onChange={(e) => setSectionForm({...sectionForm, title: e.target.value})}
                placeholder="Sectie titel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ondertitel</Label>
              <Input 
                value={sectionForm.subtitle}
                onChange={(e) => setSectionForm({...sectionForm, subtitle: e.target.value})}
                placeholder="Korte ondertitel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Inhoud</Label>
              <Textarea 
                value={sectionForm.content}
                onChange={(e) => setSectionForm({...sectionForm, content: e.target.value})}
                placeholder="De volledige inhoud van deze sectie..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Gebruik **tekst** voor vetgedrukt en maak nieuwe paragrafen met twee enters.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Afbeelding URL</Label>
              <Input 
                value={sectionForm.image_url}
                onChange={(e) => setSectionForm({...sectionForm, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Knop Tekst</Label>
                <Input 
                  value={sectionForm.button_text}
                  onChange={(e) => setSectionForm({...sectionForm, button_text: e.target.value})}
                  placeholder="Bijv. Meer Info"
                />
              </div>
              <div className="space-y-2">
                <Label>Knop Link</Label>
                <Input 
                  value={sectionForm.button_link}
                  onChange={(e) => setSectionForm({...sectionForm, button_link: e.target.value})}
                  placeholder="/register"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <Label>Sectie Actief</Label>
                <p className="text-sm text-muted-foreground">Toon deze sectie op de website</p>
              </div>
              <Switch 
                checked={sectionForm.is_active}
                onCheckedChange={(checked) => setSectionForm({...sectionForm, is_active: checked})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveSection} disabled={savingSection}>
              {savingSection ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
