import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, User, Sparkles, Loader2, RefreshCw, 
  LogOut, Download, Building2, Menu, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api, { getMyAddons, getProfile } from '../lib/api';

const moduleCapabilities = {
  vastgoed_beheer: { name: 'Vastgoed Beheer', icon: '🏠' },
  hrm: { name: 'HRM Module', icon: '👥' },
  autodealer: { name: 'Auto Dealer', icon: '🚗' },
  beauty: { name: 'Beauty & Spa', icon: '💅' },
  beautyspa: { name: 'Beauty & Spa', icon: '💅' },
  pompstation: { name: 'Pompstation', icon: '⛽' },
  boekhouding: { name: 'Boekhouding', icon: '📊' },
  schuldbeheer: { name: 'Schuldbeheer', icon: '💳' },
  suribet: { name: 'Suribet Retailer', icon: '🎫' },
};

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [activeModules, setActiveModules] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => 'ai_' + Date.now());
  const [showMenu, setShowMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkAuth();
    const handleBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Set PWA manifest for AI Assistant
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.href = '/ai-manifest.json';
    }
    
    // Update theme color for AI Assistant
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = '#10b981';
    }
    
    // Update document title
    document.title = 'AI Assistent - Facturatie.sr';
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      // Restore original manifest on unmount
      if (manifestLink) {
        manifestLink.href = '/manifest.json';
      }
    };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (!chatLoading) inputRef.current?.focus(); }, [chatLoading]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }
    try {
      const profileRes = await getProfile();
      setUser(profileRes.data);
      setCompanyName(profileRes.data.company_name || profileRes.data.name || 'uw bedrijf');
      setIsAuthenticated(true);
      await loadModules(profileRes.data.company_name || profileRes.data.name || 'uw bedrijf');
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally { setIsLoading(false); }
  };

  const loadModules = async (company) => {
    try {
      const res = await getMyAddons();
      const activeSlugs = res.data.filter(a => a.status === 'active').map(a => a.addon_slug);
      setActiveModules(activeSlugs);
      setMessages([{ role: 'assistant', content: getWelcomeMessage(activeSlugs, company) }]);
    } catch (error) {
      setMessages([{ role: 'assistant', content: 'Hallo! 👋 Ik ben uw AI assistent voor ' + company + '. Hoe kan ik u helpen?' }]);
    }
  };

  const getWelcomeMessage = (modules, company) => {
    let msg = 'Hallo! 👋 Ik ben uw AI assistent voor **' + company + '**.\n\n';
    if (modules.length > 0) {
      msg += '**Actieve modules:**\n';
      modules.forEach(slug => { const m = moduleCapabilities[slug]; if (m) msg += m.icon + ' ' + m.name + '\n'; });
      msg += '\n';
    }
    return msg + 'Wat kan ik voor u doen?';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Vul uw e-mail en wachtwoord in'); return; }
    setLoginLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setCompanyName(userData.company_name || userData.name || 'uw bedrijf');
      setIsAuthenticated(true);
      await loadModules(userData.company_name || userData.name || 'uw bedrijf');
      toast.success('Welkom terug!');
    } catch (error) { toast.error(error.response?.data?.detail || 'Ongeldige inloggegevens'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setIsAuthenticated(false); setUser(null); setMessages([]); setShowMenu(false);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') toast.success('App wordt geïnstalleerd!');
      setDeferredPrompt(null);
    } else { toast.info('Tik op "Deel" en dan "Zet op beginscherm"', { duration: 5000 }); }
    setShowMenu(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    try {
      const response = await api.post('/ai/assistant/chat', {
        message: userMessage, session_id: sessionId, active_modules: activeModules,
        context: { user_name: user?.name, company_name: companyName }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response, actionExecuted: response.data.action_executed }]);
    } catch (error) {
      try {
        const fallbackRes = await api.post('/public/chat', { message: userMessage, session_id: sessionId });
        setMessages(prev => [...prev, { role: 'assistant', content: fallbackRes.data.response }]);
      } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, er ging iets mis.', isError: true }]); }
    } finally { setChatLoading(false); }
  };

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: getWelcomeMessage(activeModules, companyName) }]);
    setShowMenu(false);
  };

  const getQuickActions = () => {
    const actions = [];
    if (activeModules.includes('vastgoed_beheer')) {
      actions.push({ label: '🏠 Huurders', message: 'Toon alle huurders' });
      actions.push({ label: '💰 Betalingen', message: 'Openstaande betalingen?' });
    }
    if (activeModules.includes('boekhouding')) {
      actions.push({ label: '📄 Facturen', message: 'Openstaande facturen' });
      actions.push({ label: '📊 Omzet', message: 'Omzet deze maand?' });
    }
    if (activeModules.includes('hrm')) actions.push({ label: '👥 Personeel', message: 'Werknemers overzicht' });
    return actions.slice(0, 4);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" /><p className="mt-2 text-gray-600">Laden...</p></div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <header className="bg-emerald-500 text-white p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-500" /></div>
          <div><h1 className="font-bold text-lg">AI Assistent</h1><p className="text-emerald-100 text-xs">Facturatie.sr</p></div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="w-8 h-8 text-emerald-500" /></div>
              <h2 className="text-xl font-bold text-gray-900">Welkom</h2>
              <p className="text-gray-500 text-sm mt-1">Log in om uw AI assistent te gebruiken</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="uw@email.com" className="w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full" /></div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loginLoading}>{loginLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Inloggen</Button>
            </form>
            {deferredPrompt && <div className="mt-4 pt-4 border-t border-gray-100"><Button onClick={handleInstallPWA} variant="outline" className="w-full"><Download className="w-4 h-4 mr-2" />Installeer als App</Button></div>}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">Powered by Facturatie.sr</p>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-500 text-white p-3 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center"><span className="text-emerald-600 font-bold">{companyName.substring(0, 2).toUpperCase()}</span></div>
            <div><h1 className="font-semibold text-base">{companyName}</h1><p className="text-emerald-100 text-xs flex items-center gap-1"><span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>Online</p></div>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/20 rounded-full">{showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
                <button onClick={handleClearChat} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Chat wissen</button>
                {deferredPrompt && <button onClick={handleInstallPWA} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4" />Installeer App</button>}
                <button onClick={() => { navigate('/app/dashboard'); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Building2 className="w-4 h-4" />Naar Dashboard</button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut className="w-4 h-4" />Uitloggen</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={'flex gap-3 ' + (message.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={'w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ' + (message.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-emerald-500')}>
              {message.role === 'user' ? <User className="w-5 h-5" /> : <span className="text-white font-bold text-sm">{companyName.substring(0, 2).toUpperCase()}</span>}
            </div>
            <div className={'max-w-[85%] rounded-2xl px-4 py-3 ' + (message.role === 'user' ? 'bg-emerald-500 text-white rounded-tr-md' : message.isError ? 'bg-red-100 text-red-600 rounded-tl-md' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md shadow-sm')}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {message.actionExecuted && <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1 text-xs opacity-80"><Sparkles className="w-3 h-3" />Actie uitgevoerd</div>}
            </div>
          </div>
        ))}
        {chatLoading && <div className="flex gap-3"><div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center"><span className="text-white font-bold text-sm">{companyName.substring(0, 2).toUpperCase()}</span></div><div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Even denken...</div></div></div>}
        <div ref={messagesEndRef} />
      </main>
      {messages.length <= 2 && <div className="px-4 pb-2 flex flex-wrap gap-2">{getQuickActions().map((action, index) => (<button key={index} onClick={() => { setInput(action.message); inputRef.current?.focus(); }} className="px-3 py-2 text-sm bg-white hover:bg-emerald-50 border border-gray-200 rounded-full text-gray-700">{action.label}</button>))}</div>}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Typ een bericht..." className="flex-1 h-12 text-base bg-gray-50 border-gray-200 rounded-full px-4" disabled={chatLoading} />
          <Button type="submit" size="icon" className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg" disabled={chatLoading || !input.trim()}>{chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</Button>
        </form>
      </footer>
      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
