import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  Download,
  FileText,
  Calculator,
  Calendar,
  CheckCircle,
  AlertCircle,
  Printer,
  ArrowUpDown,
  User,
  Building2
} from 'lucide-react';

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
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

const NieuweBTWAangiftePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedQuarter, setSelectedQuarter] = useState('Q4');

  // BTW regels data
  const [btwRegels, setBtwRegels] = useState([
    { id: 1, rubriek: '1a', omschrijving: 'Leveringen/diensten belast met hoog tarief', grondslag: 180000, btw: 45000 },
    { id: 2, rubriek: '1b', omschrijving: 'Leveringen/diensten belast met laag tarief', grondslag: 70000, btw: 7000 },
    { id: 3, rubriek: '1c', omschrijving: 'Leveringen/diensten belast met overige tarieven', grondslag: 0, btw: 0 },
    { id: 4, rubriek: '2a', omschrijving: 'Intracommunautaire leveringen', grondslag: 0, btw: 0 },
    { id: 5, rubriek: '3', omschrijving: 'Installatie/afstandsverkopen binnen de EU', grondslag: 0, btw: 0 },
    { id: 6, rubriek: '4a', omschrijving: 'Leveringen uit landen buiten de EU', grondslag: 25000, btw: 6250 },
    { id: 7, rubriek: '4b', omschrijving: 'Leveringen uit landen binnen de EU', grondslag: 0, btw: 0 },
    { id: 8, rubriek: '5a', omschrijving: 'Voorbelasting', grondslag: 0, btw: 38000 },
    { id: 9, rubriek: '5b', omschrijving: 'Verleggingsregelingen', grondslag: 0, btw: 6250 },
  ]);

  const periodeLabels = {
    'Q1': 'Jan - Mar',
    'Q2': 'Apr - Jun', 
    'Q3': 'Jul - Sep',
    'Q4': 'Okt - Dec'
  };

  // Bereken totalen
  const totaalVerschuldigdeBTW = btwRegels.slice(0, 7).reduce((sum, r) => sum + r.btw, 0);
  const totaalVoorbelasting = btwRegels.slice(7).reduce((sum, r) => sum + r.btw, 0);
  const teBetalen = totaalVerschuldigdeBTW - totaalVoorbelasting;

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setGenerated(true);
    setGenerating(false);
    toast.success('BTW-aangifte gegenereerd');
  };

  const handleDownload = () => {
    toast.success('BTW-aangifte wordt gedownload');
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
          
          <TabButton active={true} onClick={() => {}}>
            BTW-aangifte Genereren
          </TabButton>
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={handleDownload}
              disabled={!generated}
              className="rounded-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.print()}
              disabled={!generated}
              className="rounded-lg"
            >
              <Printer className="w-4 h-4 mr-2" />
              Afdrukken
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={generating || generated}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              {generated ? 'Gegenereerd' : 'Genereren'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Administratie
            </Label>
            <Select defaultValue="demo">
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo Bedrijf N.V.</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Boekjaar</Label>
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
          
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Kwartaal</Label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                <SelectItem value="Q4">Q4 (Okt-Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              Verantwoordelijke
            </Label>
            <Select defaultValue="me">
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Huidige gebruiker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-right">
            <span className="text-sm text-gray-500">Periode</span>
            <p className="text-sm font-medium text-gray-700">{selectedQuarter} {selectedYear} ({periodeLabels[selectedQuarter]})</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-6 py-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-700">
            Digitale indiening is in Suriname niet mogelijk. Download de PDF en dien handmatig in bij de Belastingdienst.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                BTW-aangifte {selectedQuarter} {selectedYear}
              </span>
              <span className="text-xs text-gray-500">
                {generated ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-3 h-3" /> Gegenereerd
                  </span>
                ) : (
                  'Nog niet gegenereerd'
                )}
              </span>
            </div>
          </div>

          {/* BTW Regels Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide w-20">
                    Rubriek
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Omschrijving
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide w-40">
                    Grondslag (SRD)
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide w-40">
                    BTW (SRD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Verschuldigde BTW sectie */}
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase">
                    Verschuldigde BTW
                  </td>
                </tr>
                {btwRegels.slice(0, 7).map((regel) => (
                  <tr key={regel.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-900">{regel.rubriek}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{regel.omschrijving}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(regel.grondslag)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(regel.btw)}</span>
                    </td>
                  </tr>
                ))}
                
                {/* Subtotaal verschuldigd */}
                <tr className="bg-emerald-50 border-b border-emerald-200">
                  <td colSpan={3} className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-emerald-800">Subtotaal verschuldigde BTW</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-emerald-700">{formatCurrency(totaalVerschuldigdeBTW)}</span>
                  </td>
                </tr>

                {/* Voorbelasting sectie */}
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase">
                    Voorbelasting (Aftrekbaar)
                  </td>
                </tr>
                {btwRegels.slice(7).map((regel) => (
                  <tr key={regel.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-900">{regel.rubriek}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{regel.omschrijving}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(regel.grondslag)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(regel.btw)}</span>
                    </td>
                  </tr>
                ))}

                {/* Subtotaal voorbelasting */}
                <tr className="bg-blue-50 border-b border-blue-200">
                  <td colSpan={3} className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-blue-800">Subtotaal voorbelasting</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(totaalVoorbelasting)}</span>
                  </td>
                </tr>

                {/* Eindtotaal */}
                <tr className="bg-amber-50">
                  <td colSpan={3} className="px-4 py-4 text-right">
                    <span className="text-base font-bold text-amber-800">
                      {teBetalen >= 0 ? 'Te betalen aan Belastingdienst' : 'Te vorderen van Belastingdienst'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-lg font-bold text-amber-700">
                      {formatCurrency(Math.abs(teBetalen))}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <p>Berekening: Verschuldigde BTW ({formatCurrency(totaalVerschuldigdeBTW)}) - Voorbelasting ({formatCurrency(totaalVoorbelasting)}) = {formatCurrency(teBetalen)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate('/app/boekhouding/btw')}
                className="rounded-lg"
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={!generated}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NieuweBTWAangiftePage;
