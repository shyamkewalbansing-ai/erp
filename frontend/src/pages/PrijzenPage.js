import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  X,
  Infinity,
  Headphones,
  BadgeCheck,
  Gem,
  Award
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

const ChatWidget = lazy(() => import('../components/ChatWidget'));
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Perfect voor startende ondernemers',
    icon: Rocket,
    monthlyPrice: 0,
    yearlyPrice: 0,
    gradient: 'from-slate-600 to-slate-800',
    lightGradient: 'from-slate-50 to-gray-100',
    borderColor: 'border-slate-200',
    accentColor: 'slate',
    popular: false,
    features: [
      { text: '1 Gratis Module (Boekhouding)', included: true },
      { text: 'Maximaal 50 facturen/maand', included: true },
      { text: 'Basis rapportages', included: true },
      { text: 'E-mail support', included: true },
      { text: 'Multi-valuta (SRD, USD, EUR)', included: true },
      { text: 'Premium modules', included: false },
      { text: 'Onbeperkte facturen', included: false },
      { text: 'Prioriteit support', included: false },
    ],
    cta: 'Gratis Starten',
    ctaVariant: 'outline'
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'Voor groeiende bedrijven',
    icon: Crown,
    monthlyPrice: 4500,
    yearlyPrice: 45000,
    gradient: 'from-emerald-500 to-teal-600',
    lightGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-300',
    accentColor: 'emerald',
    popular: true,
    features: [
      { text: 'Alle Starter features', included: true },
      { text: '3 Premium modules naar keuze', included: true, highlight: true },
      { text: 'Onbeperkte facturen', included: true },
      { text: 'Geavanceerde rapportages', included: true },
      { text: 'API toegang', included: true },
      { text: 'Prioriteit e-mail support', included: true },
      { text: 'Maandelijkse backup', included: true },
      { text: 'Dedicated account manager', included: false },
    ],
    cta: 'Start 3 Dagen Gratis',
    ctaVariant: 'default'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Voor grote ondernemingen',
    icon: Gem,
    monthlyPrice: 12500,
    yearlyPrice: 125000,
    gradient: 'from-violet-600 to-purple-700',
    lightGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-300',
    accentColor: 'violet',
    popular: false,
    features: [
      { text: 'Alle Professional features', included: true },
      { text: 'Onbeperkte modules', included: true, highlight: true },
      { text: 'Dedicated account manager', included: true },
      { text: '24/7 Telefonische support', included: true },
      { text: 'Custom integraties', included: true },
      { text: 'On-premise optie beschikbaar', included: true },
      { text: 'SLA garantie 99.9% uptime', included: true },
      { text: 'Training & onboarding', included: true },
    ],
    cta: 'Contact Sales',
    ctaVariant: 'default'
  }
];

// Module icons mapping
const MODULE_CONFIG = {
  'hrm': { icon: Users, gradient: 'from-blue-500 to-indigo-600', lightBg: 'from-blue-50 to-indigo-50', shadow: 'shadow-blue-200' },
  'vastgoed_beheer': { icon: Building2, gradient: 'from-purple-500 to-violet-600', lightBg: 'from-purple-50 to-violet-50', shadow: 'shadow-purple-200' },
  'autodealer': { icon: Car, gradient: 'from-orange-500 to-red-600', lightBg: 'from-orange-50 to-red-50', shadow: 'shadow-orange-200' },
  'ai-chatbot': { icon: MessageSquare, gradient: 'from-pink-500 to-rose-600', lightBg: 'from-pink-50 to-rose-50', shadow: 'shadow-pink-200' },
  'chatbot': { icon: MessageSquare, gradient: 'from-pink-500 to-rose-600', lightBg: 'from-pink-50 to-rose-50', shadow: 'shadow-pink-200' },
  'boekhouding': { icon: Calculator, gradient: 'from-emerald-500 to-green-600', lightBg: 'from-emerald-50 to-green-50', shadow: 'shadow-emerald-200' },
  'pompstation': { icon: Fuel, gradient: 'from-amber-500 to-orange-600', lightBg: 'from-amber-50 to-orange-50', shadow: 'shadow-amber-200' },
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  
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
    if (amount === undefined || amount === null) return 'Prijs op aanvraag';
    if (amount === 0) return 'Gratis';
    return `SRD ${amount.toLocaleString('nl-NL')}`;
  };

  const getYearlySavings = (monthly, yearly) => {
    const regularYearly = monthly * 12;
    return regularYearly - yearly;
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    if (plan.id === 'enterprise') {
      navigate('/contact');
    } else {
      setOrderDialogOpen(true);
    }
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

    setSubmitting(true);
    
    try {
      const orderData = {
        name: orderForm.name,
        email: orderForm.email,
        phone: orderForm.phone || '',
        password: orderForm.password,
        company_name: orderForm.company_name,
        addon_ids: selectedAddons,
        message: `Plan: ${selectedPlan?.name || 'Starter'}, Betaling: ${isYearly ? 'Jaarlijks' : 'Maandelijks'}`
      };
      
      const response = await axios.post(`${API_URL}/public/orders`, orderData);
      
      if (response.data) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        toast.success('Account aangemaakt! U wordt doorgestuurd...');
        setOrderDialogOpen(false);
        
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

  const paidAddons = addons.filter(a => a.price > 0 && !a.is_free);

  return (
    <div className="min-h-screen bg-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
            Transparante Prijzen • Geen Verrassingen
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Kies het Plan dat{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                bij u Past
              </span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47.6667 2.16667 141 -2.4 199 5.5" stroke="url(#underline)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="underline" x1="1" y1="5.5" x2="199" y2="5.5">
                    <stop stopColor="#34D399"/>
                    <stop offset="0.5" stopColor="#2DD4BF"/>
                    <stop offset="1" stopColor="#22D3EE"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Begin gratis en upgrade wanneer u groeit. Alle plannen inclusief de gratis Boekhouding module.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <button 
              onClick={() => setIsYearly(false)}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                !isYearly 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Maandelijks
            </button>
            <button 
              onClick={() => setIsYearly(true)}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                isYearly 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Jaarlijks
              <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg">
                2 maanden gratis
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-20 -mt-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {SUBSCRIPTION_PLANS.map((plan, index) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const isHovered = hoveredPlan === plan.id;
              const IconComponent = plan.icon;
              const savings = isYearly ? getYearlySavings(plan.monthlyPrice, plan.yearlyPrice) : 0;
              
              return (
                <div
                  key={plan.id}
                  className={`relative group ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                      <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-full shadow-lg shadow-emerald-500/30">
                        <Star className="w-4 h-4 fill-white" />
                        MEEST POPULAIR
                      </div>
                    </div>
                  )}
                  
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${plan.gradient} rounded-3xl blur-xl transition-all duration-500 ${
                    plan.popular ? 'opacity-30' : isHovered ? 'opacity-20' : 'opacity-0'
                  }`}></div>
                  
                  {/* Card */}
                  <div className={`relative h-full bg-white rounded-3xl overflow-hidden transition-all duration-500 ${
                    plan.popular 
                      ? 'ring-2 ring-emerald-500 shadow-2xl shadow-emerald-500/10' 
                      : `border-2 ${plan.borderColor} hover:border-transparent hover:shadow-2xl`
                  } ${isHovered && !plan.popular ? 'shadow-2xl -translate-y-2' : ''}`}>
                    
                    {/* Header */}
                    <div className={`relative p-8 bg-gradient-to-br ${plan.lightGradient}`}>
                      {/* Decorative Circle */}
                      <div className={`absolute top-4 right-4 w-24 h-24 bg-gradient-to-br ${plan.gradient} rounded-full opacity-10 blur-2xl`}></div>
                      
                      <div className="relative">
                        {/* Icon */}
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} shadow-lg mb-5`}>
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        
                        {/* Plan Name */}
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                        <p className="text-slate-600 text-sm">{plan.subtitle}</p>
                        
                        {/* Price */}
                        <div className="mt-6">
                          {price === 0 ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-extrabold text-slate-900">Gratis</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-extrabold text-slate-900">
                                  {price.toLocaleString('nl-NL')}
                                </span>
                                <div className="text-slate-500">
                                  <span className="text-lg font-semibold">SRD</span>
                                  <span className="text-sm">/{isYearly ? 'jaar' : 'maand'}</span>
                                </div>
                              </div>
                              {isYearly && savings > 0 && (
                                <p className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-1">
                                  <Gift className="w-4 h-4" />
                                  U bespaart {formatCurrency(savings)} per jaar
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="p-8 pt-6">
                      <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                              feature.included 
                                ? feature.highlight 
                                  ? `bg-gradient-to-br ${plan.gradient}` 
                                  : 'bg-emerald-100'
                                : 'bg-slate-100'
                            }`}>
                              {feature.included ? (
                                <Check className={`w-3 h-3 ${feature.highlight ? 'text-white' : 'text-emerald-600'}`} strokeWidth={3} />
                              ) : (
                                <X className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <span className={`text-sm ${
                              feature.included 
                                ? feature.highlight 
                                  ? 'text-slate-900 font-semibold' 
                                  : 'text-slate-700'
                                : 'text-slate-400'
                            }`}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* CTA Button */}
                      <div className="mt-8">
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full py-6 text-base font-semibold transition-all duration-300 ${
                            plan.popular
                              ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white shadow-lg shadow-emerald-500/25`
                              : plan.ctaVariant === 'outline'
                                ? 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                : `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white`
                          }`}
                        >
                          {plan.cta}
                          <ArrowRight className="w-5 h-5 ml-2" />
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

      {/* Features Comparison */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Wat zit er in elk plan?</h2>
            <p className="text-slate-600">Een overzicht van alle features per abonnement</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left p-6 font-semibold text-slate-700">Feature</th>
                    {SUBSCRIPTION_PLANS.map(plan => (
                      <th key={plan.id} className="p-6 text-center">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-sm font-semibold`}>
                          <plan.icon className="w-4 h-4" />
                          {plan.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Gratis Boekhouding Module', starter: true, professional: true, enterprise: true },
                    { name: 'Facturen per maand', starter: '50', professional: 'Onbeperkt', enterprise: 'Onbeperkt' },
                    { name: 'Premium Modules', starter: false, professional: '3 modules', enterprise: 'Onbeperkt' },
                    { name: 'Multi-valuta Support', starter: true, professional: true, enterprise: true },
                    { name: 'API Toegang', starter: false, professional: true, enterprise: true },
                    { name: 'Geavanceerde Rapportages', starter: false, professional: true, enterprise: true },
                    { name: 'Prioriteit Support', starter: false, professional: true, enterprise: true },
                    { name: 'Dedicated Account Manager', starter: false, professional: false, enterprise: true },
                    { name: '24/7 Telefonische Support', starter: false, professional: false, enterprise: true },
                    { name: 'Custom Integraties', starter: false, professional: false, enterprise: true },
                    { name: 'SLA Garantie', starter: false, professional: false, enterprise: '99.9%' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 text-slate-700 font-medium">{row.name}</td>
                      {['starter', 'professional', 'enterprise'].map(plan => (
                        <td key={plan} className="p-5 text-center">
                          {typeof row[plan] === 'boolean' ? (
                            row[plan] ? (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                                <Check className="w-5 h-5 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                                <X className="w-5 h-5 text-slate-400" />
                              </div>
                            )
                          ) : (
                            <span className="text-slate-900 font-semibold">{row[plan]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Modules Section */}
      {paidAddons.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200 px-4 py-2">
                <Puzzle className="w-4 h-4 mr-2" />
                Premium Modules
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Breid uit met Premium Modules
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Kies de modules die bij uw bedrijf passen. Beschikbaar vanaf het Professional plan.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paidAddons.slice(0, 8).map((addon) => {
                const config = getModuleConfig(addon.slug);
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={addon.id}
                    onClick={() => navigate(`/modules/${addon.slug}`)}
                    className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200 hover:border-transparent hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 shadow-lg ${config.shadow} group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {addon.name}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{addon.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(addon.price)}
                        <span className="text-sm font-normal text-slate-500">/mnd</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-center mt-10">
              <Button
                variant="outline"
                onClick={() => navigate('/modules')}
                className="px-8"
              >
                Bekijk Alle Modules
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Trust Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Shield, label: 'SSL Beveiligd', sublabel: 'Bank-niveau encryptie' },
              { icon: Clock, label: '99.9% Uptime', sublabel: 'Betrouwbare service' },
              { icon: Headphones, label: 'Surinaamse Support', sublabel: 'Lokaal team' },
              { icon: Gift, label: '3 Dagen Gratis', sublabel: 'Geen creditcard nodig' },
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <item.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{item.label}</h3>
                <p className="text-slate-400 text-sm">{item.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl font-bold text-white mb-6">
            Klaar om te Beginnen?
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Start vandaag nog gratis en ontdek hoe Facturatie.sr uw bedrijf kan helpen groeien.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => handleSelectPlan(SUBSCRIPTION_PLANS[0])}
              className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl px-10 py-6 text-lg font-semibold"
            >
              Gratis Account Aanmaken
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/contact')}
              className="border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              Bel Ons: +597 123 4567
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} />

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className={`bg-gradient-to-br ${selectedPlan?.gradient || 'from-emerald-600 to-teal-700'} p-6 text-white`}>
            <DialogTitle className="text-2xl font-bold mb-2">
              {selectedPlan?.name || 'Starter'} Plan
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {selectedPlan?.monthlyPrice === 0 
                ? 'Gratis account aanmaken' 
                : `${formatCurrency(isYearly ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice)} per ${isYearly ? 'jaar' : 'maand'}`
              }
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

            {/* Included Features */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Inbegrepen bij uw plan:</p>
              <div className="flex flex-wrap gap-2">
                {selectedPlan?.features.filter(f => f.included).slice(0, 4).map((feature, i) => (
                  <Badge key={i} variant="secondary" className="bg-white text-emerald-700 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    {feature.text.split(' ').slice(0, 3).join(' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className={`w-full bg-gradient-to-r ${selectedPlan?.gradient || 'from-emerald-600 to-teal-600'} hover:opacity-90 text-white py-6 text-lg font-semibold shadow-lg`}
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
            
            <p className="text-center text-xs text-slate-500">
              Door te registreren gaat u akkoord met onze voorwaarden en privacybeleid.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
