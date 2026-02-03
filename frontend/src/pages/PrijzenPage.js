import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowRight, 
  Check, 
  Loader2,
  Phone,
  Package,
  Sparkles,
  CreditCard,
  Building2,
  Gift,
  User,
  Mail,
  Lock,
  Building,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle,
  Puzzle,
  Users,
  Car,
  MessageSquare,
  Globe,
  BarChart3,
  Scissors,
  Fuel,
  Star,
  ChevronRight,
  Calculator,
  Crown,
  Rocket,
  Heart,
  X
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Module icons and gradients mapping
const MODULE_CONFIG = {
  'hrm': { icon: Users, gradient: 'from-blue-500 to-indigo-600', lightBg: 'from-blue-50 to-indigo-50', shadow: 'shadow-blue-200' },
  'vastgoed_beheer': { icon: Building2, gradient: 'from-purple-500 to-violet-600', lightBg: 'from-purple-50 to-violet-50', shadow: 'shadow-purple-200' },
  'autodealer': { icon: Car, gradient: 'from-orange-500 to-red-600', lightBg: 'from-orange-50 to-red-50', shadow: 'shadow-orange-200' },
  'ai-chatbot': { icon: MessageSquare, gradient: 'from-pink-500 to-rose-600', lightBg: 'from-pink-50 to-rose-50', shadow: 'shadow-pink-200' },
  'chatbot': { icon: MessageSquare, gradient: 'from-pink-500 to-rose-600', lightBg: 'from-pink-50 to-rose-50', shadow: 'shadow-pink-200' },
  'cms': { icon: Globe, gradient: 'from-cyan-500 to-blue-600', lightBg: 'from-cyan-50 to-blue-50', shadow: 'shadow-cyan-200' },
  'rapportage': { icon: BarChart3, gradient: 'from-emerald-500 to-teal-600', lightBg: 'from-emerald-50 to-teal-50', shadow: 'shadow-emerald-200' },
  'beauty': { icon: Scissors, gradient: 'from-fuchsia-500 to-pink-600', lightBg: 'from-fuchsia-50 to-pink-50', shadow: 'shadow-fuchsia-200' },
  'pompstation': { icon: Fuel, gradient: 'from-amber-500 to-orange-600', lightBg: 'from-amber-50 to-orange-50', shadow: 'shadow-amber-200' },
  'boekhouding': { icon: Calculator, gradient: 'from-emerald-500 to-green-600', lightBg: 'from-emerald-50 to-green-50', shadow: 'shadow-emerald-200' },
  'default': { icon: Package, gradient: 'from-slate-500 to-gray-600', lightBg: 'from-slate-50 to-gray-50', shadow: 'shadow-slate-200' }
};

const getModuleConfig = (slug) => MODULE_CONFIG[slug] || MODULE_CONFIG['default'];

export default function PrijzenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('trial');
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    password_confirm: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const preSelectedAddon = searchParams.get('addon');
    const preSelectedAddons = searchParams.get('addons');
    
    if (preSelectedAddon && addons.length > 0) {
      const addon = addons.find(a => a.id === preSelectedAddon || a.slug === preSelectedAddon);
      if (addon && !selectedAddons.includes(addon.id)) {
        setSelectedAddons([addon.id]);
      }
    }
    
    if (preSelectedAddons && addons.length > 0) {
      const ids = preSelectedAddons.split(',');
      const validIds = ids.filter(id => addons.some(a => a.id === id || a.slug === id));
      if (validIds.length > 0) {
        setSelectedAddons(validIds);
      }
    }
  }, [searchParams, addons]);

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes] = await Promise.all([
        axios.get(`${API_URL}/public/landing/settings`).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/public/addons`).catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data || {});
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `SRD ${(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`;
  };

  const getPrice = (addon) => {
    const basePrice = addon.price || 0;
    if (isYearly) {
      return Math.round(basePrice * 12 * 0.83);
    }
    return basePrice;
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getTotalPrice = () => {
    return addons
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + getPrice(a), 0);
  };

  const handleOrder = () => {
    if (selectedAddons.length === 0) {
      toast.warning('Selecteer minimaal één module');
      return;
    }
    setOrderDialogOpen(true);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderForm.name || !orderForm.email || !orderForm.password || !orderForm.company_name) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    
    if (orderForm.password !== orderForm.password_confirm) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }
    
    if (orderForm.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    setSubmitting(true);
    
    try {
      const orderData = {
        name: orderForm.name,
        email: orderForm.email,
        phone: orderForm.phone || '',
        password: orderForm.password,
        company_name: orderForm.company_name,
        addon_ids: selectedAddons,
        message: `Betaalmethode: ${paymentMethod === 'trial' ? '3 dagen gratis' : paymentMethod === 'mope' ? 'Mope' : 'Bankoverschrijving'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success(
          paymentMethod === 'trial' 
            ? 'Account aangemaakt! U heeft 3 dagen gratis toegang.' 
            : 'Bestelling ontvangen! U ontvangt een e-mail met betalingsinstructies.'
        );
        setOrderDialogOpen(false);
        setOrderForm({ name: '', email: '', phone: '', company_name: '', password: '', password_confirm: '' });
        setSelectedAddons([]);
        
        if (paymentMethod === 'mope' && response.data.order?.id) {
          try {
            const paymentRes = await axios.post(`${API_URL}/public/orders/${response.data.order.id}/pay`, null, {
              params: { redirect_url: window.location.origin + '/app/dashboard' }
            });
            if (paymentRes.data?.payment_url) {
              window.location.href = paymentRes.data.payment_url;
              return;
            }
          } catch (payErr) {
            console.error('Payment creation error:', payErr);
          }
        }
        
        setTimeout(() => {
          window.location.href = '/app/dashboard';
        }, 1000);
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-emerald-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/70">Prijzen laden...</p>
        </div>
      </div>
    );
  }

  // Separate free and paid addons
  const freeAddons = addons.filter(a => a.price === 0 || a.is_free);
  const paidAddons = addons.filter(a => a.price > 0 && !a.is_free);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section - Premium Design */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px]"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white/90 font-medium">Transparante Prijzen • Geen Verborgen Kosten</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Investeer in{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Groei
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47.6667 2.16667 141 -2.4 199 5.5" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="1" y1="5.5" x2="199" y2="5.5">
                    <stop stopColor="#34D399"/>
                    <stop offset="0.5" stopColor="#2DD4BF"/>
                    <stop offset="1" stopColor="#22D3EE"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Kies de modules die perfect passen bij uw bedrijf. 
            Start vandaag nog met <span className="text-emerald-400 font-semibold">3 dagen gratis</span>.
          </p>
          
          {/* Billing Toggle - Premium Design */}
          <div className="inline-flex items-center gap-6 p-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <button 
              onClick={() => setIsYearly(false)}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                !isYearly 
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/20' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Maandelijks
            </button>
            <button 
              onClick={() => setIsYearly(true)}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                isYearly 
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/20' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Jaarlijks
              <span className="px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-6 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Gift, text: '3 Dagen Gratis', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Shield, text: 'SSL Beveiligd', color: 'text-blue-600 bg-blue-50' },
              { icon: Zap, text: 'Direct Actief', color: 'text-amber-600 bg-amber-50' },
              { icon: Heart, text: 'Surinaamse Support', color: 'text-rose-600 bg-rose-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-slate-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Selection Bar */}
      {selectedAddons.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-6 px-8 py-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-900/50 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <p className="font-semibold">{selectedAddons.length} module{selectedAddons.length > 1 ? 's' : ''}</p>
                <p className="text-sm text-white/60">geselecteerd</p>
              </div>
            </div>
            <div className="h-12 w-px bg-white/20"></div>
            <div className="text-white">
              <p className="text-3xl font-bold">{formatCurrency(getTotalPrice())}</p>
              <p className="text-sm text-white/60">per {isYearly ? 'jaar' : 'maand'}</p>
            </div>
            <Button 
              onClick={handleOrder}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 px-8"
            >
              Bestellen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Free Modules Section */}
      {freeAddons.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2">
                <Gift className="w-4 h-4 mr-2" />
                Gratis Modules
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Inbegrepen bij Elke Account
              </h2>
              <p className="text-slate-600">Deze modules krijgt u automatisch gratis bij uw account</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeAddons.map((addon) => {
                const config = getModuleConfig(addon.slug);
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={addon.id}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-emerald-200 hover:border-emerald-400"
                  >
                    {/* Free Badge */}
                    <div className="absolute -top-3 -right-3">
                      <Badge className="bg-emerald-500 text-white border-0 shadow-lg px-4 py-1.5 text-sm font-bold">
                        GRATIS
                      </Badge>
                    </div>
                    
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 shadow-lg ${config.shadow}`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{addon.name}</h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{addon.description}</p>
                    
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Automatisch geactiveerd</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Paid Modules Section - Premium Cards */}
      <section className="py-20 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-100 text-slate-700 border-slate-200 px-4 py-2">
              <Crown className="w-4 h-4 mr-2" />
              Premium Modules
            </Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Kies uw Modules
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Selecteer de modules die u nodig heeft en betaal alleen voor wat u gebruikt
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paidAddons.map((addon, index) => {
              const isSelected = selectedAddons.includes(addon.id);
              const isPopular = index === 0;
              const isHovered = hoveredCard === addon.id;
              const config = getModuleConfig(addon.slug);
              const IconComponent = config.icon;
              
              return (
                <div
                  key={addon.id}
                  data-testid={`addon-card-${addon.id}`}
                  className="group relative"
                  onMouseEnter={() => setHoveredCard(addon.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-3xl blur-lg transition-all duration-500 ${
                    isSelected ? 'opacity-50' : isHovered ? 'opacity-30' : 'opacity-0'
                  }`}></div>
                  
                  {/* Card */}
                  <div 
                    onClick={() => toggleAddonSelection(addon.id)}
                    className={`relative cursor-pointer h-full bg-white rounded-3xl overflow-hidden transition-all duration-500 ${
                      isSelected 
                        ? 'ring-4 ring-emerald-500 shadow-2xl shadow-emerald-500/20 -translate-y-2' 
                        : 'border border-slate-200 hover:border-transparent hover:shadow-2xl hover:-translate-y-2'
                    }`}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute top-4 left-4 z-10">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold">
                          <Star className="w-3 h-3 mr-1 fill-white" />
                          POPULAIR
                        </Badge>
                      </div>
                    )}
                    
                    {/* Selection Indicator */}
                    <div className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-500 scale-110' 
                        : 'border-slate-300 group-hover:border-emerald-400'
                    }`}>
                      {isSelected && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                    </div>

                    {/* Image Header */}
                    <div className={`relative h-36 bg-gradient-to-br ${config.gradient} overflow-hidden`}>
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
                      <div className="absolute bottom-4 left-6">
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                          <IconComponent className={`w-8 h-8 bg-gradient-to-br ${config.gradient} bg-clip-text`} style={{color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}} />
                          <IconComponent className={`w-8 h-8 absolute text-slate-700`} />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-4">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                        {addon.name}
                      </h3>
                      
                      <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
                        {addon.description}
                      </p>

                      {/* Features Preview */}
                      <div className={`bg-gradient-to-br ${config.lightBg} rounded-xl p-4 mb-6`}>
                        <ul className="space-y-2">
                          {(addon.highlights || ['Professioneel', 'Gebruiksvriendelijk', 'Multi-valuta']).slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="line-clamp-1">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Price */}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-slate-900">
                              {formatCurrency(getPrice(addon)).replace('SRD ', '')}
                            </span>
                            <span className="text-slate-400 font-medium">SRD</span>
                          </div>
                          <p className="text-slate-500 text-sm">per {isYearly ? 'jaar' : 'maand'}</p>
                        </div>
                        
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          className={`transition-all duration-300 ${
                            isSelected 
                              ? `bg-gradient-to-r ${config.gradient} text-white border-0 shadow-lg ${config.shadow}` 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/modules/${addon.slug}`);
                          }}
                        >
                          Details
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
            <Rocket className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-white/90 font-medium">Start binnen 2 minuten</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Klaar om te Beginnen?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Probeer alle modules 3 dagen gratis. Geen creditcard nodig, 
            geen verplichtingen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => {
                if (selectedAddons.length === 0 && paidAddons.length > 0) {
                  setSelectedAddons([paidAddons[0].id]);
                }
                setOrderDialogOpen(true);
              }}
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl shadow-white/20 px-10 py-6 text-lg font-semibold"
            >
              Start Gratis Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/contact')}
              className="border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              Neem Contact Op
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} />

      {/* Order Dialog - Premium Design */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
            <DialogTitle className="text-2xl font-bold mb-2">Account Aanmaken</DialogTitle>
            <DialogDescription className="text-emerald-100">
              {selectedAddons.length} module{selectedAddons.length > 1 ? 's' : ''} • {formatCurrency(getTotalPrice())}/{isYearly ? 'jaar' : 'maand'}
            </DialogDescription>
          </div>
          
          <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-medium">Naam *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={orderForm.name}
                    onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                    className="pl-10"
                    placeholder="Uw naam"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Bedrijfsnaam *</Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={orderForm.company_name}
                    onChange={(e) => setOrderForm({...orderForm, company_name: e.target.value})}
                    className="pl-10"
                    placeholder="Bedrijf N.V."
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-slate-700 font-medium">E-mailadres *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="email"
                  value={orderForm.email}
                  onChange={(e) => setOrderForm({...orderForm, email: e.target.value})}
                  className="pl-10"
                  placeholder="email@bedrijf.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label className="text-slate-700 font-medium">Telefoon</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="tel"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
                  className="pl-10"
                  placeholder="+597 ..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-medium">Wachtwoord *</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="password"
                    value={orderForm.password}
                    onChange={(e) => setOrderForm({...orderForm, password: e.target.value})}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Bevestig *</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="password"
                    value={orderForm.password_confirm}
                    onChange={(e) => setOrderForm({...orderForm, password_confirm: e.target.value})}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Betaalmethode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'trial', label: '3 Dagen Gratis', icon: Gift, color: 'emerald' },
                  { id: 'mope', label: 'Mope', icon: CreditCard, color: 'blue' },
                  { id: 'bank', label: 'Bank', icon: Building2, color: 'slate' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      paymentMethod === method.id
                        ? `border-${method.color}-500 bg-${method.color}-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <method.icon className={`w-6 h-6 mx-auto mb-2 ${
                      paymentMethod === method.id ? `text-${method.color}-600` : 'text-slate-400'
                    }`} />
                    <p className={`text-xs font-medium ${
                      paymentMethod === method.id ? `text-${method.color}-700` : 'text-slate-600'
                    }`}>{method.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6 text-lg font-semibold shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Even geduld...
                </>
              ) : (
                <>
                  Account Aanmaken
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>

      {/* Add shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
