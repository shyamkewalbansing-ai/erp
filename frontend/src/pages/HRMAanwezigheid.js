import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Clock, Play, Square, User, Calendar, Users } from 'lucide-react';
import api from '../lib/api';

export default function HRMAanwezigheid() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    try {
      const [employeesRes, attendanceRes] = await Promise.all([
        api.get('/hrm/employees'),
        api.get(`/hrm/attendance?date=${selectedDate}`)
      ]);
      setEmployees(employeesRes.data || []);
      setAttendance(attendanceRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (employeeId) => {
    try {
      const res = await api.post(`/hrm/attendance/clock-in?employee_id=${employeeId}`);
      toast.success(res.data.message);
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error('Fout bij inklokken');
    }
  };

  const handleClockOut = async (employeeId) => {
    try {
      const res = await api.post(`/hrm/attendance/clock-out?employee_id=${employeeId}`);
      toast.success(res.data.message);
      loadData(); // eslint-disable-line react-hooks/exhaustive-deps
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij uitklokken');
    }
  };

  const getAttendanceForEmployee = (empId) => {
    return attendance.find(a => a.employee_id === empId);
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const presentToday = attendance.filter(a => a.clock_in).length;
  const totalWorkedHours = attendance.reduce((sum, a) => sum + (a.worked_hours || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aanwezigheid</h1>
          <p className="text-muted-foreground mt-1">Tijdregistratie en aanwezigheid van werknemers</p>
        </div>
        <Input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="w-48"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold">{activeEmployees.length}</p>
          <p className="text-sm text-muted-foreground">Actieve Werknemers</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{presentToday}</p>
          <p className="text-sm text-muted-foreground">Aanwezig Vandaag</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-600">{activeEmployees.length - presentToday}</p>
          <p className="text-sm text-muted-foreground">Niet Ingeklokt</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-primary">{totalWorkedHours.toFixed(1)}u</p>
          <p className="text-sm text-muted-foreground">Totaal Gewerkt</p>
        </CardContent></Card>
      </div>

      {/* Clock In/Out Section */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            In- en Uitklokken
            <Badge variant="secondary" className="ml-2">{selectedDate === new Date().toISOString().slice(0, 10) ? 'Vandaag' : selectedDate}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Geen actieve werknemers</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEmployees.map(emp => {
                const record = getAttendanceForEmployee(emp.id);
                const isClockedIn = record?.clock_in && !record?.clock_out;
                const isClockedOut = record?.clock_in && record?.clock_out;
                
                return (
                  <div 
                    key={emp.id} 
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isClockedOut ? 'bg-green-50 border-green-200' :
                      isClockedIn ? 'bg-blue-50 border-blue-200' :
                      'bg-muted/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isClockedOut ? 'bg-green-500' :
                          isClockedIn ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`}>
                          <span className="text-white font-bold">{emp.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{emp.name}</h3>
                          <p className="text-xs text-muted-foreground">{emp.position || 'Geen functie'}</p>
                          {record && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {record.clock_in && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Play className="w-3 h-3" />In: {record.clock_in}
                                </span>
                              )}
                              {record.clock_out && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <Square className="w-3 h-3" />Uit: {record.clock_out}
                                </span>
                              )}
                              {record.worked_hours && (
                                <Badge variant="secondary" className="ml-1">{record.worked_hours}u</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handleClockIn(emp.id)}
                          disabled={!!record?.clock_in || selectedDate !== new Date().toISOString().slice(0, 10)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleClockOut(emp.id)}
                          disabled={!record?.clock_in || !!record?.clock_out || selectedDate !== new Date().toISOString().slice(0, 10)}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Aanwezigheidsoverzicht - {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen aanwezigheidsgegevens voor deze datum
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Werknemer</th>
                    <th className="text-left py-3 px-2 font-medium">Ingeklokt</th>
                    <th className="text-left py-3 px-2 font-medium">Uitgeklokt</th>
                    <th className="text-left py-3 px-2 font-medium">Pauze</th>
                    <th className="text-left py-3 px-2 font-medium">Gewerkt</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{a.employee_name?.charAt(0)}</span>
                          </div>
                          {a.employee_name}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-green-600 font-medium">{a.clock_in || '-'}</td>
                      <td className="py-3 px-2 text-red-600 font-medium">{a.clock_out || '-'}</td>
                      <td className="py-3 px-2">{a.break_minutes || 0} min</td>
                      <td className="py-3 px-2 font-medium">{a.worked_hours ? `${a.worked_hours} uur` : '-'}</td>
                      <td className="py-3 px-2">
                        <Badge className={
                          a.status === 'present' ? 'bg-green-100 text-green-700' :
                          a.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                          a.status === 'absent' ? 'bg-red-100 text-red-700' :
                          a.status === 'remote' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {a.status === 'present' ? 'Aanwezig' :
                           a.status === 'late' ? 'Te laat' :
                           a.status === 'absent' ? 'Afwezig' :
                           a.status === 'remote' ? 'Remote' :
                           a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
