import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Loader2, 
  Users, 
  Building2, 
  Car, 
  MessageSquare, 
  Globe,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Star,
  Zap,
  Clock,
  Headphones,
  CheckCircle,
  Scissors,
  Fuel,
  Gift,
  Receipt
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module UI metadata with detail page slugs
const MODULE_UI_DATA = {
  'hrm': {
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'from-blue-50 to-indigo-50',
    shadowColor: 'shadow-blue-200',
    detailSlug: 'hrm',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    features: [
      'Personeelsbeheer met alle werknemergegevens',
      'Verlofaanvragen en goedkeuringsworkflow',
      'Aanwezigheidsregistratie met in/uitklokken',
      'Loonlijst en salarisadministratie'
    ]
  },
  'vastgoed_beheer': {
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'from-emerald-50 to-teal-50',
    shadowColor: 'shadow-emerald-200',
    detailSlug: 'vastgoed-beheer',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    features: [
      'Panden en units beheer',
      'Huurdersbeheer met contracten',
      'Automatische facturatie',
      'Huurders selfservice portal'
    ]
  },
  'autodealer': {
    icon: Car,
    gradient: 'from-orange-500 to-red-600',
    lightBg: 'from-orange-50 to-red-50',
    shadowColor: 'shadow-orange-200',
    detailSlug: 'auto-dealer',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
    features: [
      'Voertuigvoorraad beheer',
      'Verkoop- en aankoopregistratie',
      'Multi-valuta ondersteuning (SRD/EUR/USD)',
      'Klanten portal'
    ]
  },
  'ai-chatbot': {
    icon: MessageSquare,
    gradient: 'from-purple-500 to-pink-600',
    lightBg: 'from-purple-50 to-pink-50',
    shadowColor: 'shadow-purple-200',
    detailSlug: 'ai-chatbot',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    features: [
      'GPT-4 aangedreven conversaties',
      'Meertalige ondersteuning',
      '24/7 beschikbaarheid',
      'Aanpasbare antwoorden'
    ]
  },
  'cms': {
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    lightBg: 'from-cyan-50 to-blue-50',
    shadowColor: 'shadow-cyan-200',
    detailSlug: 'website-cms',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80',
    features: [
      'Drag & drop pagina builder',
      'Menu en navigatie beheer',
      'SEO optimalisatie tools',
      'Media bibliotheek'
    ]
  },
  'rapportage': {
    icon: BarChart3,
    gradient: 'from-teal-500 to-emerald-600',
    lightBg: 'from-teal-50 to-emerald-50',
    shadowColor: 'shadow-teal-200',
    detailSlug: 'rapportage',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    features: [
      'Real-time dashboards',
      'Exporteer naar PDF/Excel',
      'Automatische rapportages',
      'Visuele grafieken'
    ]
  },
  'beauty': {
    icon: Scissors,
    gradient: 'from-pink-500 to-rose-600',
    lightBg: 'from-pink-50 to-rose-50',
    shadowColor: 'shadow-pink-200',
    detailSlug: 'beauty-spa',
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&q=80',
    features: [
      'Klantenbeheer (CRM) met huidtype & allergieën',
      'Afspraken & roosterbeheer',
      'Kassasysteem met Surinaamse betaalmethoden',
      'Walk-in wachtrij beheer'
    ]
  },
  'pompstation': {
    icon: Fuel,
    gradient: 'from-orange-500 to-amber-600',
    lightBg: 'from-orange-50 to-amber-50',
    shadowColor: 'shadow-orange-200',
    detailSlug: 'pompstation',
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80',
    features: [
      'Brandstoftank beheer & monitoring',
      'POS/Kassa met brandstof & winkel',
      'Diensten & personeelsbeheer',
      'Veiligheid & compliance tracking'
    ]
  },
  'boekhouding': {
    icon: BarChart3,
    gradient: 'from-emerald-500 to-green-600',
    lightBg: 'from-emerald-50 to-green-50',
    shadowColor: 'shadow-emerald-200',
    detailSlug: 'boekhouding',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    isFree: false,
    trialDays: 3,
    features: [
      'Multi-valuta: SRD, USD, EUR',
      'BTW-tarieven: 0%, 10%, 25%',
      'Debiteuren & Crediteuren',
      'Balans & Resultatenrekening'
    ]
  },
  'suribet': {
    icon: Receipt,
    gradient: 'from-green-500 to-emerald-600',
    lightBg: 'from-green-50 to-emerald-50',
    shadowColor: 'shadow-green-200',
    detailSlug: 'suribet',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    features: [
      'Dagstaten per machine',
      'Kasboek administratie',
      'Werknemersbeheer',
      'Loonuitbetalingen'
    ]
  },
  'multi-tenant': {
    icon: Shield,
    gradient: 'from-slate-500 to-slate-700',
    lightBg: 'from-slate-50 to-gray-50',
    shadowColor: 'shadow-slate-200',
    detailSlug: 'multi-tenant',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    features: [
      'Eigen workspace omgeving',
      'Custom branding',
      'Gebruikersbeheer',
      'Data isolatie'
    ]
  }
};

const DEFAULT_UI = {
  icon: Sparkles,
  gradient: 'from-emerald-500 to-teal-600',
  lightBg: 'from-emerald-50 to-teal-50',
  shadowColor: 'shadow-emerald-200',
  detailSlug: null,
  image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  features: ['Volledige functionaliteit', 'Professionele ondersteuning', 'Regelmatige updates']
};

const getModuleUI = (slug) => {
  return MODULE_UI_DATA[slug] || MODULE_UI_DATA[slug?.replace('-', '_')] || DEFAULT_UI;
};

export default function ModulesOverviewPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredModule, setHoveredModule] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, addonsRes] = await Promise.all([
        api.get('/public/landing/settings').catch(() => ({ data: {} })),
        api.get('/public/addons').catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data || {});
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (addon) => {
    const moduleUI = getModuleUI(addon.slug);
    if (moduleUI.detailSlug) {
      navigate(`/modules/${moduleUI.detailSlug}`);
    } else {
      navigate(`/faq#${addon.slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-500/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-40 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30 px-4 py-2">
            <Layers className="w-4 h-4 mr-2" />
            Modulair Platform
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Krachtige{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Modules
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Kies alleen de modules die u nodig heeft. Van HRM tot vastgoedbeheer, 
            van autohandel tot AI-chatbot. Elk bedrijf is uniek.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { value: '6+', label: 'Modules', icon: Layers },
              { value: '24/7', label: 'Support', icon: Headphones },
              { value: '99.9%', label: 'Uptime', icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
                <stat.icon className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-20 -mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addons.map((addon, index) => {
              const moduleUI = getModuleUI(addon.slug);
              const IconComponent = moduleUI.icon;
              const isHovered = hoveredModule === addon.id;
              const isPopular = index === 0;
              
              return (
                <div
                  key={addon.id}
                  className="group relative"
                  onMouseEnter={() => setHoveredModule(addon.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${moduleUI.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-all duration-500`}></div>
                  
                  {/* Card */}
                  <div className={`relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2`}>
                    {/* Image Header */}
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={moduleUI.image} 
                        alt={addon.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${moduleUI.gradient} opacity-80`}></div>
                      
                      {/* Icon */}
                      <div className="absolute bottom-4 left-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-amber-400 text-amber-900 border-0 shadow-lg px-3 py-1">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Populair
                          </Badge>
                        </div>
                      )}
                      
                      {/* Free Badge */}
                      {(addon.price === 0 || addon.is_free || moduleUI.isFree) && (
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-emerald-500 text-white border-0 shadow-lg px-3 py-1">
                            <Gift className="w-3 h-3 mr-1" />
                            GRATIS
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                        {addon.name}
                      </h3>
                      
                      <p className="text-slate-500 text-sm mb-5 line-clamp-2 min-h-[40px]">
                        {addon.description}
                      </p>
                      
                      {/* Features */}
                      <div className={`bg-gradient-to-br ${moduleUI.lightBg} rounded-xl p-4 mb-5`}>
                        <ul className="space-y-2">
                          {moduleUI.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Button */}
                      <Button 
                        className={`w-full h-12 bg-gradient-to-r ${moduleUI.gradient} text-white hover:opacity-90 shadow-lg ${moduleUI.shadowColor} font-semibold`}
                        onClick={() => handleViewDetails(addon)}
                      >
                        Bekijk Details
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Voordelen
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Waarom onze modules?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Alles wat u nodig heeft voor uw bedrijf, in één platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Layers, title: 'Modulair', desc: 'Betaal alleen voor wat u gebruikt', color: 'from-emerald-400 to-teal-500' },
              { icon: Zap, title: 'Snel & Modern', desc: 'Gebouwd met nieuwste technologie', color: 'from-teal-400 to-cyan-500' },
              { icon: Shield, title: 'Veilig', desc: 'Enterprise-grade beveiliging', color: 'from-cyan-400 to-blue-500' },
              { icon: Clock, title: 'Altijd Updates', desc: 'Gratis nieuwe functies', color: 'from-blue-400 to-indigo-500' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all group">
                <div className={`w-14 h-14 mb-4 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Klaar om te starten?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
              Probeer alle modules gratis met onze demo account of neem contact met ons op voor meer informatie
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all"
                onClick={() => navigate('/demo')}
              >
                <Star className="w-5 h-5 mr-2" />
                Probeer Demo
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="h-14 px-8 rounded-full border-slate-300 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => navigate('/contact')}
              >
                Contact Opnemen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
