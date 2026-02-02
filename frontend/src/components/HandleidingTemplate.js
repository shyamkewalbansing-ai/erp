import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function HandleidingTemplate({ 
  moduleName, 
  moduleIcon: ModuleIcon, 
  moduleColor = 'emerald',
  introduction,
  steps,
  tips = [],
  warnings = []
}) {
  const [expandedStep, setExpandedStep] = useState(null);

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600'
    },
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-indigo-600'
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-red-600'
    },
    pink: {
      bg: 'bg-pink-500',
      bgLight: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      gradient: 'from-pink-500 to-rose-600'
    },
    amber: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      gradient: 'from-amber-500 to-orange-600'
    }
  };

  const colors = colorClasses[moduleColor] || colorClasses.emerald;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.gradient} rounded-2xl p-8 text-white`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            {ModuleIcon && <ModuleIcon className="w-8 h-8 text-white" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Handleiding {moduleName}</h1>
            <p className="text-white/80">Stap-voor-stap uitleg hoe het systeem werkt</p>
          </div>
        </div>
        {introduction && (
          <p className="text-white/90 text-lg max-w-3xl">{introduction}</p>
        )}
      </div>

      {/* Quick Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className={`w-5 h-5 ${colors.text}`} />
            Overzicht
          </CardTitle>
          <CardDescription>
            Deze handleiding bevat {steps.length} stappen om u te helpen met {moduleName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.slice(0, 4).map((step, index) => (
              <button
                key={index}
                onClick={() => setExpandedStep(index)}
                className={`p-4 rounded-lg ${colors.bgLight} ${colors.border} border hover:shadow-md transition-all text-left`}
              >
                <div className={`w-8 h-8 ${colors.bg} text-white rounded-full flex items-center justify-center text-sm font-bold mb-2`}>
                  {index + 1}
                </div>
                <p className="font-medium text-sm text-gray-700 line-clamp-2">{step.title}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CheckCircle2 className={`w-6 h-6 ${colors.text}`} />
          Stappen
        </h2>
        
        {steps.map((step, index) => (
          <Card 
            key={index} 
            className={`transition-all ${expandedStep === index ? 'ring-2 ring-offset-2 ' + colors.border : ''}`}
          >
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setExpandedStep(expandedStep === index ? null : index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${colors.bg} text-white rounded-full flex items-center justify-center font-bold`}>
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    {step.subtitle && (
                      <CardDescription>{step.subtitle}</CardDescription>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {expandedStep === index ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {expandedStep === index && (
              <CardContent className="pt-0">
                <div className="pl-14 space-y-4">
                  <p className="text-gray-600">{step.description}</p>
                  
                  {step.substeps && step.substeps.length > 0 && (
                    <div className="space-y-3">
                      {step.substeps.map((substep, subIndex) => (
                        <div key={subIndex} className="flex items-start gap-3">
                          <div className={`w-6 h-6 ${colors.bgLight} ${colors.text} rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5`}>
                            {String.fromCharCode(97 + subIndex)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{substep.title}</p>
                            {substep.description && (
                              <p className="text-sm text-gray-500 mt-1">{substep.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.note && (
                    <div className={`${colors.bgLight} ${colors.border} border rounded-lg p-4 flex items-start gap-3`}>
                      <Lightbulb className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                      <p className="text-sm text-gray-700">{step.note}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Tips Section */}
      {tips.length > 0 && (
        <Card className={`${colors.bgLight} ${colors.border} border`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className={`w-5 h-5 ${colors.text}`} />
              Handige Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <ArrowRight className={`w-4 h-4 ${colors.text} flex-shrink-0 mt-1`} />
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              Let Op
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-1" />
                  <span className="text-amber-800">{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center py-8 text-gray-500">
        <p>Heeft u nog vragen? Neem contact op met onze support.</p>
      </div>
    </div>
  );
}
