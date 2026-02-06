import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  LogIn, 
  Play, 
  Square, 
  Clock, 
  Gamepad2, 
  User,
  Calendar,
  History,
  LogOut,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WerknemerPortaal() {
  const { userId } = useParams();
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Shift state
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cashDifference, setCashDifference] = useState('0');
  const [shiftNotes, setShiftNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for stored session
  useEffect(() => {
    const storedEmployee = localStorage.getItem('suribet_employee');
    if (storedEmployee) {
      const emp = JSON.parse(storedEmployee);
      if (emp.user_id === userId) {
        setEmployee(emp);
        setIsLoggedIn(true);
      }
    }
  }, [userId]);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn && employee) {
      loadMachines();
      checkActiveShift();
      loadShiftHistory();
    }
  }, [isLoggedIn, employee]);

  const loadMachines = async () => {
    try {
      const response = await fetch(`${API_URL}/api/suribet/portal/machines/${userId}`);
      if (response.ok) {
        setMachines(await response.json());
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const checkActiveShift = async () => {
    try {
      const response = await fetch(`${API_URL}/api/suribet/portal/active-shift/${userId}/${employee.employee_id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveShift(data.active_shift);
      }
    } catch (error) {
      console.error('Error checking active shift:', error);
    }
  };

  const loadShiftHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/suribet/portal/shift-history/${userId}/${employee.employee_id}?limit=10`);
      if (response.ok) {
        setShiftHistory(await response.json());
      }
    } catch (error) {
      console.error('Error loading shift history:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/suribet/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
          user_id: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
        setIsLoggedIn(true);
        localStorage.setItem('suribet_employee', JSON.stringify(data));
        toast.success(`Welkom ${data.name}!`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ongeldige inloggegevens');
      }
    } catch (error) {
      toast.error('Fout bij inloggen');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('suribet_employee');
    setIsLoggedIn(false);
    setEmployee(null);
    setActiveShift(null);
    setLoginForm({ username: '', password: '' });
    toast.success('Uitgelogd');
  };

  const handleStartShift = async () => {
    if (!selectedMachine) {
      toast.error('Selecteer eerst een machine');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/suribet/portal/shift/start?user_id=${userId}&employee_id=${employee.employee_id}&machine_id=${selectedMachine}`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setActiveShift(data.shift);
        toast.success(data.message);
        loadShiftHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij starten shift');
      }
    } catch (error) {
      toast.error('Fout bij starten shift');
    } finally {
      setLoading(false);
    }
  };

  const handleStopShift = async () => {
    if (!activeShift) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: userId,
        employee_id: employee.employee_id,
        shift_id: activeShift.id,
        cash_difference: cashDifference || '0'
      });
      if (shiftNotes) params.append('notes', shiftNotes);
      
      const response = await fetch(
        `${API_URL}/api/suribet/portal/shift/stop?${params}`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setActiveShift(null);
        setCashDifference('0');
        setShiftNotes('');
        toast.success(`${data.message} - ${data.hours_worked} uren gewerkt`);
        loadShiftHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij stoppen shift');
      }
    } catch (error) {
      toast.error('Fout bij stoppen shift');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const calculateShiftDuration = () => {
    if (!activeShift?.start_time) return '0:00';
    const [hours, minutes] = activeShift.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let diff = nowMinutes - startMinutes;
    // Handle overnight shifts
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Suribet Logo URL
  const suribetLogo = "https://customer-assets.emergentagent.com/job_suribet-dayview/artifacts/ejicn20m_66d4fdc2-3b2f-41d5-a5b3-2a7fc7c1c4e2_medium.jpg";

  // Login Screen - Modern Design
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img 
              src={suribetLogo} 
              alt="Suribet" 
              className="w-48 h-auto mx-auto mb-6 object-contain"
            />
            <p className="text-white/50">Log in om te beginnen</p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-white/80">Gebruikersnaam</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                      placeholder="Voer gebruikersnaam in"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Wachtwoord</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="Voer wachtwoord in"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Inloggen
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-white/30 text-sm mt-6">
            {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  // Main Portal Screen - Modern Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative max-w-2xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{employee?.name}</h1>
                <p className="text-emerald-100 text-sm">{employee?.function} • {employee?.employer_name}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {/* Live Clock */}
          <div className="mt-4 flex items-center gap-2 text-emerald-100">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-mono">
              {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-sm ml-2">
              {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 -mt-4">
        {/* Active Shift Card */}
        {activeShift ? (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
                <span className="font-semibold text-lg">Actieve Shift</span>
                <Badge className="bg-white/20 text-white border-0 ml-auto">
                  <Timer className="w-3 h-3 mr-1" />
                  {calculateShiftDuration()} uur
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                    <Gamepad2 className="w-4 h-4" />
                    Machine
                  </div>
                  <p className="font-bold text-xl">
                    {machines.find(m => m.id === activeShift.machine_id)?.machine_id || 'Onbekend'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    Gestart om
                  </div>
                  <p className="font-bold text-xl">{activeShift.start_time}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label className="text-emerald-100 text-sm">Kas Verschil (SRD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashDifference}
                    onChange={(e) => setCashDifference(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-12 text-lg"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-emerald-100 text-sm">Opmerkingen (optioneel)</Label>
                  <Input
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="Eventuele opmerkingen..."
                  />
                </div>
              </div>

              <Button 
                onClick={handleStopShift}
                disabled={loading}
                className="w-full h-14 bg-white text-emerald-600 hover:bg-white/90 font-semibold text-lg shadow-lg"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Square className="w-5 h-5 mr-2" />
                    Shift Beëindigen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Start Shift Card */
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-emerald-500" />
                </div>
                Nieuwe Shift Starten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selecteer Machine</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue placeholder="Kies een machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map(machine => (
                      <SelectItem key={machine.id} value={machine.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <Gamepad2 className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium">{machine.machine_id}</p>
                            <p className="text-xs text-muted-foreground">{machine.location}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleStartShift}
                disabled={loading || !selectedMachine}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-lg shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Shift Starten
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shifts deze week</p>
                  <p className="text-xl font-bold">{shiftHistory.filter(s => {
                    const shiftDate = new Date(s.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return shiftDate >= weekAgo;
                  }).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uren deze week</p>
                  <p className="text-xl font-bold">{shiftHistory.filter(s => {
                    const shiftDate = new Date(s.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return shiftDate >= weekAgo && s.hours_worked;
                  }).reduce((sum, s) => sum + (s.hours_worked || 0), 0).toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shift History */}
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-slate-500" />
              </div>
              Recente Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftHistory.length > 0 ? (
              <div className="space-y-3">
                {shiftHistory.slice(0, 5).map((shift) => (
                  <div 
                    key={shift.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        shift.end_time ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium">{shift.machine_name || 'Machine'}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(shift.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {shift.start_time} - {shift.end_time || 'Actief'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {shift.end_time ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {shift.hours_worked?.toFixed(1) || '?'}u
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Actief
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                  <History className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-muted-foreground">Nog geen shifts geregistreerd</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
