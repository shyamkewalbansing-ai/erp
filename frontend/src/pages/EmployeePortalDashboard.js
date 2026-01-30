import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Briefcase, LogOut, DollarSign, Calendar, Clock, CheckCircle, 
  XCircle, AlertCircle, User, Building2, FileText, Loader2
} from 'lucide-react';
import api from '../lib/api';

export default function EmployeePortalDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [employee, setEmployee] = useState(null);

  const loadDashboard = useCallback(async (token) => {
    try {
      const response = await api.get('/employee-portal/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Sessie verlopen, log opnieuw in');
        localStorage.removeItem('employee_token');
        localStorage.removeItem('employee_user');
        navigate('/werknemer/login');
      } else {
        toast.error('Kon dashboard niet laden');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('employee_token');
    const user = localStorage.getItem('employee_user');
    
    if (!token) {
      navigate('/werknemer/login');
      return;
    }
    
    if (user) {
      setEmployee(JSON.parse(user));
    }
    
    loadDashboard(token);
  }, [navigate, loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_user');
    navigate('/werknemer/login');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />{status === 'paid' ? 'Betaald' : 'Goedgekeurd'}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />In behandeling</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Afgewezen</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Werknemers Portaal</h1>
              <p className="text-sm text-gray-500">{employee?.name || dashboard?.employee_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome & Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welkom, {dashboard?.employee_name}</h2>
          <p className="text-gray-500">{dashboard?.position} {dashboard?.department && `- ${dashboard.department}`}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Totaal verdiend (YTD)</p>
                  <p className="text-2xl font-bold">€{dashboard?.stats?.total_earned_ytd?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dagen gewerkt (maand)</p>
                  <p className="text-2xl font-bold">{dashboard?.stats?.days_worked_month || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verlofaanvragen</p>
                  <p className="text-2xl font-bold">{dashboard?.stats?.pending_leave_requests || 0} <span className="text-sm font-normal text-gray-500">in behandeling</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Mijn Gegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Naam</p>
                  <p className="font-medium">{dashboard?.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Functie</p>
                  <p className="font-medium">{dashboard?.position || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Afdeling</p>
                  <p className="font-medium">{dashboard?.department || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">In dienst sinds</p>
                  <p className="font-medium">{dashboard?.hire_date || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">E-mail</p>
                  <p className="font-medium">{dashboard?.email || employee?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefoon</p>
                  <p className="font-medium">{dashboard?.phone || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Aanwezigheid - {dashboard?.attendance_summary?.month}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{dashboard?.attendance_summary?.present || 0}</p>
                  <p className="text-sm text-gray-500">Aanwezig</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{dashboard?.attendance_summary?.absent || 0}</p>
                  <p className="text-sm text-gray-500">Afwezig</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{dashboard?.attendance_summary?.late || 0}</p>
                  <p className="text-sm text-gray-500">Te laat</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dashboard?.attendance_summary?.leave || 0}</p>
                  <p className="text-sm text-gray-500">Verlof</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Salaries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recente Loonstroken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.recent_salaries?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recent_salaries.map((salary, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{salary.period}</p>
                        <p className="text-sm text-gray-500">{salary.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">€{salary.net?.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Bruto: €{salary.gross?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">Geen loonstroken gevonden</p>
              )}
            </CardContent>
          </Card>

          {/* Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Verlofaanvragen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.leave_requests?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.leave_requests.map((leave, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{leave.type}</p>
                        <p className="text-sm text-gray-500">{leave.start_date} - {leave.end_date} ({leave.days} dagen)</p>
                      </div>
                      {getStatusBadge(leave.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">Geen verlofaanvragen</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
