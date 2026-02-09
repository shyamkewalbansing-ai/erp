import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboard, formatCurrency, getMyAddons, getModulePaymentStatus, submitModulePaymentRequest, getPublicAddons, getSidebarOrder } from '../lib/api';
import { REFRESH_EVENTS } from '../lib/refreshEvents';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Banknote,
  Package,
  Sparkles,
  Copy,
  CheckCircle,
  AlertCircle,
  Calendar,
  Bell,
  ChevronRight,
  Activity,
  BarChart3,
  Zap,
  ArrowUp,
  ArrowDown,
  Plus,
  ShoppingCart,
  Check,
  X,
  Loader2,
  Rocket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import QuickStartWizard from '../components/QuickStartWizard';
import ModuleExpiringBanner from '../components/ModuleExpiringBanner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVastgoedAddon, setHasVastgoedAddon] = useState(false);
  const [addonsChecked, setAddonsChecked] = useState(false);
  const [activeAddons, setActiveAddons] = useState([]);
  
  // Quick Start wizard state
  const [showQuickStart, setShowQuickStart] = useState(false);
  
  // Payment popup state (for expired modules)
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // Module order popup state (for users without modules)
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [orderStep, setOrderStep] = useState(1); // 1: select modules, 2: payment info
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    company_name: '',
    phone: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderPaymentInfo, setOrderPaymentInfo] = useState(null);

  useEffect(() => {
    checkAddonsAndFetch();
    
    // Check if user should see Quick Start wizard
    const quickStartCompleted = localStorage.getItem('quickStartCompleted');
    if (!quickStartCompleted && user?.role !== 'superadmin') {
      // Show wizard for new users after a short delay
      setTimeout(() => setShowQuickStart(true), 1500);
    }
  }, [user]);

  const checkPaymentStatus = async () => {
    try {
      const response = await getModulePaymentStatus();
      setPaymentStatus(response.data);
      if (response.data.has_expired_modules) {
        setPaymentPopupOpen(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleSubmitPaymentRequest = async () => {
    setSubmittingPayment(true);
    try {
      await submitModulePaymentRequest();
      toast.success('Betaalverzoek ingediend! We nemen contact met u op.');
      setPaymentPopupOpen(false);
    } catch (error) {
      toast.error('Fout bij indienen betaalverzoek');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const loadAvailableModules = async () => {
    try {
      const response = await getPublicAddons();
      setAvailableModules(response.data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  // Module slug to route mapping
  const moduleRoutes = {
    'vastgoed_beheer': '/app/dashboard', // Stay here for vastgoed
    'suribet': '/app/suribet',
    'hrm': '/app/hrm',
    'autodealer': '/app/autodealer',
    'beauty': '/app/beauty',
    'pompstation': '/app/pompstation',
    'boekhouding': '/app/boekhouding'
  };

  const checkAddonsAndFetch = async () => {
    try {
      const addonsResponse = await getMyAddons();
      const addons = addonsResponse.data || [];
      setActiveAddons(addons);
      
      // Get active modules
      const activeModules = addons.filter(addon => 
        addon.status === 'active' || addon.status === 'trial'
      );
      
      const hasVastgoed = activeModules.some(addon => 
        addon.addon_slug === 'vastgoed_beheer'
      );
      setHasVastgoedAddon(hasVastgoed);
      
      if (activeModules.length === 0) {
        // Show order popup for users without active modules
        await loadAvailableModules();
        await checkPaymentStatus();
        setOrderPopupOpen(true);
        setAddonsChecked(true);
        setLoading(false);
        return;
      }
      
      // Check for expired modules
      await checkPaymentStatus();
      setAddonsChecked(true);
      
      // Load vastgoed dashboard
      if (hasVastgoed) {
        await fetchDashboard();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking addons:', error);
      setAddonsChecked(true);
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleRefresh = () => fetchDashboard();
    window.addEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
  }, []);

  // Module selection handlers
  const toggleModuleSelection = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const calculateTotal = () => {
    return selectedModules.reduce((total, moduleId) => {
      const module = availableModules.find(m => m.id === moduleId);
      return total + (module?.price || 0);
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (selectedModules.length === 0) {
      toast.error('Selecteer minimaal één module');
      return;
    }

    if (orderStep === 1) {
      // Prefill form with user data
      setOrderForm({
        name: user?.name || '',
        email: user?.email || '',
        company_name: user?.company_name || '',
        phone: ''
      });
      setOrderStep(2);
      return;
    }

    // Submit order
    setSubmittingOrder(true);
    try {
      const orderData = {
        modules: selectedModules,
        customer: orderForm,
        user_id: user?.id
      };

      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/user/modules/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setOrderPaymentInfo(data.payment_info);
        toast.success('Bestelling geplaatst! Bekijk de betaalinstructies.');
        setOrderStep(3); // Show payment instructions
      } else {
        toast.error(data.detail || 'Fout bij plaatsen bestelling');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Fout bij plaatsen bestelling');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Show loading screen while checking addons or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-muted-foreground font-medium">
            {isRedirecting ? 'Doorverwijzen naar uw dashboard...' : 'Dashboard laden...'}
          </p>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const occupancyRate = stats?.total_apartments > 0 
    ? Math.round((stats?.occupied_apartments / stats?.total_apartments) * 100) 
    : 0;

  // Render functions for popups
  function renderOrderPopup() {
    return (
      <Dialog open={orderPopupOpen} onOpenChange={setOrderPopupOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {orderStep === 1 && <><ShoppingCart className="w-6 h-6 text-emerald-500" /> Modules Bestellen</>}
              {orderStep === 2 && <><Users className="w-6 h-6 text-blue-500" /> Uw Gegevens</>}
              {orderStep === 3 && <><CheckCircle className="w-6 h-6 text-emerald-500" /> Bestelling Geplaatst</>}
            </DialogTitle>
            <DialogDescription>
              {orderStep === 1 && 'Selecteer de modules die u wilt activeren. U krijgt 3 dagen gratis proefperiode.'}
              {orderStep === 2 && 'Vul uw gegevens in om de bestelling te plaatsen.'}
              {orderStep === 3 && 'Uw bestelling is geplaatst. Volg de betaalinstructies hieronder.'}
            </DialogDescription>
          </DialogHeader>

          {orderStep === 1 && (
            <div className="space-y-4 py-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                <div className="w-16 h-1 bg-slate-200"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold">2</div>
                <div className="w-16 h-1 bg-slate-200"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold">3</div>
              </div>

              {/* Module selection */}
              <div className="grid gap-3">
                {availableModules.filter(m => m.slug !== 'boekhouding').map((module) => (
                  <div 
                    key={module.id}
                    onClick={() => toggleModuleSelection(module.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedModules.includes(module.id)
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedModules.includes(module.id)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <div>
                          <h4 className="font-semibold">{module.name}</h4>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">SRD {module.price?.toLocaleString('nl-NL')}</p>
                        <p className="text-xs text-muted-foreground">per maand</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Boekhouding - Gratis */}
                <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h4 className="font-semibold">Boekhouding</h4>
                        <p className="text-sm text-muted-foreground">Automatisch inbegrepen</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white">GRATIS</Badge>
                  </div>
                </div>
              </div>

              {/* Total */}
              {selectedModules.length > 0 && (
                <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Totaal per maand:</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      SRD {calculateTotal().toLocaleString('nl-NL')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    * 3 dagen gratis proefperiode inbegrepen
                  </p>
                </div>
              )}
            </div>
          )}

          {orderStep === 2 && (
            <div className="space-y-4 py-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div className="w-16 h-1 bg-emerald-500"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                <div className="w-16 h-1 bg-slate-200"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold">3</div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Naam *</Label>
                    <Input
                      id="name"
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                      placeholder="Uw volledige naam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Bedrijfsnaam</Label>
                    <Input
                      id="company"
                      value={orderForm.company_name}
                      onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                      placeholder="Bedrijfsnaam (optioneel)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orderForm.email}
                      onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                      placeholder="uw@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                      placeholder="+597 ..."
                    />
                  </div>
                </div>
              </div>

              {/* Selected modules summary */}
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <h4 className="font-semibold mb-2">Geselecteerde modules:</h4>
                <div className="space-y-1">
                  {selectedModules.map(moduleId => {
                    const module = availableModules.find(m => m.id === moduleId);
                    return (
                      <div key={moduleId} className="flex justify-between text-sm">
                        <span>{module?.name}</span>
                        <span className="font-medium">SRD {module?.price?.toLocaleString('nl-NL')}/mnd</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-emerald-200 pt-2 mt-2 flex justify-between font-bold">
                    <span>Totaal:</span>
                    <span>SRD {calculateTotal().toLocaleString('nl-NL')}/mnd</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {orderStep === 3 && orderPaymentInfo && (
            <div className="space-y-4 py-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div className="w-16 h-1 bg-emerald-500"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div className="w-16 h-1 bg-emerald-500"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4" />
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-emerald-600">Bestelling Succesvol!</h3>
                <p className="text-muted-foreground">Uw modules zijn geactiveerd voor 3 dagen proefperiode.</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Betaalinstructies
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">Bank:</span>
                    <span className="font-medium">{orderPaymentInfo.bank_name || 'Hakrinbank'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">Rekening:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono">{orderPaymentInfo.account_number || '1234567890'}</span>
                      <button 
                        onClick={() => copyToClipboard(orderPaymentInfo.account_number)}
                        className="p-1 hover:bg-blue-200 rounded"
                      >
                        <Copy className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">T.n.v.:</span>
                    <span className="font-medium">{orderPaymentInfo.account_holder || 'Facturatie N.V.'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">Bedrag:</span>
                    <span className="font-bold text-lg text-blue-800">SRD {calculateTotal().toLocaleString('nl-NL')}</span>
                  </div>
                </div>
                {orderPaymentInfo.instructions && (
                  <p className="text-xs text-blue-600 mt-3 pt-3 border-t border-blue-200">
                    {orderPaymentInfo.instructions}
                  </p>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Na ontvangst van uw betaling wordt uw abonnement verlengd. 
                U ontvangt een bevestiging per e-mail.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {orderStep === 1 && (
              <>
                <Button variant="outline" onClick={() => setOrderPopupOpen(false)}>
                  Later
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={selectedModules.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Doorgaan
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {orderStep === 2 && (
              <>
                <Button variant="outline" onClick={() => setOrderStep(1)}>
                  Terug
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={submittingOrder || !orderForm.name || !orderForm.email}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submittingOrder ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig...</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4 mr-2" /> Bestelling Plaatsen</>
                  )}
                </Button>
              </>
            )}
            {orderStep === 3 && (
              <Button 
                onClick={() => {
                  setOrderPopupOpen(false);
                  window.location.reload();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Sluiten en Beginnen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function renderPaymentPopup() {
    return (
      <Dialog open={paymentPopupOpen} onOpenChange={setPaymentPopupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              Proefperiode Verlopen
            </DialogTitle>
            <DialogDescription>
              Uw proefperiode is verlopen. Betaal om uw modules te blijven gebruiken.
            </DialogDescription>
          </DialogHeader>
          
          {paymentStatus && (
            <div className="space-y-4 mt-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h4 className="font-semibold text-orange-800 mb-2">Verlopen Modules:</h4>
                <div className="space-y-2">
                  {paymentStatus.expired_modules?.map((module, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-orange-700">{module.addon_name}</span>
                      <span className="font-medium text-orange-900">SRD {module.price?.toLocaleString('nl-NL')}/mnd</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-orange-200 mt-3 pt-3 flex justify-between">
                  <span className="font-semibold text-orange-900">Totaal:</span>
                  <span className="font-bold text-orange-900">SRD {paymentStatus.total_monthly_amount?.toLocaleString('nl-NL')}/mnd</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h4 className="font-semibold text-emerald-800 mb-3">Betaalgegevens:</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">Bank:</span>
                    <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.bank_name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">Rekening:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.account_number || '-'}</span>
                      {paymentStatus.payment_info?.account_number && (
                        <button 
                          onClick={() => copyToClipboard(paymentStatus.payment_info?.account_number)}
                          className="p-1 hover:bg-emerald-200 rounded"
                        >
                          <Copy className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">T.n.v.:</span>
                    <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.account_holder || '-'}</span>
                  </div>
                </div>
                {paymentStatus.payment_info?.instructions && (
                  <p className="text-xs text-emerald-600 mt-3 pt-3 border-t border-emerald-200">
                    {paymentStatus.payment_info.instructions}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentPopupOpen(false)}
                  className="flex-1"
                >
                  Later
                </Button>
                <Button
                  onClick={handleSubmitPaymentRequest}
                  disabled={submittingPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submittingPayment ? (
                    <>Bezig...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ik heb betaald
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="dashboard">
      {/* Module Expiring Banner */}
      <ModuleExpiringBanner />
      
      {/* Hero Header - Responsive */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs - Hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-blue-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="truncate">{currentDate}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Welkom terug, <span className="text-emerald-400">{user?.name?.split(' ')[0] || 'Gebruiker'}</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Hier is een overzicht van uw verhuurportfolio
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {user?.logo && (
              <img 
                src={user.logo} 
                alt="Logo" 
                className="h-12 sm:h-16 lg:h-20 w-auto object-contain bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3"
              />
            )}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => setShowQuickStart(true)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 text-xs sm:text-sm"
              >
                <Rocket className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Quick Start</span>
                <span className="xs:hidden">Start</span>
              </Button>
              <Button 
                onClick={() => navigate('/app/boekhouding')}
                size="sm"
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Boekhouding
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Occupancy Rate - Featured Card */}
        <div className="sm:col-span-2 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Bezettingsgraad</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold">{occupancyRate}%</span>
                  <span className="text-emerald-200 text-xs sm:text-sm">bezet</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ml-2">
                <Activity className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 sm:h-3 bg-white/20 rounded-full overflow-hidden mb-3 sm:mb-4">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 scrollbar-hide">
                <span className="flex items-center gap-1 sm:gap-2 bg-white/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  {stats?.total_apartments || 0} totaal
                </span>
                <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  {stats?.occupied_apartments || 0} bezet
                </span>
              </div>
              <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 self-start sm:self-auto text-xs">
                <Zap className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                Live
              </Badge>
            </div>
          </div>
        </div>

        {/* Income Card - Same emerald color as Huurders */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3" />
              +12%
            </div>
          </div>
          
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Inkomsten deze maand</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1 truncate">
            {formatCurrency(stats?.total_income_this_month || 0)}
          </p>
          
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground text-xs sm:text-sm p-0 h-auto" onClick={() => navigate('/app/betalingen')}>
              Bekijk details
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Outstanding Card */}
        <div className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:shadow-xl ${
          (stats?.total_outstanding || 0) > 0 
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-900 hover:shadow-orange-500/10' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-emerald-500/5'
        }`}>
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg ${
              (stats?.total_outstanding || 0) > 0 
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30' 
                : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30'
            }`}>
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            {(stats?.total_outstanding || 0) > 0 && (
              <Badge className="bg-orange-500 text-white border-0 animate-pulse text-xs">
                <AlertTriangle className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                Actie
              </Badge>
            )}
          </div>
          
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Openstaand</p>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-1 truncate ${
            (stats?.total_outstanding || 0) > 0 ? 'text-orange-600' : 'text-foreground'
          }`}>
            {formatCurrency((stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0))}
          </p>
        </div>
      </div>

      {/* Secondary Stats Row - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Cash Balance - Same emerald color */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Kasgeld Saldo</p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold truncate ${
                  (stats?.total_kasgeld || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stats?.total_kasgeld || 0)}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ml-2 ${
                (stats?.total_kasgeld || 0) >= 0 
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50' 
                  : 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50'
              }`}>
                <Banknote className={`w-5 h-5 sm:w-7 sm:h-7 ${
                  (stats?.total_kasgeld || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposits - Same emerald color */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Borg in Beheer</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                  {formatCurrency(stats?.total_deposits_held || 0)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 flex items-center justify-center flex-shrink-0 ml-2">
                <Wallet className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">Snelle Acties</p>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/app/huurders')} className="justify-start text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Huurders
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/app/appartementen')} className="justify-start text-xs sm:text-sm">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Panden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Reminders & Recent - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Reminders Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                Herinneringen
              </CardTitle>
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-semibold text-xs">
                {(stats?.reminders?.length || 0)} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {stats?.reminders && stats.reminders.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {stats.reminders.slice(0, 5).map((reminder, index) => (
                  <div 
                    key={index}
                    className="group flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {reminder.title || reminder.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {reminder.date || 'Vandaag'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">Alles in orde!</p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Geen openstaande herinneringen</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Card - Same emerald color */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                Recente Betalingen
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/betalingen')} className="text-emerald-600 text-xs sm:text-sm p-1 sm:p-2 h-auto">
                Alles
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {stats?.recent_payments && stats.recent_payments.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {stats.recent_payments.slice(0, 5).map((payment, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {payment.tenant_name || 'Onbekend'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {payment.date || 'Recent'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 flex-shrink-0 ml-2">
                      +{formatCurrency(payment.amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                </div>
                <p className="text-foreground font-medium text-sm sm:text-base">Geen betalingen</p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Nog geen recente betalingen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Order Popup */}
      {renderOrderPopup()}
      
      {/* Payment Popup for expired modules */}
      {renderPaymentPopup()}
      
      {/* Quick Start Wizard */}
      <QuickStartWizard open={showQuickStart} onOpenChange={setShowQuickStart} />
    </div>
  );
}
