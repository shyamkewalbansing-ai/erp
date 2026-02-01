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
  Star
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module UI metadata with detail page slugs
const MODULE_UI_DATA = {
  'hrm': {
    icon: Users,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
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
    color: 'teal',
    gradient: 'from-teal-500 to-emerald-600',
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
    color: 'green',
    gradient: 'from-emerald-600 to-green-500',
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
    color: 'cyan',
    gradient: 'from-teal-600 to-cyan-500',
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
    color: 'emerald',
    gradient: 'from-green-500 to-emerald-600',
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
    color: 'teal',
    gradient: 'from-cyan-500 to-teal-600',
    detailSlug: 'rapportage',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    features: [
      'Real-time dashboards',
      'Exporteer naar PDF/Excel',
      'Automatische rapportages',
      'Visuele grafieken'
    ]
  },
  'multi-tenant': {
    icon: Shield,
    color: 'slate',
    gradient: 'from-slate-500 to-slate-600',
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
  color: 'emerald',
  gradient: 'from-emerald-500 to-teal-600',
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
  const [activeModule, setActiveModule] = useState(null);

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

      {/* Hero Section - Same style as FAQ */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <Badge className="mb-6 bg-white/10 text-emerald-300 border-emerald-400/30">
            <Layers className="w-4 h-4 mr-2" />
            Modulair Platform
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Onze Modules
          </h1>
          
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Kies alleen de modules die u nodig heeft. Van HRM tot vastgoedbeheer, 
            van autohandel tot AI-chatbot. Elk bedrijf is uniek.
          </p>
        </div>
      </section>

      {/* Quick Filter Buttons */}
      <section className="py-8 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {addons.map((addon) => {
              const moduleUI = getModuleUI(addon.slug);
              const IconComponent = moduleUI.icon;
              return (
                <Button
                  key={addon.id}
                  variant={activeModule === addon.slug ? "default" : "outline"}
                  className={`rounded-full ${activeModule === addon.slug 
                    ? `bg-gradient-to-r ${moduleUI.gradient} text-white border-0` 
                    : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  onClick={() => setActiveModule(activeModule === addon.slug ? null : addon.slug)}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {addon.name}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Module Detail View */}
      {activeModule && (() => {
        const addon = addons.find(a => a.slug === activeModule);
        if (!addon) return null;
        const moduleUI = getModuleUI(addon.slug);
        const IconComponent = moduleUI.icon;
        
        return (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-12">
                {/* Module Header */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${moduleUI.gradient} text-white text-sm mb-4`}>
                      <IconComponent className="w-4 h-4" />
                      {addon.name}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">
                      {addon.description}
                    </h2>
                    <p className="text-lg text-slate-600 mb-6">
                      Ontdek alle functies en mogelijkheden van de {addon.name} module.
                      Klik op "Bekijk Alle Details" voor uitgebreide informatie met foto's.
                    </p>
                    <Button
                      size="lg"
                      className={`bg-gradient-to-r ${moduleUI.gradient} text-white rounded-full px-8`}
                      onClick={() => handleViewDetails(addon)}
                    >
                      Bekijk Alle Details
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                  <div className="relative">
                    <div className={`absolute -inset-4 bg-gradient-to-r ${moduleUI.gradient} rounded-3xl blur-2xl opacity-20`}></div>
                    <img
                      src={moduleUI.image}
                      alt={addon.name}
                      className="relative rounded-2xl shadow-2xl w-full h-72 object-cover"
                    />
                  </div>
                </div>

                {/* Features Grid */}
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-500" />
                    Hoofdfuncties
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {moduleUI.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-xl p-4 border border-slate-100"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${moduleUI.gradient} flex items-center justify-center flex-shrink-0`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* All Modules Grid */}
      <section className={`py-16 ${activeModule ? 'bg-slate-50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!activeModule && (
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Alle Beschikbare Modules
              </h2>
              <p className="text-lg text-slate-600">
                Klik op een module om meer details te zien
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon, index) => {
              const moduleUI = getModuleUI(addon.slug);
              const IconComponent = moduleUI.icon;
              const isActive = activeModule === addon.slug;
              
              return (
                <div
                  key={addon.id}
                  className={`group bg-white rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
                    isActive ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-100'
                  }`}
                  onClick={() => setActiveModule(activeModule === addon.slug ? null : addon.slug)}
                >
                  {/* Header with gradient */}
                  <div className={`relative h-32 bg-gradient-to-br ${moduleUI.gradient} p-5`}>
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    </div>
                    <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {addon.name}
                    </h3>
                    <p className="text-slate-500 text-sm mb-5 min-h-[40px]">
                      {addon.description}
                    </p>
                    
                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {moduleUI.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Details Button */}
                    <Button 
                      className={`w-full bg-gradient-to-r ${moduleUI.gradient} text-white hover:opacity-90`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(addon);
                      }}
                    >
                      Bekijk Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Interesse in onze modules?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Probeer alle modules gratis of neem contact met ons op voor meer informatie
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8"
              onClick={() => navigate('/demo')}
            >
              <Star className="w-5 h-5 mr-2" />
              Probeer Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-slate-200"
              onClick={() => navigate('/contact')}
            >
              Contact Opnemen
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
