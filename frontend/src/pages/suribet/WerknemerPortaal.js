import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WerknemerPortaal() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
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

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Suribet Shift Portaal</CardTitle>
            <p className="text-muted-foreground">Log in om je shift te starten</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Gebruikersnaam</Label>
                <Input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="Voer gebruikersnaam in"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Wachtwoord</Label>
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Voer wachtwoord in"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Inloggen
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Portal Screen
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold">{employee?.name}</h1>
              <p className="text-emerald-100 text-sm">{employee?.function} • {employee?.employer_name}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Active Shift Card */}
        {activeShift ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-semibold">Actieve Shift</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-emerald-100 text-sm">Machine</p>
                  <p className="font-bold text-lg">
                    {machines.find(m => m.id === activeShift.machine_id)?.machine_id || 'Onbekend'}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Gestart om</p>
                  <p className="font-bold text-lg">{activeShift.start_time}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="space-y-1">
                  <Label className="text-emerald-100">Kas Verschil (SRD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashDifference}
                    onChange={(e) => setCashDifference(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-emerald-100">Opmerkingen</Label>
                  <Input
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="Optioneel..."
                  />
                </div>
              </div>

              <Button 
                onClick={handleStopShift}
                disabled={loading}
                className="w-full bg-white text-emerald-600 hover:bg-white/90"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Shift Beëindigen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-500" />
                Nieuwe Shift Starten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecteer Machine</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map(machine => (
                      <SelectItem key={machine.id} value={machine.id}>
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4" />
                          {machine.machine_id}
                          <span className="text-muted-foreground text-sm">• {machine.location}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleStartShift}
                disabled={loading || !selectedMachine}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Shift Starten
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Shift History */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-emerald-500" />
              Recente Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftHistory.length > 0 ? (
              <div className="space-y-3">
                {shiftHistory.map((shift) => (
                  <div 
                    key={shift.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        shift.end_time ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{shift.machine_name || 'Machine'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(shift.date)}
                          <Clock className="w-3 h-3 ml-1" />
                          {shift.start_time} - {shift.end_time || 'Actief'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {shift.end_time ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {shift.hours_worked || '?'}u
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Actief
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nog geen shifts geregistreerd
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
