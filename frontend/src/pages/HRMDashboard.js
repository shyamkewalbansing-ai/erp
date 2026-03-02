import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Building2, Calendar, Clock, DollarSign,
  TrendingUp, AlertTriangle, Target, UserCheck, FileText,
  CreditCard, Briefcase, CalendarDays, Search, Download,
  Mail, Phone, Eye, ArrowUpDown, CheckCircle, Circle,
  XCircle, Filter, Printer, Upload, Settings, MoreHorizontal
} from 'lucide-react';
import api from '../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const symbols = { SRD: 'SRD', EUR: '€', USD: '$' };
  return `${symbols[currency] || currency} ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
};

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

// Status Legend Item
const StatusLegendItem = ({ icon: Icon, label, color }) => (
  <div className="flex items-center gap-2">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-xs text-gray-600">{label}</span>
  </div>
);

// Status Icon Component
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'on_leave':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'inactive':
      return <XCircle className="w-5 h-5 text-gray-400" />;
    case 'pending':
      return <Circle className="w-5 h-5 text-blue-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
};

export default function HRMDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, leaveRes, employeesRes] = await Promise.all([
        api.get('/hrm/dashboard'),
        api.get('/hrm/leave-requests'),
        api.get('/hrm/employees')
      ]);
      setDashboard(dashboardRes.data);
      setLeaveRequests(leaveRes.data || []);
      setEmployees(employeesRes.data || []);
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

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.length === filteredEmployees.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredEmployees.map(emp => emp.id));
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalEmployees = dashboard?.employees?.total || employees.length;
  const activeEmployees = dashboard?.employees?.active || employees.filter(e => e.status === 'active').length;
  const onLeaveEmployees = dashboard?.employees?.on_leave || employees.filter(e => e.status === 'on_leave').length;
  const totalSalary = dashboard?.salary?.total_monthly || employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="hrm-dashboard">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">HRM / Personeel</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === 'overzicht'} onClick={() => { setActiveTab('overzicht'); setSelectedRows([]); }}>
            Overzicht
          </TabButton>
          <TabButton active={activeTab === 'personeel'} onClick={() => { setActiveTab('personeel'); setSelectedRows([]); }}>
            Personeel
          </TabButton>
          <TabButton active={activeTab === 'verlof'} onClick={() => { setActiveTab('verlof'); setSelectedRows([]); }}>
            Verlofaanvragen
          </TabButton>
          <TabButton active={activeTab === 'contracten'} onClick={() => { setActiveTab('contracten'); setSelectedRows([]); }}>
            Contracten
          </TabButton>
          <TabButton active={activeTab === 'loonlijst'} onClick={() => { setActiveTab('loonlijst'); setSelectedRows([]); }}>
            Loonlijst
          </TabButton>
          <TabButton active={activeTab === 'rapporten'} onClick={() => { setActiveTab('rapporten'); setSelectedRows([]); }}>
            Rapporten
          </TabButton>
          
          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="rounded-lg" data-testid="import-btn">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" className="rounded-lg" data-testid="settings-btn" onClick={() => navigate('/app/hrm/instellingen')}>
              <Settings className="w-4 h-4 mr-2" />
              Instellingen
            </Button>
            <Button 
              onClick={() => navigate('/app/hrm/personeel')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" 
              data-testid="add-employee-btn"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Werknemer
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Werknemer / Functie
            </Label>
            <div className="relative">
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg pr-10"
                data-testid="search-input"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Jaar */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Jaar</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="on_leave">Met Verlof</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Afdeling */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Afdeling
            </Label>
            <Select defaultValue="all">
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Totaal info */}
          <div className="text-right">
            <span className="text-sm text-gray-500">Totaal Loonkosten</span>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(totalSalary)}</p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <StatusLegendItem icon={CheckCircle} label="Actief" color="text-emerald-500" />
          <StatusLegendItem icon={Clock} label="Met Verlof" color="text-amber-500" />
          <StatusLegendItem icon={Circle} label="In afwachting" color="text-blue-500" />
          <StatusLegendItem icon={XCircle} label="Inactief" color="text-gray-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards - Zakelijk 3D */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Totaal Werknemers</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{totalEmployees}</p>
                <p className="text-xs text-gray-400 mt-1">{activeEmployees} actief</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Aanwezig Vandaag</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{dashboard?.employees?.present_today || activeEmployees}</p>
                <p className="text-xs text-gray-400 mt-1">Ingeklokt</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <UserCheck className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Met Verlof</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{onLeaveEmployees}</p>
                <p className="text-xs text-gray-400 mt-1">{pendingLeave.length} aanvragen</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" style={{boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Loonkosten</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalSalary)}</p>
                <p className="text-xs text-gray-400 mt-1">Per maand</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                <DollarSign className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {activeTab === 'overzicht' && `Werknemers (${filteredEmployees.length})`}
                  {activeTab === 'personeel' && `Personeel (${filteredEmployees.length})`}
                  {activeTab === 'verlof' && `Verlofaanvragen (${leaveRequests.length})`}
                  {activeTab === 'contracten' && 'Contracten'}
                  {activeTab === 'loonlijst' && 'Loonlijst'}
                  {activeTab === 'rapporten' && 'Rapporten'}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Printer className="w-4 h-4 mr-2" />
                    Afdrukken
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Download className="w-4 h-4 mr-2" />
                    Exporteren
                  </Button>
                </div>
              </div>
            </div>

            {/* Overzicht / Personeel Tab */}
            {(activeTab === 'overzicht' || activeTab === 'personeel') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3">
                        <Checkbox 
                          checked={selectedRows.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="text-left px-4 py-3">
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide hover:text-gray-900">
                          Naam
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Functie
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Afdeling
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Salaris
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actie
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen werknemers gevonden</p>
                          <p className="text-sm text-gray-500 mb-6">Voeg uw eerste werknemer toe om te beginnen.</p>
                          <Button onClick={() => navigate('/app/hrm/personeel')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Nieuwe Werknemer
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr 
                          key={emp.id} 
                          className={`border-b border-gray-100 hover:bg-emerald-50/30 transition-colors ${
                            selectedRows.includes(emp.id) ? 'bg-emerald-50/50' : ''
                          }`}
                          data-testid={`employee-row-${emp.id}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox 
                              checked={selectedRows.includes(emp.id)}
                              onCheckedChange={() => toggleRowSelection(emp.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <span className="font-semibold text-gray-600">
                                  {emp.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{emp.position || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{emp.department || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {emp.email && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="w-3 h-3" />
                                  {emp.email}
                                </div>
                              )}
                              {emp.phone && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Phone className="w-3 h-3" />
                                  {emp.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={emp.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(emp.salary || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-gray-500 hover:text-gray-700">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <Mail className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Verlof Tab */}
            {activeTab === 'verlof' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Werknemer
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Van - Tot
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Dagen
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Actie
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
                          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                          <p className="text-lg font-semibold text-gray-700 mb-2">Geen verlofaanvragen</p>
                          <p className="text-sm text-gray-500">Er zijn geen verlofaanvragen om weer te geven.</p>
                        </td>
                      </tr>
                    ) : (
                      leaveRequests.map((req) => (
                        <tr key={req.id} className="border-b border-gray-100 hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <span className="font-semibold text-gray-600">
                                  {req.employee_name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{req.employee_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{req.leave_type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {req.start_date} - {req.end_date}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-xs">{req.days} dagen</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusIcon status={req.status} />
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                                  onClick={() => handleLeaveStatus(req.id, 'approved')}
                                >
                                  Goedkeuren
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleLeaveStatus(req.id, 'rejected')}
                                >
                                  Afwijzen
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab === 'contracten' || activeTab === 'loonlijst' || activeTab === 'rapporten') && (
              <div className="px-4 py-16 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {activeTab === 'contracten' && 'Contracten'}
                  {activeTab === 'loonlijst' && 'Loonlijst'}
                  {activeTab === 'rapporten' && 'Rapporten'}
                </p>
                <p className="text-sm text-gray-500">Deze sectie wordt binnenkort beschikbaar.</p>
              </div>
            )}

            {/* Footer with selection info */}
            {selectedRows.length > 0 && (activeTab === 'overzicht' || activeTab === 'personeel') && (
              <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-emerald-700">
                  {selectedRows.length} werknemer(s) geselecteerd
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Mail className="w-4 h-4 mr-2" />
                    E-mail versturen
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Download className="w-4 h-4 mr-2" />
                    Exporteren
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                    <Printer className="w-4 h-4 mr-2" />
                    Loonstrook
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
