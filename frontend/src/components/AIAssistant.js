import { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  RefreshCw,
  Package
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import api, { getMyAddons } from '../lib/api';
import { triggerRefresh, REFRESH_EVENTS } from '../lib/refreshEvents';

// Module-specific capabilities
const moduleCapabilities = {
  vastgoed_beheer: {
    name: 'Vastgoed Beheer',
    capabilities: [
      '• Huurders toevoegen, zoeken en beheren',
      '• Appartementen beheren',
      '• Betalingen registreren en bekijken',
      '• Saldo\'s en openstaande betalingen',
      '• Leningen aanmaken en beheren',
      '• Contracten beheren',
      '• Onderhoud registreren',
      '• Overzichten en rapportages'
    ],
    quickActions: [
      { label: '📊 Overzicht', message: 'Geef me een overzicht van mijn verhuur' },
      { label: '👥 Huurders', message: 'Toon alle huurders' },
      { label: '💰 Betalingen', message: 'Wat zijn de openstaande betalingen?' },
      { label: '🏠 Appartementen', message: 'Toon alle appartementen' },
    ]
  },
  hrm: {
    name: 'HRM Module',
    capabilities: [
      '• Werknemers toevoegen, zoeken en beheren',
      '• Verlofaanvragen goedkeuren/afwijzen',
      '• Afdelingen beheren',
      '• Salarissen en loonlijst bekijken',
      '• Aanwezigheid registreren',
      '• Contracten beheren',
      '• Documenten opslaan',
      '• Overzichten en rapportages'
    ],
    quickActions: [
      { label: '👥 Personeel', message: 'Toon overzicht van alle werknemers' },
      { label: '📝 Verlof', message: 'Zijn er openstaande verlofaanvragen?' },
      { label: '💰 Salarissen', message: 'Toon salaris overzicht' },
      { label: '➕ Toevoegen', message: 'Voeg een nieuwe werknemer toe' },
    ]
  },
  autodealer: {
    name: 'Auto Dealer',
    capabilities: [
      '• Voertuigen toevoegen, zoeken en beheren',
      '• Klanten registreren en beheren',
      '• Verkopen vastleggen',
      '• Voorraad overzicht',
      '• Multi-valuta ondersteuning (SRD, EUR, USD)',
      '• Prijshistorie bijhouden',
      '• Rapportages en statistieken'
    ],
    quickActions: [
      { label: '🚗 Voorraad', message: 'Toon beschikbare voertuigen' },
      { label: '💰 Verkopen', message: 'Wat zijn de recente verkopen?' },
      { label: '➕ Auto toevoegen', message: 'Voeg een nieuw voertuig toe' },
      { label: '👥 Klanten', message: 'Toon alle klanten' },
    ]
  },
  beauty: {
    name: 'Beauty & Spa',
    capabilities: [
      '• Afspraken maken en beheren',
      '• Behandelingen/diensten beheren',
      '• Klanten registreren',
      '• Agenda overzicht',
      '• Online booking portal',
      '• Omzet rapportages'
    ],
    quickActions: [
      { label: '📅 Vandaag', message: 'Toon afspraken van vandaag' },
      { label: '✂️ Diensten', message: 'Welke behandelingen bied ik aan?' },
      { label: '➕ Afspraak', message: 'Maak een nieuwe afspraak' },
    ]
  },
  beautyspa: {
    name: 'Beauty & Spa',
    capabilities: [
      '• Afspraken maken en beheren',
      '• Behandelingen/diensten beheren',
      '• Klanten registreren',
      '• Agenda overzicht',
      '• Online booking portal',
      '• Omzet rapportages'
    ],
    quickActions: [
      { label: '📅 Vandaag', message: 'Toon afspraken van vandaag' },
      { label: '✂️ Diensten', message: 'Welke behandelingen bied ik aan?' },
      { label: '➕ Afspraak', message: 'Maak een nieuwe afspraak' },
    ]
  },
  pompstation: {
    name: 'Pompstation',
    capabilities: [
      '• Brandstofverkopen registreren',
      '• Voorraad beheren',
      '• Dagelijkse omzet bekijken',
      '• Rapportages en statistieken'
    ],
    quickActions: [
      { label: '⛽ Overzicht', message: 'Toon pompstation overzicht' },
      { label: '📊 Vandaag', message: 'Hoeveel verkocht vandaag?' },
      { label: '➕ Verkoop', message: 'Registreer een brandstofverkoop' },
    ]
  }
};

const getWelcomeMessage = (activeModules) => {
  if (activeModules.length === 0) {
    return 'Hallo! 👋 Ik ben uw AI assistent voor Facturatie N.V.\n\n⚠️ U heeft nog geen modules geactiveerd. Ga naar **Instellingen > Abonnement** om modules te activeren.\n\nZodra u een module activeert, kan ik u helpen met het beheren van uw bedrijf!';
  }
  
  let message = 'Hallo! 👋 Ik ben uw AI assistent voor Facturatie N.V.\n\n';
  message += '**Actieve modules:**\n';
  
  activeModules.forEach(slug => {
    const module = moduleCapabilities[slug];
    if (module) {
      message += `\n📦 **${module.name}**\n`;
      message += module.capabilities.join('\n');
      message += '\n';
    }
  });
  
  message += '\nWat kan ik voor u doen?';
  return message;
};

const getWelcomeMessageWithCompany = (activeModules, companyName) => {
  if (activeModules.length === 0) {
    return `Hallo! 👋 Ik ben uw AI assistent voor ${companyName}.\n\n⚠️ U heeft nog geen modules geactiveerd. Ga naar **Instellingen > Abonnement** om modules te activeren.\n\nZodra u een module activeert, kan ik u helpen met het beheren van uw bedrijf!`;
  }
  
  let message = `Hallo! 👋 Ik ben uw AI assistent voor ${companyName}.\n\n`;
  message += '**Actieve modules:**\n';
  
  activeModules.forEach(slug => {
    const module = moduleCapabilities[slug];
    if (module) {
      message += `• ${module.name}\n`;
    }
  });
  
  message += '\nWat kan ik voor u doen?';
  return message;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeModules, setActiveModules] = useState([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}`);
  const [companyName, setCompanyName] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load active modules and company name
  useEffect(() => {
    const loadModules = async () => {
      try {
        // Get user info for company name
        const userStr = localStorage.getItem('user');
        let company = 'uw bedrijf';
        if (userStr) {
          const user = JSON.parse(userStr);
          company = user.company_name || user.name || 'uw bedrijf';
        }
        setCompanyName(company);
        
        const res = await getMyAddons();
        const activeSlugs = res.data
          .filter(a => a.status === 'active')
          .map(a => a.addon_slug);
        setActiveModules(activeSlugs);
        
        // Set initial welcome message based on active modules
        setMessages([{
          role: 'assistant',
          content: getWelcomeMessageWithCompany(activeSlugs, company)
        }]);
      } catch (error) {
        console.error('Error loading modules:', error);
        const userStr = localStorage.getItem('user');
        let company = 'uw bedrijf';
        if (userStr) {
          const user = JSON.parse(userStr);
          company = user.company_name || user.name || 'uw bedrijf';
        }
        setCompanyName(company);
        setMessages([{
          role: 'assistant',
          content: `Hallo! 👋 Ik ben uw AI assistent voor ${company}. Hoe kan ik u helpen?`
        }]);
      } finally {
        setModulesLoaded(true);
      }
    };
    loadModules();
  }, []);

  // Get quick actions based on active modules
  const getQuickActions = () => {
    if (activeModules.length === 0) {
      return [{ label: 'Modules bekijken', message: 'Welke modules zijn beschikbaar?' }];
    }
    
    let actions = [];
    activeModules.forEach(slug => {
      const module = moduleCapabilities[slug];
      if (module && module.quickActions) {
        actions = [...actions, ...module.quickActions];
      }
    });
    return actions.slice(0, 3); // Max 3 quick actions
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if user has any active modules
    if (activeModules.length === 0) {
      setMessages(prev => [...prev, 
        { role: 'user', content: input.trim() },
        { 
          role: 'assistant', 
          content: '⚠️ U heeft nog geen modules geactiveerd. Ik kan pas opdrachten uitvoeren als u een module heeft geactiveerd.\n\nGa naar **Instellingen > Abonnement** om de Vastgoed Beheer module of andere modules te activeren.'
        }
      ]);
      setInput('');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: userMessage,
        session_id: sessionId,
        active_modules: activeModules // Send active modules to backend
      });

      const isSuccess = response.data.action_executed && 
                        response.data.action_result && 
                        !response.data.response.startsWith('❌');

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        actionExecuted: isSuccess
      }]);

      // Only trigger refresh if action was SUCCESSFUL (not on errors)
      if (isSuccess) {
        toast.success('Actie uitgevoerd! Data wordt vernieuwd...');
        // Trigger refresh of all data
        setTimeout(() => {
          triggerRefresh(REFRESH_EVENTS.ALL);
        }, 500);
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Er is een fout opgetreden. Probeer het opnieuw.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: getWelcomeMessageWithCompany(activeModules, companyName)
    }]);
  };

  const quickActions = getQuickActions();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        data-testid="ai-chat-button"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background animate-pulse ${
          activeModules.length > 0 ? 'bg-green-500' : 'bg-orange-500'
        }`} />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-72 h-14' : 'w-96 h-[550px]'
      }`}
      data-testid="ai-chat-window"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-emerald-500 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-sm">
              {companyName ? companyName.substring(0, 2).toUpperCase() : 'AI'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{companyName || 'AI Assistent'}</h3>
            {!isMinimized && (
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                Online
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/20 text-white"
              onClick={handleClearChat}
              title="Chat wissen"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white/20 text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-emerald-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <span className="text-white font-bold text-xs">
                      {companyName ? companyName.substring(0, 2).toUpperCase() : 'AI'}
                    </span>
                  )}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-tr-sm'
                    : message.isError
                      ? 'bg-red-100 text-red-600 rounded-tl-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.actionExecuted && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1 text-xs opacity-80">
                      <Sparkles className="w-3 h-3" />
                      Actie uitgevoerd
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {companyName ? companyName.substring(0, 2).toUpperCase() : 'AI'}
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Even denken...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 bg-white dark:bg-gray-900">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(action.message);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 rounded-full text-emerald-700 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ een bericht..."
                className="flex-1 h-10 bg-gray-50 border-gray-200 focus:border-emerald-500"
                disabled={isLoading}
                data-testid="ai-chat-input"
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 bg-emerald-500 hover:bg-emerald-600"
                disabled={isLoading || !input.trim()}
                data-testid="ai-chat-send"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
