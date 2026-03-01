import { useState, useRef, useEffect, memo } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Minimize2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Memoized message component
const ChatMessage = memo(({ message, isBot }) => (
  <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
      isBot ? 'bg-emerald-100' : 'bg-gray-100'
    }`}>
      {isBot ? (
        <Bot className="w-4 h-4 text-emerald-600" />
      ) : (
        <User className="w-4 h-4 text-gray-600" />
      )}
    </div>
    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
      isBot 
        ? 'bg-white border border-gray-200 text-gray-800' 
        : 'bg-emerald-500 text-white'
    }`}>
      <p className="text-sm whitespace-pre-wrap">{message}</p>
    </div>
  </div>
));

ChatMessage.displayName = 'ChatMessage';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: 'Hallo! 👋 Welkom bij Facturatie.sr. Ik ben uw assistent. Hoe kan ik u vandaag helpen?', 
      isBot: true 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: userMessage, 
      isBot: false 
    }]);
    
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/public/chat`, {
        message: userMessage,
        session_id: sessionId
      });

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: response.data.response, 
        isBot: true 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: 'Sorry, er ging iets mis. Probeer het opnieuw of neem contact met ons op via +597 893-4982.', 
        isBot: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'Wat zijn de prijzen?',
    'Welke modules bieden jullie?',
    'Hoe kan ik starten?'
  ];

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isOpen 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <Card className="w-[380px] h-[550px] flex flex-col shadow-2xl border-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Facturatie Assistent</h3>
                <p className="text-xs text-emerald-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg.text} isBot={msg.isBot} />
            ))}
            
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (show only initially) */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 bg-white border-t flex gap-2 overflow-x-auto">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium whitespace-nowrap hover:bg-emerald-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ uw bericht..."
                className="flex-1"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={loading || !input.trim()}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
