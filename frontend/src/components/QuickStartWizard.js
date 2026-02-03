import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  FileText, 
  Building2,
  CreditCard,
  ArrowRight,
  Check,
  ChevronRight,
  Rocket,
  BarChart3,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const quickStartSteps = [
  {
    id: 'welcome',
    title: 'Welkom bij Facturatie.sr!',
    description: 'Laten we u helpen om snel aan de slag te gaan met uw gratis boekhouding.',
    icon: Sparkles,
    color: 'emerald'
  },
  {
    id: 'grootboek',
    title: 'Stap 1: Grootboek Inrichten',
    description: 'Het grootboek is de basis van uw administratie. Hier worden alle rekeningen bijgehouden.',
    icon: BookOpen,
    color: 'blue',
    action: '/app/boekhouding/grootboek',
    actionLabel: 'Naar Grootboek'
  },
  {
    id: 'debiteuren',
    title: 'Stap 2: Debiteuren Toevoegen',
    description: 'Voeg uw klanten toe als debiteuren. Zo kunt u facturen maken en betalingen bijhouden.',
    icon: Users,
    color: 'purple',
    action: '/app/boekhouding/debiteuren',
    actionLabel: 'Debiteuren Beheren'
  },
  {
    id: 'crediteuren',
    title: 'Stap 3: Crediteuren Toevoegen',
    description: 'Voeg uw leveranciers toe als crediteuren voor een compleet overzicht van uw kosten.',
    icon: Building2,
    color: 'orange',
    action: '/app/boekhouding/crediteuren',
    actionLabel: 'Crediteuren Beheren'
  },
  {
    id: 'facturen',
    title: 'Stap 4: Eerste Factuur Maken',
    description: 'Maak uw eerste verkoopfactuur aan en verstuur deze naar uw klant.',
    icon: FileText,
    color: 'teal',
    action: '/app/boekhouding/verkoopfacturen',
    actionLabel: 'Factuur Maken'
  },
  {
    id: 'bank',
    title: 'Stap 5: Bankrekeningen Koppelen',
    description: 'Voeg uw bankrekeningen toe voor een compleet financieel overzicht.',
    icon: CreditCard,
    color: 'indigo',
    action: '/app/boekhouding/bankrekeningen',
    actionLabel: 'Bankrekeningen'
  },
  {
    id: 'done',
    title: 'Klaar om te beginnen!',
    description: 'U bent helemaal klaar. Bekijk uw dashboard voor een overzicht van uw financiën.',
    icon: Rocket,
    color: 'emerald'
  }
];

export default function QuickStartWizard({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const step = quickStartSteps[currentStep];
  const progress = Math.round((currentStep / (quickStartSteps.length - 1)) * 100);

  const handleNext = () => {
    if (currentStep < quickStartSteps.length - 1) {
      if (!completedSteps.includes(step.id)) {
        setCompletedSteps([...completedSteps, step.id]);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (step.action) {
      // Mark as completed and navigate
      if (!completedSteps.includes(step.id)) {
        setCompletedSteps([...completedSteps, step.id]);
      }
      onOpenChange(false);
      navigate(step.action);
    }
  };

  const handleFinish = () => {
    // Save that user has completed the wizard
    localStorage.setItem('quickStartCompleted', 'true');
    onOpenChange(false);
    navigate('/app/boekhouding');
  };

  const handleSkip = () => {
    localStorage.setItem('quickStartCompleted', 'true');
    onOpenChange(false);
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-500 text-white',
      blue: 'bg-blue-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      teal: 'bg-teal-500 text-white',
      indigo: 'bg-indigo-500 text-white'
    };
    return colors[color] || colors.emerald;
  };

  const getBgClasses = (color) => {
    const colors = {
      emerald: 'from-emerald-500/20 to-emerald-600/10',
      blue: 'from-blue-500/20 to-blue-600/10',
      purple: 'from-purple-500/20 to-purple-600/10',
      orange: 'from-orange-500/20 to-orange-600/10',
      teal: 'from-teal-500/20 to-teal-600/10',
      indigo: 'from-indigo-500/20 to-indigo-600/10'
    };
    return colors[color] || colors.emerald;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${getColorClasses(step.color)} flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{step.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Stap {currentStep + 1} van {quickStartSteps.length}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSkip}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Step Content */}
          <div className={`rounded-2xl bg-gradient-to-br ${getBgClasses(step.color)} p-6 mb-6`}>
            <p className="text-lg leading-relaxed">{step.description}</p>
            
            {step.id === 'welcome' && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Gratis boekhouding</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Multi-valuta (SRD, USD, EUR)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Facturen maken</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Rapportages</span>
                </div>
              </div>
            )}

            {step.id === 'done' && (
              <div className="mt-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Welkom, {user?.name?.split(' ')[0] || 'gebruiker'}!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Uw gratis boekhouding is klaar voor gebruik.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {quickStartSteps.map((s, index) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-primary' 
                    : completedSteps.includes(s.id)
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button 
              variant="ghost" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Vorige
            </Button>
            
            <div className="flex gap-2">
              {step.action && (
                <Button 
                  variant="outline"
                  onClick={handleAction}
                >
                  {step.actionLabel}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              
              {step.id === 'done' ? (
                <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-700">
                  <Rocket className="w-4 h-4 mr-2" />
                  Beginnen
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Volgende
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
