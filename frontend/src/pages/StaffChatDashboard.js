import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  Circle,
  LogOut,
  Phone,
  Mail,
  ChevronRight,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const WS_URL = API_URL.replace('http', 'ws').replace('https', 'wss');

export default function StaffChatDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('staff_chat_token'));
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [waitingChats, setWaitingChats] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [stats, setStats] = useState(null);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if already logged in
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (isLoggedIn && token) {
      connectWebSocket();
      fetchChats();
      fetchStats();
      
      // Poll for updates every 10 seconds
      const interval = setInterval(() => {
        fetchChats();
        fetchStats();
      }, 10000);
      
      return () => {
        clearInterval(interval);
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [isLoggedIn, token]);

  const verifyToken = async () => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff/me?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('staff_chat_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('staff_chat_token');
      setToken(null);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_URL}/api/live-chat/ws/staff/${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          if (isLoggedIn) {
            connectWebSocket();
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_chat_request':
        setWaitingChats(prev => [data.session, ...prev]);
        toast.info('Nieuwe chat verzoek!');
        break;
      case 'new_message':
        if (selectedChat?.id === data.message?.session_id || 
            messages.some(m => m.session_id === data.message?.session_id)) {
          setMessages(prev => [...prev, data.message]);
        }
        break;
      case 'chat_closed':
        fetchChats();
        break;
      default:
        break;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setStaff(data.staff);
        localStorage.setItem('staff_chat_token', data.access_token);
        setIsLoggedIn(true);
        toast.success('Ingelogd!');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Login mislukt');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_chat_token');
    setToken(null);
    setStaff(null);
    setIsLoggedIn(false);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const fetchChats = async () => {
    try {
      // Fetch waiting chats
      const waitingRes = await fetch(`${API_URL}/api/live-chat/sessions/waiting`);
      if (waitingRes.ok) {
        const data = await waitingRes.json();
        setWaitingChats(data);
      }
      
      // Fetch my active chats
      const activeRes = await fetch(`${API_URL}/api/live-chat/sessions?status=active&staff_id=${staff?.id}`);
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveChats(data);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const acceptChat = async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/sessions/${sessionId}/accept?token=${token}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        toast.success('Chat geaccepteerd');
        fetchChats();
        selectChat(sessionId);
        
        // Join the session via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'join_session',
            session_id: sessionId
          }));
        }
      } else {
        toast.error('Kon chat niet accepteren');
      }
    } catch (error) {
      console.error('Error accepting chat:', error);
      toast.error('Er is een fout opgetreden');
    }
  };

  const selectChat = async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/sessions/${sessionId}`);
      if (res.ok) {
        const session = await res.json();
        setSelectedChat(session);
        setMessages(session.messages || []);
        
        // Join the session via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'join_session',
            session_id: sessionId
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      // Send via WebSocket for real-time
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          session_id: selectedChat.id,
          content: newMessage
        }));
      }
      
      // Also send via REST API as backup
      await fetch(`${API_URL}/api/live-chat/sessions/${selectedChat.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          sender_type: 'staff',
          sender_name: staff?.name
        })
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Kon bericht niet versturen');
    }
  };

  const closeChat = async () => {
    if (!selectedChat) return;
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/sessions/${selectedChat.id}/close?token=${token}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        toast.success('Chat gesloten');
        setSelectedChat(null);
        setMessages([]);
        fetchChats();
      }
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Live Chat Dashboard</CardTitle>
            <p className="text-gray-500 mt-2">Log in om chats te beheren</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  placeholder="email@voorbeeld.com"
                  required
                />
              </div>
              <div>
                <Label>Wachtwoord</Label>
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Live Chat Dashboard</h1>
              <p className="text-sm text-gray-500">Welkom, {staff?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{stats?.waiting_sessions || 0} wachtend</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span>{stats?.active_sessions || 0} actief</span>
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Left Sidebar - Chat List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Waiting Chats */}
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Wachtrij ({waitingChats.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {waitingChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Geen wachtende chats
                </div>
              ) : (
                <div className="divide-y">
                  {waitingChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => acceptChat(chat.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{chat.customer_name}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {chat.messages?.[0]?.content || 'Nieuwe chat'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-teal-600">
                          Accepteren
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Chats */}
            <div className="p-4 border-t border-b bg-gray-50">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                Mijn Chats ({activeChats.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Geen actieve chats
                </div>
              ) : (
                <div className="divide-y">
                  {activeChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedChat?.id === chat.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                      }`}
                      onClick={() => selectChat(chat.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{chat.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(chat.started_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-700 font-semibold">
                        {selectedChat.customer_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedChat.customer_name}</p>
                      {selectedChat.customer_email && (
                        <p className="text-sm text-gray-500">{selectedChat.customer_email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={closeChat}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Sluiten
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${
                        msg.sender_type === 'staff' ? 'justify-end' : 
                        msg.sender_type === 'system' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      {msg.sender_type === 'system' ? (
                        <div className="bg-gray-100 text-gray-500 text-sm px-4 py-2 rounded-full">
                          {msg.content}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.sender_type === 'staff'
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'staff' ? 'text-teal-100' : 'text-gray-500'
                          }`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Typ een bericht..."
                      className="flex-1"
                    />
                    <Button type="submit">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Selecteer een chat om te beginnen</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
