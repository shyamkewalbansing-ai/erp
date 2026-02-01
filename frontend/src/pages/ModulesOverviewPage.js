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
  Shield
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module UI metadata with detail page slugs
const MODULE_UI_DATA = {
  'hrm': {
    icon: Users,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500',
    detailSlug: 'hrm',
    features: [
      'Personeelsbeheer met alle werknemergegevens',
      'Verlofaanvragen en goedkeuringsworkflow',
      'Aanwezigheidsregistratie met in/uitklokken',
      'Loonlijst en salarisadministratie'
    ]
  },
  'vastgoed_beheer': {
    icon: Building2,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500',
    detailSlug: 'vastgoed-beheer',
    features: [
      'Panden en units beheer',
      'Huurdersbeheer met contracten',
      'Automatische facturatie',
      'Huurders selfservice portal'
    ]
  },
  'autodealer': {
    icon: Car,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500',
    detailSlug: 'auto-dealer',
    features: [
      'Voertuigvoorraad beheer',
      'Verkoop- en aankoopregistratie',
      'Multi-valuta ondersteuning (SRD/EUR/USD)',
      'Klanten portal'
    ]
  },
  'ai-chatbot': {
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500',
    detailSlug: 'ai-chatbot',
    features: [
      'GPT-4 aangedreven conversaties',
      'Meertalige ondersteuning',
      '24/7 beschikbaarheid',
      'Aanpasbare antwoorden'
    ]
  },
  'cms': {
    icon: Globe,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-500',
    detailSlug: 'website-cms',
    features: [
      'Drag & drop pagina builder',
      'Menu en navigatie beheer',
      'SEO optimalisatie tools',
      'Media bibliotheek'
    ]
  },
  'rapportage': {
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500',
    detailSlug: 'rapportage',
    features: [
      'Real-time dashboards',
      'Exporteer naar PDF/Excel',
      'Automatische rapportages',
      'Visuele grafieken'
    ]
  },
  'multi-tenant': {
    icon: Shield,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500',
    detailSlug: 'multi-tenant',
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
  color: 'from-emerald-500 to-teal-500',
  bgColor: 'bg-emerald-500',
  detailSlug: null,
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
      navigate(`/module/${moduleUI.detailSlug}`);
    } else {
      navigate(`/faq#${addon.slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl"></div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 bg-emerald-100 text-emerald-700 border-emerald-200">
            <Sparkles className="w-4 h-4 mr-2" />
            Modulair Platform
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-slate-800">Onze </span>
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Modules</span>
          </h1>
          
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Kies alleen de modules die u nodig heeft. Van HRM tot vastgoedbeheer, 
            van autohandel tot AI-chatbot.
          </p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon, index) => {
              const moduleUI = getModuleUI(addon.slug);
              const IconComponent = moduleUI.icon;
              
              return (
                <div
                  key={addon.id}
                  className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Header with gradient */}
                  <div className={`relative h-28 bg-gradient-to-br ${moduleUI.color} p-5`}>
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
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
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
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Details Button */}
                    <Button 
                      className="w-full bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-all duration-300"
                      onClick={() => handleViewDetails(addon)}
                    >
                      Bekijk Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Interesse in een module?
              </h3>
              <p className="text-slate-600 mb-6">
                Neem contact met ons op voor meer informatie of probeer de demo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => navigate('/contact')}
                  className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-full shadow-lg shadow-emerald-200"
                >
                  Contact Opnemen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/demo')}
                  className="h-12 px-8 border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                >
                  Probeer Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
