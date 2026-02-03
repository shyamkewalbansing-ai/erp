import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Clock, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Loader2,
  Calendar,
  Mail,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ScheduledJobsAdmin() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/scheduled-jobs/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runJob = async (jobType) => {
    setRunning(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/scheduled-jobs/run?job_type=${jobType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        toast.success(`Job "${jobType}" succesvol uitgevoerd`);
        await loadStatus();
      } else {
        toast.error('Fout bij uitvoeren job');
      }
    } catch (error) {
      toast.error('Fout bij uitvoeren job');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Geplande Taken
              </CardTitle>
              <CardDescription>
                Automatische email herinneringen en module controles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {status?.scheduler_running ? (
                <Badge className="bg-emerald-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Actief
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Gestopt
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={loadStatus}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scheduled Jobs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {status?.jobs?.map((job) => (
              <div 
                key={job.id}
                className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    {job.id === 'check_expiring_modules' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    {job.id === 'check_expired_modules' && <XCircle className="w-4 h-4 text-red-500" />}
                    {job.id === 'cleanup_old_logs' && <RefreshCw className="w-4 h-4 text-blue-500" />}
                    {job.id === 'check_expiring_modules' && 'Module Verlopen Check'}
                    {job.id === 'check_expired_modules' && 'Verlopen Modules'}
                    {job.id === 'cleanup_old_logs' && 'Log Cleanup'}
                  </h4>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Volgende run: {job.next_run ? new Date(job.next_run).toLocaleString('nl-NL') : 'Niet gepland'}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    {job.trigger}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Manual Run Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant="outline"
              onClick={() => runJob('expiring')}
              disabled={running}
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Check Bijna Verlopen
            </Button>
            <Button
              variant="outline"
              onClick={() => runJob('expired')}
              disabled={running}
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Check Verlopen
            </Button>
            <Button
              onClick={() => runJob('all')}
              disabled={running}
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Alle Jobs Uitvoeren
            </Button>
          </div>

          {/* Recent Logs */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recente Uitvoeringen
            </h4>
            {status?.recent_logs?.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nog geen uitvoeringen</p>
            ) : (
              <div className="space-y-2">
                {status?.recent_logs?.map((log, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{log.job}</p>
                        {log.emails_sent !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {log.emails_sent} emails verzonden
                            {log.modules_updated !== undefined && `, ${log.modules_updated} modules bijgewerkt`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.run_at).toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
