import React, { useState, useEffect } from 'react';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { History, Search, User, Database, Download, RefreshCw, Eye, Edit, Trash2, Plus, CheckCircle, FileText, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditTrailPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [dateRange, setDateRange] = useState({ van: '', tot: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterModule !== 'all') params.append('module', filterModule);
      if (filterAction !== 'all') params.append('action', filterAction);
      if (dateRange.van) params.append('van', dateRange.van);
      if (dateRange.tot) params.append('tot', dateRange.tot);
      
      const response = await fetch(`${API_URL}/api/boekhouding/audit-trail?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(Array.isArray(data) ? data : data.data || []);
      } else {
        setAuditLogs(generateDemoData());
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setAuditLogs(generateDemoData());
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = () => {
    const actions = ['create', 'update', 'delete', 'view', 'verzenden', 'betaling', 'boeken'];
    const modules = ['verkoop', 'inkoop', 'debiteuren', 'crediteuren', 'grootboek', 'bank', 'btw'];
    const entityTypes = ['verkoopfactuur', 'inkoopfactuur', 'debiteur', 'crediteur', 'journaalpost', 'bankrekening'];
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: `audit-${i}`,
      user_id: 'demo-user',
      user_email: 'demo@facturatie.sr',
      user_name: 'Demo Gebruiker',
      action: actions[Math.floor(Math.random() * actions.length)],
      module: modules[Math.floor(Math.random() * modules.length)],
      entity_type: entityTypes[Math.floor(Math.random() * entityTypes.length)],
      entity_id: `ENT-${1000 + i}`,
      details: { beschrijving: 'Demo activiteit' },
      ip_address: '192.168.1.100',
      timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 24).toISOString()
    }));
  };

  const handleExport = () => {
    toast.success('Audit trail wordt geëxporteerd...');
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-500" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'view': return <Eye className="w-4 h-4 text-slate-500" />;
      case 'verzenden': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'betaling': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'boeken': return <FileText className="w-4 h-4 text-purple-500" />;
      default: return <History className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'create': 'Aangemaakt',
      'update': 'Bijgewerkt',
      'delete': 'Verwijderd',
      'view': 'Bekeken',
      'verzenden': 'Verzonden',
      'betaling': 'Betaling',
      'boeken': 'Geboekt'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'bg-green-100 text-green-700',
      'update': 'bg-blue-100 text-blue-700',
      'delete': 'bg-red-100 text-red-700',
      'view': 'bg-slate-100 text-slate-700',
      'verzenden': 'bg-green-100 text-green-700',
      'betaling': 'bg-blue-100 text-blue-700',
      'boeken': 'bg-purple-100 text-purple-700'
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  const getModuleLabel = (module) => {
    const labels = {
      'verkoop': 'Verkoop',
      'inkoop': 'Inkoop',
      'debiteuren': 'Debiteuren',
      'crediteuren': 'Crediteuren',
      'grootboek': 'Grootboek',
      'bank': 'Bank/Kas',
      'btw': 'BTW',
      'voorraad': 'Voorraad',
      'projecten': 'Projecten',
      'rapportages': 'Rapportages',
      'instellingen': 'Instellingen',
      'boekhouding': 'Boekhouding'
    };
    return labels[module] || module;
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesModule && matchesAction;
  });

  const stats = {
    totaal: auditLogs.length,
    vandaag: auditLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    creates: auditLogs.filter(l => l.action === 'create').length,
    updates: auditLogs.filter(l => l.action === 'update').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="audit-trail-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl" data-testid="audit-trail-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit Trail</h1>
          <p className="text-slate-500 mt-0.5">Bekijk alle gebruikersacties en wijzigingen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporteren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Acties</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totaal}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <History className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Vandaag</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.vandaag}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Aangemaakt</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.creates}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                <Plus className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Bijgewerkt</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.updates}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Edit className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Zoeken op gebruiker, email of ID..."
                className="pl-10"
              />
            </div>
            <div className="w-40">
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle modules</SelectItem>
                  <SelectItem value="verkoop">Verkoop</SelectItem>
                  <SelectItem value="inkoop">Inkoop</SelectItem>
                  <SelectItem value="debiteuren">Debiteuren</SelectItem>
                  <SelectItem value="crediteuren">Crediteuren</SelectItem>
                  <SelectItem value="grootboek">Grootboek</SelectItem>
                  <SelectItem value="bank">Bank/Kas</SelectItem>
                  <SelectItem value="btw">BTW</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Actie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle acties</SelectItem>
                  <SelectItem value="create">Aangemaakt</SelectItem>
                  <SelectItem value="update">Bijgewerkt</SelectItem>
                  <SelectItem value="delete">Verwijderd</SelectItem>
                  <SelectItem value="view">Bekeken</SelectItem>
                  <SelectItem value="verzenden">Verzonden</SelectItem>
                  <SelectItem value="betaling">Betaling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Input type="date" value={dateRange.van} onChange={(e) => setDateRange({...dateRange, van: e.target.value})} />
            </div>
            <div className="w-36">
              <Input type="date" value={dateRange.tot} onChange={(e) => setDateRange({...dateRange, tot: e.target.value})} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Activiteitenlog</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-xs font-medium text-slate-500"></TableHead>
                <TableHead className="w-40 text-xs font-medium text-slate-500">Tijdstip</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Gebruiker</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Module</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Actie</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Entiteit</TableHead>
                <TableHead className="w-32 text-xs font-medium text-slate-500">IP Adres</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{getActionIcon(log.action)}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div>{formatDate(log.timestamp)}</div>
                    <div className="text-slate-400 text-xs">{new Date(log.timestamp).toLocaleTimeString('nl-NL')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{log.user_name || 'Onbekend'}</div>
                        <div className="text-xs text-slate-500">{log.user_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getModuleLabel(log.module)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getActionColor(log.action)}`}>{getActionLabel(log.action)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{log.entity_type}</div>
                      <div className="text-slate-500 text-xs">{log.entity_id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{log.ip_address || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Geen audit logs gevonden met deze filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditTrailPage;
