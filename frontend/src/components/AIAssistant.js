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
  Package,
  Users,
  PhoneCall
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import api, { getMyAddons, getProfile } from '../lib/api';
import { triggerRefresh, REFRESH_EVENTS } from '../lib/refreshEvents';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const WS_URL = API_URL.replace('http', 'ws').replace('https', 'wss');

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
  },
  boekhouding: {
    name: 'Boekhouding',
    capabilities: [
      '• Verkoop- en inkoopfacturen',
      '• Debiteuren en crediteuren',
      '• BTW administratie',
      '• Grootboek en journaalposten',
      '• Bank & kas mutaties',
      '• Voorraad beheer',
      '• Rapportages en balansen',
      '• Wisselkoersen (CME)'
    ],
    quickActions: [
      { label: '📄 Facturen', message: 'Toon openstaande facturen' },
      { label: '💰 BTW', message: 'Wat is mijn BTW saldo?' },
      { label: '📊 Omzet', message: 'Toon omzet overzicht' },
      { label: '🏦 Bank', message: 'Toon bank mutaties' },
    ]
  },
  schuldbeheer: {
    name: 'Schuldbeheer',
    capabilities: [
      '• Leningen beheren',
      '• Schulden overzicht',
      '• Aflossingsschema\'s',
      '• Betalingsherinneringen',
      '• Financiële planning'
    ],
    quickActions: [
      { label: '💳 Schulden', message: 'Toon openstaande schulden' },
      { label: '📅 Aflossing', message: 'Wanneer is mijn volgende aflossing?' },
    ]
  },
  suribet: {
    name: 'Suribet Retailer',
    capabilities: [
      '• Tickets verkopen',
      '• Dagelijkse omzet bekijken',
      '• Uitbetalingen beheren',
      '• Transactie historie'
    ],
    quickActions: [
      { label: '🎫 Tickets', message: 'Toon ticket verkopen' },
      { label: '💰 Omzet', message: 'Wat is mijn omzet vandaag?' },
    ]
  },
  chatbot: {
    name: 'AI Chatbot',
    capabilities: [
      '• GPT-4 powered klantenservice',
      '• Automatische antwoorden',
      '• Kennisbank beheer',
      '• Chat historie'
    ],
    quickActions: []
  },
  cms: {
    name: 'Website CMS',
    capabilities: [
      '• Website content beheren',
      '• Pagina\'s aanmaken en bewerken',
      '• Media bibliotheek',
      '• SEO instellingen'
    ],
    quickActions: []
  },
  rapportage: {
    name: 'Rapportage',
    capabilities: [
      '• Bedrijfsanalytics',
      '• Dashboards en grafieken',
      '• Export naar PDF/Excel',
      '• Automatische rapportages'
    ],
    quickActions: [
      { label: '📊 Dashboard', message: 'Toon analytics dashboard' },
      { label: '📈 Trends', message: 'Wat zijn de trends?' },
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
  
  // Live Chat State
  const [isLiveChat, setIsLiveChat] = useState(false);
  const [liveChatSession, setLiveChatSession] = useState(null);
  const [staffOnline, setStaffOnline] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [connectingToStaff, setConnectingToStaff] = useState(false);
  const wsRef = useRef(null);

  // Check if staff is online
  useEffect(() => {
    const checkStaffOnline = async () => {
      try {
        const res = await fetch(`${API_URL}/api/live-chat/online-status`);
        if (res.ok) {
          const data = await res.json();
          setStaffOnline(data.staff_online);
        }
      } catch (error) {
        console.error('Error checking staff status:', error);
      }
    };
    checkStaffOnline();
    // Check every 30 seconds
    const interval = setInterval(checkStaffOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for live chat
  useEffect(() => {
    if (isLiveChat && liveChatSession) {
      connectLiveChatWebSocket();
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [isLiveChat, liveChatSession]);

  const connectLiveChatWebSocket = () => {
    if (!liveChatSession) return;
    
    try {
      const ws = new WebSocket(`${WS_URL}/api/live-chat/ws/customer/${liveChatSession.id}`);
      
      ws.onopen = () => {
        console.log('Live chat WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleLiveChatMessage(data);
      };
      
      ws.onclose = () => {
        console.log('Live chat WebSocket disconnected');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const handleLiveChatMessage = (data) => {
    switch (data.type) {
      case 'staff_connected':
        setMessages(prev => [...prev, {
          role: 'system',
          content: data.message?.content || `${data.staff_name} is nu verbonden met u.`
        }]);
        setConnectingToStaff(false);
        break;
      case 'new_message':
        if (data.message?.sender_type !== 'customer') {
          setMessages(prev => [...prev, {
            role: data.message?.sender_type === 'system' ? 'system' : 'staff',
            content: data.message?.content,
            senderName: data.message?.sender_name
          }]);
        }
        break;
      case 'chat_closed':
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Chat is beëindigd. Bedankt voor uw contact!'
        }]);
        setTimeout(() => {
          setIsLiveChat(false);
          setLiveChatSession(null);
        }, 2000);
        break;
      case 'typing':
        // Could show typing indicator
        break;
    }
  };

  const requestLiveChat = () => {
    if (!staffOnline) {
      toast.error('Helaas zijn er momenteel geen medewerkers online. Probeer het later opnieuw.');
      return;
    }
    setShowNameInput(true);
  };

  const startLiveChat = async () => {
    if (!customerName.trim()) {
      toast.error('Vul uw naam in');
      return;
    }
    
    setConnectingToStaff(true);
    setShowNameInput(false);
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          initial_message: 'Klant wilt graag verbonden worden met een medewerker.'
        })
      });
      
      if (res.ok) {
        const session = await res.json();
        setLiveChatSession(session);
        setIsLiveChat(true);
        setMessages(prev => [...prev, {
          role: 'system',
          content: `U wordt verbonden met een medewerker. Even geduld alstublieft...`
        }]);
      } else {
        toast.error('Kon niet verbinden. Probeer het opnieuw.');
        setConnectingToStaff(false);
      }
    } catch (error) {
      console.error('Error starting live chat:', error);
      toast.error('Er is een fout opgetreden');
      setConnectingToStaff(false);
    }
  };

  const sendLiveChatMessage = async (content) => {
    if (!liveChatSession || !content.trim()) return;
    
    // Add to local messages immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: content
    }]);
    
    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: content,
        sender_name: customerName
      }));
    }
    
    // Also send via REST API as backup
    try {
      await fetch(`${API_URL}/api/live-chat/sessions/${liveChatSession.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          sender_type: 'customer',
          sender_name: customerName
        })
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Load active modules and company name
  useEffect(() => {
    const loadModules = async () => {
      try {
        // Get user profile for company name
        let company = 'uw bedrijf';
        try {
          const profileRes = await getProfile();
          company = profileRes.data.company_name || profileRes.data.name || 'uw bedrijf';
        } catch (e) {
          // Fallback to localStorage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              company = user.company_name || user.companyName || user.name || 'uw bedrijf';
            } catch (parseErr) {
              console.error('Error parsing user:', parseErr);
            }
          }
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
          try {
            const user = JSON.parse(userStr);
            company = user.company_name || user.companyName || user.name || 'uw bedrijf';
          } catch (e) {
            console.error('Error parsing user:', e);
          }
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

    // If in live chat mode, send to live chat
    if (isLiveChat) {
      const message = input.trim();
      setInput('');
      await sendLiveChatMessage(message);
      return;
    }

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

      // Check if AI suggests connecting to staff
      const lowerResponse = response.data.response.toLowerCase();
      if (lowerResponse.includes('medewerker') && 
          (lowerResponse.includes('doorverbinden') || lowerResponse.includes('helpen') || lowerResponse.includes('contact'))) {
        // AI might be suggesting to connect to a staff member
      }

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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        data-testid="ai-chat-button"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse ${
          activeModules.length > 0 ? 'bg-green-500' : 'bg-orange-500'
        }`} />
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ${
        isMinimized 
          ? 'bottom-6 right-6 w-72 h-14 rounded-2xl border border-gray-200 dark:border-gray-700' 
          : 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[550px] sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-gray-700'
      }`}
      data-testid="ai-chat-window"
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-3 sm:p-3 border-b border-gray-200 dark:border-gray-700 bg-emerald-500 ${isMinimized ? 'rounded-t-2xl' : 'sm:rounded-t-2xl'}`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-base sm:text-sm">
              {companyName ? companyName.substring(0, 2).toUpperCase() : 'AI'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-base sm:text-sm text-white">{companyName || 'AI Assistent'}</h3>
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
              className="h-9 w-9 sm:h-7 sm:w-7 hover:bg-white/20 text-white"
              onClick={handleClearChat}
              title="Chat wissen"
            >
              <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          {/* Hide minimize button on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex h-7 w-7 hover:bg-white/20 text-white"
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
            className="h-9 w-9 sm:h-7 sm:w-7 bg-white/20 hover:bg-white/30 text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
                className={`flex gap-2 sm:gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : 
                  message.role === 'system' ? 'justify-center' : ''
                }`}
              >
                {message.role === 'system' ? (
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                    {message.content}
                  </div>
                ) : (
                  <>
                    <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-emerald-500 text-white' 
                        : message.role === 'staff'
                          ? 'bg-teal-500 text-white'
                          : 'bg-emerald-500'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : message.role === 'staff' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <span className="text-white font-bold text-xs">
                          {companyName ? companyName.substring(0, 2).toUpperCase() : 'AI'}
                        </span>
                      )}
                    </div>
                    <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-tr-sm'
                        : message.role === 'staff'
                          ? 'bg-teal-500 text-white rounded-tl-sm'
                          : message.isError
                            ? 'bg-red-100 text-red-600 rounded-tl-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                    }`}>
                      {message.role === 'staff' && message.senderName && (
                        <p className="text-xs text-teal-100 mb-1">{message.senderName}</p>
                      )}
                      <p className="text-sm sm:text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.actionExecuted && (
                        <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1 text-xs opacity-80">
                          <Sparkles className="w-3 h-3" />
                          Actie uitgevoerd
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-emerald-500 flex items-center justify-center">
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
          {messages.length <= 2 && !isLiveChat && (
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

          {/* Connect to Staff Button */}
          {!isLiveChat && !showNameInput && (
            <div className="px-4 pb-2 bg-white dark:bg-gray-900">
              <button
                onClick={requestLiveChat}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  staffOnline 
                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!staffOnline}
              >
                <Users className="w-4 h-4" />
                {staffOnline ? 'Verbind met medewerker' : 'Geen medewerkers online'}
                {staffOnline && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              </button>
            </div>
          )}

          {/* Name Input for Live Chat */}
          {showNameInput && (
            <div className="px-4 pb-2 bg-white dark:bg-gray-900 space-y-2">
              <p className="text-sm text-gray-600">Vul uw naam in om te verbinden:</p>
              <div className="flex gap-2">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Uw naam"
                  className="flex-1"
                />
                <Button onClick={startLiveChat} className="bg-teal-500 hover:bg-teal-600">
                  Verbinden
                </Button>
              </div>
              <button
                onClick={() => setShowNameInput(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Annuleren
              </button>
            </div>
          )}

          {/* Connecting to Staff Indicator */}
          {connectingToStaff && (
            <div className="px-4 pb-2 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-center gap-2 text-teal-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verbinden met medewerker...</span>
              </div>
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
