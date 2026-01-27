import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Building2, Calendar, Clock, DollarSign,
  TrendingUp, AlertTriangle, Target, UserCheck, FileText,
  CreditCard, ArrowUpRight, Briefcase, CalendarDays
} from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
};

export default function HRMDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, leaveRes] = await Promise.all([
        api.get('/hrm/dashboard'),
        api.get('/hrm/leave-requests')
      ]);
      setDashboard(dashboardRes.data);
      setLeaveRequests(leaveRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveStatus = async (id, status) => {
    try {
      await api.put(`/hrm/leave-requests/${id}?status=${status}`);
      toast.success(status === 'approved' ? 'Verlof goedgekeurd' : 'Verlof afgewezen');
      loadData();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Totaal Werknemers',
      value: dashboard?.employees?.total || 0,
      subtitle: `${dashboard?.employees?.active || 0} actief`,
      icon: Users,
      color: 'bg-blue-500',
      link: '/app/hrm/personeel'
    },
    {
      title: 'Aanwezig Vandaag',
      value: dashboard?.employees?.present_today || 0,
      subtitle: 'Ingeklokt',
      icon: UserCheck,
      color: 'bg-green-500',
      link: '/app/hrm/aanwezigheid'
    },
    {
      title: 'Met Verlof',
      value: dashboard?.employees?.on_leave || 0,
      subtitle: `${dashboard?.leave?.pending_requests || 0} aanvragen`,
      icon: Calendar,
      color: 'bg-yellow-500',
      link: '/app/hrm/verlof'
    },
    {
      title: 'Open Vacatures',
      value: dashboard?.recruitment?.open_vacancies || 0,
      subtitle: `${dashboard?.recruitment?.new_applications || 0} nieuwe sollicitaties`,
      icon: Target,
      color: 'bg-purple-500',
      link: '/app/hrm/werving'
    },
    {
      title: 'Aflopende Contracten',
      value: dashboard?.contracts?.expiring_soon || 0,
      subtitle: 'Binnen 30 dagen',
      icon: FileText,
      color: 'bg-orange-500',
      link: '/app/hrm/contracten'
    },
    {
      title: 'Maandelijkse Loonkosten',
      value: formatCurrency(dashboard?.salary?.total_monthly || 0),
      subtitle: `Gem. ${formatCurrency(dashboard?.salary?.average || 0)}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      link: '/app/hrm/loonlijst'
    },
  ];

  const pendingLeave = leaveRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HRM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van uw personeelsbeheer
          </p>
        </div>
        <Button onClick={() => navigate('/app/hrm/personeel')} size="lg" className="shadow-lg">
          <UserPlus className="w-5 h-5 mr-2" />
          Nieuwe Werknemer
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-md overflow-hidden"
            onClick={() => navigate(stat.link)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Bekijk details</span>
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Pending Requests */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Snelle Acties
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start h-12" onClick={() => navigate('/app/hrm/personeel')}>
              <UserPlus className="w-5 h-5 mr-3 text-blue-500" />
              Werknemer Toevoegen
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => navigate('/app/hrm/werving')}>
              <Target className="w-5 h-5 mr-3 text-purple-500" />
              Vacature Plaatsen
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => navigate('/app/hrm/verlof')}>
              <CalendarDays className="w-5 h-5 mr-3 text-yellow-500" />
              Verlof Aanvragen
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => navigate('/app/hrm/loonlijst')}>
              <CreditCard className="w-5 h-5 mr-3 text-emerald-500" />
              Loonlijst Genereren
            </Button>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Wachtende Verlofaanvragen
              {pendingLeave.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingLeave.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLeave.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Geen wachtende aanvragen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeave.slice(0, 4).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {req.employee_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{req.employee_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {req.leave_type} • {req.days} dag(en)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleLeaveStatus(req.id, 'approved')}
                      >
                        Goedkeuren
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleLeaveStatus(req.id, 'rejected')}
                      >
                        Afwijzen
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingLeave.length > 4 && (
                  <Button variant="ghost" className="w-full" onClick={() => navigate('/app/hrm/verlof')}>
                    Bekijk alle ({pendingLeave.length}) aanvragen
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      {dashboard?.department_breakdown?.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Werknemers per Afdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {dashboard.department_breakdown.map((dept, i) => (
                <div key={i} className="relative p-4 bg-gradient-to-br from-muted/50 to-muted rounded-xl text-center group hover:shadow-md transition-shadow">
                  <p className="text-3xl font-bold text-primary">{dept.count}</p>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{dept.name || 'Geen afdeling'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
