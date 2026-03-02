import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { btwAPI, reportsAPI } from '../../lib/boekhoudingApi';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  Download,
  FileText,
  Calculator,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Printer,
  Eye,
  RefreshCw,
  Building2
} from 'lucide-react';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  if (currency === 'USD') return `$ ${formatted}`;
  if (currency === 'EUR') return `€ ${formatted}`;
  return `SRD ${formatted}`;
};

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

// Step Indicator
const StepIndicator = ({ step, currentStep, label }) => {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isComplete ? 'bg-emerald-600 text-white' :
        isActive ? 'bg-emerald-600 text-white' :
        'bg-gray-200 text-gray-500'
      }`}>
        {isComplete ? <CheckCircle className="w-5 h-5" /> : step}
      </div>
      <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
};

const NieuweBTWAangiftePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedQuarter, setSelectedQuarter] = useState('Q4');
  const [aangifteData, setAangifteData] = useState(null);

  // Periodes mapping
  const periodeLabels = {
    'Q1': 'Januari - Maart',
    'Q2': 'April - Juni', 
    'Q3': 'Juli - September',
    'Q4': 'Oktober - December'
  };

  const handleGenerateAangifte = async () => {
    setGenerating(true);
    try {
      // Simulate API call to generate BTW report
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data - in real app this would come from API
      setAangifteData({
        periode: `${selectedQuarter} ${selectedYear}`,
        maanden: periodeLabels[selectedQuarter],
        generated_at: new Date().toISOString(),
        bedrijf: {
          naam: 'Demo Bedrijf N.V.',
          btw_nummer: 'BTW-SR-123456',
          adres: 'Domineestraat 1, Paramaribo'
        },
        verkoop: {
          totaal_excl: 250000,
          btw_10: 15000,
          btw_25: 10000,
          totaal_btw: 25000
        },
        inkoop: {
          totaal_excl: 180000,
          btw_10: 10800,
          btw_25: 7200,
          totaal_btw: 18000
        },
        saldo: {
          te_betalen: 7000,
          te_vorderen: 0
        },
        transacties: {
          verkoop_facturen: 45,
          inkoop_facturen: 32
        }
      });
      
      setCurrentStep(2);
      toast.success('BTW-aangifte succesvol gegenereerd');
    } catch (error) {
      toast.error('Fout bij genereren aangifte');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    toast.success('BTW-aangifte wordt gedownload als PDF');
    // In real app, this would trigger PDF download
    setCurrentStep(3);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Afdrukvenster geopend');
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="nieuwe-btw-aangifte-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">BTW Administratie</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/boekhouding/btw')}
            className="rounded-lg text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar overzicht
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <TabButton active={currentStep === 1} onClick={() => currentStep > 1 && setCurrentStep(1)}>
            1. Periode Selecteren
          </TabButton>
          <TabButton active={currentStep === 2} onClick={() => currentStep > 2 && setCurrentStep(2)}>
            2. Aangifte Bekijken
          </TabButton>
          <TabButton active={currentStep === 3} onClick={() => {}}>
            3. Downloaden & Indienen
          </TabButton>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl">
          <StepIndicator step={1} currentStep={currentStep} label="Periode selecteren" />
          <div className="flex-1 h-px bg-gray-200 mx-4"></div>
          <StepIndicator step={2} currentStep={currentStep} label="Aangifte bekijken" />
          <div className="flex-1 h-px bg-gray-200 mx-4"></div>
          <StepIndicator step={3} currentStep={currentStep} label="Downloaden" />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Let op:</strong> In Suriname is digitale indiening nog niet mogelijk. 
            Genereer uw aangifte, download de PDF en dien deze handmatig in bij de Belastingdienst.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Step 1: Periode Selecteren */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">Selecteer Periode</h2>
                    <p className="text-sm text-gray-500">Kies het boekjaar en kwartaal voor de BTW-aangifte</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Boekjaar</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Kwartaal</Label>
                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q1">Q1 - Januari t/m Maart</SelectItem>
                        <SelectItem value="Q2">Q2 - April t/m Juni</SelectItem>
                        <SelectItem value="Q3">Q3 - Juli t/m September</SelectItem>
                        <SelectItem value="Q4">Q4 - Oktober t/m December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Geselecteerde periode:</strong> {selectedQuarter} {selectedYear} ({periodeLabels[selectedQuarter]})
                  </p>
                </div>
              </CardContent>

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                <Button 
                  onClick={handleGenerateAangifte}
                  disabled={generating}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4 mr-2" />
                  )}
                  Aangifte Genereren
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Aangifte Bekijken */}
        {currentStep === 2 && aangifteData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Aangifte Header */}
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-white" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">BTW-aangifte {aangifteData.periode}</h2>
                      <p className="text-sm text-emerald-100">{aangifteData.maanden}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Eye className="w-4 h-4 mr-2" />
                      Voorbeeld
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Herberekenen
                    </Button>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Bedrijfsgegevens */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Bedrijfsgegevens</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Bedrijfsnaam</p>
                      <p className="text-sm font-medium text-gray-900">{aangifteData.bedrijf.naam}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">BTW-nummer</p>
                      <p className="text-sm font-medium text-gray-900">{aangifteData.bedrijf.btw_nummer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Adres</p>
                      <p className="text-sm font-medium text-gray-900">{aangifteData.bedrijf.adres}</p>
                    </div>
                  </div>
                </div>

                {/* BTW Overzicht */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Verkoop BTW */}
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800">BTW op Verkopen (Afdracht)</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-emerald-200">
                          <td className="py-2 text-gray-600">Totaal verkopen excl. BTW</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.verkoop.totaal_excl)}</td>
                        </tr>
                        <tr className="border-b border-emerald-200">
                          <td className="py-2 text-gray-600">BTW 10%</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.verkoop.btw_10)}</td>
                        </tr>
                        <tr className="border-b border-emerald-200">
                          <td className="py-2 text-gray-600">BTW 25%</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.verkoop.btw_25)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold text-emerald-800">Totaal BTW Verkoop</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(aangifteData.verkoop.totaal_btw)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Inkoop BTW */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">BTW op Inkopen (Voorheffing)</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-blue-200">
                          <td className="py-2 text-gray-600">Totaal inkopen excl. BTW</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.inkoop.totaal_excl)}</td>
                        </tr>
                        <tr className="border-b border-blue-200">
                          <td className="py-2 text-gray-600">BTW 10%</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.inkoop.btw_10)}</td>
                        </tr>
                        <tr className="border-b border-blue-200">
                          <td className="py-2 text-gray-600">BTW 25%</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(aangifteData.inkoop.btw_25)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold text-blue-800">Totaal BTW Inkoop</td>
                          <td className="py-2 text-right font-bold text-blue-600">{formatCurrency(aangifteData.inkoop.totaal_btw)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Saldo */}
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">BTW Saldo (Te betalen aan Belastingdienst)</span>
                    </div>
                    <span className="text-2xl font-bold text-amber-600">{formatCurrency(aangifteData.saldo.te_betalen)}</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Berekening: BTW Verkoop ({formatCurrency(aangifteData.verkoop.totaal_btw)}) - BTW Inkoop ({formatCurrency(aangifteData.inkoop.totaal_btw)}) = {formatCurrency(aangifteData.saldo.te_betalen)}
                  </p>
                </div>

                {/* Transactie Info */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Verkoopfacturen verwerkt</p>
                    <p className="text-lg font-bold text-gray-900">{aangifteData.transacties.verkoop_facturen}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Inkoopfacturen verwerkt</p>
                    <p className="text-lg font-bold text-gray-900">{aangifteData.transacties.inkoop_facturen}</p>
                  </div>
                </div>
              </CardContent>

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={handlePrint}
                    className="rounded-lg"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Afdrukken
                  </Button>
                  <Button 
                    onClick={handleDownloadPDF}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Step 3: Downloaden & Indienen */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-600 px-6 py-8 text-center">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">BTW-aangifte Klaar!</h2>
                <p className="text-sm text-emerald-100 mt-2">Uw aangifte voor {aangifteData?.periode} is gegenereerd</p>
              </div>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">PDF Gedownload</p>
                        <p className="text-xs text-emerald-600 mt-1">BTW-aangifte-{aangifteData?.periode}.pdf</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Volgende stap: Handmatig indienen</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Dien de gedownloade PDF in bij de Belastingdienst Suriname. 
                          U kunt dit doen via het loket of per post.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Te betalen bedrag:</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(aangifteData?.saldo?.te_betalen || 0)}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Deadline: Laatste dag van de maand volgend op het kwartaal
                    </p>
                  </div>
                </div>
              </CardContent>

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug naar aangifte
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Opnieuw downloaden
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/boekhouding/btw')}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Voltooien
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NieuweBTWAangiftePage;
