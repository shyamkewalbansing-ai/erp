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
  ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

// Module UI metadata
const MODULE_UI_DATA = {
  'hrm': {
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500',
    features: [
      'Personeelsbeheer met alle werknemergegevens',
      'Verlofaanvragen en goedkeuringsworkflow',
      'Aanwezigheidsregistratie met in/uitklokken',
      'Loonlijst en salarisadministratie'
    ]
  },
  'vastgoed_beheer': {
    icon: Building2,
    color: 'from-teal-500 to-emerald-600',
    bgColor: 'bg-teal-500',
    features: [
      'Panden en units beheer',
      'Huurdersbeheer met contracten',
      'Automatische facturatie',
      'Huurders selfservice portal'
    ]
  },
  'autodealer': {
    icon: Car,
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500',
    features: [
      'Voertuigvoorraad beheer',
      'Verkoop- en aankoopregistratie',
      'Multi-valuta ondersteuning (SRD/EUR/USD)',
      'Klanten portal'
    ]
  },
  'ai-chatbot': {
    icon: MessageSquare,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500',
    features: [
      'GPT-4 aangedreven conversaties',
      'Meertalige ondersteuning',
      '24/7 beschikbaarheid',
      'Aanpasbare antwoorden'
    ]
  },
  'cms': {
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-500',
    features: [
      'Drag & drop pagina builder',
      'Menu en navigatie beheer',
      'SEO optimalisatie tools',
      'Media bibliotheek'
    ]
  },
  'rapportage': {
    icon: BarChart3,
    color: 'from-orange-500 to-red-600',
    bgColor: 'bg-orange-500',
    features: [
      'Real-time dashboards',
      'Exporteer naar PDF/Excel',
      'Automatische rapportages',
      'Visuele grafieken'
    ]
  }
};

const DEFAULT_UI = {
  icon: Sparkles,
  color: 'from-emerald-500 to-teal-600',
  bgColor: 'bg-emerald-500',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Hero Section */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Sparkles className="w-4 h-4 mr-2" />
            Modulair Platform
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-white">Onze </span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Modules</span>
          </h1>
          
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
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
                  className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className={`relative h-24 bg-gradient-to-br ${moduleUI.color} p-5`}>
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                    <div className="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {addon.name}
                    </h3>
                    <p className="text-slate-400 text-sm mb-5 min-h-[40px]">
                      {addon.description}
                    </p>
                    
                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {moduleUI.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Details Button */}
                    <Button 
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => navigate(`/faq#${addon.slug}`)}
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
            <p className="text-slate-400 mb-6">
              Interesse in een module? Neem contact met ons op.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/contact')}
                className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full"
              >
                Contact Opnemen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/demo')}
                className="h-12 px-8 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 rounded-full"
              >
                Probeer Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter logoUrl={settings?.logo_url} companyName={settings?.company_name} />
    </div>
  );
}
